import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { getWorkOrder } from '@/app/api/work-orders/actions'
import { WO_STATUS_LABEL, WO_STATUS_COLOR } from '@/app/api/work-orders/constants'
import WorkOrderShell from '@/components/work-orders/WorkOrderShell'

export default async function WorkOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [wo, techsRes] = await Promise.all([
    getWorkOrder(params.id),
    supabase.from('technicians').select('id, name').order('name'),
  ])

  if (!wo) notFound()

  const technicians: { id: string; name: string }[] = techsRes.data ?? []

  return (
    <AppShell userEmail={user.email}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', marginBottom: '20px' }}>
        <Link href="/work-orders" style={{ color: '#555', textDecoration: 'none' }}>Ordens de Serviço</Link>
        <span>›</span>
        <span style={{ color: '#FF6B00', fontFamily: 'monospace' }}>{wo.wo_number}</span>
        {wo.case && (
          <>
            <span>·</span>
            <Link href={`/cases/${wo.case_id}`} style={{ color: '#555', textDecoration: 'none' }}>
              Caso {wo.case.case_number}
            </Link>
          </>
        )}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '600', fontFamily: 'monospace' }}>{wo.wo_number}</h1>
            <span style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: '8px',
              background: `${WO_STATUS_COLOR[wo.status]}22`,
              color: WO_STATUS_COLOR[wo.status],
              border: `1px solid ${WO_STATUS_COLOR[wo.status]}44`,
            }}>
              {WO_STATUS_LABEL[wo.status]}
            </span>
          </div>
          {wo.case && (
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#888' }}>
              {wo.case.customer.name}
              {' · '}
              {wo.case.vehicle.make} {wo.case.vehicle.model} {wo.case.vehicle.year}
              {' · '}
              <span style={{ fontFamily: 'monospace' }}>{wo.case.vehicle.plate}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {wo.case_id && (
            <Link href={`/cases/${wo.case_id}`}
              style={{ height: '34px', padding: '0 14px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', fontSize: '12px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              ← Caso
            </Link>
          )}
        </div>
      </div>

      {/* Shell client */}
      <WorkOrderShell workOrder={wo} technicians={technicians} />
    </AppShell>
  )
}
