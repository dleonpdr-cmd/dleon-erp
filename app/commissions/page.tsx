import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

const STATUS_LABEL: Record<string, string> = {
  calculated: 'Calculada',
  reviewed: 'Conferida',
  closed: 'Fechada',
  pending_payment: 'Pgto pendente',
  partial: 'Pgto parcial',
  paid: 'Paga',
}
const STATUS_COLOR: Record<string, string> = {
  calculated: '#378ADD',
  reviewed: '#7F77DD',
  closed: '#888',
  pending_payment: '#FF6B00',
  partial: '#FFB800',
  paid: '#1D9E75',
}

export default async function CommissionsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Casos com comissão já criada
  const { data: commissions } = await supabase
    .from('commissions')
    .select('*, cases(id, case_number, total_amount, status, customers(name))')
    .order('created_at', { ascending: false })

  // Casos sem comissão ainda
  const commissionCaseIds = commissions?.map(c => c.case_id) ?? []
  const { data: pendingCases } = await supabase
    .from('cases')
    .select('id, case_number, total_amount, status, customers(name)')
    .not('id', 'in', `(${commissionCaseIds.length > 0 ? commissionCaseIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    .order('created_at', { ascending: false })

  // KPIs
  const totalComm = commissions?.reduce((s, c) => s + Number(c.total_amount ?? 0), 0) ?? 0
  const totalPaid = commissions?.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.total_amount ?? 0), 0) ?? 0
  const totalPending = totalComm - totalPaid

  return (
    <AppShell userEmail={user.email}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500' }}>Comissões</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{commissions?.length ?? 0} comissão(ões) ativas</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total comissões', value: totalComm, color: '#F0EEE9' },
          { label: 'Pago', value: totalPaid, color: '#1D9E75' },
          { label: 'Pendente', value: totalPending, color: '#FF6B00' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>{kpi.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: kpi.color }}>¥{kpi.value.toLocaleString('ja-JP')}</div>
          </div>
        ))}
      </div>

      {/* Comissões existentes */}
      <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '12px 16px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', fontSize: '12px', fontWeight: '500', color: '#555' }}>
          COMISSÕES ATIVAS
        </div>
        {commissions && commissions.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 100px 100px 100px 80px', padding: '8px 16px', fontSize: '10px', color: '#555', background: '#111' }}>
              {['Caso', 'Cliente', 'Total', 'Pago', 'Pendente', 'Status'].map(h => <span key={h}>{h}</span>)}
            </div>
            {commissions.map((c: any) => {
              const comm_case = c.cases
              return (
                <Link key={c.id} href={`/commissions/${c.case_id}`}
                  style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 100px 100px 100px 80px', padding: '12px 16px', borderBottom: '1px solid #1A1A1A', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FF6B00' }}>{comm_case?.case_number ?? '—'}</span>
                  <span style={{ fontSize: '12px' }}>{comm_case?.customers?.name ?? '—'}</span>
                  <span style={{ fontSize: '12px', color: '#F0EEE9' }}>¥{Number(c.total_amount).toLocaleString('ja-JP')}</span>
                  <span style={{ fontSize: '12px', color: '#1D9E75' }}>—</span>
                  <span style={{ fontSize: '12px', color: '#FF6B00' }}>—</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: `${STATUS_COLOR[c.status] ?? '#888'}22`, color: STATUS_COLOR[c.status] ?? '#888', width: 'fit-content' }}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </Link>
              )
            })}
          </>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Nenhuma comissão calculada ainda.</div>
        )}
      </div>

      {/* Casos sem comissão */}
      {pendingCases && pendingCases.length > 0 && (
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', fontSize: '12px', fontWeight: '500', color: '#555' }}>
            CASOS SEM COMISSÃO
          </div>
          {pendingCases.map((c: any) => (
            <Link key={c.id} href={`/commissions/${c.id}`}
              style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr 120px', padding: '12px 16px', borderBottom: '1px solid #1A1A1A', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FF6B00' }}>{c.case_number}</span>
              <span style={{ fontSize: '12px' }}>{c.customers?.name ?? '—'}</span>
              <span style={{ fontSize: '12px', color: '#FF6B00' }}>¥{Number(c.total_amount).toLocaleString('ja-JP')}</span>
              <span style={{ fontSize: '11px', color: '#378ADD' }}>→ Calcular comissão</span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
