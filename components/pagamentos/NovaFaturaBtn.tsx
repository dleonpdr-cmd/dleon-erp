// ============================================================
// D'LEON ERP — Componente: Botão Nova Fatura
// ============================================================
'use client'

import { useState } from 'react'

export default function NovaFaturaBtn() {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 text-sm px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
      >
        <span>+ Nova fatura</span>
      </button>
      {/* Modal de criação — expandir em próxima iteração */}
      {aberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-base font-medium mb-1">Nova fatura</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione as OS concluídas para gerar a fatura.
            </p>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              🔧 Formulário completo — próxima iteração do desenvolvimento
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setAberto(false)}
                className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted/50"
              >Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
