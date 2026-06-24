'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Recipient = { block: string; name: string; pct: number }

export default function NewCustomerPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({
    name: '', type: 'company', phone: '', email: '', company_name: '',
    pct_supplier: 30, pct_dleon: 15, pct_technicians: 55
  })
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = Number(form.pct_supplier) + Number(form.pct_dleon) + Number(form.pct_technicians)
  const totalOk = total === 100

  const blocks = ['supplier', 'dleon', 'technicians']
  const blockLabel: any = { supplier: 'Fornecedor', dleon: "D'LEON", technicians: 'Técnicos' }
  const blockColor: any = { supplier: '#888780', dleon: '#FF6B00', technicians: '#1D9E75' }

  function addRecipient(block: string) {
    setRecipients(p => [...p, { block, name: 'Novo destinatário', pct: 0 }])
  }

  function updateRecipient(idx: number, field: string, value: any) {
    setRecipients(p => p.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function removeRecipient(idx: number) {
    setRecipients(p => p.filter((_, i) => i !== idx))
  }

  const getBlockRecipients = (block: string) => recipients.filter(r => r.block === block)
  const getBlockSubtotal = (block: string) => getBlockRecipients(block).reduce((s, r) => s + Number(r.pct), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    if (!totalOk) { setError('A soma das percentagens deve ser 100%.'); return }
    setLoading(true)
    setError(null)

    const { data: customer, error: custErr } = await supabase
      .from('customers').insert([form]).select().single()

    if (custErr || !customer) { setError('Erro ao salvar cliente.'); setLoading(false); return }

    if (recipients.length > 0) {
      await supabase.from('commission_templates').insert(
        recipients.map(r => ({ customer_id: customer.id, block: r.block, name: r.name, pct: r.pct }))
      )
    }

    router.push('/customers')
    router.refresh()
  }

  const inputStyle = { width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 12px', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '500' as const, color: '#888', marginBottom: '6px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D'LEON</Link>
        <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
      </div>
      <div style={{ maxWidth: '580px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <Link href="/customers" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Clientes</Link>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ fontSize: '13px' }}>Novo cliente</span>
        </div>
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '24px', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '24px' }}>Cadastrar cliente</h1>
          {error && <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#F09595', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nome completo *</label>
              <input placeholder="Ex: Toyota Nagoya Ltda." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Tipo *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                <option value="individual">Pessoa física</option>
                <option value="company">Empresa / Concessionária</option>
                <option value="insurance">Seguradora</option>
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Telefone</label>
              <input placeholder="Ex: 052-0000-0000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>E-mail</label>
              <input type="email" placeholder="Ex: contato@empresa.jp" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>PERCENTAGENS PRINCIPAIS</div>
              <div style={{ fontSize: '11px', color: '#444', marginBottom: '14px' }}>Como o valor total do caso é dividido entre os blocos.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>% Fornecedor</label>
                  <input type="number" min="0" max="100" value={form.pct_supplier} onChange={e => setForm(p => ({ ...p, pct_supplier: Number(e.target.value) }))} style={{ ...inputStyle, textAlign: 'center' }} />
                </div>
                <div>
                  <label style={labelStyle}>% D'LEON</label>
                  <input type="number" min="0" max="100" value={form.pct_dleon} onChange={e => setForm(p => ({ ...p, pct_dleon: Number(e.target.value) }))} style={{ ...inputStyle, textAlign: 'center' }} />
                </div>
                <div>
                  <label style={labelStyle}>% Técnicos</label>
                  <input type="number" min="0" max="100" value={form.pct_technicians} onChange={e => setForm(p => ({ ...p, pct_technicians: Number(e.target.value) }))} style={{ ...inputStyle, textAlign: 'center' }} />
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: totalOk ? 'rgba(29,158,117,0.08)' : 'rgba(226,75,74,0.08)', border: `1px solid ${totalOk ? 'rgba(29,158,117,0.3)' : 'rgba(226,75,74,0.3)'}`, borderRadius: '6px', fontSize: '12px', color: totalOk ? '#1D9E75' : '#F09595' }}>
                {totalOk ? '✓ Soma = 100%' : `⚠ Soma = ${total}% (precisa ser 100%)`}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '20px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '4px' }}>DESTINATÁRIOS PADRÃO</div>
              <div style={{ fontSize: '11px', color: '#444', marginBottom: '14px' }}>Quem recebe dentro de cada bloco. Preenchem automaticamente em cada novo caso.</div>
              {blocks.map(block => (
                <div key={block} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: blockColor[block] }} />
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>{blockLabel[block]}</span>
                    </div>
                    <button type="button" onClick={() => addRecipient(block)}
                      style={{ fontSize: '11px', padding: '2px 8px', border: `1px dashed ${blockColor[block]}`, borderRadius: '4px', background: 'none', color: blockColor[block], cursor: 'pointer' }}>
                      + Adicionar
                    </button>
                  </div>
                  {getBlockRecipients(block).map((r, idx) => {
                    const realIdx = recipients.indexOf(r)
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 32px', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <input value={r.name} onChange={e => updateRecipient(realIdx, 'name', e.target.value)}
                          style={{ height: '34px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '5px', color: '#F0EEE9', fontSize: '12px', padding: '0 8px', outline: 'none' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <input type="number" min="0" max="100" value={r.pct} onChange={e => updateRecipient(realIdx, 'pct', Number(e.target.value))}
                            style={{ width: '46px', height: '34px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '5px', color: '#F0EEE9', fontSize: '12px', textAlign: 'center', outline: 'none' }} />
                          <span style={{ fontSize: '11px', color: '#555' }}>%</span>
                        </div>
                        <button type="button" onClick={() => removeRecipient(realIdx)}
                          style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '16px' }}>×</button>
                      </div>
                    )
                  })}
                  {getBlockRecipients(block).length > 0 && (
                    <div style={{ fontSize: '11px', textAlign: 'right', marginTop: '4px', color: getBlockSubtotal(block) === 100 ? '#1D9E75' : '#E24B4A' }}>
                      {getBlockSubtotal(block) === 100 ? '✓ 100%' : `⚠ ${getBlockSubtotal(block)}%`}
                    </div>
                  )}
                  {getBlockRecipients(block).length === 0 && (
                    <div style={{ fontSize: '11px', color: '#333', textAlign: 'center', padding: '6px' }}>Nenhum destinatário definido</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/customers" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', fontSize: '13px', textDecoration: 'none' }}>Cancelar</Link>
              <button type="submit" disabled={loading || !totalOk} style={{ flex: 2, height: '42px', background: '#FF6B00', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: (loading || !totalOk) ? 'not-allowed' : 'pointer', opacity: (loading || !totalOk) ? 0.5 : 1 }}>
                {loading ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}