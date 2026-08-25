'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowTask,
  WorkflowTaskEvent,
  InspectionFinding,
  QueueItem,
  StepCount,
  CaseWorkflowStatus,
  TaskPriority,
  StepType,
  FindingSeverity,
} from './constants'

// ─── Templates ───────────────────────────────────────────────────────────────

export async function getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) { console.error(error); return [] }
  return (data ?? []) as WorkflowTemplate[]
}

export async function getWorkflowTemplate(id: string): Promise<WorkflowTemplate | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('workflow_templates')
    .select('*')
    .eq('id', id)
    .single()
  return (data as WorkflowTemplate) ?? null
}

export async function createWorkflowTemplate(payload: {
  name: string
  description?: string
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase
    .from('workflow_templates')
    .insert([{
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      created_by: user.id,
    }])
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/workflow-templates')
  return { id: data.id }
}

export async function updateWorkflowTemplate(
  id: string,
  payload: Partial<{ name: string; description: string | null; is_active: boolean }>
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('workflow_templates')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/workflow-templates')
  revalidatePath(`/workflow-templates/${id}`)
  return {}
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function getWorkflowSteps(templateId: string): Promise<WorkflowStep[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('template_id', templateId)
    .eq('is_active', true)
    .order('sort_order')
  if (error) { console.error(error); return [] }
  return (data ?? []) as WorkflowStep[]
}

export async function createWorkflowStep(payload: {
  template_id: string
  name: string
  step_type: StepType
  sort_order: number
  responsible_role?: string | null
  auto_advance?: boolean
  config?: Record<string, unknown> | null
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('workflow_steps')
    .insert([{
      template_id: payload.template_id,
      name: payload.name.trim(),
      step_type: payload.step_type,
      sort_order: payload.sort_order,
      responsible_role: payload.responsible_role ?? null,
      auto_advance: payload.auto_advance ?? true,
      config: payload.config ?? null,
    }])
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/workflow-templates/${payload.template_id}`)
  return { id: data.id }
}

export async function updateWorkflowStep(
  id: string,
  templateId: string,
  payload: Partial<{
    name: string
    step_type: StepType
    sort_order: number
    responsible_role: string | null
    auto_advance: boolean
    is_active: boolean
    config: Record<string, unknown> | null
  }>
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('workflow_steps')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/workflow-templates/${templateId}`)
  return {}
}

export async function reorderSteps(
  templateId: string,
  steps: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  for (const s of steps) {
    await supabase
      .from('workflow_steps')
      .update({ sort_order: s.sort_order, updated_at: new Date().toISOString() })
      .eq('id', s.id)
  }
  revalidatePath(`/workflow-templates/${templateId}`)
  return {}
}

export async function deleteWorkflowStep(id: string, templateId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('workflow_steps')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/workflow-templates/${templateId}`)
  return {}
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function createWorkflowTask(payload: {
  operation_id: string
  case_id: string
  work_order_id?: string | null
  workflow_step_id: string
  task_type: string
  priority?: TaskPriority
  round?: number
  notes?: string | null
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase
    .from('workflow_tasks')
    .insert([{
      operation_id: payload.operation_id,
      case_id: payload.case_id,
      work_order_id: payload.work_order_id ?? null,
      workflow_step_id: payload.workflow_step_id,
      task_type: payload.task_type,
      priority: payload.priority ?? 'normal',
      round: payload.round ?? 1,
      notes: payload.notes ?? null,
      status: 'queued',
      requested_by: user.id,
    }])
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/operations/${payload.operation_id}`)
  return { id: data.id }
}

// Iniciar task (queued → in_progress)
export async function startTask(taskId: string, operationId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('workflow_tasks')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      started_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'queued')

  if (error) return { error: error.message }

  await supabase.from('workflow_task_events').insert([{
    task_id: taskId,
    event_type: 'started',
    user_id: user.id,
  }])

  revalidatePath(`/operations/${operationId}`)
  return {}
}

// Concluir task (in_progress → completed) + avança automaticamente para próxima etapa
export async function completeTask(
  taskId: string,
  operationId: string,
  opts?: { notes?: string; payload?: Record<string, unknown>; advanceToStepId?: string }
): Promise<{ nextTaskId?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Busca task atual
  const { data: task } = await supabase
    .from('workflow_tasks')
    .select('*, workflow_steps(*)')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task não encontrada' }

  const now = new Date().toISOString()

  // Conclui a task
  const { error } = await supabase
    .from('workflow_tasks')
    .update({
      status: 'completed',
      finished_at: now,
      finished_by: user.id,
      notes: opts?.notes ?? task.notes,
      payload: opts?.payload ? { ...(task.payload ?? {}), ...opts.payload } : task.payload,
      updated_at: now,
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  await supabase.from('workflow_task_events').insert([{
    task_id: taskId,
    event_type: 'completed',
    user_id: user.id,
    payload: opts?.payload ?? null,
  }])

  // Auto-advance: cria próxima task se advanceToStepId fornecido
  let nextTaskId: string | undefined
  if (opts?.advanceToStepId) {
    const { data: nextStep } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('id', opts.advanceToStepId)
      .single()

    if (nextStep) {
      const { data: nextTask } = await supabase
        .from('workflow_tasks')
        .insert([{
          operation_id: task.operation_id,
          case_id: task.case_id,
          work_order_id: task.work_order_id,
          workflow_step_id: opts.advanceToStepId,
          task_type: nextStep.step_type,
          priority: task.priority,
          round: task.round,
          status: 'queued',
          requested_by: user.id,
        }])
        .select('id')
        .single()

      nextTaskId = nextTask?.id
    }
  }

  revalidatePath(`/operations/${operationId}`)
  return { nextTaskId }
}

// Pular etapa (queued → skipped)
export async function skipTask(taskId: string, operationId: string, notes?: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('workflow_tasks')
    .update({
      status: 'skipped',
      finished_at: new Date().toISOString(),
      finished_by: user.id,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  await supabase.from('workflow_task_events').insert([{
    task_id: taskId,
    event_type: 'skipped',
    user_id: user.id,
    payload: notes ? { notes } : null,
  }])

  revalidatePath(`/operations/${operationId}`)
  return {}
}

// Cancelar task
export async function cancelTask(taskId: string, operationId: string, reason?: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('workflow_tasks')
    .update({
      status: 'cancelled',
      finished_at: new Date().toISOString(),
      finished_by: user.id,
      notes: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  await supabase.from('workflow_task_events').insert([{
    task_id: taskId,
    event_type: 'cancelled',
    user_id: user.id,
    payload: reason ? { reason } : null,
  }])

  revalidatePath(`/operations/${operationId}`)
  return {}
}

// Atribuir técnico
export async function assignTask(taskId: string, technicianId: string | null, operationId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('workflow_tasks')
    .update({ assigned_to: technicianId, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }

  await supabase.from('workflow_task_events').insert([{
    task_id: taskId,
    event_type: 'assigned',
    user_id: user.id,
    payload: { technician_id: technicianId },
  }])

  revalidatePath(`/operations/${operationId}`)
  return {}
}

// Alterar prioridade
export async function changeTaskPriority(taskId: string, priority: TaskPriority, operationId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('workflow_tasks')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }

  await supabase.from('workflow_task_events').insert([{
    task_id: taskId,
    event_type: 'priority_changed',
    user_id: user.id,
    payload: { priority },
  }])

  revalidatePath(`/operations/${operationId}`)
  return {}
}

// ─── Inspeção com findings ────────────────────────────────────────────────────
//   Resultado: 'approved' → avança para próxima etapa
//              'rework_needed' → cria task de repasse + nova inspeção subsequente

export async function submitInspection(
  taskId: string,
  operationId: string,
  result: 'approved' | 'rework_needed',
  findings: Array<{
    part_id: string
    part_label: string
    severity: FindingSeverity
    notes?: string
  }>,
  opts?: {
    reworkStepId?: string       // step de repasse
    nextInspectionStepId?: string // step de inspeção seguinte
    nextStepAfterApproval?: string // step após aprovação (ex: montagem)
    notes?: string
  }
): Promise<{ reworkTaskId?: string; inspectionTaskId?: string; nextTaskId?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Busca a task atual
  const { data: task } = await supabase
    .from('workflow_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task não encontrada' }

  const now = new Date().toISOString()

  // Salva os findings
  if (findings.length > 0) {
    await supabase.from('inspection_findings').insert(
      findings.map(f => ({
        task_id: taskId,
        part_id: f.part_id,
        part_label: f.part_label,
        severity: f.severity,
        notes: f.notes ?? null,
      }))
    )
  }

  // Conclui a task de inspeção
  await supabase.from('workflow_tasks').update({
    status: 'completed',
    finished_at: now,
    finished_by: user.id,
    notes: opts?.notes ?? null,
    payload: { inspection_result: result, findings_count: findings.length },
    updated_at: now,
  }).eq('id', taskId)

  await supabase.from('workflow_task_events').insert([{
    task_id: taskId,
    event_type: result === 'approved' ? 'inspection_approved' : 'inspection_failed',
    user_id: user.id,
    payload: { result, findings_count: findings.length },
  }])

  let reworkTaskId: string | undefined
  let inspectionTaskId: string | undefined
  let nextTaskId: string | undefined

  if (result === 'rework_needed' && opts?.reworkStepId) {
    // Cria task de repasse
    const { data: reworkTask } = await supabase
      .from('workflow_tasks')
      .insert([{
        operation_id: task.operation_id,
        case_id: task.case_id,
        work_order_id: task.work_order_id,
        workflow_step_id: opts.reworkStepId,
        task_type: 'rework',
        priority: task.priority,
        round: task.round,
        status: 'queued',
        requested_by: user.id,
      }])
      .select('id')
      .single()
    reworkTaskId = reworkTask?.id

    // Cria próxima inspeção (round + 1)
    if (opts.nextInspectionStepId) {
      const { data: inspTask } = await supabase
        .from('workflow_tasks')
        .insert([{
          operation_id: task.operation_id,
          case_id: task.case_id,
          work_order_id: task.work_order_id,
          workflow_step_id: opts.nextInspectionStepId,
          task_type: 'inspection',
          priority: task.priority,
          round: task.round + 1,
          status: 'queued',
          requested_by: user.id,
        }])
        .select('id')
        .single()
      inspectionTaskId = inspTask?.id
    }
  } else if (result === 'approved' && opts?.nextStepAfterApproval) {
    // Avança para próxima etapa (ex: montagem)
    const { data: nextStep } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('id', opts.nextStepAfterApproval)
      .single()

    if (nextStep) {
      const { data: nextTask } = await supabase
        .from('workflow_tasks')
        .insert([{
          operation_id: task.operation_id,
          case_id: task.case_id,
          work_order_id: task.work_order_id,
          workflow_step_id: opts.nextStepAfterApproval,
          task_type: nextStep.step_type,
          priority: task.priority,
          round: task.round,
          status: 'queued',
          requested_by: user.id,
        }])
        .select('id')
        .single()
      nextTaskId = nextTask?.id
    }
  }

  revalidatePath(`/operations/${operationId}`)
  return { reworkTaskId, inspectionTaskId, nextTaskId }
}

// ─── Iniciar workflow completo para um caso ───────────────────────────────────
//   Dado um templateId, cria a primeira task do template para o case

export async function startCaseWorkflow(
  operationId: string,
  caseId: string,
  templateId: string,
  workOrderId?: string | null,
  priority?: TaskPriority
): Promise<{ taskId?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Busca o primeiro step do template
  const { data: firstStep } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('template_id', templateId)
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .single()

  if (!firstStep) return { error: 'Template não possui etapas ativas' }

  // Verifica se já existe task ativa para este case/operation
  const { data: existing } = await supabase
    .from('workflow_tasks')
    .select('id')
    .eq('case_id', caseId)
    .eq('operation_id', operationId)
    .in('status', ['queued', 'in_progress'])
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'Este caso já possui tarefas ativas no workflow' }
  }

  const { data: newTask } = await supabase
    .from('workflow_tasks')
    .insert([{
      operation_id: operationId,
      case_id: caseId,
      work_order_id: workOrderId ?? null,
      workflow_step_id: firstStep.id,
      task_type: firstStep.step_type,
      priority: priority ?? 'normal',
      status: 'queued',
      requested_by: user.id,
    }])
    .select('id')
    .single()

  revalidatePath(`/operations/${operationId}`)
  return { taskId: newTask?.id }
}

// ─── Queries / views ──────────────────────────────────────────────────────────

export async function getQueueByStep(stepId: string, operationId?: string): Promise<QueueItem[]> {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('v_workflow_queue')
    .select('*')
    .eq('workflow_step_id', stepId)
    .in('status', ['queued', 'in_progress'])
    .order('queue_position')

  if (operationId) query = query.eq('operation_id', operationId)

  const { data, error } = await query
  if (error) { console.error(error); return [] }
  return (data ?? []) as QueueItem[]
}

export async function getOperationStepCounts(operationId: string): Promise<StepCount[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('v_operation_step_counts')
    .select('*')
    .eq('operation_id', operationId)
    .order('step_order')
  if (error) { console.error(error); return [] }
  return (data ?? []) as StepCount[]
}

export async function getCaseWorkflowStatus(caseId: string, operationId: string): Promise<CaseWorkflowStatus | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('v_case_workflow_status')
    .select('*')
    .eq('case_id', caseId)
    .eq('operation_id', operationId)
    .single()
  return (data as CaseWorkflowStatus) ?? null
}

export async function getTasksByCase(caseId: string, operationId: string): Promise<WorkflowTask[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('workflow_tasks')
    .select('*')
    .eq('case_id', caseId)
    .eq('operation_id', operationId)
    .order('created_at')
  if (error) { console.error(error); return [] }
  return (data ?? []) as WorkflowTask[]
}

export async function getTaskEvents(taskId: string): Promise<WorkflowTaskEvent[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('workflow_task_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at')
  if (error) { console.error(error); return [] }
  return (data ?? []) as WorkflowTaskEvent[]
}

export async function getInspectionFindings(taskId: string): Promise<InspectionFinding[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('inspection_findings')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at')
  if (error) { console.error(error); return [] }
  return (data ?? []) as InspectionFinding[]
}
