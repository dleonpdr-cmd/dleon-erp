'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { createWorkflowTemplate } from '@/app/api/workflow/actions'

const input: React.CSSProperties = {
  width: '100%', height: '42px', background: '#1A1A1A', border: '1px solid #2A2A2A',
  borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 12px',
  outline: 'none', boxSizing: 'border-box',
}
const label: React.CSSProperties = { display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }
const card: React.CSSProperties = {
  background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px',
  padding: '20px', marginBottom: '12px',
}

export default function NewWorkflowTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    const r = await createWorkflowTemplate({ name, description: description || undefined })
    setLoading(false)
    if (r.error) { setError(r.error); return }
    router.push(`/workflow-templates/${r.id}`)
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', marginBottom: '20px' }}>
        <Link href="/workflow-templates" style={{ color: '#555', textDecoration: 'none' }}>Templates</Link>
        <span>›</span>
        <span style={{ color: '#F0EEE9' }}>Novo template</span>
      </div>

      <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Novo Template de Workflow</h1>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '6px', fontSize: '12px', background: 'rgba(226,75,74,0.1)', border: '1px solid #E24B4A', color: '#F09595' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={card}>
          <div style={{ fontSize: '11px', color: '#555', fontWeight: '600', marginBottom: '14px' }}>IDENTIFICAÇÃO</div>
          <div style={{ marginBottom: '14px' }}>
            <label style={label}>Nome do template *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Daihatsu Hail, Toyota Pátio, Cliente Individual..."
              style={input}
              autoFocus
            />
          </div>
          <div>
            <label style={label}>Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva quando usar este template..."
              rows={3}
              style={{ ...input, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
            />
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#555', marginBottom: '20px' }}>
          Após criar o template você poderá adicionar as etapas do fluxo.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Link href="/workflow-templates" style={{
            height: '38px', padding: '0 20px', background: '#1A1A1A', border: '1px solid #2A2A2A',
            borderRadius: '6px', color: '#888', fontSize: '13px', display: 'inline-flex',
            alignItems: 'center', textDecoration: 'none',
          }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading} style={{
            height: '38px', padding: '0 24px', background: '#FF6B00', border: 'none',
            borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Criando...' : 'Criar template'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
