'use client'

import { useState, useTransition } from 'react'
import { criarFatura } from '@/app/api/faturas/actions'
import type { OsParaFaturar } from '@/types/pagamentos'

interface Props {
  onClose: () => void
  osProntas: OsParaFaturar[]
}

const METODOS = ['Transferência bancária', 'Dinheiro', 'Cheque', 'Boleto', 'Outro']
const fmt = (v: number) => '¥ ' + Math.round(v).toLocaleString('ja-JP')

function default30dias() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export function ModalNovaFatura({ onClose, osProntas }: Props) {
  const [, startTransition] = useTransition()
  const [osSelecionadas, setOsSelecionadas] = useState<Set<string>>(new Set())
  const [desconto, setDesconto] = useState(0)
  const [metodo, setMetodo] = useState(METODOS[0])
  const [vencimento, setVencimento] = useState(default30dias)
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const osSel = osProntas.filter(os => osSelecionadas.has(os.id))
  const clientesDistintos = [...new Set(osSel.map(os => os.cliente_id))]
  const clienteNome = osSel[0]?.cliente_nome ?? null
  const totalBruto = osSel.reduce((s, os) => s + os.valor_total, 0)
  const totalLiquido = Math.max(0, totalBruto - desconto)
  const totalVeiculos = osSel.reduce((s, os) => s + os.total_veiculos, 0)

  const porCliente = osProntas.reduce<Record<string, OsParaFaturar[]>>((acc, os) => {
    if (!acc[os.cliente_id]) acc[os.cliente_id] = []
    acc[os.cliente_id].push(os)
    return acc
  }, {})

  function toggleOS(id: string, clienteId: string) {
    setOsSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        const jaTemOutro = [...next].some(
          osId => osProntas.find(o => o.id === osId)?.cliente_id !== clienteId
        )
        if (jaTemOutro) { setErro('Uma fatura só pode conter OS do mesmo cliente.'); return prev }
        next.add(id)
      }
      setErro(null)
      return next
    })
  }

  function selecionarTodoCliente(clienteId: string) {
    const ids = porCliente[clienteId].map(os => os.id)
    setOsSelecionadas(prev => {
      const next = new Set(prev)
      if (ids.every(id => next.has(id))) {
        ids.forEach(id => next.delete(id))
      } else {
        const temOutro = [...next].some(
          osId => osProntas.find(o => o.id === osId)?.cliente_id !== clienteId
        )
        if (temOutro) { setErro('Selecione OS do mesmo cliente.'); return prev }
        ids.forEach(id => next.add(id))
      }
      setErro(null)
      return next
    })
  }

  async function handleSubmit() {
    setErro(null)
    if (osSelecionadas.size === 0) { setErro('Selecione ao menos uma OS.'); return }
    if (clientesDistintos.length > 1) { setErro('Selecione OS de um único cliente.'); return }
    if (!vencimento) { setErro('Informe a data de vencimento.'); return }
    setLoading(true)
    startTransition(async () => {
      const { error } = await criarFatura({
        cliente_id: osSel[0].cliente_id,
        os_ids: [...osSelecionadas],
        valor_total: totalLiquido,
        data_emissao: new Date().toISOString().slice(0, 10),
        data_vencimento: vencimento,
        metodo_pagamento: metodo,
        observacoes: observacoes || undefined,
      })
      if (error) { setErro(error); setLoading(false); return }
      setSucesso(true)
      setTimeout(onClose, 1500)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div>
            <h2 className="text-base font-medium">Nova fatura</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Selecione as OS e configure os detalhes de cobrança</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl px-1">✕</button>
        </div>

        {sucesso ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-4xl">✅</div>
            <p className="font-medium">Fatura criada com sucesso!</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">Ordens de serviço prontas</p>
                {Object.entries(porCliente).map(([clienteId, oss]) => {
                  const bloqueado = clientesDistintos.length > 0 &&
                    !clientesDistintos.includes(clienteId) && osSelecionadas.size > 0
                  return (
                    <div key={clienteId} className={`mb-3 border border-border/50 rounded-xl overflow-hidden ${bloqueado ? 'opacity-40' : ''}`}>
                      <div onClick={() => !bloqueado && selecionarTodoCliente(clienteId)}
                        className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 cursor-pointer hover:bg-muted/60 select-none">
                        <span className="text-sm font-medium">{oss[0].cliente_nome}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {oss.length} OS · {fmt(oss.reduce((s, o) => s + o.valor_total, 0))}
                        </span>
                      </div>
                      {oss.map(os => (
                        <label key={os.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-t border-border/30
                            ${osSelecionadas.has(os.id) ? 'bg-emerald-50/50' : 'hover:bg-muted/20'}`}>
                          <input type="checkbox" checked={osSelecionadas.has(os.id)}
                            onChange={() => !bloqueado && toggleOS(os.id, clienteId)}
                            disabled={bloqueado} className="w-3.5 h-3.5 accent-emerald-600" />
                          <span className="font-mono text-xs text-muted-foreground w-16">{os.numero}</span>
                          <span className="text-xs text-muted-foreground flex-1">{os.tecnico_nome} · {os.total_veiculos} veíc.</span>
                          <span className="text-xs font-medium">{fmt(os.valor_total)}</span>
                        </label>
                      ))}
                    </div>
                  )
                })}
                {osProntas.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-xl">
                    Nenhuma OS concluída aguarda faturamento
                  </div>
                )}
              </div>

              {osSelecionadas.size > 0 && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-800">{clienteNome}</span>
                    <span className="text-xs text-emerald-700">{osSelecionadas.size} OS · {totalVeiculos} veículos</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-emerald-700">Total bruto</span>
                    <span className="text-xs font-medium text-emerald-800">{fmt(totalBruto)}</span>
                  </div>
                  {desconto > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-emerald-700">Desconto</span>
                      <span className="text-xs text-red-600">− {fmt(desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-emerald-200 mt-2 pt-2">
                    <span className="text-sm font-medium text-emerald-900">Total da fatura</span>
                    <span className="text-base font-medium text-emerald-900">{fmt(totalLiquido)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Desconto (¥)</label>
                  <input type="number" min={0} value={desconto || ''}
                    onChange={e => setDesconto(Number(e.target.value) || 0)}
                    placeholder="0" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Vencimento</label>
                  <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Método de pagamento</label>
                  <select value={metodo} onChange={e => setMetodo(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background">
                    {METODOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Observações</label>
                  <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
                    rows={2} placeholder="Referência interna, instrução de pagamento, etc."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none" />
                </div>
              </div>
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-border/50 bg-muted/20">
              {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{erro}</p>}
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50">Cancelar</button>
                <button onClick={handleSubmit} disabled={loading || osSelecionadas.size === 0}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50">
                  {loading ? 'Criando...' : osSelecionadas.size === 0 ? 'Selecione OS para continuar' : `Emitir fatura · ${fmt(totalLiquido)}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
