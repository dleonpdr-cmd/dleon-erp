'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createWorkOrder } from '@/app/api/work-orders/actions'

type Props = {
  caseId: string
  documents: { id: string; doc_number: string; total_amount: number; doc_status: string }[]
  technicians: { id: string; name: string }[]
}

const input: React.CSSProperties = {
  height: '36px', background: '#1A1A1A', border: '1px solid #2A2A2A',
  borderRadius: '6px', color: '#F0EEE9', fontSize: '12px',
  padding: '0 10px', outline: 'none', width: '100%',
}

export default function CreateOSBtn({ caseId, documents, technicians }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startT] = useTransition()
  const [docId, setDocId] = useState(
    documents.find(d => d.doc_status === 'issued')?.id ?? documents[0]?.id ?? ''
  )
  const [techId, setTechId] = useState(technicians[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  function handleCreate() {
    startT(async () => {
      const r = await createWorkOrder(caseId, {
        documentId: docId || undefined,
        responsibleTechnicianId: techId || undefined,
        notes: notes || undefined,
      })
      if (r.error) { setError(r.error); return }
      setOpen(false)
      router.push(`/work-orders/${r.id}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ fontSize: '12px', color: '#FF6B00', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        + Criar OS
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '380px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '20px' }}>Criar Ordem de Serviço</h3>

            {error && (
              <div style={{ padding: '8px 12px', marginBottom: '14px', borderRadius: '6px', fontSize: '12px', background: 'rgba(226,75,74,0.1)', border: '1px solid #E24B4A', color: '#F09595' }}>
                {error}
              </div>
            )}

            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Orçamento</label>
            <select value={docId} onChange={e => setDocId(e.target.value)} style={{ ...input, marginBottom: '12px' }}>
              <option value="">— sem orçamento —</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.doc_number} · ¥{Number(d.total_amount).toLocaleString('ja-JP')} {d.doc_status === 'issued' ? '✓' : '(rascunho)'}
                </option>
              ))}
            </select>

            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Técnico responsável</label>
            <select value={techId} onChange={e => setTechId(e.target.value)} style={{ ...input, marginBottom: '12px' }}>
              <option value="">— sem responsável —</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Observações (opcional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} style={{ ...input, marginBottom: '20px' }} placeholder="Instruções para o técnico..." />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setOpen(false); setError('') }} style={{ height: '36px', padding: '0 16px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '12px' }}>
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={pending} style={{ flex: 1, height: '36px', background: '#FF6B00', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                {pending ? 'Criando...' : 'Criar OS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
