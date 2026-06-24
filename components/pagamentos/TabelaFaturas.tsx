// ============================================================
// D'LEON ERP — Componente: Tabela de Faturas
// ============================================================
'use client'

import { useState, useTransition } from 'react'
import { marcarFaturaPaga, cancelarFatura } from '@/lib/pagamentos'
import type { Fatura } from '@/types/pagamentos'

const STATUS_LABEL: Record<string, string> = {
  aberta: 'Em aberto', pago: 'Pago', vencido: 'Vencido', cancelado: 'Cancelado',
}
const STATUS_CLASS: Record<string, string> = {
  aberta:    'bg-amber-50 text-amber-800',
  pago:      'bg-emerald-50 text-emerald-800',
  vencido:   'bg-red-50 text-red-800',
  cancelado: 'bg-gray-100 text-gray-500',
}

const fmt = (v: number) => '¥ ' + Math.round(v).toLocaleString('ja-JP')

export default function TabelaFaturas({ faturas }: { faturas: Fatura[] }) {
  const [, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState<string | null>(null)

  function handlePagar(id: string) {
    const hoje = new Date().toISOString().slice(0, 10)
    startTransition(async () => {
      await marcarFaturaPaga(id, hoje, 'transferência')
      setConfirmando(null)
    })
  }

  function handleCancelar(id: string) {
    startTransition(async () => {
      await cancelarFatura(id)
      setConfirmando(null)
    })
  }

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-sm font-medium">Faturas</h2>
        <span className="text-xs text-muted-foreground">{faturas.length} registros</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Nº</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Cliente</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Valor</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Emissão</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {faturas.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                  Nenhuma fatura encontrada
                </td>
              </tr>
            )}
            {faturas.map(f => (
              <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.numero}</td>
                <td className="px-4 py-2.5 text-xs font-medium">{f.clientes?.nome ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-right font-medium">{fmt(f.valor_total)}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[f.status]}`}>
                    {STATUS_LABEL[f.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {new Date(f.data_emissao).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-2.5">
                  {f.status === 'aberta' && (
                    confirmando === f.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePagar(f.id)}
                          className="text-xs px-2 py-1 bg-emerald-600 text-white rounded-md"
                        >Confirmar</button>
                        <button
                          onClick={() => setConfirmando(null)}
                          className="text-xs px-2 py-1 border rounded-md"
                        >✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmando(f.id)}
                        className="text-xs px-2 py-1 border border-border rounded-md hover:bg-muted/50"
                      >Marcar pago</button>
                    )
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
