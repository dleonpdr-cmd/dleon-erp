import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { count: casesTotal },
    { count: casesInProgress },
    { count: casesDone },
    { count: techniciansTotal },
    { data: recentCases },
  ] = await Promise.all([
    supabase.from('cases').select('*', { count: 'exact', head: true }),
    supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    supabase.from('technicians').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('cases').select('*').order('created_at', { ascending: false }).limit(5),
  ])

  return (
    <AppShell userEmail={user.email}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '500' }}>Dashboard</h1>
        <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total de casos',  value: casesTotal ?? 0,       color: '#F0EEE9' },
          { label: 'Em andamento',    value: casesInProgress ?? 0,  color: '#FF6B00' },
          { label: 'Concluídos',      value: casesDone ?? 0,        color: '#1D9E75' },
          { label: 'Técnicos ativos', value: techniciansTotal ?? 0, color: '#378ADD' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '500', color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#888', marginBottom: '14px' }}>Casos recentes</div>
        {recentCases && recentCases.length > 0 ? (
          recentCases.map((c: Record<string, unknown>) => (
            <div key={c.id as string} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1E1E1E' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FF6B00' }}>{c.case_number as string}</span>
              <span style={{ flex: 1, fontSize: '12px', color: '#888' }}>{c.region as string ?? '—'}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#1E1E1E', color: '#888' }}>{c.status as string}</span>
              <span style={{ fontSize: '12px', color: '#F0EEE9' }}>¥{Number(c.total_amount ?? 0).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: '#333' }}>
            <div style={{ fontSize: '13px', color: '#444' }}>Nenhum caso ainda.</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
