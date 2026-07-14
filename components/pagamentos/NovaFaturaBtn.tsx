'use client'

import { useState } from 'react'
import { criarFatura } from '@/lib/pagamentos'
import type { OsParaFaturar } from '@/types/pagamentos'

interface Props {
  osProntas?: OsParaFaturar[]
}

export default function NovaFaturaBtn({ osProntas = [] }: Props) {
  const [aberto, setAberto] = useState(false)
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [vencimento, setVencimento] = useState('')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const fmt = (v: number) => '¥' + Math.round(v).toLocaleString('ja-JP')

  const osSelecionadas = osProntas.filter(os => selecionadas.includes(os.id))
  const total = osSelecionadas.reduce((s, os) => s + Number(os.valor_total), 0)

  function toggleOS(id: string) {
    setSelecionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSalvar() {
    if (selecionadas.length === 0) { setErro('Selecione pelo menos uma OS.'); return }
    if (!vencimento) { setErro('Informe a data de vencimento.'); return }
    const clienteId = osSelecionadas[0]?.cliente_id
    if (!clienteId) { setErro('Erro: cliente não encontrado.'); return }

    setSalvando(true)
    setErro('')
    try {
      await criarFatura({
        cliente_id: clienteId,
        os_ids: selecionadas,
        valor_total: total,
        data_emissao: new Date().toISOString().slice(0, 10),
        data_vencimento: vencimento,
        observacoes: obs || undefined,
      })
      setAberto(false)
      setSelecionadas([])
      setVencimento('')
      setObs('')
      window.location.reload()
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao criar fatura.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 text-sm px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
      >
        + Nova fatura
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-base font-medium">Nova fatura</h3>
              <button onClick={() => setAberto(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* OS disponíveis */}
              <div>
                <p className="text-sm font-medium mb-2">OS prontas para faturar</p>
                {osProntas.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-3">
                    Nenhuma OS pronta para faturar. Conclua uma OS primeiro.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {osProntas.map(os => (
                      <label key={os.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selecionadas.includes(os.id)
                            ? 'border-emerald-600 bg-emerald-50/10'
                            : 'border-border hover:bg-muted/30'
                        }`}>
                        <input
                          type="checkbox"
                          checked={selecionadas.includes(os.id)}
                          onChange={() => toggleOS(os.id)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-mono text-emerald-600">{os.numero}</span>
                            <span className="text-sm font-medium">{fmt(os.valor_total)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{os.cliente_nome} · {os.tecnico_nome}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              {selecionadas.length > 0 && (
                <div className="flex items-center justify-between bg-emerald-50/10 border border-emerald-600/30 rounded-lg px-4 py-3">
                  <span className="text-sm text-muted-foreground">{selecionadas.length} OS · {osSelecionadas[0]?.cliente_nome}</span>
                  <span className="text-base font-semibold text-emerald-500">{fmt(total)}</span>
                </div>
              )}

              {/* Vencimento */}
              <div>
                <label className="text-sm font-medium block mb-1.5">Data de vencimento</label>
                <input
                  type="date"
                  value={vencimento}
                  onChange={e => setVencimento(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="text-sm font-medium block mb-1.5">Observações <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  rows={2}
                  placeholder="Condições de pagamento, notas..."
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background resize-none"
                />
              </div>

              {erro && <p className="text-sm text-red-500 bg-red-50/10 rounded-lg px-3 py-2">{erro}</p>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
              <button
                onClick={() => setAberto(false)}
                className="text-sm px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >Cancelar</button>
              <button
                onClick={handleSalvar}
                disabled={salvando || selecionadas.length === 0 || !vencimento}
                className="text-sm px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-40 transition-colors"
              >
                {salvando ? 'Criando...' : `Criar fatura${selecionadas.length > 0 ? ' — ' + fmt(total) : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
