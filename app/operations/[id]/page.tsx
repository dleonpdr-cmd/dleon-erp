import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import {
  getOperation, getOperationCases, getOperationMembers,
  OP_STATUS_LABEL, OP_STATUS_COLOR, MEMBER_ROLE_LABEL,
} from '@/app/api/operations/actions'
import OperationShell from '@/components/operations/OperationShell'

export default async function OperationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [op, cases, members, customersRes, techsRes] = await Promise.all([
    getOperation(id),
    getOperationCases(id),
    getOperationMembers(id),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('technicians').select('id, name').eq('active', true).order('name'),
  ])

  if (!op) notFound()

  const customers = customersRes.data ?? []
  const technicians = techsRes.data ?? []

  const pct = op.target_vehicle_count && op.target_vehicle_count > 0
    ? Math.min(100, Math.round((op.total_cases / op.target_vehicle_count) * 100))
    : null

  const statusColor = OP_STATUS_COLOR[op.status]
  const statusLabel = OP_STATUS_LABEL[op.status]

  const card: React.CSSProperties = {
    background: '#141414', border: '1px solid #2A2A2A',
    borderRadius: '10px', padding: '20px', marginBottom: '16px',
  }

  return (
    <AppShell userEmail={user.email}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', marginBottom: '20px' }}>
        <Link href="/operations" style={{ color: '#555', textDecoration: 'none' }}>Operações</Link>
        <span>›</span>
        <span style={{ color: '#F0EEE9' }}>{op.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{op.name}</h1>
            <span style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: '8px',
              background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44`,
            }}>
              {statusLabel}
            </span>
          </div>
          {op.customer_name && (
            <div style={{ fontSize: '13px', color: '#555' }}>{op.customer_name}</div>
          )}
        </div>
        <Link href="/operations" style={{
          height: '34px', padding: '0 14px', background: '#1A1A1A', border: '1px solid #2A2A2A',
          borderRadius: '6px', color: '#888', fontSize: '12px', display: 'inline-flex',
          alignItems: 'center', textDecoration: 'none',
        }}>
          ← Operações
        </Link>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Meta',         value: op.target_vehicle_count ? `${op.target_vehicle_count} veíc.` : '—',             color: '#F0EEE9' },
          { label: 'Total',        value: String(op.total_cases),                                                           color: '#F0EEE9' },
          { label: 'Finalizados',  value: String(op.completed_cases),                                                       color: '#1D9E75' },
          { label: 'Em operação',  value: String(op.in_progress_cases),                                                     color: '#FF6B00' },
          { label: 'Pendentes',    value: String(op.pending_cases),                                                         color: '#555'    },
        ].map(k => (
          <div key={k.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Barra de progresso */}
      {pct !== null && (
        <div style={{ ...card, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>Progresso da operação</span>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#FF6B00' }}>{pct}%</span>
          </div>
          <div style={{ height: '8px', background: '#2A2A2A', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#FF6B00', borderRadius: '4px', transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#555' }}>{op.total_cases} cadastrados</span>
            <span style={{ fontSize: '11px', color: '#555' }}>{op.target_vehicle_count! - op.total_cases} restantes</span>
          </div>
        </div>
      )}

      {/* Shell client (edição + seções interativas) */}
      <OperationShell
        operation={op}
        cases={cases as any}
        members={members}
        customers={customers}
        technicians={technicians}
      />
    </AppShell>
  )
}
