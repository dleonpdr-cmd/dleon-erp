'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewTechnicianPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({ name: '', role: 'PDR Técnico', phone: '', email: '', region: '', bank_name: '', bank_account: '', active: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('technicians').insert([form])
    if (error) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }
    router.push('/technicians')
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
          <Link href="/technicians" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Técnicos</Link>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ fontSize: '13px' }}>Novo técnico</span>
        </div>
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '24px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '24px' }}>Cadastrar técnico</h1>
          {error && <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#F09595', marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            {field('Nome completo *', 'name', 'text', 'Ex: Gabriel Leon')}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '6px' }}>Função *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 12px', outline: 'none' }}>
                <option>PDR Sênior</option>
                <option>PDR Técnico</option>
                <option>PDR Júnior</option>
                <option>Supervisor</option>
                <option>Aprendiz</option>
              </select>
            </div>
            {field('Telefone', 'phone', 'text', 'Ex: 090-0000-0000')}
            {field('E-mail', 'email', 'email', 'Ex: tecnico@dleon.jp')}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888', marginBottom: '6px' }}>Região principal</label>
              <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                style={{ width: '100%', height: '42px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 12px', outline: 'none' }}>
                <option value="">Selecionar...</option>
                {['Aichi-ken','Tokyo-to','Osaka-fu','Nagano-ken','Gunma-ken','Saitama-ken','Kanagawa-ken','Shizuoka-ken'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '12px' }}>DADOS BANCÁRIOS</div>
              {field('Banco', 'bank_name', 'text', 'Ex: 三菱UFJ銀行')}
              {field('Conta (agência + número)', 'bank_account', 'text', 'Ex: 123-4567890')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#1A1A1A', borderRadius: '6px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '13px' }}>Técnico ativo</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Pode ser alocado em novos casos</div>
              </div>
              <div onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                style={{ width: '40px', height: '22px', borderRadius: '11px', background: form.active ? '#FF6B00' : '#2A2A2A', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: form.active ? '20px' : '2px', transition: 'left 0.2s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href="/technicians" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '42px', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', fontSize: '13px', textDecoration: 'none' }}>Cancelar</Link>
              <button type="submit" disabled={loading} style={{ flex: 2, height: '42px', background: '#FF6B00', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Salvando...' : 'Salvar técnico'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
