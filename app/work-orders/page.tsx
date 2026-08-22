import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { listWorkOrders } from '@/app/api/work-orders/actions'
import { WO_STATUS_LABEL, WO_STATUS_COLOR } from '@/app/api/work-orders/constants'

const STATUS_ORDER = [
  'waiting', 'in_progress', 'paused', 'waiting_qc',
  'qc_rejected', 'completed', 'ready_to_invoice',
]

export default async function WorkOrdersPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orders = await listWorkOrders()

  const byStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = orders.filter((o: any) => o.status === s)
    return acc
  }, {} as Record<string, any[]>)

  const card: React.CSSProperties = {
    background: '#141414', border: '1px solid #2A2A2A',
    borderRadius: '10px', padding: '16px', marginBottom: '12px',
  }

  function formatTime(start: string | null, end: string | null): string {
    if (!start) return '—'
    const s = new Date(start)
    const e = end ? new Date(end) : new Date()
    const min = Math.round((e.getTime() - s.getTime()) / 60000)
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
  }

  return (
    <AppShell userEmail={user.email}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '500' }}>Ordens de Serviço</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{orders.length} OS registradas</p>
        </div>
      </div>

      {/* Cards de status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '28px' }}>
        {STATUS_ORDER.map(s => (
          <div key={s} style={{ background: '#141414', border: `1px solid ${WO_STATUS_COLOR[s]}33`, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: WO_STATUS_COLOR[s] }}>
              {byStatus[s]?.length ?? 0}
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '4px', lineHeight: '1.3' }}>
              {WO_STATUS_LABEL[s]}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={card}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>TODAS AS ORDENS</div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: '13px' }}>
            Nenhuma OS criada ainda. Crie uma OS a partir de um caso com orçamento aprovado.
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 80px 100px 100px 80px 80px', gap: '10px', fontSize: '10px', color: '#444', marginBottom: '8px', padding: '0 4px' }}>
              <span>OS</span>
              <span>Cliente</span>
              <span>Veículo / Placa</span>
              <span>Painéis</span>
              <span>Responsável</span>
              <span>Status</span>
              <span>Tempo</span>
              <span></span>
            </div>

            {orders.map((o: any) => (
              <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 80px 100px 100px 80px 80px', gap: '10px', alignItems: 'center', padding: '12px 4px', borderTop: '1px solid #1A1A1A' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FF6B00', fontWeight: '500' }}>{o.wo_number}</span>
                <div>
                  <div style={{ fontSize: '12px' }}>{o.customer_name}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{o.case_number}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px' }}>{o.vehicle_make} {o.vehicle_model}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{o.vehicle_plate}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                  {o.completed_items}/{o.total_items}
                </div>
                <div style={{ fontSize: '12px' }}>{o.responsible_name ?? '—'}</div>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '8px', background: `${WO_STATUS_COLOR[o.status]}22`, color: WO_STATUS_COLOR[o.status], display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {WO_STATUS_LABEL[o.status]}
                </span>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {formatTime(o.started_at, o.finished_at ?? (o.status !== 'waiting' ? null : null))}
                </div>
                <Link href={`/work-orders/${o.id}`} style={{ fontSize: '12px', color: '#FF6B00', textDecoration: 'none' }}>
                  Abrir →
                </Link>
              </div>
            ))}
          </>
        )}
      </div>
    </AppShell>
  )
}
