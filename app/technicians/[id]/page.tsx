import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import {
  getTechnicianKpis,
  getTechnicianTimeline,
  getTechnicianPayments,
  getMonthlyKpis,
} from '@/app/api/repasse/actions'
import { getTechnicianWithRoles, getAvailableOperations } from '@/app/api/roles/actions'
import TechnicianRolesShell from '@/components/technicians/TechnicianRolesShell'
import { ROLE_LABEL, ROLE_COLOR } from '@/app/api/roles/constants'

export default async function TechnicianProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tech } = await supabase
    .from('technicians')
    .select('id, name, role, active, primary_role')
    .eq('id', id)
    .single()

  if (!tech) notFound()

  const [kpis, timeline, payments, monthly, techRoles, availableOps] = await Promise.all([
    getTechnicianKpis(id),
    getTechnicianTimeline(id),
    getTechnicianPayments(id),
    getMonthlyKpis(id),
    getTechnicianWithRoles(id),
    getAvailableOperations(),
  ])

  const fmt = (n: number) => '¥' + n.toLocaleString('ja-JP')
  const card: React.CSSProperties = { background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '16px' }

  const SPLIT_STATUS_COLOR: Record<string, string> = {
    pending: '#555', partial: '#FFB800', paid: '#1D9E75',
  }

  const primaryRoleColor = techRoles?.primary_role
    ? ROLE_COLOR[techRoles.primary_role] ?? '#555'
    : '#555'
  const primaryRoleLabel = techRoles?.primary_role
    ? ROLE_LABEL[techRoles.primary_role]
    : null

  return (
    <AppShell userEmail={user.email}>
    <div style={{ maxWidth: '960px', margin: '0 auto', color: '#F0EEE9' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#1D9E7533', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#1D9E75' }}>
          {tech.name.charAt(0)}
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{tech.name}</h1>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>{tech.role ?? 'Técnico'}</span>
            {primaryRoleLabel && (
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                background: `${primaryRoleColor}22`, color: primaryRoleColor, border: `1px solid ${primaryRoleColor}44`,
              }}>
                {primaryRoleLabel}
              </span>
            )}
            <span style={{ fontSize: '11px', color: tech.active ? '#1D9E75' : '#555' }}>
              {tech.active ? '● Ativo' : '○ Inativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Layout: 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
      <div>{/* Coluna esquerda: KPIs + financeiro */}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Casos atendidos', value: kpis?.total_cases ?? 0, format: 'num' },
          { label: 'Receita gerada', value: kpis?.revenue_generated ?? 0, format: 'yen' },
          { label: 'Comissão total', value: kpis?.commission_total ?? 0, format: 'yen' },
          { label: 'Já repassado', value: kpis?.commission_paid ?? 0, format: 'yen', color: '#1D9E75' },
          { label: 'Pendente', value: kpis?.commission_pending ?? 0, format: 'yen', color: '#FF6B00' },
          { label: 'Ag. liberação', value: kpis?.splits_awaiting_liberation ?? 0, format: 'num', color: '#FF6B00' },
        ].map(k => (
          <div key={k.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: k.color ?? '#F0EEE9' }}>
              {k.format === 'yen' ? fmt(Number(k.value)) : k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Este mês */}
      <div style={card}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '12px' }}>ESTE MÊS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Casos', value: monthly.cases, format: 'num' },
            { label: 'Receita', value: monthly.revenue, format: 'yen' },
            { label: 'Comissão', value: monthly.commission, format: 'yen' },
            { label: 'Ticket médio', value: monthly.avgTicket, format: 'yen' },
          ].map(k => (
            <div key={k.label}>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>
                {k.format === 'yen' ? fmt(Number(k.value)) : k.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline de casos */}
      <div style={card}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>HISTÓRICO DE CASOS</div>
        {timeline.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', padding: '20px 0' }}>Nenhum caso ainda.</p>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 80px 80px', gap: '10px', fontSize: '10px', color: '#444', marginBottom: '8px', padding: '0 4px' }}>
              <span>Caso</span><span>Cliente / Veículo</span><span>Comissão</span><span>Pago</span><span>Status</span>
            </div>
            {timeline.map(row => (
              <a key={row.splitId} href={`/commissions/${row.caseId}`} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 80px 80px', gap: '10px', alignItems: 'center', padding: '10px 4px', borderTop: '1px solid #1A1A1A', textDecoration: 'none', color: 'inherit' }}>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#FF6B00' }}>{row.caseNumber}</span>
                <div>
                  <div style={{ fontSize: '12px' }}>{row.customerName}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{row.vehicle}</div>
                </div>
                <span style={{ fontSize: '12px' }}>{fmt(row.amount)}</span>
                <span style={{ fontSize: '12px', color: '#1D9E75' }}>{fmt(row.paid_amount)}</span>
                <span style={{ fontSize: '11px', color: SPLIT_STATUS_COLOR[row.status] ?? '#555' }}>
                  {row.status === 'paid' ? '✓ Pago' : row.status === 'partial' ? 'Parcial' : 'Pendente'}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Histórico de repasses */}
      <div style={card}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>REPASSES RECEBIDOS</div>
        {payments.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', padding: '20px 0' }}>Nenhum repasse registrado.</p>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 100px 1fr 80px 80px', gap: '10px', fontSize: '10px', color: '#444', marginBottom: '8px', padding: '0 4px' }}>
              <span>Data</span><span>Caso</span><span>Método / Conta</span><span>Valor</span><span>Ref.</span>
            </div>
            {payments.map(p => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '100px 100px 1fr 80px 80px', gap: '10px', alignItems: 'center', padding: '10px 4px', borderTop: '1px solid #1A1A1A' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>{new Date(p.paid_at).toLocaleDateString('pt-BR')}</span>
                <a href={`/commissions/${p.caseId}`} style={{ fontSize: '12px', color: '#FF6B00', textDecoration: 'none' }}>{p.caseNumber}</a>
                <div>
                  <div style={{ fontSize: '12px' }}>{p.method}</div>
                  {p.account && <div style={{ fontSize: '11px', color: '#555' }}>{p.account}</div>}
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1D9E75' }}>{fmt(Number(p.amount))}</span>
                <span style={{ fontSize: '11px', color: '#555' }}>{p.reference ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>{/* fim coluna esquerda */}

      {/* Coluna direita: Função & acesso */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', color: '#F0EEE9' }}>
          FUNÇÃO &amp; ACESSO
        </div>
        {techRoles ? (
          <TechnicianRolesShell
            tech={techRoles}
            availableOperations={availableOps}
          />
        ) : (
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', fontSize: '12px', color: '#555' }}>
            Migration 010 ainda não aplicada — execute no Supabase para habilitar funções.
          </div>
        )}
      </div>
      </div>{/* fim grid 2 colunas */}
    </div>
    </AppShell>
  )
}
