-- ============================================================
-- D'LEON ERP — Workflow Engine (Fase 2 das Operações)
-- Migration: 009_workflow_tasks.sql
-- ============================================================

-- ─── 1. workflow_templates ────────────────────────────────────────────────────
--   Templates reutilizáveis: "Daihatsu Hail", "Toyota Pátio", etc.
--   Cada operação seleciona um template → gera o fluxo de tasks para cada veículo.

CREATE TABLE IF NOT EXISTS workflow_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,              -- "Daihatsu Hail", "Toyota Pátio", "Cliente Individual"
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. workflow_steps ────────────────────────────────────────────────────────
--   Etapas ordenadas de um template.
--   Tipos permitem filas por função sem hardcode de nomes.

CREATE TABLE IF NOT EXISTS workflow_steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  -- "Desmontagem", "PDR", "Inspeção #1", "Repasse", "Montagem", etc.
  step_type           TEXT NOT NULL DEFAULT 'custom'
                      CHECK (step_type IN (
                        'reception',      -- recepção do veículo
                        'disassembly',    -- desmontagem
                        'repair',         -- PDR / reparo
                        'inspection',     -- inspeção de qualidade
                        'rework',         -- repasse (volta ao técnico)
                        'assembly',       -- montagem / remontagem
                        'wash',           -- lavagem
                        'polish',         -- polimento
                        'paint',          -- pintura
                        'parts',          -- troca de peças
                        'finalization',   -- finalização / entrega
                        'custom'          -- etapa livre
                      )),
  sort_order          INT NOT NULL DEFAULT 0,
  responsible_role    TEXT CHECK (responsible_role IN (
                        'pdr_tech','inspector','assembler',
                        'supervisor','financial','admin'
                      )),                  -- NULL = qualquer papel autorizado
  is_active           BOOLEAN NOT NULL DEFAULT true,
  auto_advance        BOOLEAN NOT NULL DEFAULT true,
  -- ao completar esta etapa, criar automaticamente a próxima task
  config              JSONB,               -- configurações extras por tipo
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. FK operations → workflow_templates ────────────────────────────────────
--   A coluna workflow_template_id já existe em operations (008_operations.sql).
--   Adicionamos agora a constraint de FK.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'operations_workflow_template_fk'
  ) THEN
    ALTER TABLE operations
      ADD CONSTRAINT operations_workflow_template_fk
      FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id);
  END IF;
END $$;

-- ─── 4. workflow_tasks ────────────────────────────────────────────────────────
--   Tarefas reais geradas para cada veículo (case) dentro de uma operação.
--   Uma task = "este carro precisa ser desmontado agora".
--
--   Fila calculada dinamicamente:
--     ORDER BY prioridade DESC, requested_at ASC
--   Rounds ilimitados para inspection ↔ rework.

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id       UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  case_id            UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  work_order_id      UUID REFERENCES work_orders(id),
  workflow_step_id   UUID NOT NULL REFERENCES workflow_steps(id),
  task_type          TEXT NOT NULL,
  -- copiado de workflow_steps.step_type na criação — facilita queries sem JOIN
  status             TEXT NOT NULL DEFAULT 'queued'
                     CHECK (status IN (
                       'queued',       -- aguardando na fila
                       'in_progress',  -- sendo executada
                       'completed',    -- concluída
                       'skipped',      -- pulada (step opcional)
                       'cancelled'     -- cancelada
                     )),
  priority           TEXT NOT NULL DEFAULT 'normal'
                     CHECK (priority IN ('urgent','normal','low')),
  round              INT NOT NULL DEFAULT 1,
  -- inspection/rework: incrementar a cada ciclo
  requested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  requested_by       UUID REFERENCES auth.users(id),
  assigned_to        UUID REFERENCES technicians(id),
  started_at         TIMESTAMPTZ,
  started_by         UUID REFERENCES auth.users(id),
  finished_at        TIMESTAMPTZ,
  finished_by        UUID REFERENCES auth.users(id),
  notes              TEXT,
  payload            JSONB,
  -- ex: { "inspection_result": "approved" | "rework_needed" }
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. workflow_task_events ──────────────────────────────────────────────────
--   Timeline auditável de cada tarefa.

CREATE TABLE IF NOT EXISTS workflow_task_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  -- queued | started | completed | skipped | cancelled
  -- assigned | priority_changed
  -- inspection_approved | inspection_failed
  -- rework_requested | rework_completed
  user_id     UUID REFERENCES auth.users(id),
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. inspection_findings ───────────────────────────────────────────────────
--   Registra quais painéis apresentaram problema durante uma inspeção.
--   Permite rastrear First Pass Rate, taxa por técnico, painel mais problemático.

CREATE TABLE IF NOT EXISTS inspection_findings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  -- task deve ser do tipo 'inspection'
  part_id     TEXT NOT NULL,           -- 'roof', 'front_door_rh', etc.
  part_label  TEXT NOT NULL,           -- 'ルーフ', 'フロントドアRH', etc.
  severity    TEXT NOT NULL DEFAULT 'minor'
              CHECK (severity IN ('minor','major','critical')),
  notes       TEXT,                    -- "ondulação na press line"
  photo_url   TEXT,                    -- futuramente (Fase 2)
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Triggers updated_at ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'workflow_templates_updated_at') THEN
    CREATE TRIGGER workflow_templates_updated_at
      BEFORE UPDATE ON workflow_templates
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'workflow_steps_updated_at') THEN
    CREATE TRIGGER workflow_steps_updated_at
      BEFORE UPDATE ON workflow_steps
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'workflow_tasks_updated_at') THEN
    CREATE TRIGGER workflow_tasks_updated_at
      BEFORE UPDATE ON workflow_tasks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── Índices ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wft_active        ON workflow_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_wfs_template      ON workflow_steps(template_id);
CREATE INDEX IF NOT EXISTS idx_wfs_sort          ON workflow_steps(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_wft_tasks_op      ON workflow_tasks(operation_id);
CREATE INDEX IF NOT EXISTS idx_wft_tasks_case    ON workflow_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_wft_tasks_wo      ON workflow_tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wft_tasks_step    ON workflow_tasks(workflow_step_id);
CREATE INDEX IF NOT EXISTS idx_wft_tasks_status  ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wft_tasks_type    ON workflow_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_wft_tasks_queue   ON workflow_tasks(workflow_step_id, status, priority, requested_at);
-- índice composto para calcular posição na fila eficientemente
CREATE INDEX IF NOT EXISTS idx_wft_events_task   ON workflow_task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_wft_events_time   ON workflow_task_events(created_at);
CREATE INDEX IF NOT EXISTS idx_insp_findings     ON inspection_findings(task_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE workflow_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_findings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workflow_templates' AND policyname='wft_auth') THEN
    CREATE POLICY "wft_auth" ON workflow_templates FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workflow_steps' AND policyname='wfs_auth') THEN
    CREATE POLICY "wfs_auth" ON workflow_steps FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workflow_tasks' AND policyname='wftask_auth') THEN
    CREATE POLICY "wftask_auth" ON workflow_tasks FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workflow_task_events' AND policyname='wfte_auth') THEN
    CREATE POLICY "wfte_auth" ON workflow_task_events FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inspection_findings' AND policyname='insp_auth') THEN
    CREATE POLICY "insp_auth" ON inspection_findings FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ─── View: fila dinâmica ──────────────────────────────────────────────────────
--   Posição calculada por step — sem queue_position armazenado.
--   Fórmula: urgent=1, normal=2, low=3 → requested_at ASC

CREATE OR REPLACE VIEW v_workflow_queue AS
SELECT
  wt.id,
  wt.operation_id,
  wt.case_id,
  wt.work_order_id,
  wt.workflow_step_id,
  ws.name            AS step_name,
  ws.step_type,
  ws.sort_order      AS step_order,
  ws.responsible_role,
  wt.task_type,
  wt.status,
  wt.priority,
  wt.round,
  wt.requested_at,
  wt.assigned_to,
  wt.started_at,
  wt.finished_at,
  wt.notes,
  wt.payload,
  -- caso
  c.case_number,
  c.total_amount,
  -- cliente
  cu.name            AS customer_name,
  -- veículo
  v.make             AS vehicle_make,
  v.model            AS vehicle_model,
  v.year             AS vehicle_year,
  v.plate            AS vehicle_plate,
  -- técnico atribuído
  tech.name          AS assigned_name,
  -- posição na fila (somente tasks queued por step)
  ROW_NUMBER() OVER (
    PARTITION BY wt.workflow_step_id
    ORDER BY
      CASE wt.priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      wt.requested_at ASC
  ) AS queue_position,
  -- tempo de espera em minutos (NULL se ainda não iniciada)
  CASE WHEN wt.started_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (wt.started_at - wt.requested_at)) / 60
    ELSE EXTRACT(EPOCH FROM (now() - wt.requested_at)) / 60
  END AS wait_minutes,
  -- tempo de execução em minutos (NULL se não concluída)
  CASE WHEN wt.started_at IS NOT NULL AND wt.finished_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (wt.finished_at - wt.started_at)) / 60
    ELSE NULL
  END AS work_minutes
FROM workflow_tasks wt
JOIN workflow_steps  ws ON ws.id  = wt.workflow_step_id
JOIN cases           c  ON c.id   = wt.case_id
JOIN customers       cu ON cu.id  = c.customer_id
JOIN vehicles        v  ON v.id   = c.vehicle_id
LEFT JOIN technicians tech ON tech.id = wt.assigned_to;

-- ─── View: contagem por etapa na operação ─────────────────────────────────────
--   Dashboard: Desmontagem 4 | PDR 11 | Inspeção 7 | Repasse 3 | Montagem 5

CREATE OR REPLACE VIEW v_operation_step_counts AS
SELECT
  wt.operation_id,
  wt.workflow_step_id,
  ws.name          AS step_name,
  ws.step_type,
  ws.sort_order    AS step_order,
  ws.responsible_role,
  -- por status
  COUNT(*) FILTER (WHERE wt.status = 'queued')      AS queued_count,
  COUNT(*) FILTER (WHERE wt.status = 'in_progress') AS in_progress_count,
  COUNT(*) FILTER (WHERE wt.status = 'completed')   AS completed_count,
  COUNT(*) FILTER (WHERE wt.status = 'skipped')     AS skipped_count,
  COUNT(*) FILTER (WHERE wt.status = 'cancelled')   AS cancelled_count,
  -- ativo = queued + in_progress
  COUNT(*) FILTER (WHERE wt.status IN ('queued','in_progress')) AS active_count,
  COUNT(*)                                           AS total_count,
  -- tempo médio de espera (tasks concluídas)
  AVG(
    CASE WHEN wt.started_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (wt.started_at - wt.requested_at)) / 60
    END
  )                                                  AS avg_wait_minutes,
  -- tempo médio de execução (tasks concluídas)
  AVG(
    CASE WHEN wt.started_at IS NOT NULL AND wt.finished_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (wt.finished_at - wt.started_at)) / 60
    END
  )                                                  AS avg_work_minutes
FROM workflow_tasks wt
JOIN workflow_steps ws ON ws.id = wt.workflow_step_id
GROUP BY wt.operation_id, wt.workflow_step_id, ws.name, ws.step_type, ws.sort_order, ws.responsible_role;

-- ─── View: estado atual de cada veículo na operação ──────────────────────────
--   Para o dashboard: onde está cada carro agora.

CREATE OR REPLACE VIEW v_case_workflow_status AS
SELECT DISTINCT ON (wt.case_id, wt.operation_id)
  wt.case_id,
  wt.operation_id,
  wt.id              AS current_task_id,
  ws.name            AS current_step_name,
  ws.step_type       AS current_step_type,
  wt.status          AS task_status,
  wt.round,
  wt.priority,
  wt.requested_at,
  wt.started_at,
  wt.assigned_to,
  tech.name          AS assigned_name,
  -- posição na fila para o step atual
  ROW_NUMBER() OVER (
    PARTITION BY wt.workflow_step_id
    ORDER BY
      CASE wt.priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
      wt.requested_at ASC
  ) AS queue_position
FROM workflow_tasks wt
JOIN workflow_steps  ws   ON ws.id   = wt.workflow_step_id
LEFT JOIN technicians tech ON tech.id = wt.assigned_to
WHERE wt.status IN ('queued','in_progress')
ORDER BY wt.case_id, wt.operation_id,
  CASE wt.status WHEN 'in_progress' THEN 1 ELSE 2 END,
  wt.requested_at DESC;

NOTIFY pgrst, 'reload schema';
