'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { QC_CHECKS } from './constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WOStatus =
  | 'waiting' | 'in_progress' | 'paused' | 'waiting_qc'
  | 'qc_rejected' | 'completed' | 'ready_to_invoice' | 'cancelled'

export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'issue'

export type WorkOrderItem = {
  id: string
  work_order_id: string
  source_item_id: string | null
  part_id: string
  part_label: string
  dent_count: number
  unit_price: number
  subtotal: number
  sort_order: number
  status: ItemStatus
  notes: string | null
  completed_at: string | null
}

export type WorkOrderTechnician = {
  id: string
  work_order_id: string
  technician_id: string
  role: 'lead' | 'assistant'
  added_at: string
  removed_at: string | null
  technicians: { id: string; name: string; role: string | null } | null
}

export type WorkOrderPause = {
  id: string
  reason: string
  reason_notes: string | null
  started_at: string
  ended_at: string | null
}

export type WorkOrderEvent = {
  id: string
  event_type: string
  user_id: string | null
  payload: any
  created_at: string
}

export type QualityCheck = {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  reviewer_id: string | null
  reviewed_at: string | null
  notes: string | null
  rejection_reason: string | null
  items: { check_key: string; result: string; notes: string | null; sort_order: number }[]
}

export type WorkOrder = {
  id: string
  wo_number: string
  case_id: string
  document_id: string | null
  status: WOStatus
  responsible_technician_id: string | null
  items_snapshot: any
  notes: string | null
  notes_client: string | null
  notes_qc: string | null
  started_at: string | null
  finished_at: string | null
  qc_approved_at: string | null
  ready_to_invoice_at: string | null
  invoice_document_id: string | null
  created_at: string
  updated_at: string
  // joined
  items: WorkOrderItem[]
  technicians: WorkOrderTechnician[]
  pauses: WorkOrderPause[]
  events: WorkOrderEvent[]
  quality_check: QualityCheck | null
  // case data
  case: {
    case_number: string
    total_amount: number
    customer: { name: string; phone: string | null }
    vehicle: { make: string; model: string; year: number; plate: string }
  } | null
  responsible: { id: string; name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logEvent(
  supabase: any,
  workOrderId: string,
  eventType: string,
  userId: string,
  payload: object = {}
) {
  await supabase.from('work_order_events').insert({
    work_order_id: workOrderId,
    event_type: eventType,
    user_id: userId,
    payload,
  })
}

function computeWorkedMinutes(
  startedAt: string | null,
  finishedAt: string | null,
  pauses: WorkOrderPause[]
): number {
  if (!startedAt) return 0
  const end = finishedAt ? new Date(finishedAt) : new Date()
  const total = (end.getTime() - new Date(startedAt).getTime()) / 60000
  const pausedMin = pauses.reduce((acc, p) => {
    const ps = new Date(p.started_at).getTime()
    const pe = p.ended_at ? new Date(p.ended_at).getTime() : Date.now()
    return acc + (pe - ps) / 60000
  }, 0)
  return Math.max(0, Math.round(total - pausedMin))
}


// ─── getWorkOrder ─────────────────────────────────────────────────────────────

export async function getWorkOrder(workOrderId: string): Promise<WorkOrder | null> {
  const supabase = await createSupabaseServerClient()

  const { data: wo } = await supabase
    .from('work_orders')
    .select(`
      *,
      cases!inner(case_number, total_amount,
        customers(name, phone),
        vehicles(make, model, year, plate)
      )
    `)
    .eq('id', workOrderId)
    .single()

  if (!wo) return null

  const [itemsRes, techsRes, pausesRes, eventsRes, qcRes, responsibleRes] = await Promise.all([
    supabase.from('work_order_items').select('*').eq('work_order_id', workOrderId).order('sort_order'),
    supabase.from('work_order_technicians').select('*, technicians(id, name, role)').eq('work_order_id', workOrderId).is('removed_at', null),
    supabase.from('work_order_pauses').select('*').eq('work_order_id', workOrderId).order('started_at'),
    supabase.from('work_order_events').select('*').eq('work_order_id', workOrderId).order('created_at'),
    supabase.from('quality_checks').select('*, quality_check_items(*)').eq('work_order_id', workOrderId).order('created_at', { ascending: false }).limit(1),
    wo.responsible_technician_id
      ? supabase.from('technicians').select('id, name').eq('id', wo.responsible_technician_id).single()
      : Promise.resolve({ data: null }),
  ])

  const qc = qcRes.data?.[0] ?? null

  return {
    ...wo,
    items: itemsRes.data ?? [],
    technicians: techsRes.data ?? [],
    pauses: pausesRes.data ?? [],
    events: eventsRes.data ?? [],
    quality_check: qc ? { ...qc, items: qc.quality_check_items ?? [] } : null,
    case: wo.cases ? {
      case_number: wo.cases.case_number,
      total_amount: Number(wo.cases.total_amount),
      customer: wo.cases.customers,
      vehicle: wo.cases.vehicles,
    } : null,
    responsible: responsibleRes.data ?? null,
  }
}

// ─── getWorkOrderByCaseId ─────────────────────────────────────────────────────

export async function getWorkOrderByCaseId(caseId: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('work_orders')
    .select('id, wo_number, status, started_at, responsible_technician_id')
    .eq('case_id', caseId)
    .single()
  return data ?? null
}

// ─── listWorkOrders ───────────────────────────────────────────────────────────

export async function listWorkOrders(filters?: {
  status?: string
  technician_id?: string
}) {
  const supabase = await createSupabaseServerClient()

  let q = supabase
    .from('v_work_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status)       q = q.eq('status', filters.status)
  if (filters?.technician_id) q = q.eq('responsible_technician_id', filters.technician_id)

  const { data } = await q
  return data ?? []
}

// ─── createWorkOrder ──────────────────────────────────────────────────────────

export async function createWorkOrder(
  caseId: string,
  payload: {
    documentId?: string
    responsibleTechnicianId?: string
    notes?: string
  }
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: null, error: 'Não autenticado' }

  // Verificar que não existe OS já
  const { data: existing } = await supabase
    .from('work_orders')
    .select('id')
    .eq('case_id', caseId)
    .not('status', 'eq', 'cancelled')
    .single()
  if (existing) return { id: null, error: 'Já existe uma OS para este caso' }

  // Gerar número da OS
  const { count } = await supabase
    .from('work_orders')
    .select('*', { count: 'exact', head: true })
  const year = new Date().getFullYear()
  const seq  = String((count ?? 0) + 1).padStart(6, '0')
  const woNumber = `OS-${year}-${seq}`

  // Buscar itens do documento aprovado para snapshot
  let itemsSnapshot: any[] = []
  if (payload.documentId) {
    const { data: docItems } = await supabase
      .from('document_items')
      .select('*')
      .eq('document_id', payload.documentId)
      .order('sort_order')
    itemsSnapshot = docItems ?? []
  }

  // Criar OS
  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      wo_number:                  woNumber,
      case_id:                    caseId,
      document_id:                payload.documentId ?? null,
      status:                     'waiting',
      responsible_technician_id:  payload.responsibleTechnicianId ?? null,
      items_snapshot:             itemsSnapshot,
      notes:                      payload.notes ?? null,
      created_by:                 user.id,
    })
    .select('id')
    .single()

  if (error || !wo) return { id: null, error: error?.message ?? 'Erro ao criar OS' }

  // Criar work_order_items a partir do snapshot
  if (itemsSnapshot.length > 0) {
    const items = itemsSnapshot
      .filter((it: any) => it.section === 'pdr' || it.item_type === 'pdr_repair')
      .map((it: any, i: number) => ({
        work_order_id:  wo.id,
        source_item_id: it.id ?? null,
        part_id:        it.part_id ?? '',
        part_label:     it.part_label ?? it.part_id ?? '',
        dent_count:     it.dent_count ?? 0,
        unit_price:     Number(it.unit_price ?? 0),
        subtotal:       Number(it.subtotal ?? 0),
        sort_order:     i,
        status:         'pending',
      }))
    if (items.length > 0) {
      await supabase.from('work_order_items').insert(items)
    }
  }

  // Adicionar técnico responsável como lead
  if (payload.responsibleTechnicianId) {
    await supabase.from('work_order_technicians').insert({
      work_order_id: wo.id,
      technician_id: payload.responsibleTechnicianId,
      role: 'lead',
      added_by: user.id,
    })
  }

  await logEvent(supabase, wo.id, 'created', user.id, { wo_number: woNumber, case_id: caseId })

  revalidatePath(`/cases/${caseId}`)
  revalidatePath('/work-orders')
  return { id: wo.id, error: null }
}

// ─── startRepair ──────────────────────────────────────────────────────────────

export async function startRepair(workOrderId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: wo } = await supabase.from('work_orders').select('status, started_at, case_id').eq('id', workOrderId).single()
  if (!wo) return { error: 'OS não encontrada' }
  if (!['waiting', 'paused'].includes(wo.status)) return { error: `Não é possível iniciar OS com status ${wo.status}` }

  const now = new Date().toISOString()

  // Se estava pausada, encerrar pausa ativa
  if (wo.status === 'paused') {
    await supabase
      .from('work_order_pauses')
      .update({ ended_at: now, ended_by: user.id })
      .eq('work_order_id', workOrderId)
      .is('ended_at', null)
    await logEvent(supabase, workOrderId, 'resumed', user.id, {})
  } else {
    await logEvent(supabase, workOrderId, 'started', user.id, {})
  }

  await supabase.from('work_orders').update({
    status: 'in_progress',
    started_at: wo.started_at ?? now,
    updated_at: now,
  }).eq('id', workOrderId)

  revalidatePath(`/work-orders/${workOrderId}`)
  revalidatePath(`/cases/${wo.case_id}`)
  return { error: null }
}

// ─── pauseRepair ──────────────────────────────────────────────────────────────

export async function pauseRepair(
  workOrderId: string,
  reason: string,
  reasonNotes?: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: wo } = await supabase.from('work_orders').select('status, case_id').eq('id', workOrderId).single()
  if (!wo) return { error: 'OS não encontrada' }
  if (wo.status !== 'in_progress') return { error: 'Só é possível pausar OS em andamento' }

  const now = new Date().toISOString()

  await supabase.from('work_order_pauses').insert({
    work_order_id: workOrderId,
    reason,
    reason_notes: reasonNotes ?? null,
    started_at: now,
    created_by: user.id,
  })

  await supabase.from('work_orders').update({ status: 'paused', updated_at: now }).eq('id', workOrderId)
  await logEvent(supabase, workOrderId, 'paused', user.id, { reason, reason_notes: reasonNotes })

  revalidatePath(`/work-orders/${workOrderId}`)
  revalidatePath(`/cases/${wo.case_id}`)
  return { error: null }
}

// ─── updateItemStatus ─────────────────────────────────────────────────────────

export async function updateItemStatus(
  itemId: string,
  workOrderId: string,
  status: ItemStatus,
  notes?: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const now = new Date().toISOString()
  const { data: item } = await supabase.from('work_order_items').select('part_label').eq('id', itemId).single()

  await supabase.from('work_order_items').update({
    status,
    notes: notes ?? null,
    completed_at: status === 'completed' ? now : null,
    completed_by: status === 'completed' ? user.id : null,
    updated_at: now,
  }).eq('id', itemId)

  const eventType = status === 'completed' ? 'item_completed' : status === 'issue' ? 'item_issue' : 'item_started'
  await logEvent(supabase, workOrderId, eventType, user.id, { item_id: itemId, part_label: item?.part_label, status })

  revalidatePath(`/work-orders/${workOrderId}`)
  return { error: null }
}

// ─── finishRepair ─────────────────────────────────────────────────────────────

export async function finishRepair(workOrderId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: wo } = await supabase.from('work_orders').select('status, case_id').eq('id', workOrderId).single()
  if (!wo) return { error: 'OS não encontrada' }
  if (wo.status !== 'in_progress') return { error: 'Somente OS em andamento pode ser finalizada' }

  // Verificar se há painéis com issue ou pending (aviso, não bloqueio na fase 1)
  const { data: items } = await supabase.from('work_order_items').select('status').eq('work_order_id', workOrderId)
  const pending = (items ?? []).filter(i => i.status === 'pending').length
  if (pending > 0) return { error: `${pending} painel(is) ainda pendente(s). Conclua ou marque como issue antes de finalizar.` }

  const now = new Date().toISOString()
  await supabase.from('work_orders').update({ status: 'waiting_qc', finished_at: now, updated_at: now }).eq('id', workOrderId)

  // Criar QC pendente com checklist
  const { data: qc } = await supabase.from('quality_checks').insert({
    work_order_id: workOrderId,
    status: 'pending',
  }).select('id').single()

  if (qc) {
    const qcItems = QC_CHECKS.map((c, i) => ({
      quality_check_id: qc.id,
      check_key: c.key,
      result: 'pending',
      sort_order: i,
    }))
    await supabase.from('quality_check_items').insert(qcItems)
  }

  await logEvent(supabase, workOrderId, 'qc_submitted', user.id, { finished_at: now })

  revalidatePath(`/work-orders/${workOrderId}`)
  revalidatePath(`/cases/${wo.case_id}`)
  return { error: null }
}

// ─── submitQC ─────────────────────────────────────────────────────────────────

export async function submitQC(
  workOrderId: string,
  qcId: string,
  items: { check_key: string; result: string; notes?: string }[],
  approved: boolean,
  rejectionReason?: string,
  notes?: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: wo } = await supabase.from('work_orders').select('status, case_id').eq('id', workOrderId).single()
  if (!wo) return { error: 'OS não encontrada' }
  if (wo.status !== 'waiting_qc') return { error: 'QC só pode ser submetido em OS aguardando QC' }
  if (!approved && !rejectionReason) return { error: 'Motivo da reprovação é obrigatório' }

  const now = new Date().toISOString()
  const newWoStatus = approved ? 'completed' : 'qc_rejected'
  const qcStatus    = approved ? 'approved' : 'rejected'

  // Atualizar itens do QC
  for (const item of items) {
    await supabase.from('quality_check_items')
      .update({ result: item.result, notes: item.notes ?? null })
      .eq('quality_check_id', qcId)
      .eq('check_key', item.check_key)
  }

  // Atualizar QC
  await supabase.from('quality_checks').update({
    status: qcStatus,
    reviewer_id: user.id,
    reviewed_at: now,
    notes: notes ?? null,
    rejection_reason: rejectionReason ?? null,
    updated_at: now,
  }).eq('id', qcId)

  // Atualizar OS
  await supabase.from('work_orders').update({
    status: newWoStatus,
    qc_approved_at: approved ? now : null,
    updated_at: now,
  }).eq('id', workOrderId)

  await logEvent(supabase, workOrderId, approved ? 'qc_approved' : 'qc_rejected', user.id, {
    qc_id: qcId,
    rejection_reason: rejectionReason,
  })

  revalidatePath(`/work-orders/${workOrderId}`)
  revalidatePath(`/cases/${wo.case_id}`)
  return { error: null }
}

// ─── returnToRepair ───────────────────────────────────────────────────────────

export async function returnToRepair(workOrderId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: wo } = await supabase.from('work_orders').select('status, case_id').eq('id', workOrderId).single()
  if (!wo) return { error: 'OS não encontrada' }
  if (wo.status !== 'qc_rejected') return { error: 'Somente OS reprovada no QC pode retornar para reparo' }

  const now = new Date().toISOString()
  await supabase.from('work_orders').update({ status: 'in_progress', finished_at: null, updated_at: now }).eq('id', workOrderId)
  await logEvent(supabase, workOrderId, 'returned_to_repair', user.id, {})

  // Resetar painéis com issue para pending
  await supabase.from('work_order_items').update({ status: 'pending', completed_at: null }).eq('work_order_id', workOrderId).eq('status', 'issue')

  revalidatePath(`/work-orders/${workOrderId}`)
  revalidatePath(`/cases/${wo.case_id}`)
  return { error: null }
}

// ─── markReadyToInvoice ───────────────────────────────────────────────────────

export async function markReadyToInvoice(workOrderId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: wo } = await supabase.from('work_orders').select('status, qc_approved_at, case_id').eq('id', workOrderId).single()
  if (!wo) return { error: 'OS não encontrada' }
  if (wo.status !== 'completed') return { error: 'Somente OS concluída pode ser marcada para faturar' }
  if (!wo.qc_approved_at) return { error: 'QC não foi aprovado. Não é possível faturar sem QC aprovado.' }

  const now = new Date().toISOString()
  await supabase.from('work_orders').update({ status: 'ready_to_invoice', ready_to_invoice_at: now, updated_at: now }).eq('id', workOrderId)
  await logEvent(supabase, workOrderId, 'ready_to_invoice', user.id, {})

  revalidatePath(`/work-orders/${workOrderId}`)
  revalidatePath(`/cases/${wo.case_id}`)
  revalidatePath('/work-orders')
  return { error: null }
}

// ─── addTechnician ────────────────────────────────────────────────────────────

export async function addTechnician(
  workOrderId: string,
  technicianId: string,
  role: 'lead' | 'assistant' = 'assistant'
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: tech } = await supabase.from('technicians').select('name').eq('id', technicianId).single()
  const { error } = await supabase.from('work_order_technicians').upsert({
    work_order_id: workOrderId,
    technician_id: technicianId,
    role,
    added_by: user.id,
    removed_at: null,
  }, { onConflict: 'work_order_id,technician_id' })

  if (error) return { error: error.message }
  await logEvent(supabase, workOrderId, 'technician_added', user.id, { technician_id: technicianId, name: tech?.name, role })

  revalidatePath(`/work-orders/${workOrderId}`)
  return { error: null }
}

