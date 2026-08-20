import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import CommissionShell from '@/components/commissions/CommissionShell'
import { getOrCreateCommission } from '@/app/api/commissions/actions'

export default async function CommissionDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: caso } = await supabase
    .from('cases')
    .select('*, customers(name)')
    .eq('id', caseId)
    .single()
  if (!caso) redirect('/commissions')

  const { data: technicians } = await supabase
    .from('technicians')
    .select('id, name, region')
    .eq('active', true)
    .order('name')

  const { data: commission } = await getOrCreateCommission(caseId)

  return (
    <AppShell userEmail={user.email}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Link href="/commissions" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Comissões</Link>
        <span style={{ color: '#333' }}>›</span>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#FF6B00' }}>{caso.case_number}</span>
        <span style={{ color: '#333' }}>·</span>
        <span style={{ fontSize: '13px', color: '#888' }}>{caso.customers?.name ?? '—'}</span>
      </div>

      <CommissionShell
        caseId={caseId}
        caseAmount={Number(caso.total_amount ?? 0)}
        initialCommission={commission}
        technicians={technicians ?? []}
      />
    </AppShell>
  )
}
