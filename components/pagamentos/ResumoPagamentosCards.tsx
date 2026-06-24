'use client'

import type { ResumoPagamentos } from '@/lib/types/pagamentos'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)
}

interface Props {
  resumo: ResumoPagamentos | null
}

const cards = (r: ResumoPagamentos) => [
  {
    label: 'A Receber',
    value: r.totalReceber,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: '📥',
  },
  {
    label: 'Recebido',
    value: r.totalRecebido,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✅',
  },
  {
    label: 'Vencido',
    value: r.totalVencido,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '⚠️',
  },
  {
    label: 'Comissões Pendentes',
    value: r.totalComissoesPendentes,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '👨‍🔧',
  },
  {
    label: 'Comissões Pagas',
    value: r.totalComissoesPagas,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: '💸',
  },
  {
    label: 'Saldo Líquido',
    value: r.saldoLiquido,
    color: r.saldoLiquido >= 0 ? 'text-green-700' : 'text-red-700',
    bg: r.saldoLiquido >= 0 ? 'bg-green-50' : 'bg-red-50',
    border: r.saldoLiquido >= 0 ? 'border-green-200' : 'border-red-200',
    icon: '💰',
  },
]

export function ResumoPagamentosCards({ resumo }: Props) {
  if (!resumo) {
    return (
      <div className="text-sm text-muted-foreground">
        Erro ao carregar resumo financeiro.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards(resumo).map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${card.bg} ${card.border}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{card.icon}</span>
            <span className="text-xs font-medium text-muted-foreground">
              {card.label}
            </span>
          </div>
          <p className={`text-xl font-bold tabular-nums ${card.color}`}>
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
