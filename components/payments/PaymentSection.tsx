'use client'

import { useState, useTransition } from 'react'
import {
  createPayment,
  cancelPayment,
  PAYMENT_METHODS,
  PAYMENT_ACCOUNTS,
  type Payment,
  type PaymentStatus,
} from '@/app/api/payments/actions'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending:  '🔴 Aguardando pagamento',
  partial:  '🟡 Parcialmente pago',
  paid:     '🟢 Pago',
  overdue:  '🔺 Atrasado',
}
const STATUS_COLOR: Record<PaymentStatus, string> = {
  pending: '#888',
  partial: '#FFB800',
  paid:    '#1D9E75',
  overdue: '#ef4444',
}

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  caseId:           string
  totalAmount:      number
  initialPayments:  Payment[]
  initialReceived:  number
  initialBalance:   number
  initialStatus:    PaymentStatus
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PaymentSection({
  caseId,
  totalAmount,
  initialPayments,
  initialReceived,
  initialBalance,
  initialStatus,
}: Props) {
  const [payments,  setPayments]  = useState<Payment[]>(initialPayments)
  const [received,  setReceived]  = useState(initialReceived)
  const [balance,   setBalance]   = useState(initialBalance)
  const [status,    setStatus]    = useState<PaymentStatus>(initialStatus)
  const [showModal, setShowModal] = useState(false)
  const [err,       setErr]       = useState('')
  const [isPending, startTransition] = useTransition()

  // Form state
  const today = new Date().toISOString().slice(0, 10)
  const [amount,    setAmount]    = useState('')
  const [paidAt,    setPaidAt]    = useState(today)
  const [method,    setMethod]    = useState('bank_transfer')
  const [account,   setAccount]   = useState('')
  const [reference, setReference] = useState('')
  const [notes,     setNotes]     = useState('')

  const fmt = (n: number) => '¥' + n.toLocaleString('ja-JP')

  function openModal() {
    setAmount(''); setPaidAt(today); setMethod('bank_transfer')
    setAccount(''); setReference(''); setNotes(''); setErr('')
    setShowModal(true)
  }

  function recompute(list: Payment[]) {
    const confirmed = list.filter(p => p.status === 'confirmed')
    const rec = confirmed.reduce((s, p) => s + Number(p.amount), 0)
    const bal = totalAmount - rec
    setReceived(rec)
    setBalance(bal)
    setStatus(rec <= 0 ? 'pending' : rec >= totalAmount ? 'paid' : 'partial')
  }

  async function handleRegister() {
    const amt = parseFloat(amount.replace(/,/g, ''))
    if (!amt || amt <= 0) { setErr('Valor inválido'); return }
    setErr('')
    startTransition(async () => {
      const res = await createPayment(caseId, {
        amount: amt, paid_at: paidAt, method, account, reference, notes,
      })
      if (res.error) { setErr(res.error); return }
      // Optimistic update
      const newPayment: Payment = {
        id: crypto.randomUUID(), case_id: caseId, amount: amt,
        paid_at: paidAt, method, account: account || null,
        reference: reference || null, notes: notes || null,
        attachment_url: null, status: 'confirmed',
        created_by: null, created_at: new Date().toISOString(),
      }
      const updated = [newPayment, ...payments]
      setPayments(updated)
      recompute(updated)
      setShowModal(false)
    })
  }

  async function handleCancel(paymentId: string) {
    if (!confirm('Cancelar este pagamento?')) return
    startTransition(async () => {
      const res = await cancelPayment(paymentId, caseId)
      if (res.error) { alert(res.error); return }
      const updated = payments.map(p =>
        p.id === paymentId ? { ...p, status: 'cancelled' as const } : p
      )
      setPayments(updated)
      recompute(updated)
    })
  }

  const card: React.CSSProperties = {
    background: '#141414', border: '1px solid #2A2A2A',
    borderRadius: '10px', padding: '16px',
  }
  const INP: React.CSSProperties = {
    width: '100%', background: '#0D0D0D', border: '1px solid #2A2A2A',
    borderRadius: '7px', padding: '9px 12px', color: '#F0EEE9',
    fontSize: '13px', boxSizing: 'border-box',
  }
  const LBL: React.CSSProperties = {
    fontSize: '11px', color: '#555', display: 'block', marginBottom: '5px',
  }

  const confirmedPayments = payments.filter(p => p.status === 'confirmed')
  const cancelledPayments = payments.filter(p => p.status === 'cancelled')

  return (
    <>
      {/* ─── KPI cards ─────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#555' }}>FINANCEIRO</div>
          <button
            onClick={openModal}
            disabled={isPending}
            style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            + Registrar pagamento
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'Valor do caso',  value: totalAmount, color: '#F0EEE9' },
            { label: 'Recebido',       value: received,    color: '#1D9E75' },
            { label: 'Saldo',          value: balance,     color: balance > 0 ? '#FF6B00' : '#1D9E75' },
          ].map(k => (
            <div key={k.label} style={{ background: '#111', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: k.color }}>{fmt(k.value)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px', padding: '4px 12px', borderRadius: '10px', background: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status], fontWeight: '500' }}>
          {STATUS_LABEL[status]}
        </div>
      </div>

      {/* ─── Histórico ─────────────────────────────────────────────────────── */}
      {payments.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '12px' }}>HISTÓRICO DE PAGAMENTOS</div>

          {confirmedPayments.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1A1A1A' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75' }}>{fmt(Number(p.amount))}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{new Date(p.paid_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                  {PAYMENT_METHODS[p.method] ?? p.method}
                  {p.account    && ` · ${p.account}`}
                  {p.reference  && ` · Ref: ${p.reference}`}
                </div>
                {p.notes && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{p.notes}</div>}
              </div>
              <button
                onClick={() => handleCancel(p.id)}
                style={{ background: 'none', border: '1px solid #2A2A2A', color: '#555', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          ))}

          {cancelledPayments.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '10px', color: '#333', marginBottom: '6px' }}>CANCELADOS</div>
              {cancelledPayments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px', color: '#333', textDecoration: 'line-through' }}>
                  <span>{fmt(Number(p.amount))} · {PAYMENT_METHODS[p.method] ?? p.method}</span>
                  <span>{new Date(p.paid_at).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '14px', width: '460px', maxWidth: '95vw', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #1E1E1E' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Registrar pagamento</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Valor */}
              <div>
                <label style={LBL}>Valor recebido *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', fontSize: '13px' }}>¥</span>
                  <input
                    type="number" min="1" step="1"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    style={{ ...INP, paddingLeft: '24px' }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                  Saldo atual: {fmt(balance)}
                </div>
              </div>

              {/* Data */}
              <div>
                <label style={LBL}>Data do pagamento</label>
                <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} style={INP} />
              </div>

              {/* Método */}
              <div>
                <label style={LBL}>Método</label>
                <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...INP, appearance: 'none' }}>
                  {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Conta */}
              <div>
                <label style={LBL}>Conta que recebeu</label>
                <select value={account} onChange={e => setAccount(e.target.value)} style={{ ...INP, appearance: 'none' }}>
                  <option value="">— Selecionar —</option>
                  {PAYMENT_ACCOUNTS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Referência */}
              <div>
                <label style={LBL}>Referência (opcional)</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex: nº da transferência" style={INP} />
              </div>

              {/* Observação */}
              <div>
                <label style={LBL}>Observação (opcional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ex: Pagamento referente ao lote Agosto" style={{ ...INP, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Comprovante */}
              <div>
                <label style={LBL}>Comprovante (em breve)</label>
                <div style={{ background: '#111', border: '1px dashed #2A2A2A', borderRadius: '7px', padding: '12px', textAlign: 'center', fontSize: '12px', color: '#333' }}>
                  Upload disponível em breve (PDF, JPG, PNG)
                </div>
              </div>

              {err && <div style={{ fontSize: '12px', color: '#ef4444' }}>{err}</div>}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #1E1E1E', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', color: '#555', border: '1px solid #2A2A2A', borderRadius: '7px', padding: '8px 18px', fontSize: '12px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={handleRegister}
                disabled={isPending || !amount}
                style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 22px', fontSize: '12px', fontWeight: '700', cursor: isPending || !amount ? 'not-allowed' : 'pointer', opacity: isPending || !amount ? 0.6 : 1 }}
              >
                {isPending ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
