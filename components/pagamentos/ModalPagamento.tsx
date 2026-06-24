'use client'

import { useState } from 'react'
import type { Fatura, RegistrarPagamentoPayload } from '@/lib/types/pagamentos'

const METODOS = [
  'Transferência bancária',
  'Dinheiro',
  'Cheque',
  'PIX',
  'Cartão',
  'Outro',
]

interface Props {
  fatura: Fatura
  onClose: () => void
  onPagar: (payload: RegistrarPagamentoPayload) => Promise<{ error: string | null }>
}

export function ModalPagamento({ fatura, onClose, onPagar }: Props) {
  const saldoRestante = fatura.valor_total - fatura.valor_pago
  const [valor, setValor] = useState(saldoRestante.toString())
  const [metodo, setMetodo] = useState(METODOS[0])
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit() {
    const v = parseFloat(valor)
    if (isNaN(v) || v <= 0) { setErro('Valor inválido'); return }
    if (v > saldoRestante) { setErro(`Valor máximo: ¥${saldoRestante.toLocaleString('ja-JP')}`); return }

    setLoading(true)
    setErro(null)

    const { error } = await onPagar({
      fatura_id: fatura.id,
      valor: v,
      metodo,
      data_pagamento: new Date(data).toISOString(),
    })

    setLoading(false)
    if (error) { setErro(error); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl border w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold mb-1">Registrar Recebimento</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Fatura <span className="font-mono">{fatura.numero}</span> —{' '}
          {fatura.clientes?.nome ?? ''}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Valor recebido (¥)
            </label>
            <input
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              min={1}
              max={saldoRestante}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Saldo restante: ¥{saldoRestante.toLocaleString('ja-JP')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Método</label>
            <select
              value={metodo}
              onChange={e => setMetodo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              {METODOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Data do recebimento</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {erro && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Salvando...' : 'Confirmar Recebimento'}
          </button>
        </div>
      </div>
    </div>
  )
}
