// ============================================================
// D'LEON ERP — Types: Módulo de Pagamentos
// ============================================================

export type FaturaStatus = 'aberta' | 'pago' | 'vencido' | 'cancelado'
export type ComissaoStatus = 'pendente' | 'pago' | 'cancelado'

export interface Fatura {
  id: string
  numero: string
  cliente_id: string
  os_ids: string[]
  valor_total: number
  data_emissao: string
  data_vencimento: string | null
  data_pagamento: string | null
  status: FaturaStatus
  metodo_pagamento: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  // joined
  clientes?: { nome: string; email: string | null }
}

export interface FaturaInput {
  cliente_id: string
  os_ids: string[]
  valor_total: number
  data_emissao: string
  data_vencimento?: string
  metodo_pagamento?: string
  observacoes?: string
}

export interface Comissao {
  id: string
  tecnico_id: string
  mes_referencia: string
  os_ids: string[]
  valor_base: number
  percentual: number
  valor_comissao: number
  status: ComissaoStatus
  data_pagamento: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  // joined
  tecnicos?: { nome: string }
}

export interface ComissaoInput {
  tecnico_id: string
  mes_referencia: string
  os_ids: string[]
  valor_base: number
  percentual?: number
  observacoes?: string
}

export interface ResumoPagamentos {
  mes: string
  total_faturas: number
  faturamento_total: number
  recebido: number
  a_receber: number
  vencido: number
}

export interface OsParaFaturar {
  id: string
  numero: string
  cliente_id: string
  cliente_nome: string
  tecnico_id: string
  tecnico_nome: string
  total_veiculos: number
  valor_total: number
  data_conclusao: string
}
