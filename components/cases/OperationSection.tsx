'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { linkCaseToOperation } from '@/app/api/operations/actions'

type Op = { id: string; name: string; customer_name: string | null }

type Props = {
  caseId: string
  currentOperation: Op | null
  allOperations: Op[]
}

export default function OperationSection({ caseId, currentOperation, allOperations }: Props) {
  const [op, setOp]         = useState(currentOperation)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(currentOperation?.id ?? '')
  const [msg, setMsg]       = useState('')
  const [pending, startT]   = useTransition()

  const card: React.CSSProperties = {
    background: '#141414', border: '1px solid #2A2A2A',
    borderRadius: '10px', padding: '20px', marginBottom: '12px',
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  function handleSave() {
    startT(async () => {
      const r = await linkCaseToOperation(caseId, selected || null)
      if (r.error) { flash('Erro: ' + r.error); return }
      const newOp = allOperations.find(o => o.id === selected) ?? null
      setOp(newOp ? { id: newOp.id, name: newOp.name, customer_name: newOp.customer_name } : null)
      setEditing(false)
      flash(newOp ? `Vinculado a "${newOp.name}"` : 'Operação removida.')
    })
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#555', fontWeight: '600' }}>OPERAÇÃO / BLOCO</div>
        {!editing && (
          <button onClick={() => { setEditing(true); setSelected(op?.id ?? '') }}
            style={{ height: '28px', padding: '0 12px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '5px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>
            {op ? 'Alterar' : 'Vincular'}
          </button>
        )}
      </div>

      {msg && (
        <div style={{ marginBottom: '10px', padding: '6px 10px', borderRadius: '5px', fontSize: '11px',
          background: msg.startsWith('Erro') ? 'rgba(226,75,74,0.1)' : 'rgba(29,158,117,0.1)',
          border: `1px solid ${msg.startsWith('Erro') ? '#E24B4A' : '#1D9E75'}`,
          color: msg.startsWith('Erro') ? '#F09595' : '#1D9E75' }}>
          {msg}
        </div>
      )}

      {!editing ? (
        op ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{op.name}</div>
              {op.customer_name && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{op.customer_name}</div>}
            </div>
            <Link href={`/operations/${op.id}`} style={{
              height: '30px', padding: '0 12px', background: '#1A1A1A', border: '1px solid #2A2A2A',
              borderRadius: '5px', color: '#FF6B00', fontSize: '11px', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
            }}>
              Abrir operação →
            </Link>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#555' }}>Nenhuma operação vinculada</div>
        )
      ) : (
        <div>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{ width: '100%', height: '36px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '0 10px', outline: 'none', marginBottom: '10px' }}
          >
            <option value="">Sem operação (caso independente)</option>
            {allOperations.map(o => (
              <option key={o.id} value={o.id}>{o.name}{o.customer_name ? ` · ${o.customer_name}` : ''}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setEditing(false)}
              style={{ flex: 1, height: '32px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '5px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={pending}
              style={{ flex: 2, height: '32px', background: '#FF6B00', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1 }}>
              {pending ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
