// ─── Workflow Engine constants (sem 'use server') ────────────────────────────

export type StepType =
  | 'reception'
  | 'disassembly'
  | 'repair'
  | 'inspection'
  | 'rework'
  | 'assembly'
  | 'wash'
  | 'polish'
  | 'paint'
  | 'parts'
  | 'finalization'
  | 'custom'

export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'
export type TaskPriority = 'urgent' | 'normal' | 'low'
export type FindingSeverity = 'minor' | 'major' | 'critical'

export type WorkflowTemplate = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type WorkflowStep = {
  id: string
  template_id: string
  name: string
  step_type: StepType
  sort_order: number
  responsible_role: string | null
  is_active: boolean
  auto_advance: boolean
  config: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type WorkflowTask = {
  id: string
  operation_id: string
  case_id: string
  work_order_id: string | null
  workflow_step_id: string
  task_type: string
  status: TaskStatus
  priority: TaskPriority
  round: number
  requested_at: string
  requested_by: string | null
  assigned_to: string | null
  started_at: string | null
  started_by: string | null
  finished_at: string | null
  finished_by: string | null
  notes: string | null
  payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type WorkflowTaskEvent = {
  id: string
  task_id: string
  event_type: string
  user_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export type InspectionFinding = {
  id: string
  task_id: string
  part_id: string
  part_label: string
  severity: FindingSeverity
  notes: string | null
  photo_url: string | null
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

// ─── Tipos das views ──────────────────────────────────────────────────────────

export type QueueItem = WorkflowTask & {
  step_name: string
  step_type: StepType
  step_order: number
  responsible_role: string | null
  case_number: string
  total_amount: number
  customer_name: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_plate: string
  assigned_name: string | null
  queue_position: number
  wait_minutes: number
  work_minutes: number | null
}

export type StepCount = {
  operation_id: string
  workflow_step_id: string
  step_name: string
  step_type: StepType
  step_order: number
  responsible_role: string | null
  queued_count: number
  in_progress_count: number
  completed_count: number
  skipped_count: number
  cancelled_count: number
  active_count: number
  total_count: number
  avg_wait_minutes: number | null
  avg_work_minutes: number | null
}

export type CaseWorkflowStatus = {
  case_id: string
  operation_id: string
  current_task_id: string
  current_step_name: string
  current_step_type: StepType
  task_status: TaskStatus
  round: number
  priority: TaskPriority
  requested_at: string
  started_at: string | null
  assigned_to: string | null
  assigned_name: string | null
  queue_position: number
}

// ─── Labels e cores ───────────────────────────────────────────────────────────

export const STEP_TYPE_LABEL: Record<StepType, string> = {
  reception:    'Recepção',
  disassembly:  'Desmontagem',
  repair:       'PDR / Reparo',
  inspection:   'Inspeção',
  rework:       'Repasse',
  assembly:     'Montagem',
  wash:         'Lavagem',
  polish:       'Polimento',
  paint:        'Pintura',
  parts:        'Troca de Peças',
  finalization: 'Finalização',
  custom:       'Personalizado',
}

export const STEP_TYPE_COLOR: Record<StepType, string> = {
  reception:    '#378ADD',
  disassembly:  '#FF6B00',
  repair:       '#1D9E75',
  inspection:   '#9B59B6',
  rework:       '#E24B4A',
  assembly:     '#FF6B00',
  wash:         '#378ADD',
  polish:       '#1D9E75',
  paint:        '#E67E22',
  parts:        '#95A5A6',
  finalization: '#1D9E75',
  custom:       '#555',
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  queued:      'Na fila',
  in_progress: 'Em andamento',
  completed:   'Concluída',
  skipped:     'Pulada',
  cancelled:   'Cancelada',
}

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  queued:      '#555',
  in_progress: '#FF6B00',
  completed:   '#1D9E75',
  skipped:     '#378ADD',
  cancelled:   '#E24B4A',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: 'Urgente',
  normal: 'Normal',
  low:    'Baixa',
}

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: '#E24B4A',
  normal: '#555',
  low:    '#378ADD',
}

export const FINDING_SEVERITY_LABEL: Record<FindingSeverity, string> = {
  minor:    'Leve',
  major:    'Médio',
  critical: 'Crítico',
}

export const FINDING_SEVERITY_COLOR: Record<FindingSeverity, string> = {
  minor:    '#FF6B00',
  major:    '#E67E22',
  critical: '#E24B4A',
}
