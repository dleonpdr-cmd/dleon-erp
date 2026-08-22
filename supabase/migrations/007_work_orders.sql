-- ============================================================
-- D'LEON ERP — Módulo de Ordem de Serviço (OS)
-- Migration: 007_work_orders.sql
-- ============================================================

-- ─── 1. work_orders ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number                TEXT UNIQUE NOT NULL,           -- OS-2026-000351
  case_id                  UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  document_id              UUID REFERENCES documents(id),  -- orçamento aprovado
  status                   TEXT NOT NULL DEFAULT 'waiting'
                           CHECK (status IN (
                             'waiting','in_progress','paused','waiting_qc',
                             'qc_rejected','completed','ready_to_invoice','cancelled'
                           )),
  responsible_technician_id UUID REFERENCES technicians(id),
  items_snapshot           JSONB,          -- snapshot dos document_items na criação
  notes                    TEXT,           -- observação interna
  notes_client             TEXT,           -- observação para o cliente
  notes_qc                 TEXT,           -- observação de QC
  started_at               TIMESTAMPTZ,    -- primeiro início de reparo
  finished_at              TIMESTAMPTZ,    -- conclusão do reparo (→ waiting_qc)
  qc_approved_at           TIMESTAMPTZ,
  ready_to_invoice_at      TIMESTAMPTZ,
  invoice_document_id      UUID REFERENCES documents(id), -- evitar faturamento duplo
  created_by               UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. work_order_technicians ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_order_technicians (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  technician_id   UUID NOT NULL REFERENCES technicians(id),
  role            TEXT NOT NULL DEFAULT 'assistant'
                  CHECK (role IN ('lead','assistant')),
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by        UUID REFERENCES auth.users(id),
  removed_at      TIMESTAMPTZ,
  UNIQUE (work_order_id, technician_id)
);

-- ─── 3. work_order_items (snapshot dos painéis aprovados) ─────────────────────

CREATE TABLE IF NOT EXISTS work_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  source_item_id UUID,                   -- document_items.id original
  part_id       TEXT NOT NULL,           -- 'roof', 'front_door_rh', etc.
  part_label    TEXT NOT NULL,           -- 'ルーフ', etc.
  dent_count    INT NOT NULL DEFAULT 0,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed','issue')),
  notes         TEXT,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. work_order_events (timeline auditável) ────────────────────────────────

CREATE TABLE IF NOT EXISTS work_order_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  -- created | started | paused | resumed | item_started | item_completed | item_issue
  -- qc_submitted | qc_approved | qc_rejected | returned_to_repair
  -- ready_to_invoice | technician_added | technician_removed
  -- note_added | status_changed | cancelled
  user_id       UUID REFERENCES auth.users(id),
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. work_order_pauses ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_order_pauses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL DEFAULT 'other'
                CHECK (reason IN ('lunch','waiting_part','vehicle_unavailable','client','other')),
  reason_notes  TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,             -- NULL = pausa ativa
  created_by    UUID REFERENCES auth.users(id),
  ended_by      UUID REFERENCES auth.users(id)
);

-- ─── 6. quality_checks ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_checks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  reviewer_id   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  notes         TEXT,
  rejection_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 7. quality_check_items ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_check_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_check_id UUID NOT NULL REFERENCES quality_checks(id) ON DELETE CASCADE,
  check_key        TEXT NOT NULL,
  -- visual_finish | reflection | waviness | tool_marks | alignment
  -- disassembly | cleaning | final_photos | additional_damage | final_note
  result           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (result IN ('approved','rejected','na','pending')),
  notes            TEXT,
  sort_order       INT NOT NULL DEFAULT 0
);

-- ─── 8. work_order_photos (estrutura para Fase 2) ────────────────────────────

CREATE TABLE IF NOT EXISTS work_order_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  item_id       UUID REFERENCES work_order_items(id), -- painel opcional
  category      TEXT NOT NULL DEFAULT 'during'
                CHECK (category IN ('before','during','after','qc','additional_damage')),
  photo_url     TEXT,                    -- NULL até upload implementado
  storage_path  TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Triggers updated_at ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'work_orders_updated_at') THEN
    CREATE TRIGGER work_orders_updated_at
      BEFORE UPDATE ON work_orders
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'work_order_items_updated_at') THEN
    CREATE TRIGGER work_order_items_updated_at
      BEFORE UPDATE ON work_order_items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'quality_checks_updated_at') THEN
    CREATE TRIGGER quality_checks_updated_at
      BEFORE UPDATE ON quality_checks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── Índices ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wo_case         ON work_orders(case_id);
CREATE INDEX IF NOT EXISTS idx_wo_status       ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_wo_responsible  ON work_orders(responsible_technician_id);
CREATE INDEX IF NOT EXISTS idx_wo_techs_wo     ON work_order_technicians(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_items_wo     ON work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_events_wo    ON work_order_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_events_time  ON work_order_events(created_at);
CREATE INDEX IF NOT EXISTS idx_wo_pauses_wo    ON work_order_pauses(work_order_id);
CREATE INDEX IF NOT EXISTS idx_qc_wo           ON quality_checks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_qci_qc          ON quality_check_items(quality_check_id);
CREATE INDEX IF NOT EXISTS idx_wo_photos_wo    ON work_order_photos(work_order_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE work_orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_technicians  ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_pauses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_check_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_photos       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_orders' AND policyname='wo_auth') THEN
    CREATE POLICY "wo_auth" ON work_orders FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_order_technicians' AND policyname='wo_techs_auth') THEN
    CREATE POLICY "wo_techs_auth" ON work_order_technicians FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_order_items' AND policyname='wo_items_auth') THEN
    CREATE POLICY "wo_items_auth" ON work_order_items FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_order_events' AND policyname='wo_events_auth') THEN
    CREATE POLICY "wo_events_auth" ON work_order_events FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_order_pauses' AND policyname='wo_pauses_auth') THEN
    CREATE POLICY "wo_pauses_auth" ON work_order_pauses FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quality_checks' AND policyname='qc_auth') THEN
    CREATE POLICY "qc_auth" ON quality_checks FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quality_check_items' AND policyname='qci_auth') THEN
    CREATE POLICY "qci_auth" ON quality_check_items FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_order_photos' AND policyname='wo_photos_auth') THEN
    CREATE POLICY "wo_photos_auth" ON work_order_photos FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ─── View: OS com dados do caso ───────────────────────────────────────────────

CREATE OR REPLACE VIEW v_work_orders AS
SELECT
  wo.id,
  wo.wo_number,
  wo.status,
  wo.started_at,
  wo.finished_at,
  wo.qc_approved_at,
  wo.ready_to_invoice_at,
  wo.created_at,
  wo.updated_at,
  wo.case_id,
  c.case_number,
  c.type          AS case_type,
  c.total_amount,
  wo.document_id,
  wo.responsible_technician_id,
  t.name          AS responsible_name,
  c.customer_id,
  cu.name         AS customer_name,
  c.vehicle_id,
  v.make          AS vehicle_make,
  v.model         AS vehicle_model,
  v.year          AS vehicle_year,
  v.plate         AS vehicle_plate,
  -- contagem de painéis
  (SELECT COUNT(*) FROM work_order_items wi WHERE wi.work_order_id = wo.id) AS total_items,
  (SELECT COUNT(*) FROM work_order_items wi WHERE wi.work_order_id = wo.id AND wi.status = 'completed') AS completed_items,
  -- pausa ativa
  (SELECT COUNT(*) FROM work_order_pauses wp WHERE wp.work_order_id = wo.id AND wp.ended_at IS NULL) > 0 AS is_paused
FROM work_orders wo
JOIN cases     c  ON c.id  = wo.case_id
JOIN customers cu ON cu.id = c.customer_id
JOIN vehicles  v  ON v.id  = c.vehicle_id
LEFT JOIN technicians t ON t.id = wo.responsible_technician_id;

NOTIFY pgrst, 'reload schema';
