import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TechniciansPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: technicians } = await supabase
    .from('technicians')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D'LEON</Link>
          <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
        </div>
        <span style={{ fontSize: '13px', color: '#555' }}>{user.email}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 'calc(100vh - 57px)' }}>
        <div style={{ borderRight: '1px solid #2A2A2A', padding: '20px 0' }}>
          {[
            { label: 'Dashboard', href: '/', active: false },
            { label: 'Casos', href: '/cases', active: false },
            { label: 'Clientes', href: '/customers', active: false },
            { label: 'Veículos', href: '/vehicles', active: false },
            { label: 'Técnicos', href: '/technicians', active: true },
            { label: 'Comissões', href: '/commissions', active: false },
            { label: 'Pagamentos', href: '/payments', active: false },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{ display: 'block', padding: '8px 20px', fontSize: '13px', color: item.active ? '#FF6B00' : '#888', background: item.active ? 'rgba(255,107,0,0.08)' : 'transparent', borderRight: item.active ? '2px solid #FF6B00' : 'none', textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
        </div>
        <div style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '500' }}>Técnicos</h1>
              <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{technicians?.length ?? 0} técnico(s) cadastrado(s)</p>
            </div>
            <Link href="/technicians/new" style={{ background: '#FF6B00', color: '#fff', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>+ Novo técnico</Link>
          </div>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '10px 16px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A' }}>
              {['Nome', 'Função', 'Região', 'Telefone', 'Status'].map(h => (
                <span key={h} style={{ fontSize: '11px', fontWeight: '500', color: '#555' }}>{h}</span>
              ))}
            </div>
            {technicians && technicians.length > 0 ? technicians.map((t: any) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', padding: '12px 16px', borderBottom: '1px solid #1A1A1A', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#FF6B00', flexShrink: 0 }}>
                    {t.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{t.name}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#888' }}>{t.role ?? '—'}</span>
                <span style={{ fontSize: '12px', color: '#888' }}>{t.region ?? '—'}</span>
                <span style={{ fontSize: '12px', color: '#888' }}>{t.phone ?? '—'}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: t.active ? 'rgba(29,158,117,0.15)' : 'rgba(136,135,128,0.15)', color: t.active ? '#1D9E75' : '#888' }}>
                  {t.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '48px', color: '#333' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔧</div>
                <div style={{ fontSize: '13px', color: '#444' }}>Nenhum técnico ainda.</div>
                <Link href="/technicians/new" style={{ display: 'inline-block', marginTop: '12px', color: '#FF6B00', fontSize: '13px' }}>Cadastrar primeiro técnico →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
