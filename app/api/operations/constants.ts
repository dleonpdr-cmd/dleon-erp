// ─── Operations constants (sem 'use server') ─────────────────────────────────

export type OperationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
export type BudgetTypeDefault = 'individual' | 'batch'
export type MemberRole = 'pdr_tech' | 'inspector' | 'assembler' | 'supervisor' | 'financial' | 'admin'

export const OP_STATUS_LABEL: Record<OperationStatus, string> = {
  draft:     'Rascunho',
  active:    'Ativa',
  paused:    'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

export const OP_STATUS_COLOR: Record<OperationStatus, string> = {
  draft:     '#555',
  active:    '#1D9E75',
  paused:    '#FF6B00',
  completed: '#378ADD',
  cancelled: '#E24B4A',
}

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  pdr_tech:   'Técnico PDR',
  inspector:  'Inspetor',
  assembler:  'Desmontador/Montador',
  supervisor: 'Supervisor',
  financial:  'Financeiro',
  admin:      'Administrador',
}
