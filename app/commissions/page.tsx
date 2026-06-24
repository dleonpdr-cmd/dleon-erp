'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CommissionsPage() {
  const supabase = createSupabaseBrowserClient()
  const [cases, setCases] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [recipients, setRecipients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('cases')
      .select('*, customers(name, pct_supplier, pct_dleon, pct_technicians)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCases(data ?? []); setLoading(false) })
  }, [])

  async function loadRecipients(caseId: string) {
    const { data } = await supabase.from('commission_recipients').select('*').eq('case_id', caseId).order('block')
    setRecipients(data ?? [])
  }

  async function selectCase(c: any) {
    setSelected(c)
    await loadRecipients(c.id)
  }

  async function addRecipient(block: string) {
    const newRec = { case_id: selected.id, block, name: 'Novo destinatário', pct: 0, amount: 0 }
    const { data } = await supabase.from('commission_recipients').insert([newRec]).select().single()
    if (data) setRecipients(p => [...p, data])
  }

  async function updateRecipient(id: string, field: string, value: any) {
    setRecipients(p => p.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  async function saveRecipient(r: any) {
    const total = selected.total_amount
    const blockPct = r.block === 'supplier' ? selected.customers?.pct_supplier :
                     r.block === 'dleon' ? selected.customers?.pct_dleon :
                     selected.customers?.pct_technicians
    const amount = (total * blockPct / 100) * (r.pct / 100)
    await supabase.from('commission_recipients').update({ name: r.name, pct: r.pct, amount }).eq('id', r.id)
    setRecipients(p => p.map(x => x.id === r.id ? { ...x, amount } : x))
  }

  async function deleteRecipient(id: string) {
    await supabase.from('commission_recipients').delete().eq('id', id)
    setRecipients(p => p.filter(r => r.id !== id))
  }

  async function markPaid(id: string) {
    await supabase.from('commission_recipients').update({ status: 'paid' }).eq('id', id)
    setRecipients(p => p.map(r => r.id === id ? { ...r, status: 'paid' } : r))
  }

  const blockLabel: any = { supplier: 'Fornecedor', dleon: "D'LEON", technicians: 'Técnicos' }
  const blockColor: any = { supplier: '#888780', dleon: '#FF6B00', technicians: '#1D9E75' }
  const blocks = ['supplier', 'dleon', 'technicians']

  const getBlockPct = (block: string) => {
    if (!selected?.customers) return 0
    return block === 'supplier' ? selected.customers.pct_supplier :
           block === 'dleon' ? selected.customers.pct_dleon :
           selected.customers.pct_technicians
  }

  const getBlockAmount = (block: string) => {
    if (!selected) return 0
    return (selected.total_amount * getBlockPct(block)) / 100
  }

  const getBlockRecipients = (block: string) => recipients.filter(r => r.block === block)
  const getBlockSubtotal = (block: string) => getBlockRecipients(block).reduce((s, r) => s + Number(r.pct), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D'LEON</Link>
        <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 57px)' }}>
        <div style={{ borderRight: '1px solid #2A2A2A', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Casos</div>
          {loading ? <div style={{ color: '#555', fontSize: '12px' }}>Carregando...</div> :
            cases.map(c => (
              <div key={c.id} onClick={() => selectCase(c)}
                style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', background: selected?.id === c.id ? 'rgba(255,107,0,0.08)' : '#141414', border: `1px solid ${selected?.id === c.id ? '#FF6B00' : '#2A2A2A'}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#FF6B00' }}>{c.case_number}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{c.customers?.name}</div>
                <div style={{ fontSize: '12px', fontWeight: '500', marginTop: '2px' }}>¥{Number(c.total_amount).toLocaleString()}</div>
              </div>
            ))
          }
        </div>
        <div style={{ padding: '24px 32px' }}>
          {!selected ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#333' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
              <div style={{ fontSize: '13px' }}>Selecione um caso para gerenciar as comissões</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '500', fontFamily: 'monospace', color: '#FF6B00' }}>{selected.case_number}</h1>
                <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Total: ¥{Number(selected.total_amount).toLocaleString()}</p>
              </div>
              {blocks.map(block => (
                <div key={block} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: blockColor[block] }} />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{blockLabel[block]}</span>
                      <span style={{ fontSize: '12px', color: '#555' }}>{getBlockPct(block)}% do total</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: blockColor[block] }}>¥{getBlockAmount(block).toLocaleString()}</span>
                      <button onClick={() => addRecipient(block)}
                        style={{ fontSize: '11px', padding: '3px 10px', border: `1px dashed ${blockColor[block]}`, borderRadius: '5px', background: 'none', color: blockColor[block], cursor: 'pointer' }}>
                        + Adicionar
                      </button>
                    </div>
                  </div>
                  {getBlockRecipients(block).map(r => (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 32px', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <input value={r.name} onChange={e => updateRecipient(r.id, 'name', e.target.value)} onBlur={() => saveRecipient(r)}
                        style={{ height: '36px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '0 10px', outline: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="number" min="0" max="100" value={r.pct} onChange={e => updateRecipient(r.id, 'pct', Number(e.target.value))} onBlur={() => saveRecipient(r)}
                          style={{ width: '52px', height: '36px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', textAlign: 'center', outline: 'none' }} />
                        <span style={{ fontSize: '11px', color: '#555' }}>%</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: blockColor[block] }}>¥{Number(r.amount).toLocaleString()}</span>
                      <button onClick={() => markPaid(r.id)} disabled={r.status === 'paid'}
                        style={{ fontSize: '10px', padding: '3px 6px', border: 'none', borderRadius: '4px', background: r.status === 'paid' ? 'rgba(29,158,117,0.15)' : '#2A2A2A', color: r.status === 'paid' ? '#1D9E75' : '#888', cursor: r.status === 'paid' ? 'default' : 'pointer' }}>
                        {r.status === 'paid' ? 'Pago' : 'Pagar'}
                      </button>
                      <button onClick={() => deleteRecipient(r.id)}
                        style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '16px' }}>×</button>
                    </div>
                  ))}
                  {getBlockRecipients(block).length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', marginTop: '6px', color: getBlockSubtotal(block) === 100 ? '#1D9E75' : '#E24B4A' }}>
                      {getBlockSubtotal(block) === 100 ? '✓ Soma = 100%' : `⚠ Soma = ${getBlockSubtotal(block)}% (precisa ser 100%)`}
                    </div>
                  )}
                  {getBlockRecipients(block).length === 0 && (
                    <div style={{ fontSize: '12px', color: '#333', textAlign: 'center', padding: '12px' }}>
                      Clique em "+ Adicionar" para definir os destinatários
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
