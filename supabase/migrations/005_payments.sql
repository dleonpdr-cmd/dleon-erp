-- ============================================================
-- D'LEON ERP — Módulo de Pagamentos do Cliente
-- Migration: 005_payments.sql
-- Controla recebimentos da concessionária/cliente → D'LEON
-- NÃO controla pagamento de técnicos (módulo separado)
-- ============================================================

-- 1. Adicionar payment_status em cases
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending','partial','paid','overdue'));

-- 2. Tabela de pagamentos recebidos
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  method         TEXT NOT NULL DEFAULT 'bank_transfer'
                 CHECK (method IN ('bank_transfer','cash','card','insurance','other')),
  account        TEXT,
  reference      TEXT,
  notes          TEXT,
  attachment_url TEXT,
  status         TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed','cancelled')),
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_payments_case_id  ON payments(case_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at  ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON payments(status);

-- 4. RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_auth" ON payments FOR ALL TO authenticated USING (true);

-- 5. View resumo por caso
CREATE OR REPLACE VIEW v_case_payment_summary AS
SELECT
  c.id                                               AS case_id,
  c.case_number,
  c.total_amount,
  c.payment_status,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) AS received_amount,
  c.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) AS balance,
  COUNT(p.id) FILTER (WHERE p.status = 'confirmed')  AS payment_count
FROM cases c
LEFT JOIN payments p ON p.case_id = c.id
GROUP BY c.id, c.case_number, c.total_amount, c.payment_status;

NOTIFY pgrst, 'reload schema';
