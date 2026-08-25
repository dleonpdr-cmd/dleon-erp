// ─── Roles ────────────────────────────────────────────────────────────────────

export type OperationalRole =
  | 'pdr_tech'
  | 'inspector'
  | 'assembler'
  | 'supervisor'
  | 'financial'
  | 'admin'

export const ROLE_LABEL: Record<OperationalRole, string> = {
  pdr_tech:   'Técnico PDR',
  inspector:  'Inspetor',
  assembler:  'Desmontador / Montador',
  supervisor: 'Supervisor',
  financial:  'Financeiro',
  admin:      'Administrador',
}

export const ROLE_COLOR: Record<OperationalRole, string> = {
  pdr_tech:   '#FF6B00',
  inspector:  '#9B59B6',
  assembler:  '#3498DB',
  supervisor: '#F39C12',
  financial:  '#1D9E75',
  admin:      '#E74C3C',
}

export const ALL_ROLES: OperationalRole[] = [
  'pdr_tech', 'inspector', 'assembler', 'supervisor', 'financial', 'admin',
]

// ─── Permissions ─────────────────────────────────────────────────────────────

export type TechnicianPermission =
  | 'can_approve_qc'
  | 'can_change_priority'
  | 'can_reassign_tasks'
  | 'can_view_all_queues'
  | 'can_manage_workflows'
  | 'can_view_financial'

export const PERMISSION_LABEL: Record<TechnicianPermission, string> = {
  can_approve_qc:        'Aprovar inspeção final',
  can_change_priority:   'Alterar prioridade de tarefas',
  can_reassign_tasks:    'Reatribuir tarefas',
  can_view_all_queues:   'Ver filas de todas as funções',
  can_manage_workflows:  'Gerenciar templates de workflow',
  can_view_financial:    'Ver dados financeiros',
}

export const ALL_PERMISSIONS: TechnicianPermission[] = [
  'can_approve_qc',
  'can_change_priority',
  'can_reassign_tasks',
  'can_view_all_queues',
  'can_manage_workflows',
  'can_view_financial',
]

// ─── Types ────────────────────────────────────────────────────────────────────

export type TechnicianWithRoles = {
  id: string
  name: string
  role: string | null
  primary_role: OperationalRole | null
  active: boolean
  user_id: string | null
  permissions: TechnicianPermission[]
  // operações vinculadas
  operations: {
    operation_id: string
    operation_name: string
    primary_function: OperationalRole | null
    roles: OperationalRole[]
    member_id: string
  }[]
}

export type UserSessionState = {
  user_id: string
  active_technician_id: string | null
  active_operation_id: string | null
  active_role: OperationalRole | null
  updated_at: string
}
