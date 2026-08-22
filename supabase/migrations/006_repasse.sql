-- ============================================================
-- D'LEON ERP — Módulo de Repasse para Técnicos
-- Migration: 006_repasse.sql
-- Controla pagamentos da D'LEON → Técnicos (repasse de comissão)
-- INDEPENDENTE do módulo de pagamentos do cliente (005_payments.sql)
-- ============================================================

-- 1. Estender commissions.status com awaiting_liberation e liberated
--    Fluxo completo:
--    calculated → reviewed → closed → awaiting_liberation → liberated
--    → pending_payment → partial → paid
ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_status_check;

ALTER TABLE commissions
  ADD CONSTRAINT commissions_status_check
  CHECK (status IN (
    'calculated',
    'reviewed',
    'closed',
    'awaiting_liberation',
    'liberated',
    'pending_payment',
    'partial',
    'paid'
  ));

-- 2. Adicionar colunas em commission_payments (attachment e referência)
ALTER TABLE commission_payments
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS reference      TEXT;

-- 3. View de KPIs por técnico (calculado em tempo real, sem duplicações)
CREATE OR REPLACE VIEW v_technician_kpis AS
SELECT
  t.id                                                                      AS technician_id,
  t.name                                                                    AS technician_name,
  t.role,
  t.active,
  COUNT(DISTINCT comm.case_id)                                              AS total_cases,
  COALESCE(SUM(ca.total_amount), 0)                                         AS revenue_generated,
  COALESCE(SUM(cs.amount), 0)                                               AS commission_total,
  COALESCE(SUM(cs.paid_amount), 0)                                          AS commission_paid,
  COALESCE(SUM(cs.amount - cs.paid_amount), 0)                              AS commission_pending,
  COUNT(cs.id) FILTER (WHERE cs.status = 'pending'
    AND comm.status IN ('liberated','pending_payment','partial'))            AS splits_awaiting_repasse,
  COUNT(cs.id) FILTER (WHERE comm.status = 'awaiting_liberation')           AS splits_awaiting_liberation
FROM technicians t
LEFT JOIN commission_splits  cs   ON cs.technician_id = t.id AND cs.block = 'technicians'
LEFT JOIN commissions        comm  ON comm.id = cs.commission_id
LEFT JOIN cases              ca    ON ca.id = comm.case_id
GROUP BY t.id, t.name, t.role, t.active;

-- 4. View de KPIs mensais por técnico
CREATE OR REPLACE VIEW v_technician_monthly_kpis AS
SELECT
  t.id                                        AS technician_id,
  DATE_TRUNC('month', ca.created_at)          AS month,
  COUNT(DISTINCT comm.case_id)                AS cases_count,
  COALESCE(SUM(ca.total_amount), 0)           AS revenue_generated,
  COALESCE(SUM(cs.amount), 0)                 AS commission_total,
  CASE
    WHEN COUNT(DISTINCT comm.case_id) > 0
    THEN ROUND(SUM(ca.total_amount) / COUNT(DISTINCT comm.case_id), 0)
    ELSE 0
  END                                         AS avg_ticket
FROM technicians t
LEFT JOIN commission_splits  cs   ON cs.technician_id = t.id AND cs.block = 'technicians'
LEFT JOIN commissions        comm  ON comm.id = cs.commission_id
LEFT JOIN cases              ca    ON ca.id = comm.case_id
WHERE ca.created_at IS NOT NULL
GROUP BY t.id, DATE_TRUNC('month', ca.created_at);

-- 5. Garantir RLS nas tabelas de pagamento de comissão (já existente, só re-confirma)
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commission_payments' AND policyname = 'commission_payments_auth'
  ) THEN
    CREATE POLICY "commission_payments_auth"
      ON commission_payments FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Notificar PostgREST para reload do schema
NOTIFY pgrst, 'reload schema';
