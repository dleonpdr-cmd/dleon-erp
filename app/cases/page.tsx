import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
            { label: 'Casos', href: '/cases', active: true },
            { label: 'Clientes', href: '/customers', active: false },
            { label: 'Veículos', href: '/vehicles', active: false },
            { label: 'Técnicos', href: '/technicians', active: false },
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
              <h1 style={{ fontSize: '20px', fontWeight: '500' }}>Casos</h1>
              <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{cases?.length ?? 0} caso(s) registrado(s)</p>
            </div>
            <Link href="/cases/new" style={{ background: '#FF6B00', color: '#fff', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>+ Novo caso</Link>
          </div>

          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.4fr 1.2fr 100px 90px 80px', padding: '10px 16px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A' }}>
              {['Caso / Cliente', 'Veículo', 'Tipo', 'Status', 'Total', 'Data'].map(h => (
                <span key={h} style={{ fontSize: '11px', fontWeight: '500', color: '#555' }}>{h}</span>
              ))}
            </div>
            {cases && cases.length > 0 ? cases.map((c: any) => (
              <Link key={c.id} href={`/cases/${c.id}`} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.4fr 1.2fr 100px 90px 80px', padding: '12px 16px', borderBottom: '1px solid #1A1A1A', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#FF6B00' }}>{c.case_number}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{c.customers?.name ?? '—'}</div>
                </div>
                <span style={{ fontSize: '12px', color: '#888' }}>{c.vehicles ? `${c.vehicles.make} ${c.vehicles.model}` : '—'}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#1E1E1E', color: '#888', display: 'inline-block' }}>{c.type === 'insurance' ? 'Seguro' : 'Particular'}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: `${statusColor[c.status]}20`, color: statusColor[c.status], display: 'inline-block' }}>{statusLabel[c.status]}</span>
                <span style={{ fontSize: '12px' }}>¥{Number(c.total_amount ?? 0).toLocaleString()}</span>
                <span style={{ fontSize: '11px', color: '#555' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
              </Link>
            )) : (
              <div style={{ textAlign: 'center', padding: '48px', color: '#333' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '13px', color: '#444' }}>Nenhum caso ainda.</div>
                <Link href="/cases/new" style={{ display: 'inline-block', marginTop: '12px', color: '#FF6B00', fontSize: '13px' }}>Criar primeiro caso →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
