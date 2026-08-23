import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { getOperations } from '@/app/api/operations/actions'
import { OP_STATUS_LABEL, OP_STATUS_COLOR } from '@/app/api/operations/constants'

export default async function OperationsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const operations = await getOperations()

  const active    = operations.filter(o => o.status === 'active').length
  const total     = operations.length
  const totalCars = operations.reduce((s, o) => s + (o.total_cases ?? 0), 0)

  return (
    <AppShell userEmail={user.email}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>Operações</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
            {total} operação(ões) · {active} ativa(s) · {totalCars} veículos no total
          </p>
        </div>
        <Link href="/operations/new" style={{
          background: '#FF6B00', color: '#fff', padding: '8px 18px',
          borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none',
        }}>
          + Nova operação
        </Link>
      </div>

      {operations.length === 0 ? (
        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
          <div style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Nenhuma operação cadastrada</div>
          <Link href="/operations/new" style={{
            display: 'inline-block', background: '#FF6B00', color: '#fff',
            padding: '8px 20px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none',
          }}>
            Criar primeira operação
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {operations.map(op => {
            const pct = op.target_vehicle_count && op.target_vehicle_count > 0
              ? Math.min(100, Math.round((op.total_cases / op.target_vehicle_count) * 100))
              : null
            const statusColor = OP_STATUS_COLOR[op.status]
            const statusLabel = OP_STATUS_LABEL[op.status]

            return (
              <div key={op.id} style={{
                background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px',
                padding: '20px', display: 'flex', flexDirection: 'column', gap: '0',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#F0EEE9' }}>{op.name}</div>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                    background: `${statusColor}22`, color: statusColor,
                    border: `1px solid ${statusColor}44`, whiteSpace: 'nowrap',
                  }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Customer */}
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>
                  {op.customer_name ?? '—'}
                </div>

                {/* Progress bar */}
                {pct !== null && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#888' }}>
                        {op.total_cases} / {op.target_vehicle_count} veículos
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#FF6B00' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '4px', background: '#2A2A2A', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#FF6B00', borderRadius: '2px' }} />
                    </div>
                  </div>
                )}

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { label: 'Finalizados',   value: op.completed_cases,   color: '#1D9E75' },
                    { label: 'Em operação',   value: op.in_progress_cases, color: '#FF6B00' },
                    { label: 'Pendentes',     value: op.pending_cases,     color: '#555' },
                  ].map(k => (
                    <div key={k.label} style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: k.color }}>{k.value}</div>
                      <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {op.start_date && (
                    <span style={{ fontSize: '11px', color: '#555' }}>
                      Início: {new Date(op.start_date).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  <Link href={`/operations/${op.id}`} style={{
                    marginLeft: 'auto', fontSize: '12px', color: '#FF6B00',
                    textDecoration: 'none', fontWeight: '500',
                  }}>
                    Abrir operação →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
