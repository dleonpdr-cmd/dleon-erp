// ============================================================
// D'LEON ERP — Componente: Tabela de Comissões
// ============================================================
'use client'

import { useTransition } from 'react'
import { marcarComissaoPaga } from '@/lib/pagamentos'
import type { Comissao } from '@/types/pagamentos'

const STATUS_CLASS: Record<string, string> = {
  pendente:  'bg-amber-50 text-amber-800',
  pago:      'bg-emerald-50 text-emerald-800',
  cancelado: 'bg-gray-100 text-gray-500',
}
const fmt = (v: number) => '¥ ' + Math.round(v).toLocaleString('ja-JP')

export default function TabelaComissoes({ comissoes }: { comissoes: Comissao[] }) {
  const [, startTransition] = useTransition()

  function handlePagar(id: string) {
    const hoje = new Date().toISOString().slice(0, 10)
    startTransition(async () => { await marcarComissaoPaga(id, hoje) })
  }

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-sm font-medium">Comissões dos técnicos</h2>
        <span className="text-xs text-muted-foreground">{comissoes.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Técnico</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Base</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">%</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Comissão</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {comissoes.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                  Nenhuma comissão registrada
                </td>
              </tr>
            )}
            {comissoes.map(c => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-xs font-medium">{c.tecnicos?.nome ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{fmt(c.valor_base)}</td>
                <td className="px-4 py-2.5 text-xs text-right text-muted-foreground">{c.percentual}%</td>
                <td className="px-4 py-2.5 text-xs text-right font-medium">{fmt(c.valor_comissao)}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[c.status]}`}>
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {c.status === 'pendente' && (
                    <button
                      onClick={() => handlePagar(c.id)}
                      className="text-xs px-2 py-1 border border-border rounded-md hover:bg-muted/50"
                    >Pagar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
