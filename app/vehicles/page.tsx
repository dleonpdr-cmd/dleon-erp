import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export default async function VehiclesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*, customers(name)')
    .order('created_at', { ascending: false })

  return (
    <AppShell userEmail={user.email}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500' }}>Veículos</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{vehicles?.length ?? 0} veículo(s) cadastrado(s)</p>
        </div>
        <Link href="/vehicles/new" style={{ background: '#FF6B00', color: '#fff', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none' }}>+ Novo veículo</Link>
      </div>
      <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 16px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A' }}>
          {['Veículo', 'Ano', 'Placa', 'Chassi', 'Proprietário'].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: '500', color: '#555' }}>{h}</span>
          ))}
        </div>
        {vehicles && vehicles.length > 0 ? vehicles.map((v: any) => (
          <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 16px', borderBottom: '1px solid #1A1A1A', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{v.make} {v.model}</span>
            <span style={{ fontSize: '12px', color: '#888' }}>{v.year}</span>
            <span style={{ fontSize: '12px', color: '#888' }}>{v.plate ?? '—'}</span>
            <span style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>{v.vin ?? '—'}</span>
            <span style={{ fontSize: '12px', color: '#FF6B00' }}>{v.customers?.name ?? '—'}</span>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: '48px', color: '#333' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚗</div>
            <div style={{ fontSize: '13px', color: '#444' }}>Nenhum veículo ainda.</div>
            <Link href="/vehicles/new" style={{ display: 'inline-block', marginTop: '12px', color: '#FF6B00', fontSize: '13px' }}>Cadastrar primeiro veículo →</Link>
          </div>
        )}
      </div>
    </AppShell>
  )
}
