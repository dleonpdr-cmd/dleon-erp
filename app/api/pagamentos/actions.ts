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
