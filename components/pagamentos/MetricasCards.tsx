// ============================================================
// D'LEON ERP — Componente: Métricas de Pagamentos
// ============================================================
'use client'

const fmt = (v: number) =>
  '¥ ' + Math.round(v).toLocaleString('ja-JP')

interface Props {
  faturamento: number
  recebido: number
  aReceber: number
  comissoesPendentes: number
  osProntas: number
}

export default function MetricasCards({
  faturamento, recebido, aReceber, comissoesPendentes, osProntas,
}: Props) {
  const cards = [
    { label: 'Faturamento do mês', value: fmt(faturamento), sub: 'total emitido', color: 'text-emerald-700' },
    { label: 'A receber',           value: fmt(aReceber),   sub: 'faturas abertas', color: 'text-amber-700' },
    { label: 'Comissões a pagar',   value: fmt(comissoesPendentes), sub: 'técnicos pendentes', color: 'text-red-700' },
    { label: 'OS prontas p/ faturar', value: String(osProntas),   sub: 'aguardando emissão', color: 'text-sky-700' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
          <p className={`text-xl font-medium ${c.color}`}>{c.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
