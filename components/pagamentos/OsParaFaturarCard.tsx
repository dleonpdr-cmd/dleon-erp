// ============================================================
// D'LEON ERP — Componente: OS prontas para faturar
// ============================================================
import type { OsParaFaturar } from '@/types/pagamentos'

const fmt = (v: number) => '¥ ' + Math.round(v).toLocaleString('ja-JP')

export default function OsParaFaturarCard({ itens }: { itens: OsParaFaturar[] }) {
  const total = itens.reduce((s, i) => s + i.valor_total, 0)

  return (
    <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium text-amber-900">OS prontas para faturar</h2>
          <p className="text-xs text-amber-700 mt-0.5">
            {itens.length} OS · total {fmt(total)}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {itens.map(os => (
          <div key={os.id}
            className="bg-white border border-amber-100 rounded-lg px-3 py-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{os.numero}</span>
              <span className="text-xs font-medium">{os.cliente_nome}</span>
              <span className="text-xs text-muted-foreground">· {os.tecnico_nome}</span>
              <span className="text-xs text-muted-foreground">· {os.total_veiculos} veíc.</span>
            </div>
            <span className="text-xs font-medium text-amber-900">{fmt(os.valor_total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
