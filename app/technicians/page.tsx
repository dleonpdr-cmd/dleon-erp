import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export default async function TechniciansPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: technicians } = await supabase
    .from('technicians')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AppShell userEmail={user.email}>
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
    </AppShell>
  )
}
