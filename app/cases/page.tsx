import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export default async function CasesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cases } = await supabase
    .from('cases')
    .select('*, customers(name), vehicles(make, model)')
    .order('created_at', { ascending: false })

  const statusColor: any = {
    draft: '#555', quoted: '#378ADD', approved: '#1D9E75',
    in_progress: '#FF6B00', done: '#1D9E75', invoiced: '#7F77DD',
    received: '#1D9E75', paid: '#888'
  }
  const statusLabel: any = {
    draft: 'Rascunho', quoted: 'Orçamento', approved: 'Aprovado',
    in_progress: 'Em execução', done: 'Concluído', invoiced: 'Faturado',
    received: 'Recebido', paid: 'Pago'
  }

  return (
    <AppShell userEmail={user.email}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500' }}>Casos</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{cases?.length ?? 0} caso(s) registrado(s)</p>
        </div>
        <Link href="/cases/new" style={{ background: '#FF6B00', color: '#fff', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>+ Novo caso</Link>
      </div>

      <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 80px', padding: '10px 16px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A' }}>
          {['Número', 'Cliente', 'Veículo', 'Região', 'Status', 'Total'].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: '500', color: '#555' }}>{h}</span>
          ))}
        </div>
        {cases && cases.length > 0 ? cases.map((c: any) => (
          <Link key={c.id} href={`/cases/${c.id}`} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 80px', padding: '12px 16px', borderBottom: '1px solid #1A1A1A', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FF6B00' }}>{c.case_number}</span>
            <span style={{ fontSize: '12px', color: '#F0EEE9' }}>{c.customers?.name ?? '—'}</span>
            <span style={{ fontSize: '12px', color: '#888' }}>{c.vehicles ? `${c.vehicles.make} ${c.vehicles.model}` : '—'}</span>
            <span style={{ fontSize: '12px', color: '#888' }}>{c.region ?? '—'}</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: `${statusColor[c.status] ?? '#555'}22`, color: statusColor[c.status] ?? '#555', width: 'fit-content' }}>
              {statusLabel[c.status] ?? c.status}
            </span>
            <span style={{ fontSize: '12px', color: '#F0EEE9', textAlign: 'right' }}>¥{Number(c.total_amount ?? 0).toLocaleString()}</span>
          </Link>
        )) : (
          <div style={{ textAlign: 'center', padding: '48px', color: '#333' }}>
            <div style={{ fontSize: '13px', color: '#444' }}>Nenhum caso ainda.</div>
            <Link href="/cases/new" style={{ display: 'inline-block', marginTop: '12px', color: '#FF6B00', fontSize: '13px' }}>Criar primeiro caso →</Link>
          </div>
        )}
      </div>
    </AppShell>
  )
}
