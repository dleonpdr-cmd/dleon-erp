'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Constants ────────────────────────────────────────────────────────────────

export const PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: '振込（銀行振込）',
  cash:          '現金',
  card:          'カード',
  insurance:     '保険会社',
  other:         'その他',
}

export const PAYMENT_ACCOUNTS = [
  'Rakuten PJ',
  'PayPay Bank',
  'MUFG',
  'Banco do Brasil',
  'Outro',
]

// ─── Types ────────────────────────────────────────────────────────────────────

export type Payment = {
  id:             string
  case_id:        string
  amount:         number
  paid_at:        string
  method:         string
  account:        string | null
  reference:      string | null
  notes:          string | null
  attachment_url: string | null
  status:         'confirmed' | 'cancelled'
  created_by:     string | null
  created_at:     string
  // joined
  profiles?: { email: string } | null
}

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStatus(total: number, received: number): PaymentStatus {
  if (received <= 0)         return 'pending'
  if (received >= total)     return 'paid'
  return 'partial'
}

// ─── getPaymentsForCase ───────────────────────────────────────────────────────

export async function getPaymentsForCase(caseId: string): Promise<{
  data: Payment[]
  received: number
  balance: number
  status: PaymentStatus
  total: number
}> {
  const supabase = await createSupabaseServerClient()

  const [caseRes, paymentsRes] = await Promise.all([
    supabase.from('cases').select('total_amount, payment_status').eq('id', caseId).single(),
    supabase.from('payments')
      .select('*')
      .eq('case_id', caseId)
      .order('paid_at', { ascending: false }),
  ])

  const total    = Number(caseRes.data?.total_amount ?? 0)
  const payments = paymentsRes.data ?? []
  const received = payments
    .filter(p => p.status === 'confirmed')
    .reduce((s, p) => s + Number(p.amount), 0)

  return {
    data:     payments,
    received,
    balance:  total - received,
    status:   computeStatus(total, received),
    total,
  }
}

// ─── createPayment ────────────────────────────────────────────────────────────

export async function createPayment(
  caseId: string,
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

  // Fetch current case
  const { data: caso } = await supabase
    .from('cases')
    .select('total_amount')
    .eq('id', caseId)
    .single()
  if (!caso) return { error: 'Caso não encontrado' }

  // Insert payment
  const { error: insertErr } = await supabase.from('payments').insert({
    case_id:    caseId,
    amount:     payload.amount,
    paid_at:    payload.paid_at,
    method:     payload.method,
    account:    payload.account   ?? null,
    reference:  payload.reference ?? null,
    notes:      payload.notes     ?? null,
    status:     'confirmed',
    created_by: user.id,
  })
  if (insertErr) return { error: insertErr.message }

  // Recalculate payment_status
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('case_id', caseId)
    .eq('status', 'confirmed')

  const received = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const total    = Number(caso.total_amount)
  const newStatus = computeStatus(total, received)

  await supabase.from('cases').update({ payment_status: newStatus }).eq('id', caseId)

  revalidatePath(`/cases/${caseId}`)
  revalidatePath('/pagamentos')
  return { error: null }
}

// ─── cancelPayment ────────────────────────────────────────────────────────────

export async function cancelPayment(
  paymentId: string,
  caseId:    string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Soft delete: mark as cancelled
  const { error } = await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('id', paymentId)
  if (error) return { error: error.message }

  // Recalculate payment_status
  const [caseRes, paymentsRes] = await Promise.all([
    supabase.from('cases').select('total_amount').eq('id', caseId).single(),
    supabase.from('payments').select('amount').eq('case_id', caseId).eq('status', 'confirmed'),
  ])

  const total    = Number(caseRes.data?.total_amount ?? 0)
  const received = (paymentsRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const newStatus = computeStatus(total, received)

  await supabase.from('cases').update({ payment_status: newStatus }).eq('id', caseId)

  revalidatePath(`/cases/${caseId}`)
  revalidatePath('/pagamentos')
  return { error: null }
}

// ─── getAllPaymentSummaries (for /pagamentos overview) ────────────────────────

export async function getAllPaymentSummaries() {
  const supabase = await createSupabaseServerClient()

  const { data: cases } = await supabase
    .from('cases')
    .select('id, case_number, total_amount, payment_status, customers(name)')
    .order('created_at', { ascending: false })

  const { data: payments } = await supabase
    .from('payments')
    .select('case_id, amount, status')
    .eq('status', 'confirmed')

  const byCase = new Map<string, number>()
  for (const p of payments ?? []) {
    byCase.set(p.case_id, (byCase.get(p.case_id) ?? 0) + Number(p.amount))
  }

  return (cases ?? []).map((c: any) => ({
    id:             c.id,
    case_number:    c.case_number,
    total_amount:   Number(c.total_amount ?? 0),
    received:       byCase.get(c.id) ?? 0,
    balance:        Number(c.total_amount ?? 0) - (byCase.get(c.id) ?? 0),
    payment_status: c.payment_status,
    customer_name:  c.customers?.name ?? '—',
  }))
}
