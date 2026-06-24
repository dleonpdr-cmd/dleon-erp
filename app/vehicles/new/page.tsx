'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewVehiclePage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({ customer_id: '', make: '', model: '', year: new Date().getFullYear(), plate: '', vin: '', mileage: '' })
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('customers').select('id, name').order('name').then(({ data }) => setCustomers(data ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id) { setError('Selecione um cliente.'); return }
    if (!form.make.trim() || !form.model.trim()) { setError('Marca e modelo são obrigatórios.'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('vehicles').insert([{ ...form, year: Number(form.year), mileage: form.mileage ? Number(form.mileage) : null }])
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }
    router.push('/vehicles')
    router.refresh()
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '6px' }}>{label}</label>
      <input type={type} placeholder={placeholder} value={(form as any)[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        style={{ width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 12px', outline: 'none' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D'LEON</Link>
        <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
      </div>
      <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <Link href="/vehicles" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Veículos</Link>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ fontSize: '13px' }}>Novo veículo</span>
        </div>
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '24px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '24px' }}>Cadastrar veículo</h1>
          {error && <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#F09595', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '6px' }}>Proprietário (cliente) *</label>
              <select value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}
                style={{ width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: form.customer_id ? '#F0EEE9' : '#555', fontSize: '13px', padding: '0 12px', outline: 'none' }}>
                <option value="">Selecionar cliente...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '6px' }}>Marca *</label>
                <select value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))}
                  style={{ width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: form.make ? '#F0EEE9' : '#555', fontSize: '13px', padding: '0 12px', outline: 'none' }}>
                  <option value="">Selecionar...</option>
                  {['Toyota','Honda','Nissan','Mazda','Subaru','Mitsubishi','Lexus','Suzuki','Daihatsu','Outra'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '6px' }}>Modelo *</label>
                <input placeholder="Ex: Crown, CX-5" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                  style={{ width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 12px', outline: 'none' }} />
              </div>
            </div>
            {field('Ano *', 'year', 'number', '2023')}
            {field('Placa', 'plate', 'text', 'Ex: 愛知 530 あ 1234')}
            {field('Chassi (VIN)', 'vin', 'text', '17 caracteres')}
            {field('Quilometragem', 'mileage', 'number', 'Ex: 24500')}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <Link href="/vehicles" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', fontSize: '13px', textDecoration: 'none' }}>Cancelar</Link>
              <button type="submit" disabled={loading} style={{ flex: 2, height: '42px', background: '#FF6B00', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Salvando...' : 'Salvar veículo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
