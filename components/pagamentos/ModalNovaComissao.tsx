'use client'

import { useState } from 'react'
import { criarComissao } from '@/app/api/pagamentos/actions'

export function ModalNovaComissao({ onClose }: { onClose: () => void }) {
  const mesAtual = new Date().toISOString().slice(0, 7)
  const [form, setForm] = useState({
    tecnico_id: '',
    mes_referencia: mesAtual,
    valor_base: '',
    percentual: '20',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.tecnico_id || !form.valor_base) {
      setErro('Técnico e valor base são obrigatórios')
      return
    }
    setLoading(true)
    const { error } = await criarComissao({
      tecnico_id: form.tecnico_id,
      mes_referencia: form.mes_referencia,
      os_ids: [],
      valor_base: parseFloat(form.valor_base),
      percentual: parseFloat(form.percentual),
      observacoes: form.observacoes || undefined,
    })
    setLoading(false)
    if (error) { setErro(error); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-base font-medium mb-4">Nova comissão</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">ID do técnico</label>
            <input value={form.tecnico_id} onChange={e => set('tecnico_id', e.target.value)}
              placeholder="UUID do técnico" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Mês de referência</label>
            <input type="month" value={form.mes_referencia} onChange={e => set('mes_referencia', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Valor base (¥)</label>
            <input type="number" value={form.valor_base} onChange={e => set('valor_base', e.target.value)}
              placeholder="0" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Percentual (%)</label>
            <input type="number" value={form.percentual} onChange={e => set('percentual', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background resize-none" />
          </div>
        </div>
        {erro && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted/50">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Criar comissão'}
          </button>
        </div>
      </div>
    </div>
  )
}
