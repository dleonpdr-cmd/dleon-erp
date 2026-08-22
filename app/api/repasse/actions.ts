'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepasseStatus = 'pending' | 'partial' | 'paid'

export type CommissionPayment = {
  id:             string
  split_id:       string
  amount:         number
  paid_at:        string
  method:         string | null
  account:        string | null
  reference:      string | null
  notes:          string | null
  attachment_url: string | null
  created_by:     string | null
  created_at:     string
}

export type SplitComRepasse = {
  id:          string
  name:        string
  block:       string
  amount:      number
  paid_amount: number
  status:      RepasseStatus
  pct:         number | null
  technician_id: string | null
  payments:    CommissionPayment[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeSplitStatus(amount: number, paid: number): RepasseStatus {
  if (paid <= 0)           return 'pending'
  if (paid >= amount)      return 'paid'
  return 'partial'
}

function computeCommissionStatus(splits: { amount: number; paid_amount: number }[]): string {
  const techSplits = splits.filter(s => s.amount > 0)
  if (techSplits.length === 0) return 'liberated'
  const totalDue  = techSplits.reduce((s, x) => s + x.amount, 0)
  const totalPaid = techSplits.reduce((s, x) => s + x.paid_amount, 0)
  if (totalPaid <= 0)          return 'pending_payment'
  if (totalPaid >= totalDue)   return 'paid'
  return 'partial'
}

// ─── getSplitsComRepasse — busca splits de uma comissão com pagamentos ────────

export async function getSplitsComRepasse(caseId: string): Promise<{
  commissionId:   string | null
  commissionStatus: string
  splits: SplitComRepasse[]
  error:  string | null
}> {
  const supabase = await createSupabaseServerClient()

  const { data: comm, error } = await supabase
    .from('commissions')
    .select('id, status, commission_splits(id, name, block, amount, paid_amount, status, pct, technician_id)')
    .eq('case_id', caseId)
    .single()

  if (error || !comm) return { commissionId: null, commissionStatus: 'calculated', splits: [], error: error?.message ?? 'Comissão não encontrada' }

  // Buscar pagamentos de cada split
  const splitIds = (comm.commission_splits ?? []).map((s: any) => s.id)
  const { data: payments } = splitIds.length
    ? await supabase.from('commission_payments').select('*').in('split_id', splitIds).order('paid_at', { ascending: false })
    : { data: [] }

  const paymentsBySplit = new Map<string, CommissionPayment[]>()
  for (const p of payments ?? []) {
    const list = paymentsBySplit.get(p.split_id) ?? []
    list.push(p as CommissionPayment)
    paymentsBySplit.set(p.split_id, list)
  }

  const splits: SplitComRepasse[] = (comm.commission_splits ?? []).map((s: any) => ({
    ...s,
    amount:      Number(s.amount),
    paid_amount: Number(s.paid_amount),
    payments:    paymentsBySplit.get(s.id) ?? [],
  }))

  return { commissionId: comm.id, commissionStatus: comm.status, splits, error: null }
}

// ─── solicitarLiberacao — closed → awaiting_liberation ───────────────────────

export async function solicitarLiberacao(caseId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: comm } = await supabase
    .from('commissions')
    .select('id, status')
    .eq('case_id', caseId)
    .single()

  if (!comm) return { error: 'Comissão não encontrada' }
  if (comm.status !== 'closed') return { error: `Status inválido para solicitar liberação: ${comm.status}` }

  const { error } = await supabase
    .from('commissions')
    .update({ status: 'awaiting_liberation', updated_at: new Date().toISOString() })
    .eq('id', comm.id)

  if (error) return { error: error.message }

  await supabase.from('commission_history').insert({
    commission_id: comm.id,
    event_type:    'awaiting_liberation',
    user_id:       user.id,
    payload:       { note: 'Comissão enviada para liberação' },
  })

  revalidatePath(`/commissions/${caseId}`)
  return { error: null }
}

// ─── liberarComissao — awaiting_liberation → liberated ───────────────────────

export async function liberarComissao(caseId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: comm } = await supabase
    .from('commissions')
    .select('id, status')
    .eq('case_id', caseId)
    .single()

  if (!comm) return { error: 'Comissão não encontrada' }
  if (comm.status !== 'awaiting_liberation') return { error: `Somente comissões em "Aguardando liberação" podem ser liberadas. Status atual: ${comm.status}` }

  const { error } = await supabase
    .from('commissions')
    .update({ status: 'liberated', updated_at: new Date().toISOString() })
    .eq('id', comm.id)

  if (error) return { error: error.message }

  await supabase.from('commission_history').insert({
    commission_id: comm.id,
    event_type:    'liberated',
    user_id:       user.id,
    payload:       { note: 'Comissão liberada para repasse' },
  })

  revalidatePath(`/commissions/${caseId}`)
  revalidatePath(`/repasse`)
  return { error: null }
}

// ─── registrarRepasse — insere commission_payment, recalcula status ───────────

export async function registrarRepasse(
  splitId: string,
  caseId:  string,
  payload: {
    amount:     number
    paid_at:    string
    method:     string
    account?:   string
    reference?: string
    notes?:     string
  }
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (!payload.amount || payload.amount <= 0) return { error: 'Valor inválido' }

  // Verificar split e comissão
  const { data: split } = await supabase
    .from('commission_splits')
    .select('id, amount, paid_amount, commission_id')
    .eq('id', splitId)
    .single()

  if (!split) return { error: 'Split não encontrado' }

  const { data: comm } = await supabase
    .from('commissions')
    .select('id, status')
    .eq('id', split.commission_id)
    .single()

  if (!comm) return { error: 'Comissão não encontrada' }
  if (!['liberated', 'pending_payment', 'partial'].includes(comm.status)) {
    return { error: 'Comissão não está liberada para repasse' }
  }

  // Inserir pagamento
  const { error: insertErr } = await supabase.from('commission_payments').insert({
    split_id:    splitId,
    amount:      payload.amount,
    paid_at:     payload.paid_at,
    method:      payload.method,
    account:     payload.account   ?? null,
    reference:   payload.reference ?? null,
    notes:       payload.notes     ?? null,
    created_by:  user.id,
  })
  if (insertErr) return { error: insertErr.message }

  // Recalcular paid_amount do split
  const { data: allPayments } = await supabase
    .from('commission_payments')
    .select('amount')
    .eq('split_id', splitId)

  const newPaid = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const splitTotal = Number(split.amount)
  const newSplitStatus = computeSplitStatus(splitTotal, newPaid)

  await supabase
    .from('commission_splits')
    .update({ paid_amount: newPaid, status: newSplitStatus, updated_at: new Date().toISOString() })
    .eq('id', splitId)

  // Recalcular status global da comissão a partir de todos os splits técnicos
  const { data: allSplits } = await supabase
    .from('commission_splits')
    .select('amount, paid_amount')
    .eq('commission_id', comm.id)
    .eq('block', 'technicians')

  const newCommStatus = computeCommissionStatus(
    (allSplits ?? []).map(s => ({ amount: Number(s.amount), paid_amount: Number(s.paid_amount) }))
  )

  await supabase
    .from('commissions')
    .update({ status: newCommStatus, updated_at: new Date().toISOString() })
    .eq('id', comm.id)

  // Registrar histórico
  await supabase.from('commission_history').insert({
    commission_id: comm.id,
    event_type:    'repasse_registered',
    user_id:       user.id,
    payload:       {
      split_id:  splitId,
      amount:    payload.amount,
      method:    payload.method,
      new_status: newCommStatus,
    },
  })

  revalidatePath(`/commissions/${caseId}`)
  revalidatePath('/repasse')
  return { error: null }
}

// ─── getHistoricoComissao ─────────────────────────────────────────────────────

export async function getHistoricoComissao(caseId: string): Promise<{
  history: { id: string; event_type: string; payload: any; created_at: string; user_id: string | null }[]
  error:   string | null
}> {
  const supabase = await createSupabaseServerClient()

  const { data: comm } = await supabase
    .from('commissions')
    .select('id')
    .eq('case_id', caseId)
    .single()

  if (!comm) return { history: [], error: null }

  const { data: history, error } = await supabase
    .from('commission_history')
    .select('id, event_type, payload, created_at, user_id')
    .eq('commission_id', comm.id)
    .order('created_at', { ascending: true })

  return { history: history ?? [], error: error?.message ?? null }
}

// ─── getTechnicianKpis ────────────────────────────────────────────────────────

export async function getTechnicianKpis(technicianId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('v_technician_kpis')
    .select('*')
    .eq('technician_id', technicianId)
    .single()

  return data ?? null
}

// ─── getTechnicianTimeline ────────────────────────────────────────────────────

export async function getTechnicianTimeline(technicianId: string) {
  const supabase = await createSupabaseServerClient()

  const { data } = await supabase
    .from('commission_splits')
    .select(`
      id, amount, paid_amount, status,
      commissions!inner(
        id, status,
        cases!inner(id, case_number, total_amount, created_at, customers(name), vehicles(make, model))
      )
    `)
    .eq('technician_id', technicianId)
    .eq('block', 'technicians')
    .order('created_at', { ascending: false })
    .limit(50)

  return (data ?? []).map((s: any) => ({
    splitId:        s.id,
    amount:         Number(s.amount),
    paid_amount:    Number(s.paid_amount),
    status:         s.status as RepasseStatus,
    commissionId:   s.commissions?.id,
    commissionStatus: s.commissions?.status,
    caseId:         s.commissions?.cases?.id,
    caseNumber:     s.commissions?.cases?.case_number,
    caseTotal:      Number(s.commissions?.cases?.total_amount ?? 0),
    createdAt:      s.commissions?.cases?.created_at,
    customerName:   s.commissions?.cases?.customers?.name ?? '—',
    vehicle:        s.commissions?.cases?.vehicles
      ? `${s.commissions.cases.vehicles.make} ${s.commissions.cases.vehicles.model}`
      : '—',
  }))
}

// ─── getTechnicianPayments ────────────────────────────────────────────────────

export async function getTechnicianPayments(technicianId: string) {
  const supabase = await createSupabaseServerClient()

  // commission_payments via commission_splits → technician_id
  const { data } = await supabase
    .from('commission_payments')
    .select(`
      id, amount, paid_at, method, account, reference, notes, attachment_url, created_by, created_at,
      commission_splits!inner(technician_id, commissions!inner(case_id, cases!inner(case_number)))
    `)
    .eq('commission_splits.technician_id', technicianId)
    .order('paid_at', { ascending: false })
    .limit(100)

  return (data ?? []).map((p: any) => ({
    id:            p.id,
    amount:        Number(p.amount),
    paid_at:       p.paid_at,
    method:        p.method,
    account:       p.account,
    reference:     p.reference,
    notes:         p.notes,
    attachment_url: p.attachment_url,
    created_by:    p.created_by,
    created_at:    p.created_at,
    caseNumber:    p.commission_splits?.commissions?.cases?.case_number ?? '—',
    caseId:        p.commission_splits?.commissions?.case_id,
  }))
}

// ─── getMonthlyKpis ───────────────────────────────────────────────────────────

export async function getMonthlyKpis(technicianId: string) {
  const supabase = await createSupabaseServerClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('commission_splits')
    .select(`
      amount,
      commissions!inner(
        cases!inner(total_amount, created_at)
      )
    `)
    .eq('technician_id', technicianId)
    .eq('block', 'technicians')
    .gte('commissions.cases.created_at', startOfMonth.toISOString())

  const items = data ?? []
  const count = items.length
  const revenue = items.reduce((s: number, x: any) => s + Number(x.commissions?.cases?.total_amount ?? 0), 0)
  const commission = items.reduce((s: number, x: any) => s + Number(x.amount), 0)

  return {
    cases:      count,
    revenue,
    commission,
    avgTicket:  count > 0 ? Math.round(revenue / count) : 0,
  }
}
