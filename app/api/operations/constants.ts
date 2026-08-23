// ─── Operations constants (sem 'use server') ─────────────────────────────────

export type OperationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
export type BudgetTypeDefault = 'individual' | 'batch'
export type MemberRole = 'pdr_tech' | 'inspector' | 'assembler' | 'supervisor' | 'financial' | 'admin'

export type Operation = {
  id: string
  name: string
  status: OperationStatus
  budget_type_default: BudgetTypeDefault
  workflow_template_id: string | null
  start_date: string | null
  end_date: string | null
  target_vehicle_count: number | null
  notes: string | null
  created_at: string
  updated_at: string
  customer_id: string | null
  customer_name: string | null
  total_cases: number
  completed_cases: number
  in_progress_cases: number
  pending_cases: number
  total_amount: number
  active_members: number
}

export type OperationMember = {
  id: string
  operation_id: string
  technician_id: string
  primary_function: MemberRole | null
  joined_at: string
  left_at: string | null
  technicians: { id: string; name: string; role: string | null } | null
  roles: MemberRole[]
}

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
