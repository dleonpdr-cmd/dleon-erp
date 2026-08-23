'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { createOperation } from '@/app/api/operations/actions'

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
const sectionTitle: React.CSSProperties = { fontSize: '11px', color: '#555', fontWeight: '600', marginBottom: '14px' }

export default function NewOperationPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({
    name: '',
    customer_id: '',
    status: 'active',
    budget_type_default: 'individual',
    target_vehicle_count: '',
    start_date: '',
    end_date: '',
    notes: '',
  })
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('customers').select('id, name').order('name').then(({ data }) => setCustomers(data ?? []))
  }, [])

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')

    const r = await createOperation({
      name: form.name,
      customer_id: form.customer_id || undefined,
      status: form.status as any,
      budget_type_default: form.budget_type_default as any,
      target_vehicle_count: form.target_vehicle_count ? Number(form.target_vehicle_count) : undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      notes: form.notes || undefined,
    })

    setLoading(false)
    if (r.error) { setError(r.error); return }
    router.push(`/operations/${r.id}`)
  }

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', marginBottom: '20px' }}>
        <Link href="/operations" style={{ color: '#555', textDecoration: 'none' }}>Operações</Link>
        <span>›</span>
        <span style={{ color: '#F0EEE9' }}>Nova operação</span>
      </div>

      <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Nova Operação</h1>

      {error && (
        <div style={{ padding: '10px 14px', marginBottom: '16px', borderRadius: '6px', fontSize: '12px', background: 'rgba(226,75,74,0.1)', border: '1px solid #E24B4A', color: '#F09595' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Identificação */}
        <div style={card}>
          <div style={sectionTitle}>IDENTIFICAÇÃO</div>
          <div style={{ marginBottom: '14px' }}>
            <label style={label}>Nome da operação *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Daihatsu Ibaraki, Toyota Kobe, Galpão B..."
              style={input}
              autoFocus
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Cliente / Concessionária</label>
              <select value={form.customer_id} onChange={e => set('customer_id', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="">— selecionar —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Status inicial</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="draft">Rascunho</option>
                <option value="active">Ativa</option>
                <option value="paused">Pausada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Meta e datas */}
        <div style={card}>
          <div style={sectionTitle}>META E PERÍODO</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Meta de veículos</label>
              <input
                type="number" min="1"
                value={form.target_vehicle_count}
                onChange={e => set('target_vehicle_count', e.target.value)}
                placeholder="320"
                style={input}
              />
            </div>
            <div>
              <label style={label}>Data de início</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={input} />
            </div>
            <div>
              <label style={label}>Data final prevista</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={input} />
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div style={card}>
          <div style={sectionTitle}>CONFIGURAÇÕES</div>
          <div>
            <label style={label}>Tipo de orçamento padrão</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {[
                { value: 'individual', label: 'Individual', desc: 'Um veículo · contagem de painéis e amassados' },
                { value: 'batch', label: 'Lote / Pátio', desc: 'N veículos · lista com valor por unidade' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('budget_type_default', opt.value)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer',
                    border: form.budget_type_default === opt.value ? '2px solid #FF6B00' : '1px solid #2A2A2A',
                    background: form.budget_type_default === opt.value ? 'rgba(255,107,0,0.08)' : '#1A1A1A',
                    textAlign: 'left', color: '#F0EEE9',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Observações */}
        <div style={card}>
          <div style={sectionTitle}>OBSERVAÇÕES</div>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Observações internas..."
            rows={3}
            style={{ ...input, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
          />
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Link href="/operations" style={{
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
            {loading ? 'Criando...' : 'Criar operação'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
