'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommissionBlock = {
  block: 'supplier' | 'dleon' | 'technicians'
  pct: number
  amount: number
}

export type CommissionSplit = {
  id: string
  commission_id: string
  block: 'supplier' | 'dleon' | 'technicians'
  technician_id: string | null
  name: string
  split_mode: 'pct' | 'fixed'
  pct: number | null
  amount: number
  paid_amount: number
  status: 'pending' | 'partial' | 'paid'
  sort_order: number
}

export type Commission = {
  id: string
  case_id: string
  rule_id: string | null
  status: 'calculated' | 'reviewed' | 'closed' | 'pending_payment' | 'partial' | 'paid'
  total_amount: number
  snapshot: any
  closed_at: string | null
  created_at: string
  blocks: CommissionBlock[]
  splits: CommissionSplit[]
}

// ─── Buscar ou calcular comissão do caso ──────────────────────────────────────

export async function getOrCreateCommission(caseId: string): Promise<{ data: Commission | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()

  // Tentar buscar existente
  const { data: existing } = await supabase
    .from('commissions')
    .select('*, commission_blocks(*), commission_splits(*)')
    .eq('case_id', caseId)
    .single()

  if (existing) {
    return {
      data: {
        ...existing,
        blocks: existing.commission_blocks ?? [],
        splits: existing.commission_splits ?? [],
      },
      error: null,
    }
  }

  // Não existe → calcular automaticamente
  return calculateCommission(caseId)
}

// ─── Calcular comissão (cria ou recalcula) ────────────────────────────────────

export async function calculateCommission(caseId: string): Promise<{ data: Commission | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado' }

  // Buscar caso + cliente
  const { data: caso } = await supabase
    .from('cases')
    .select('*, customers(id, pct_supplier, pct_dleon, pct_technicians)')
    .eq('id', caseId)
    .single()
  if (!caso) return { data: null, error: 'Caso não encontrado' }

  const totalAmount = Number(caso.total_amount ?? 0)

  // Buscar regra aplicável
  // Prioridade: 1) regra específica do cliente, 2) regra por case_type, 3) padrão global
  let ruleBlocks: Array<{ block: string; pct: number }> = []
  let ruleId: string | null = null

  const { data: customerRule } = await supabase
    .from('commission_rules')
    .select('*')
    .eq('customer_id', caso.customer_id)
    .limit(1)
    .single()

  if (customerRule) {
    ruleId = customerRule.id
    ruleBlocks = customerRule.blocks
  } else {
    // Tentar por case_type, senão usar percentuais do cliente, senão padrão global
    const { data: typeRule } = await supabase
      .from('commission_rules')
      .select('*')
      .eq('case_type', caso.type ?? 'private')
      .is('customer_id', null)
      .limit(1)
      .single()

    if (typeRule) {
      ruleId = typeRule.id
      ruleBlocks = typeRule.blocks
    } else if (caso.customers?.pct_dleon != null) {
      // Fallback: percentuais do cadastro do cliente
      ruleBlocks = [
        { block: 'supplier', pct: caso.customers.pct_supplier ?? 0 },
        { block: 'dleon', pct: caso.customers.pct_dleon ?? 20 },
        { block: 'technicians', pct: caso.customers.pct_technicians ?? 80 },
      ]
    } else {
      // Padrão: 20% D'LEON, 80% técnicos
      ruleBlocks = [
        { block: 'dleon', pct: 20 },
        { block: 'technicians', pct: 80 },
      ]
    }
  }

  // Verificar se já existe comissão → atualizar; senão criar
  const { data: existing } = await supabase
    .from('commissions')
    .select('id')
    .eq('case_id', caseId)
    .single()

  let commissionId: string

  if (existing) {
    commissionId = existing.id
    await supabase.from('commissions').update({
      rule_id: ruleId,
      total_amount: totalAmount,
      status: 'calculated',
      updated_at: new Date().toISOString(),
    }).eq('id', commissionId)
    // Recriar blocos
    await supabase.from('commission_blocks').delete().eq('commission_id', commissionId)
  } else {
    const { data: newComm, error: commErr } = await supabase
      .from('commissions')
      .insert({ case_id: caseId, rule_id: ruleId, total_amount: totalAmount, status: 'calculated' })
      .select()
      .single()
    if (commErr || !newComm) return { data: null, error: commErr?.message ?? 'Erro ao criar comissão' }
    commissionId = newComm.id
  }

  // Inserir blocos
  const blockRows = ruleBlocks
    .filter(b => b.pct > 0)
    .map(b => ({
      commission_id: commissionId,
      block: b.block,
      pct: b.pct,
      amount: Math.round(totalAmount * b.pct) / 100,
    }))
  await supabase.from('commission_blocks').insert(blockRows)

  // Registrar histórico
  await supabase.from('commission_history').insert({
    commission_id: commissionId,
    event_type: existing ? 'recalculated' : 'created',
    user_id: user.id,
    payload: { total_amount: totalAmount, blocks: blockRows },
  })

  revalidatePath(`/commissions/${caseId}`)
  return getOrCreateCommission(caseId)
}

// ─── Atualizar split de técnico ───────────────────────────────────────────────

export async function upsertSplit(
  commissionId: string,
  caseId: string,
  split: Partial<CommissionSplit> & { id?: string }
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  let oldSplit: any = null
  if (split.id) {
    const { data } = await supabase.from('commission_splits').select('*').eq('id', split.id).single()
    oldSplit = data
  }

  if (split.id) {
    const { error } = await supabase.from('commission_splits').update({
      name: split.name,
      technician_id: split.technician_id,
      split_mode: split.split_mode,
      pct: split.pct,
      amount: split.amount,
      sort_order: split.sort_order,
      updated_at: new Date().toISOString(),
    }).eq('id', split.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('commission_splits').insert({
      commission_id: commissionId,
      block: split.block,
      technician_id: split.technician_id ?? null,
      name: split.name ?? 'Novo',
      split_mode: split.split_mode ?? 'pct',
      pct: split.pct ?? null,
      amount: split.amount ?? 0,
      sort_order: split.sort_order ?? 0,
    })
    if (error) return { error: error.message }
  }

  // Histórico
  await supabase.from('commission_history').insert({
    commission_id: commissionId,
    event_type: 'split_changed',
    user_id: user.id,
    payload: {
      name: split.name,
      old_pct: oldSplit?.pct,
      new_pct: split.pct,
      old_amount: oldSplit?.amount,
      new_amount: split.amount,
    },
  })

  revalidatePath(`/commissions/${caseId}`)
  return { error: null }
}

// ─── Remover split ────────────────────────────────────────────────────────────

export async function deleteSplit(splitId: string, commissionId: string, caseId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: split } = await supabase.from('commission_splits').select('name').eq('id', splitId).single()
  const { error } = await supabase.from('commission_splits').delete().eq('id', splitId)
  if (error) return { error: error.message }

  await supabase.from('commission_history').insert({
    commission_id: commissionId,
    event_type: 'split_removed',
    user_id: user.id,
    payload: { name: split?.name },
  })

  revalidatePath(`/commissions/${caseId}`)
  return { error: null }
}

// ─── Avançar status da comissão ───────────────────────────────────────────────

export async function advanceCommissionStatus(
  commissionId: string,
  caseId: string,
  nextStatus: Commission['status']
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const update: any = { status: nextStatus, updated_at: new Date().toISOString() }
  if (nextStatus === 'closed') {
    // Salvar snapshot completo
    const { data: comm } = await supabase
      .from('commissions')
      .select('*, commission_blocks(*), commission_splits(*)')
      .eq('id', commissionId)
      .single()
    update.snapshot = comm
    update.closed_at = new Date().toISOString()
    update.closed_by = user.id
  }

  const { error } = await supabase.from('commissions').update(update).eq('id', commissionId)
  if (error) return { error: error.message }

  await supabase.from('commission_history').insert({
    commission_id: commissionId,
    event_type: 'status_changed',
    user_id: user.id,
    payload: { status: nextStatus },
  })

  revalidatePath(`/commissions/${caseId}`)
  return { error: null }
}

// ─── Registrar pagamento ──────────────────────────────────────────────────────

export async function registerPayment(
  splitId: string,
  commissionId: string,
  caseId: string,
  payment: { amount: number; method: string; account?: string; notes?: string }
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Buscar split atual
  const { data: split } = await supabase
    .from('commission_splits')
    .select('amount, paid_amount')
    .eq('id', splitId)
    .single()
  if (!split) return { error: 'Split não encontrado' }

  const newPaid = Number(split.paid_amount) + Number(payment.amount)
  const newStatus = newPaid >= Number(split.amount) ? 'paid' : newPaid > 0 ? 'partial' : 'pending'

  // Registrar pagamento
  const { error: payErr } = await supabase.from('commission_payments').insert({
    split_id: splitId,
    amount: payment.amount,
    method: payment.method,
    account: payment.account ?? null,
    notes: payment.notes ?? null,
    created_by: user.id,
  })
  if (payErr) return { error: payErr.message }

  // Atualizar split
  await supabase.from('commission_splits').update({
    paid_amount: newPaid,
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', splitId)

  // Verificar se toda a comissão está paga
  const { data: allSplits } = await supabase
    .from('commission_splits')
    .select('id, status')
    .eq('commission_id', commissionId)
  const allPaid = allSplits?.every(s => s.id === splitId ? newStatus === 'paid' : s.status === 'paid')
  const anyPartial = allSplits?.some(s => s.id === splitId ? newStatus !== 'pending' : s.status !== 'pending')

  if (allPaid) {
    await supabase.from('commissions').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', commissionId)
  } else if (anyPartial) {
    await supabase.from('commissions').update({ status: 'partial', updated_at: new Date().toISOString() }).eq('id', commissionId)
  }

  // Histórico
  await supabase.from('commission_history').insert({
    commission_id: commissionId,
    event_type: 'payment',
    user_id: user.id,
    payload: { split_id: splitId, amount: payment.amount, method: payment.method, new_status: newStatus },
  })

  revalidatePath(`/commissions/${caseId}`)
  return { error: null }
}
