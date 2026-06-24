'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarFatura(payload: {
  cliente_id: string
  os_ids: string[]
  valor_total: number
  data_emissao: string
  data_vencimento?: string
  metodo_pagamento?: string
  observacoes?: string
}) {
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase.from('faturas').select('*', { count: 'exact', head: true })
  const numero = 'F-' + String((count ?? 0) + 1).padStart(4, '0')
  const { error } = await supabase.from('faturas').insert({ ...payload, numero, status: 'aberta' })
  revalidatePath('/pagamentos')
  return { error: error?.message ?? null }
}
