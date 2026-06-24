// ============================================================
// D'LEON ERP — Server Actions: Módulo de Pagamentos
// ============================================================
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  Fatura, FaturaInput, Comissao, ComissaoInput,
  ResumoPagamentos, OsParaFaturar
} from '@/types/pagamentos'

// ── Helpers ──────────────────────────────────────────────────

function gerarNumeroFatura(seq: number): string {
  return `F-${String(seq).padStart(4, '0')}`
}

// ── Faturas ──────────────────────────────────────────────────

export async function listarFaturas(filtros?: {
  status?: string
  cliente_id?: string
  mes?: string
}): Promise<Fatura[]> {
  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('faturas')
    .select('*, clientes(nome, email)')
    .order('data_emissao', { ascending: false })

  if (filtros?.status)     query = query.eq('status', filtros.status)
  if (filtros?.cliente_id) query = query.eq('cliente_id', filtros.cliente_id)
  if (filtros?.mes) {
    const inicio = filtros.mes + '-01'
    const fim    = new Date(filtros.mes + '-01')
    fim.setMonth(fim.getMonth() + 1)
    query = query.gte('data_emissao', inicio)
                 .lt('data_emissao', fim.toISOString().slice(0, 10))
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Fatura[]
}

export async function buscarFatura(id: string): Promise<Fatura | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('faturas')
    .select('*, clientes(nome, email)')
    .eq('id', id)
    .single()
  if (error) return null
  return data as Fatura
}

export async function criarFatura(input: FaturaInput): Promise<Fatura> {
  const supabase = await createSupabaseServerClient()

  // Gerar número sequencial
  const { count } = await supabase
    .from('faturas').select('*', { count: 'exact', head: true })
  const numero = gerarNumeroFatura((count ?? 0) + 1)

  const { data, error } = await supabase
    .from('faturas')
    .insert({ ...input, numero, status: 'aberta' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/pagamentos')
  return data as Fatura
}

export async function marcarFaturaPaga(
  id: string,
  data_pagamento: string,
  metodo_pagamento?: string
): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('faturas')
    .update({ status: 'pago', data_pagamento, metodo_pagamento })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/pagamentos')
}

export async function cancelarFatura(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('faturas')
    .update({ status: 'cancelado' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/pagamentos')
}

// ── Comissões ─────────────────────────────────────────────────

export async function listarComissoes(filtros?: {
  tecnico_id?: string
  mes?: string
  status?: string
}): Promise<Comissao[]> {
  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('comissoes')
    .select('*, tecnicos(nome)')
    .order('mes_referencia', { ascending: false })

  if (filtros?.tecnico_id) query = query.eq('tecnico_id', filtros.tecnico_id)
  if (filtros?.status)     query = query.eq('status', filtros.status)
  if (filtros?.mes)        query = query.eq('mes_referencia', filtros.mes + '-01')

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Comissao[]
}

export async function criarComissao(input: ComissaoInput): Promise<Comissao> {
  const supabase = await createSupabaseServerClient()
  const payload = {
    ...input,
    mes_referencia: input.mes_referencia + '-01',
    percentual: input.percentual ?? 20,
    status: 'pendente',
  }
  const { data, error } = await supabase
    .from('comissoes').insert(payload).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/pagamentos')
  return data as Comissao
}

export async function marcarComissaoPaga(
  id: string,
  data_pagamento: string
): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('comissoes')
    .update({ status: 'pago', data_pagamento })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/pagamentos')
}

// ── OS para faturar ───────────────────────────────────────────

export async function listarOsParaFaturar(): Promise<OsParaFaturar[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('v_os_para_faturar')
    .select('*')
  if (error) throw new Error(error.message)
  return data as OsParaFaturar[]
}

// ── Resumo mensal ─────────────────────────────────────────────

export async function resumoPagamentos(
  meses?: number
): Promise<ResumoPagamentos[]> {
  const supabase = await createSupabaseServerClient()
  let query = supabase.from('v_resumo_pagamentos').select('*')
  if (meses) query = query.limit(meses)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as ResumoPagamentos[]
}
