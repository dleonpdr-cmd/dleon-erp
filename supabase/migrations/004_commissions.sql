-- ============================================================
-- D'LEON ERP — Módulo de Comissões
-- Migration: 004_commissions.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS commission_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  case_type   TEXT CHECK (case_type IN ('insurance','private')),
  customer_id UUID REFERENCES customers(id),
  blocks      JSONB NOT NULL DEFAULT '[]',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO commission_rules (name, case_type, blocks, is_default) VALUES
  ('Seguro',     'insurance', '[{"block":"supplier","pct":30},{"block":"dleon","pct":15},{"block":"technicians","pct":55}]', true),
  ('Particular', 'private',   '[{"block":"dleon","pct":20},{"block":"technicians","pct":80}]', false)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS commissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      UUID NOT NULL UNIQUE REFERENCES cases(id),
  rule_id      UUID REFERENCES commission_rules(id),
  status       TEXT NOT NULL DEFAULT 'calculated'
               CHECK (status IN ('calculated','reviewed','closed','pending_payment','partial','paid')),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  snapshot     JSONB,
  closed_at    TIMESTAMPTZ,
  closed_by    UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  block         TEXT NOT NULL CHECK (block IN ('supplier','dleon','technicians')),
  pct           NUMERIC(5,2) NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  UNIQUE (commission_id, block)
);

CREATE TABLE IF NOT EXISTS commission_splits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  block         TEXT NOT NULL CHECK (block IN ('supplier','dleon','technicians')),
  technician_id UUID REFERENCES technicians(id),
  name          TEXT NOT NULL,
  split_mode    TEXT NOT NULL DEFAULT 'pct' CHECK (split_mode IN ('pct','fixed')),
  pct           NUMERIC(5,2),
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid')),
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id   UUID NOT NULL REFERENCES commission_splits(id) ON DELETE CASCADE,
  amount     NUMERIC(12,2) NOT NULL,
  paid_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  method     TEXT CHECK (method IN ('bank_transfer','cash','pix','other')),
  account    TEXT,
  notes      TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES commissions(id),
  event_type    TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id),
  payload       JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'commissions_updated_at') THEN
    CREATE TRIGGER commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'commission_splits_updated_at') THEN
    CREATE TRIGGER commission_splits_updated_at BEFORE UPDATE ON commission_splits FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_commissions_case        ON commissions(case_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status      ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commission_splits_comm  ON commission_splits(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_splits_tech  ON commission_splits(technician_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_sp  ON commission_payments(split_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_comm ON commission_history(commission_id);

ALTER TABLE commission_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_splits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_history  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commission_rules_auth') THEN
    CREATE POLICY "commission_rules_auth"    ON commission_rules    FOR ALL TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commissions_auth') THEN
    CREATE POLICY "commissions_auth"         ON commissions         FOR ALL TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commission_blocks_auth') THEN
    CREATE POLICY "commission_blocks_auth"   ON commission_blocks   FOR ALL TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commission_splits_auth') THEN
    CREATE POLICY "commission_splits_auth"   ON commission_splits   FOR ALL TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commission_payments_auth') THEN
    CREATE POLICY "commission_payments_auth" ON commission_payments FOR ALL TO authenticated USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'commission_history_auth') THEN
    CREATE POLICY "commission_history_auth"  ON commission_history  FOR ALL TO authenticated USING (true);
  END IF;
END $$;

CREATE OR REPLACE VIEW v_technician_commission_summary AS
SELECT t.id AS technician_id, t.name AS technician_name,
  COUNT(DISTINCT cs.commission_id) AS total_cases,
  COALESCE(SUM(cs.amount), 0) AS total_amount,
  COALESCE(SUM(cs.paid_amount), 0) AS paid_amount,
  COALESCE(SUM(cs.amount - cs.paid_amount), 0) AS pending_amount
FROM technicians t
LEFT JOIN commission_splits cs ON cs.technician_id = t.id
GROUP BY t.id, t.name;
