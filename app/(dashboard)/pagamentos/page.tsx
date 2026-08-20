import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { getAllPaymentSummaries } from '@/app/api/payments/actions'

const STATUS_LABEL: Record<string, string> = {
  pending: '🔴 Aguardando',
  partial: '🟡 Parcial',
  paid:    '🟢 Pago',
  overdue: '🔺 Atrasado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#888',
  partial: '#FFB800',
  paid:    '#1D9E75',
  overdue: '#ef4444',
}

export default async function PagamentosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const summaries = await getAllPaymentSummaries()

  const fmt = (n: number) => '¥' + n.toLocaleString('ja-JP')

  const totalGeral    = summaries.reduce((s, c) => s + c.total_amount, 0)
  const recebidoGeral = summaries.reduce((s, c) => s + c.received, 0)
  const saldoGeral    = summaries.reduce((s, c) => s + c.balance, 0)
  const qtyPaid       = summaries.filter(c => c.payment_status === 'paid').length
  const qtyPartial    = summaries.filter(c => c.payment_status === 'partial').length
  const qtyPending    = summaries.filter(c => c.payment_status === 'pending').length

  const card: React.CSSProperties = {
    background: '#141414', border: '1px solid #2A2A2A',
    borderRadius: '10px', padding: '16px',
  }

  return (
    <AppShell userEmail={user.email}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '500' }}>Pagamentos dos Clientes</h1>
        <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Recebimentos por caso</p>
      </div>

      {/* KPIs globais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total faturado',  value: fmt(totalGeral),    color: '#F0EEE9' },
          { label: 'Total recebido',  value: fmt(recebidoGeral), color: '#1D9E75' },
          { label: 'Saldo pendente',  value: fmt(saldoGeral),    color: saldoGeral > 0 ? '#FF6B00' : '#1D9E75' },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Status counts */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[
          { label: `${qtyPaid} Pagos`,        color: '#1D9E75' },
          { label: `${qtyPartial} Parciais`,  color: '#FFB800' },
          { label: `${qtyPending} Pendentes`, color: '#888' },
        ].map(b => (
          <span key={b.label} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '10px', background: `${b.color}22`, color: b.color, fontWeight: '500' }}>
            {b.label}
          </span>
        ))}
      </div>

      {/* Tabela */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 110px 110px 110px 100px', gap: '0', fontSize: '10px', color: '#555', borderBottom: '1px solid #1E1E1E', paddingBottom: '8px', marginBottom: '4px' }}>
          <span>CASO</span>
          <span>CLIENTE</span>
          <span style={{ textAlign: 'right' }}>VALOR</span>
          <span style={{ textAlign: 'right' }}>RECEBIDO</span>
          <span style={{ textAlign: 'right' }}>SALDO</span>
          <span style={{ textAlign: 'right' }}>STATUS</span>
        </div>

        {summaries.length === 0 && (
          <div style={{ fontSize: '13px', color: '#555', padding: '20px 0', textAlign: 'center' }}>Nenhum caso encontrado.</div>
        )}

        {summaries.map(c => (
          <Link key={c.id} href={`/cases/${c.id}`} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 110px 110px 110px 100px', gap: '0', padding: '10px 0', borderBottom: '1px solid #1A1A1A', textDecoration: 'none', color: 'inherit', alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FF6B00' }}>{c.case_number}</span>
            <span style={{ fontSize: '13px', color: '#F0EEE9' }}>{c.customer_name}</span>
            <span style={{ fontSize: '13px', textAlign: 'right', color: '#F0EEE9' }}>{fmt(c.total_amount)}</span>
            <span style={{ fontSize: '13px', textAlign: 'right', color: '#1D9E75' }}>{fmt(c.received)}</span>
            <span style={{ fontSize: '13px', textAlign: 'right', color: c.balance > 0 ? '#FF6B00' : '#1D9E75' }}>{fmt(c.balance)}</span>
            <span style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '8px', background: `${STATUS_COLOR[c.payment_status] ?? '#888'}22`, color: STATUS_COLOR[c.payment_status] ?? '#888', whiteSpace: 'nowrap' }}>
                {STATUS_LABEL[c.payment_status] ?? c.payment_status}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}
