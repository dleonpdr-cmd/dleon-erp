'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewCasePage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({ customer_id: '', vehicle_id: '', technician_id: '', type: 'insurance', region: '', notes: '' })
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [technicians, setTechnicians] = useState<any[]>([])
  const [parts, setParts] = useState([{ part_name: 'Roof', dent_count: 0, unit_price: 100 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('customers').select('id, name').order('name').then(({ data }) => setCustomers(data ?? []))
    supabase.from('technicians').select('id, name').eq('active', true).order('name').then(({ data }) => setTechnicians(data ?? []))
  }, [])

  useEffect(() => {
    if (!form.customer_id) { setVehicles([]); return }
    supabase.from('vehicles').select('id, make, model, year').eq('customer_id', form.customer_id).then(({ data }) => setVehicles(data ?? []))
  }, [form.customer_id])

  const partOptions = ['Roof','Hood','Trunk','Front Door LH','Front Door RH','Rear Door LH','Rear Door RH','Fender LH','Fender RH','Quarter LH','Quarter RH','Pillar LH','Pillar RH']

  function addPart() { setParts(p => [...p, { part_name: 'Hood', dent_count: 0, unit_price: 100 }]) }
  function removePart(i: number) { setParts(p => p.filter((_, idx) => idx !== i)) }
  function updatePart(i: number, key: string, val: any) { setParts(p => p.map((part, idx) => idx === i ? { ...part, [key]: val } : part)) }

  const subtotal = parts.reduce((s, p) => s + (p.dent_count * p.unit_price), 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax

  function generateCaseNumber() {
    const d = new Date()
    const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
    return `DLN-${date}-${seq}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id) { setError('Selecione um cliente.'); return }
    if (!form.vehicle_id) { setError('Selecione um veículo.'); return }
    if (!form.technician_id) { setError('Selecione um técnico.'); return }
    setLoading(true); setError(null)

    const case_number = generateCaseNumber()
    const { data: caseData, error: caseError } = await supabase.from('cases').insert([{
      case_number, customer_id: form.customer_id, vehicle_id: form.vehicle_id,
      type: form.type, region: form.region, notes: form.notes,
      quote_amount: subtotal, tax_amount: tax, total_amount: total, status: 'quoted'
    }]).select().single()

    if (caseError || !caseData) { setError('Erro ao criar caso.'); setLoading(false); return }

    await supabase.from('case_technicians').insert([{ case_id: caseData.id, technician_id: form.technician_id, split_pct: 100 }])

    const partsToInsert = parts.filter(p => p.dent_count > 0).map(p => ({
      case_id: caseData.id, part_name: p.part_name,
      dent_count: p.dent_count, unit_price: p.unit_price,
      subtotal: p.dent_count * p.unit_price
    }))
    if (partsToInsert.length > 0) await supabase.from('vehicle_parts').insert(partsToInsert)

    router.push('/cases')
    router.refresh()
  }

  const sectionStyle = { background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '12px' }
  const sectionTitle = { fontSize: '12px', fontWeight: '500' as const, color: '#555', marginBottom: '14px' }
  const selectStyle = { width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 12px', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D'LEON</Link>
        <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
      </div>
      <div style={{ maxWidth: '680px', margin: '32px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Link href="/cases" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Casos</Link>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ fontSize: '13px' }}>Novo caso</span>
        </div>

        {error && <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#F09595', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={sectionStyle}>
            <div style={sectionTitle}>1. IDENTIFICAÇÃO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={selectStyle}>
                  <option value="insurance">Seguro</option>
                  <option value="private">Particular</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Região</label>
                <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} style={selectStyle}>
                  <option value="">Selecionar...</option>
                  {['Aichi-ken','Tokyo-to','Osaka-fu','Nagano-ken','Gunma-ken','Saitama-ken'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={sectionTitle}>2. CLIENTE E VEÍCULO</div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Cliente *</label>
              <select value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value, vehicle_id: '' }))} style={{ ...selectStyle, color: form.customer_id ? '#F0EEE9' : '#555' }}>
                <option value="">Selecionar cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Veículo *</label>
              <select value={form.vehicle_id} onChange={e => setForm(p => ({ ...p, vehicle_id: e.target.value }))} disabled={!form.customer_id} style={{ ...selectStyle, color: form.vehicle_id ? '#F0EEE9' : '#555', opacity: form.customer_id ? 1 : 0.5 }}>
                <option value="">Selecionar veículo...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year}</option>)}
              </select>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={sectionTitle}>3. TÉCNICO</div>
            <select value={form.technician_id} onChange={e => setForm(p => ({ ...p, technician_id: e.target.value }))} style={{ ...selectStyle, color: form.technician_id ? '#F0EEE9' : '#555' }}>
              <option value="">Selecionar técnico...</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div style={sectionStyle}>
            <div style={sectionTitle}>4. PEÇAS E AMASSADOS</div>
            {parts.map((part, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select value={part.part_name} onChange={e => updatePart(i, 'part_name', e.target.value)}
                  style={{ height: '38px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '0 10px', outline: 'none' }}>
                  {partOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input type="number" placeholder="Qtd" value={part.dent_count || ''}
                  onChange={e => updatePart(i, 'dent_count', Number(e.target.value))}
                  style={{ height: '38px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '0 10px', outline: 'none', textAlign: 'center' }} />
                <div style={{ height: '38px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#FF6B00' }}>
                  ¥{(part.dent_count * part.unit_price).toLocaleString()}
                </div>
                {parts.length > 1 && <button type="button" onClick={() => removePart(i)} style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '18px' }}>×</button>}
              </div>
            ))}
            <button type="button" onClick={addPart} style={{ fontSize: '12px', color: '#FF6B00', background: 'none', border: '1px dashed #FF6B00', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', marginTop: '4px' }}>+ Adicionar peça</button>
            <div style={{ borderTop: '1px solid #2A2A2A', marginTop: '14px', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '4px' }}><span>Subtotal</span><span>¥{subtotal.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '8px' }}><span>Imposto (10%)</span><span>¥{tax.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '500', color: '#FF6B00' }}><span>Total</span><span>¥{total.toLocaleString()}</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/cases" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', fontSize: '13px', textDecoration: 'none' }}>Cancelar</Link>
            <button type="submit" disabled={loading} style={{ flex: 2, height: '44px', background: '#FF6B00', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Salvando...' : 'Criar caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
