-- ============================================================
-- D'LEON ERP — Mobile Roles & Session State
-- Migration: 010_mobile_roles.sql
-- ============================================================

-- ─── 1. Ligar auth.users → technicians ───────────────────────────────────────
--   Um usuário do sistema pode estar vinculado a um técnico.
--   Permite que um técnico autenticado veja sua própria fila no mobile.

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS primary_role TEXT CHECK (primary_role IN (
    'pdr_tech','inspector','assembler','supervisor','financial','admin'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_technicians_user_id ON technicians(user_id)
  WHERE user_id IS NOT NULL;

-- ─── 2. Permissões especiais por técnico ─────────────────────────────────────
--   Separar papel operacional de permissões de gestão.
--   Supervisor com can_change_priority pode alterar prioridades.
--   Admin com can_manage_workflows pode editar templates.

CREATE TABLE IF NOT EXISTS technician_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id  UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  permission     TEXT NOT NULL CHECK (permission IN (
    'can_approve_qc',
    'can_change_priority',
    'can_reassign_tasks',
    'can_view_all_queues',
    'can_manage_workflows',
    'can_view_financial'
  )),
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by     UUID REFERENCES auth.users(id),
  UNIQUE (technician_id, permission)
);

-- ─── 3. Estado de sessão mobile por usuário ───────────────────────────────────
--   Guarda qual operação e qual função o usuário está ativo no mobile.
--   Atualizado quando o usuário troca de operação ou função.
--   RLS garante que cada usuário só lê/escreve o próprio estado.

CREATE TABLE IF NOT EXISTS user_session_state (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_technician_id  UUID REFERENCES technicians(id),
  active_operation_id   UUID REFERENCES operations(id),
  active_role           TEXT CHECK (active_role IN (
    'pdr_tech','inspector','assembler','supervisor','financial','admin'
  )),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. Trigger updated_at em user_session_state ─────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_session_state_updated_at') THEN
    CREATE TRIGGER user_session_state_updated_at
      BEFORE UPDATE ON user_session_state
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── 5. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tech_perms_technician ON technician_permissions(technician_id);
CREATE INDEX IF NOT EXISTS idx_session_operation     ON user_session_state(active_operation_id);

-- ─── 6. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE technician_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_session_state     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Qualquer autenticado pode ler/escrever permissões (admin gerencia pelo ERP)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='technician_permissions' AND policyname='tech_perms_auth') THEN
    CREATE POLICY "tech_perms_auth" ON technician_permissions FOR ALL TO authenticated USING (true);
  END IF;
  -- Cada usuário só acessa o próprio estado de sessão
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_session_state' AND policyname='session_own') THEN
    CREATE POLICY "session_own" ON user_session_state FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
