'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  calculateCommission,
  upsertSplit,
  deleteSplit,
  advanceCommissionStatus,
  registerPayment,
  type Commission,
  type CommissionSplit,
} from '@/app/api/commissions/actions'

// ─── Constants ─────────────────────────────────────────────────────────────────

const BLOCK_LABEL: Record<string, string> = {
  supplier: 'Fornecedor',
  dleon: "D'LEON",
  technicians: 'Equipe Técnica',
}
const BLOCK_COLOR: Record<string, string> = {
  supplier: '#888780',
  dleon: '#FF6B00',
  technicians: '#1D9E75',
}
const STATUS_LABEL: Record<string, string> = {
  calculated: 'Calculada',
  reviewed: 'Conferida',
  closed: 'Fechada',
  pending_payment: 'Pgto pendente',
  partial: 'Pgto parcial',
  paid: 'Paga',
}
const STATUS_FLOW: Array<Commission['status']> = [
  'calculated', 'reviewed', 'closed', 'pending_payment', 'partial', 'paid',
]
const STATUS_COLOR: Record<string, string> = {
  calculated: '#378ADD',
  reviewed: '#7F77DD',
  closed: '#888',
  pending_payment: '#FF6B00',
  partial: '#FFB800',
  paid: '#1D9E75',
}

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  caseId: string
  caseAmount: number
  initialCommission: Commission | null
  technicians: { id: string; name: string; region: string | null }[]
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CommissionShell({ caseId, caseAmount, initialCommission, technicians }: Props) {
  const [commission, setCommission] = useState<Commission | null>(initialCommission)
  const [msg, setMsg] = useState('')
  const [pending, startTransition] = useTransition()
  const [payModal, setPayModal] = useState<CommissionSplit | null>(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'pix', account: '', notes: '' })

  const refresh = useCallback(async () => {
    const res = await calculateCommission(caseId)
    if (res.data) setCommission(res.data)
    if (res.error) setMsg('Erro: ' + res.error)
  }, [caseId])

  // ── Calcular ────────────────────────────────────────────────────────────────
  function handleCalculate() {
    startTransition(async () => {
      const res = await calculateCommission(caseId)
      if (res.data) { setCommission(res.data); setMsg('Comissão calculada!') }
      else setMsg('Erro: ' + res.error)
    })
  }

  // ── Avançar status ──────────────────────────────────────────────────────────
  function handleAdvance() {
    if (!commission) return
    const idx = STATUS_FLOW.indexOf(commission.status)
    const next = STATUS_FLOW[idx + 1]
    if (!next) return
    startTransition(async () => {
      const res = await advanceCommissionStatus(commission.id, caseId, next)
      if (!res.error) {
        setCommission(prev => prev ? { ...prev, status: next } : prev)
        setMsg(`Status: ${STATUS_LABEL[next]}`)
      } else setMsg('Erro: ' + res.error)
    })
  }

  // ── Adicionar split ─────────────────────────────────────────────────────────
  function handleAddSplit(block: string) {
    if (!commission) return
    startTransition(async () => {
      const blockAmount = commission.blocks.find(b => b.block === block)?.amount ?? 0
      const res = await upsertSplit(commission.id, caseId, {
        block: block as any,
        name: 'Novo técnico',
        split_mode: 'pct',
        pct: 0,
        amount: 0,
        sort_order: commission.splits.filter(s => s.block === block).length,
      })
      if (!res.error) await refresh().then(() => {})
      else setMsg('Erro: ' + res.error)
    })
  }

  // ── Salvar split ────────────────────────────────────────────────────────────
  function handleSaveSplit(split: CommissionSplit, field: string, value: any) {
    if (!commission) return
    const blockAmount = commission.blocks.find(b => b.block === split.block)?.amount ?? 0
    const updated = { ...split, [field]: value }

    // Recalcular amount
    if (updated.split_mode === 'pct') {
      updated.amount = Math.round((blockAmount * (Number(updated.pct) || 0)) / 100)
    } else {
      updated.pct = blockAmount > 0 ? Math.round((Number(updated.amount) / blockAmount) * 100) : 0
    }

    // Update optimistic
    setCommission(prev => prev ? {
      ...prev,
      splits: prev.splits.map(s => s.id === split.id ? updated : s),
    } : prev)

    startTransition(async () => {
      const res = await upsertSplit(commission.id, caseId, updated)
      if (res.error) setMsg('Erro: ' + res.error)
    })
  }

  // ── Remover split ───────────────────────────────────────────────────────────
  function handleDeleteSplit(splitId: string) {
    if (!commission) return
    setCommission(prev => prev ? { ...prev, splits: prev.splits.filter(s => s.id !== splitId) } : prev)
    startTransition(async () => {
      const res = await deleteSplit(splitId, commission.id, caseId)
      if (res.error) setMsg('Erro: ' + res.error)
    })
  }

  // ── Registrar pagamento ─────────────────────────────────────────────────────
  function handlePay() {
    if (!commission || !payModal) return
    startTransition(async () => {
      const res = await registerPayment(payModal.id, commission.id, caseId, {
        amount: Number(payForm.amount),
        method: payForm.method,
        account: payForm.account,
        notes: payForm.notes,
      })
      if (!res.error) {
        setPayModal(null)
        setMsg('Pagamento registrado!')
        await refresh()
      } else setMsg('Erro: ' + res.error)
    })
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const card = { background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '16px' }
  const input = { height: '36px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '0 10px', outline: 'none', width: '100%' }
  const numInput = { ...input, width: '72px', textAlign: 'right' as const }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const nextStatusIdx = commission ? STATUS_FLOW.indexOf(commission.status) + 1 : -1
  const nextStatus = nextStatusIdx < STATUS_FLOW.length ? STATUS_FLOW[nextStatusIdx] : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '500' }}>Comissões</h2>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>
            Valor do caso: <span style={{ color: '#FF6B00', fontWeight: '500' }}>¥{caseAmount.toLocaleString('ja-JP')}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {commission && (
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: `${STATUS_COLOR[commission.status]}22`, color: STATUS_COLOR[commission.status] }}>
              {STATUS_LABEL[commission.status]}
            </span>
          )}
          <button onClick={handleCalculate} disabled={pending}
            style={{ fontSize: '12px', padding: '6px 14px', border: '1px solid #2A2A2A', borderRadius: '6px', background: '#1A1A1A', color: '#888', cursor: 'pointer' }}>
            {commission ? '↻ Recalcular' : '＋ Calcular'}
          </button>
          {nextStatus && (
            <button onClick={handleAdvance} disabled={pending}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: '#FF6B00', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              → {STATUS_LABEL[nextStatus]}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ padding: '8px 14px', background: msg.startsWith('Erro') ? 'rgba(226,75,74,0.1)' : 'rgba(29,158,117,0.1)', border: `1px solid ${msg.startsWith('Erro') ? '#E24B4A' : '#1D9E75'}`, borderRadius: '6px', fontSize: '12px', color: msg.startsWith('Erro') ? '#F09595' : '#1D9E75', marginBottom: '16px' }}>
          {msg}
        </div>
      )}

      {!commission ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#555', fontSize: '13px' }}>
          Clique em "＋ Calcular" para gerar a comissão deste caso.
        </div>
      ) : (
        <>
          {/* Blocos resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${commission.blocks.length}, 1fr)`, gap: '10px', marginBottom: '16px' }}>
            {commission.blocks.map(b => (
              <div key={b.block} style={{ background: '#141414', border: `1px solid ${BLOCK_COLOR[b.block]}44`, borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BLOCK_COLOR[b.block] }} />
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{BLOCK_LABEL[b.block]}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>{b.pct}%</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: BLOCK_COLOR[b.block] }}>
                  ¥{Number(b.amount).toLocaleString('ja-JP')}
                </div>
              </div>
            ))}
          </div>

          {/* Splits por bloco — só mostrar técnicos */}
          {commission.blocks.map(block => {
            const splits = commission.splits.filter(s => s.block === block.block)
            const totalPct = splits.reduce((s, sp) => s + Number(sp.pct || 0), 0)
            const totalAmt = splits.reduce((s, sp) => s + Number(sp.amount || 0), 0)
            const pctOk = Math.abs(totalPct - 100) < 0.01 || splits.length === 0

            return (
              <div key={block.block} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: BLOCK_COLOR[block.block] }} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{BLOCK_LABEL[block.block]}</span>
                    <span style={{ fontSize: '11px', color: '#555' }}>
                      {block.pct}% · ¥{Number(block.amount).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <button onClick={() => handleAddSplit(block.block)} disabled={pending}
                    style={{ fontSize: '11px', padding: '3px 10px', border: `1px dashed ${BLOCK_COLOR[block.block]}`, borderRadius: '5px', background: 'none', color: BLOCK_COLOR[block.block], cursor: 'pointer' }}>
                    + Adicionar
                  </button>
                </div>

                {splits.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#333', textAlign: 'center', padding: '12px' }}>
                    Nenhum destinatário. Clique em "+ Adicionar".
                  </div>
                ) : (
                  <>
                    {/* Header da tabela */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px 80px 32px', gap: '8px', fontSize: '10px', color: '#555', marginBottom: '6px', padding: '0 4px' }}>
                      <span>Nome</span><span>Técnico</span><span>Modo</span><span>%</span><span>Valor</span><span>Status</span><span></span>
                    </div>
                    {splits.map(sp => (
                      <SplitRow
                        key={sp.id}
                        split={sp}
                        blockAmount={block.amount}
                        technicians={technicians}
                        onSave={(field, value) => handleSaveSplit(sp, field, value)}
                        onDelete={() => handleDeleteSplit(sp.id)}
                        onPay={() => { setPayModal(sp); setPayForm({ amount: String(sp.amount - sp.paid_amount), method: 'pix', account: '', notes: '' }) }}
                        pending={pending}
                      />
                    ))}

                    {/* Validação soma */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px' }}>
                      <span style={{ color: pctOk ? '#1D9E75' : '#E24B4A' }}>
                        {pctOk ? `✓ Soma = 100%` : `⚠ Soma = ${totalPct.toFixed(1)}% (precisa ser 100%)`}
                      </span>
                      <span style={{ color: '#888' }}>Total: ¥{Math.round(totalAmt).toLocaleString('ja-JP')}</span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Modal de pagamento */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '380px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '16px' }}>Registrar Pagamento — {payModal.name}</h3>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                <span>Total: ¥{Number(payModal.amount).toLocaleString('ja-JP')}</span>
                <span>Já pago: ¥{Number(payModal.paid_amount).toLocaleString('ja-JP')}</span>
                <span style={{ color: '#FF6B00' }}>Saldo: ¥{(payModal.amount - payModal.paid_amount).toLocaleString('ja-JP')}</span>
              </div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Valor *</label>
              <input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} style={{ ...input, marginBottom: '10px' }} />
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Método</label>
              <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))} style={{ ...input, marginBottom: '10px' }}>
                <option value="pix">PIX</option>
                <option value="bank_transfer">Transferência bancária</option>
                <option value="cash">Dinheiro</option>
                <option value="other">Outro</option>
              </select>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Conta / referência</label>
              <input value={payForm.account} onChange={e => setPayForm(p => ({ ...p, account: e.target.value }))} style={{ ...input, marginBottom: '10px' }} />
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Observação</label>
              <input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} style={input} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPayModal(null)} style={{ flex: 1, height: '38px', background: 'none', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={handlePay} disabled={pending || !payForm.amount}
                style={{ flex: 2, height: '38px', background: '#1D9E75', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500', opacity: (pending || !payForm.amount) ? 0.5 : 1 }}>
                {pending ? 'Salvando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SplitRow ──────────────────────────────────────────────────────────────────

function SplitRow({
  split, blockAmount, technicians, onSave, onDelete, onPay, pending,
}: {
  split: CommissionSplit
  blockAmount: number
  technicians: { id: string; name: string; region: string | null }[]
  onSave: (field: string, value: any) => void
  onDelete: () => void
  onPay: () => void
  pending: boolean
}) {
  const paidPct = split.amount > 0 ? Math.round((split.paid_amount / split.amount) * 100) : 0
  const statusColor = split.status === 'paid' ? '#1D9E75' : split.status === 'partial' ? '#FFB800' : '#555'
  const input = { height: '32px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '5px', color: '#F0EEE9', fontSize: '12px', padding: '0 8px', outline: 'none' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px 80px 32px', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
      {/* Nome */}
      <input
        defaultValue={split.name}
        onBlur={e => { if (e.target.value !== split.name) onSave('name', e.target.value) }}
        style={{ ...input, width: '100%' }}
      />
      {/* Técnico */}
      <select
        value={split.technician_id ?? ''}
        onChange={e => onSave('technician_id', e.target.value || null)}
        style={{ ...input, width: '100%' }}
      >
        <option value="">— livre —</option>
        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      {/* Modo */}
      <select
        value={split.split_mode}
        onChange={e => onSave('split_mode', e.target.value)}
        style={{ ...input, width: '100%' }}
      >
        <option value="pct">%</option>
        <option value="fixed">¥ fixo</option>
      </select>
      {/* Pct */}
      {split.split_mode === 'pct' ? (
        <input
          type="number" min="0" max="100"
          defaultValue={split.pct ?? 0}
          onBlur={e => onSave('pct', Number(e.target.value))}
          style={{ ...input, width: '100%', textAlign: 'right' }}
        />
      ) : (
        <span style={{ fontSize: '11px', color: '#555', textAlign: 'right' }}>{split.pct ?? 0}%</span>
      )}
      {/* Amount */}
      {split.split_mode === 'fixed' ? (
        <input
          type="number"
          defaultValue={split.amount}
          onBlur={e => onSave('amount', Number(e.target.value))}
          style={{ ...input, width: '100%', textAlign: 'right' }}
        />
      ) : (
        <span style={{ fontSize: '12px', color: '#1D9E75', textAlign: 'right' }}>¥{Math.round(split.amount).toLocaleString('ja-JP')}</span>
      )}
      {/* Status + pagar */}
      <button
        onClick={onPay}
        disabled={split.status === 'paid' || pending}
        style={{ fontSize: '10px', padding: '3px 6px', border: 'none', borderRadius: '4px', background: split.status === 'paid' ? 'rgba(29,158,117,0.15)' : '#2A2A2A', color: statusColor, cursor: split.status === 'paid' ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
        title={`Pago: ¥${split.paid_amount.toLocaleString('ja-JP')} / ¥${split.amount.toLocaleString('ja-JP')}`}
      >
        {split.status === 'paid' ? '✓ Pago' : split.status === 'partial' ? `${paidPct}%` : 'Pagar'}
      </button>
      {/* Remover */}
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '16px', padding: 0 }}>×</button>
    </div>
  )
}
