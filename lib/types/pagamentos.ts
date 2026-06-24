// ============================================================
// D'LEON ERP — Types do Módulo de Pagamentos
// ============================================================

export type FaturaStatus = 'pendente' | 'parcial' | 'pago' | 'cancelado'
export type ComissaoStatus = 'pendente' | 'aprovado' | 'pago' | 'cancelado'
export type MovimentacaoTipo = 'entrada' | 'saida'

export interface Fatura {
  id: string
  os_id: string | null
  cliente_id: string | null
  numero: string
  valor_total: number
  valor_pago: number
  desconto: number
  status: FaturaStatus
  metodo: string | null
  vencimento: string      // ISO date string
  data_emissao: string
  data_pagamento: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
  // joins
  clientes?: { nome: string; email: string | null }
  ordens_servico?: { numero: string; descricao: string | null }
}

export interface Comissao {
  id: string
  tecnico_id: string | null
  os_id: string | null
  periodo_inicio: string
  periodo_fim: string
  valor_servicos: number
  percentual: number
  valor_comissao: number
  bonus: number
  descontos: number
  valor_liquido: number
  status: ComissaoStatus
  data_pagamento: string | null
  metodo: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
  // joins
  tecnicos?: { nome: string }
  ordens_servico?: { numero: string }
}

export interface Movimentacao {
  id: string
  tipo: MovimentacaoTipo
  categoria: string
  referencia_id: string | null
  descricao: string
  valor: number
  data: string
  criado_em: string
}

export interface ResumoPagamentos {
  totalReceber: number
  totalRecebido: number
  totalVencido: number
  totalComissoesPendentes: number
  totalComissoesPagas: number
  saldoLiquido: number
}

// Formulário de criação de fatura
export interface CriarFaturaPayload {
  os_id?: string
  cliente_id?: string
  valor_total: number
  desconto?: number
  metodo?: string
  vencimento: string
  observacoes?: string
}

// Formulário de pagamento de fatura
export interface RegistrarPagamentoPayload {
  fatura_id: string
  valor: number
  metodo: string
  data_pagamento?: string
}

// Formulário de criação de comissão
export interface CriarComissaoPayload {
  tecnico_id: string
  os_id?: string
  periodo_inicio: string
  periodo_fim: string
  valor_servicos: number
  percentual: number
  bonus?: number
  descontos?: number
  observacoes?: string
}
