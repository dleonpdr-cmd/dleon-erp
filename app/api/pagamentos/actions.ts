'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function marcarFaturaPaga(id: string, data_pagamento: string, metodo_pagamento?: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('faturas').update({ status: 'pago', data_pagamento, metodo_pagamento }).eq('id', id)
  revalidatePath('/pagamentos')
  return { error: error?.message ?? null }
}

export async function marcarComissaoPaga(id: string, data_pagamento: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('comissoes').update({ status: 'pago', data_pagamento }).eq('id', id)
  revalidatePath('/pagamentos')
  return { error: error?.message ?? null }
}

export async function criarComissao(payload: {
  tecnico_id: string
  mes_referencia: string
  os_ids: string[]
  valor_base: number
  percentual?: number
  observacoes?: string
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('comissoes').insert({
    ...payload,
    mes_referencia: payload.mes_referencia + '-01',
    percentual: payload.percentual ?? 20,
    status: 'pendente',
  })
  revalidatePath('/pagamentos')
  return { error: error?.message ?? null }
}

export async function criarFatura(payload: {
  osIds: string[]
  vencimento: string
  observacoes?: string
}) {
  const supabase = await createSupabaseServerClient()

  // Busca as OS selecionadas
  const { data: osList, error: osError } = await supabase
    .from('ordens_servico')
    .select('id, numero, cliente_id, valor_total, tecnico_id')
    .in('id', payload.osIds)

  if (osError || !osList || osList.length === 0) {
    throw new Error('Erro ao buscar OS selecionadas.')
  }

  const valorTotal = osList.reduce((s, os) => s + Number(os.valor_total), 0)
  const clienteId = osList[0].cliente_id

  // Gera número da fatura
  const { count } = await supabase
    .from('faturas')
    .select('*', { count: 'exact', head: true })

  const numero = `FAT-${String((count ?? 0) + 1).padStart(4, '0')}`

  // Cria a fatura
  const { data: fatura, error: faturaError } = await supabase
    .from('faturas')
    .insert({
      numero,
      cliente_id: clienteId,
      valor_total: valorTotal,
      status: 'pendente',
      data_emissao: new Date().toISOString().slice(0, 10),
      data_vencimento: payload.vencimento,
      observacoes: payload.observacoes ?? null,
      os_ids: payload.osIds,
    })
    .select()
    .single()

  if (faturaError) throw new Error(faturaError.message)

  // Atualiza status das OS para faturado
  await supabase
    .from('ordens_servico')
    .update({ status: 'faturado' })
    .in('id', payload.osIds)

  revalidatePath('/pagamentos')
  return fatura
}
