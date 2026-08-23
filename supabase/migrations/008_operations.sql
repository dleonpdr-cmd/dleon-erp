-- ============================================================
-- D'LEON ERP — Módulo de Operações (Blocos)
-- Migration: 008_operations.sql
-- ============================================================

-- ─── 1. operations ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,                         -- totalmente editável: "Daihatsu Ibaraki", "Galpão B"...
  customer_id            UUID REFERENCES customers(id),         -- concessionária / cliente do bloco
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','active','paused','completed','cancelled')),
  workflow_template_id   UUID,                                  -- nullable — configurado depois
  budget_type_default    TEXT NOT NULL DEFAULT 'individual'
                         CHECK (budget_type_default IN ('individual','batch')),
  notes                  TEXT,
  start_date             DATE,
  end_date               DATE,
  target_vehicle_count   INT,                                   -- meta de veículos
  created_by             UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. operation_members ─────────────────────────────────────────────────────
--   Um técnico pode estar em vários projetos.
--   Um técnico pode ter vários papéis no mesmo projeto (ver operation_member_roles).

CREATE TABLE IF NOT EXISTS operation_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id     UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  technician_id    UUID NOT NULL REFERENCES technicians(id),
  primary_function TEXT CHECK (primary_function IN (
    'pdr_tech','inspector','assembler','supervisor','financial','admin'
  )),                                                           -- define home do mobile
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at          TIMESTAMPTZ,                                 -- NULL = ainda na operação
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (operation_id, technician_id)
);

-- ─── 3. operation_member_roles ────────────────────────────────────────────────
--   Múltiplos papéis por membro na mesma operação.
--   Ex: Gabriel → pdr_tech + inspector

CREATE TABLE IF NOT EXISTS operation_member_roles (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES operation_members(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN (
    'pdr_tech','inspector','assembler','supervisor','financial','admin'
  )),
  UNIQUE (member_id, role)
);

-- ─── 4. Vincular casos a operações ────────────────────────────────────────────
--   Nullable: casos antigos sem operação continuam funcionando.

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES operations(id);

-- ─── 5. Trigger updated_at ────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'operations_updated_at') THEN
    CREATE TRIGGER operations_updated_at
      BEFORE UPDATE ON operations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── 6. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_operations_customer     ON operations(customer_id);
CREATE INDEX IF NOT EXISTS idx_operations_status       ON operations(status);
CREATE INDEX IF NOT EXISTS idx_op_members_operation    ON operation_members(operation_id);
CREATE INDEX IF NOT EXISTS idx_op_members_technician   ON operation_members(technician_id);
CREATE INDEX IF NOT EXISTS idx_op_member_roles_member  ON operation_member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_cases_operation         ON cases(operation_id);

-- ─── 7. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE operations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_member_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operations' AND policyname='operations_auth') THEN
    CREATE POLICY "operations_auth" ON operations FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operation_members' AND policyname='op_members_auth') THEN
    CREATE POLICY "op_members_auth" ON operation_members FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='operation_member_roles' AND policyname='op_member_roles_auth') THEN
    CREATE POLICY "op_member_roles_auth" ON operation_member_roles FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ─── 8. View: operações com contagem de veículos ──────────────────────────────

CREATE OR REPLACE VIEW v_operations AS
SELECT
  op.id,
  op.name,
  op.status,
  op.budget_type_default,
  op.workflow_template_id,
  op.start_date,
  op.end_date,
  op.target_vehicle_count,
  op.notes,
  op.created_at,
  op.updated_at,
  op.customer_id,
  cu.name                                                  AS customer_name,
  -- contagem de casos vinculados
  COUNT(DISTINCT c.id)                                     AS total_cases,
  -- veículos por status do caso
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('done','invoiced','received','paid'))  AS completed_cases,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('in_progress','approved'))             AS in_progress_cases,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('draft','quoted'))                     AS pending_cases,
  -- faturamento total dos casos vinculados
  COALESCE(SUM(c.total_amount), 0)                         AS total_amount,
  -- membros ativos
  COUNT(DISTINCT om.id) FILTER (WHERE om.left_at IS NULL)  AS active_members
FROM operations op
LEFT JOIN customers       cu ON cu.id = op.customer_id
LEFT JOIN cases           c  ON c.operation_id = op.id
LEFT JOIN operation_members om ON om.operation_id = op.id
GROUP BY op.id, op.name, op.status, op.budget_type_default, op.workflow_template_id,
         op.start_date, op.end_date, op.target_vehicle_count, op.notes,
         op.created_at, op.updated_at, op.customer_id, cu.name;

NOTIFY pgrst, 'reload schema';
