-- ============================================================
-- D'LEON ERP — Mobile Estimates
-- Migration: 011_mobile_estimates.sql
-- ============================================================
-- Verificações executadas em 2026-08-26:
-- • documents: sem CHECK constraints → adição direta segura
-- • document_items: sem CHECK constraints → adição direta segura
-- • document_items: price_modified_by/at/note já existem ✓
-- • documents.case_id: nullable ✓ → batch pode ter case_id = NULL
-- • tabela_precos.nivel: 'Leve', 'Médio', 'Grave' ✓
-- • set_updated_at(): confirmada como existente ✓
-- • estimate_vehicles: não existe → CREATE limpo
-- • technician_permissions constraint: technician_permissions_permission_check
-- ============================================================

-- ─── 1. documents — novas colunas ─────────────────────────────────────────────

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS operation_id  UUID REFERENCES operations(id),
  ADD COLUMN IF NOT EXISTS estimate_type TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by  UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by   UUID REFERENCES auth.users(id);

-- CHECK em estimate_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'documents'::regclass
      AND contype = 'c'
      AND conname = 'documents_estimate_type_check'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_estimate_type_check
      CHECK (estimate_type IN ('individual', 'batch'));
  END IF;
END $$;

-- CHECK em approval_status
-- Sem constraint existente → adição direta
-- Preserva 'pending' (único valor em uso em produção, confirmado 2026-08-26)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'documents'::regclass
      AND contype = 'c'
      AND conname = 'documents_approval_status_check'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_approval_status_check
      CHECK (approval_status IN (
        'pending',             -- legado admin (valor único em produção)
        'not_required',        -- admin novos (emissão direta, sem revisão)
        'draft',               -- mobile: rascunho não submetido
        'submitted',           -- mobile: enviado para revisão
        'revision_requested',  -- supervisor/admin: solicita correção
        'approved',            -- aprovado para emissão
        'rejected'             -- rejeitado definitivamente
      ));
  END IF;
END $$;

-- ─── 2. document_items — novas colunas ────────────────────────────────────────
-- NOTA: price_modified_by, price_modified_at, price_modification_note JÁ EXISTEM ✓
-- Esses campos cobrem o audit trail de override de preço (can_override_estimate_price)

ALTER TABLE document_items
  ADD COLUMN IF NOT EXISTS damage_level        TEXT,
  ADD COLUMN IF NOT EXISTS material            TEXT,
  ADD COLUMN IF NOT EXISTS press_line          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimate_vehicle_id UUID;
  -- FK adicionada após criação de estimate_vehicles (seção 4)

-- CHECK em damage_level — espelha exatamente tabela_precos.nivel (confirmado 2026-08-26)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'document_items'::regclass
      AND contype = 'c'
      AND conname = 'document_items_damage_level_check'
  ) THEN
    ALTER TABLE document_items
      ADD CONSTRAINT document_items_damage_level_check
      CHECK (damage_level IN ('Leve', 'Médio', 'Grave'));
  END IF;
END $$;

-- CHECK em material
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'document_items'::regclass
      AND contype = 'c'
      AND conname = 'document_items_material_check'
  ) THEN
    ALTER TABLE document_items
      ADD CONSTRAINT document_items_material_check
      CHECK (material IN ('steel', 'aluminum', 'plastic'));
  END IF;
END $$;

-- ─── 3. estimate_vehicles — nova tabela ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS estimate_vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Referências opcionais (nullable — veículo pode não estar cadastrado ainda)
  case_id     UUID REFERENCES cases(id),
  vehicle_id  UUID REFERENCES vehicles(id),

  -- Snapshot imutável do veículo no momento do orçamento
  -- Alterações posteriores em vehicles/cases não afetam este registro
  make        TEXT,
  model       TEXT,
  year        INT,
  plate       TEXT,
  vin         TEXT,
  color       TEXT,

  -- Precificação do lote
  amount      NUMERIC(12, 2),
  notes       TEXT,
  sort_order  INT NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. FK document_items → estimate_vehicles ─────────────────────────────────
-- Nullable: individual = NULL, batch detalhado = <id do veículo>
-- ON DELETE SET NULL: remoção de estimate_vehicle não quebra os itens

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'document_items'::regclass
      AND contype = 'f'
      AND conname = 'fk_doc_items_estimate_vehicle'
  ) THEN
    ALTER TABLE document_items
      ADD CONSTRAINT fk_doc_items_estimate_vehicle
        FOREIGN KEY (estimate_vehicle_id)
        REFERENCES estimate_vehicles(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 5. technician_permissions — expandir CHECK ───────────────────────────────
-- Nome confirmado: technician_permissions_permission_check
-- Valores em uso: 'can_approve_qc', 'can_view_all_queues' (outros no CHECK mas não em dados)

ALTER TABLE technician_permissions
  DROP CONSTRAINT IF EXISTS technician_permissions_permission_check;

ALTER TABLE technician_permissions
  ADD CONSTRAINT technician_permissions_permission_check
  CHECK (permission IN (
    -- existentes (preservados integralmente)
    'can_approve_qc',
    'can_change_priority',
    'can_reassign_tasks',
    'can_view_all_queues',
    'can_manage_workflows',
    'can_view_financial',
    -- novas — orçamento mobile
    'can_create_individual_estimate',
    'can_create_batch_estimate',
    'can_override_estimate_price',
    'can_approve_estimate',
    'can_issue_estimate'
  ));

-- ─── 6. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_operation      ON documents(operation_id);
CREATE INDEX IF NOT EXISTS idx_documents_estimate_type  ON documents(estimate_type);
CREATE INDEX IF NOT EXISTS idx_documents_approval       ON documents(approval_status);
CREATE INDEX IF NOT EXISTS idx_estimate_vehicles_doc    ON estimate_vehicles(document_id);
CREATE INDEX IF NOT EXISTS idx_estimate_vehicles_case   ON estimate_vehicles(case_id);

-- ─── 7. RLS — estimate_vehicles ───────────────────────────────────────────────
-- Padrão confirmado do projeto: FOR ALL TO authenticated USING (true)
-- Autorização real feita nas Server Actions (mesma arquitetura de documents/document_items)

ALTER TABLE estimate_vehicles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estimate_vehicles'
      AND policyname = 'estimate_vehicles_auth'
  ) THEN
    CREATE POLICY "estimate_vehicles_auth"
      ON estimate_vehicles FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ─── 8. Trigger updated_at ────────────────────────────────────────────────────
-- set_updated_at() confirmada como existente ✓

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'estimate_vehicles_updated_at'
  ) THEN
    CREATE TRIGGER estimate_vehicles_updated_at
      BEFORE UPDATE ON estimate_vehicles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
