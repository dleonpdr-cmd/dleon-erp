'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  calculateCommission,
  upsertSplit,
  deleteSplit,
  advanceCommissionStatus,
  type Commission,
  type CommissionSplit,
} from '@/app/api/commissions/actions'
import {
  solicitarLiberacao,
  liberarComissao,
  registrarRepasse,
} from '@/app/api/repasse/actions'
import { REPASSE_METHODS, REPASSE_ACCOUNTS } from '@/app/api/repasse/constants'

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
  calculated:          'Calculada',
  reviewed:            'Conferida',
  closed:              'Fechada',
  awaiting_liberation: 'Ag. liberação',
  liberated:           'Liberada',
  pending_payment:     'Pgto pendente',
  partial:             'Pgto parcial',
  paid:                'Paga',
}
// Apenas os estados que avançam via botão genérico (até closed)
const STATUS_FLOW_GENERIC: Array<Commission['status']> = [
  'calculated', 'reviewed', 'closed',
]
const STATUS_COLOR: Record<string, string> = {
  calculated:          '#378ADD',
  reviewed:            '#7F77DD',
  closed:              '#888',
  awaiting_liberation: '#FF6B00',
  liberated:           '#1D9E75',
  pending_payment:     '#FF6B00',
  partial:             '#FFB800',
  paid:                '#1D9E75',
}

const REPASSE_ENABLED_STATUSES = ['liberated', 'pending_payment', 'partial']

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
  const [repasseModal, setRepasseModal] = useState<CommissionSplit | null>(null)
  const [repasseForm, setRepasseForm] = useState({
    amount: '', paid_at: new Date().toISOString().slice(0,10),
    method: 'bank_transfer', account: '', reference: '', notes: '',
  })

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

  // ── Avançar status genérico (até closed) ───────────────────────────────────
  function handleAdvance() {
    if (!commission) return
    const idx = STATUS_FLOW_GENERIC.indexOf(commission.status as any)
    const next = STATUS_FLOW_GENERIC[idx + 1]
    if (!next) return
    startTransition(async () => {
      const res = await advanceCommissionStatus(commission.id, caseId, next)
      if (!res.error) {
        setCommission(prev => prev ? { ...prev, status: next } : prev)
        setMsg(`Status: ${STATUS_LABEL[next]}`)
      } else setMsg('Erro: ' + res.error)
    })
  }

  // ── Solicitar liberação (closed → awaiting_liberation) ──────────────────────
  function handleSolicitarLiberacao() {
    startTransition(async () => {
      const res = await solicitarLiberacao(caseId)
      if (!res.error) {
        setCommission(prev => prev ? { ...prev, status: 'awaiting_liberation' as any } : prev)
        setMsg('Comissão enviada para liberação.')
      } else setMsg('Erro: ' + res.error)
    })
  }

  // ── Liberar comissão (awaiting_liberation → liberated) ─────────────────────
  function handleLiberarComissao() {
    startTransition(async () => {
      const res = await liberarComissao(caseId)
      if (!res.error) {
        setCommission(prev => prev ? { ...prev, status: 'liberated' as any } : prev)
        setMsg('Comissão liberada para repasse!')
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

  // ── Registrar repasse ───────────────────────────────────────────────────────
  function handleRepasse() {
    if (!repasseModal) return
    startTransition(async () => {
      const res = await registrarRepasse(repasseModal.id, caseId, {
        amount:    Number(repasseForm.amount),
        paid_at:   repasseForm.paid_at,
        method:    repasseForm.method,
        account:   repasseForm.account || undefined,
        reference: repasseForm.reference || undefined,
        notes:     repasseForm.notes || undefined,
      })
      if (!res.error) {
        setRepasseModal(null)
        setMsg('Repasse registrado!')
        await refresh()
      } else setMsg('Erro: ' + res.error)
    })
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const card = { background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '16px' }
  const input = { height: '36px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '0 10px', outline: 'none', width: '100%' }
  const numInput = { ...input, width: '72px', textAlign: 'right' as const }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const status = commission?.status ?? ''
  const genericIdx = STATUS_FLOW_GENERIC.indexOf(status as any)
  const nextGeneric = genericIdx >= 0 && genericIdx < STATUS_FLOW_GENERIC.length - 1
    ? STATUS_FLOW_GENERIC[genericIdx + 1]
    : null
  const repasseEnabled = REPASSE_ENABLED_STATUSES.includes(status)

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
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status] }}>
              {STATUS_LABEL[status]}
            </span>
          )}
          <button onClick={handleCalculate} disabled={pending}
            style={{ fontSize: '12px', padding: '6px 14px', border: '1px solid #2A2A2A', borderRadius: '6px', background: '#1A1A1A', color: '#888', cursor: 'pointer' }}>
            {commission ? '↻ Recalcular' : '＋ Calcular'}
          </button>
          {/* Botões por estado */}
          {nextGeneric && (
            <button onClick={handleAdvance} disabled={pending}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: '#2A2A2A', color: '#F0EEE9', border: 'none', cursor: 'pointer' }}>
              → {STATUS_LABEL[nextGeneric]}
            </button>
          )}
          {status === 'closed' && (
            <button onClick={handleSolicitarLiberacao} disabled={pending}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: '#FF6B00', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              Solicitar liberação
            </button>
          )}
          {status === 'awaiting_liberation' && (
            <button onClick={handleLiberarComissao} disabled={pending}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', background: '#1D9E75', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              ✓ Liberar comissão
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
                        onRepasse={repasseEnabled ? () => {
                          setRepasseModal(sp)
                          setRepasseForm({ amount: String(Math.max(0, sp.amount - sp.paid_amount)), paid_at: new Date().toISOString().slice(0,10), method: 'bank_transfer', account: '', reference: '', notes: '' })
                        } : undefined}
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

      {/* Modal de repasse */}
      {repasseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '95vw' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>Registrar Repasse</h3>
            <p style={{ fontSize: '12px', color: '#FF6B00', marginBottom: '16px' }}>{repasseModal.name}</p>
            {/* KPIs do split */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'A receber', value: repasseModal.amount, color: '#F0EEE9' },
                { label: 'Já pago', value: repasseModal.paid_amount, color: '#1D9E75' },
                { label: 'Saldo', value: repasseModal.amount - repasseModal.paid_amount, color: '#FF6B00' },
              ].map(k => (
                <div key={k.label} style={{ background: '#1A1A1A', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{k.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: k.color }}>¥{Number(k.value).toLocaleString('ja-JP')}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Valor *</label>
                <input type="number" value={repasseForm.amount} onChange={e => setRepasseForm(p => ({ ...p, amount: e.target.value }))}
                  style={{ ...input, width: '100%' }} placeholder="¥" />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Data *</label>
                <input type="date" value={repasseForm.paid_at} onChange={e => setRepasseForm(p => ({ ...p, paid_at: e.target.value }))}
                  style={{ ...input, width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Método</label>
              <select value={repasseForm.method} onChange={e => setRepasseForm(p => ({ ...p, method: e.target.value }))} style={{ ...input, width: '100%' }}>
                {Object.entries(REPASSE_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Conta utilizada</label>
              <select value={repasseForm.account} onChange={e => setRepasseForm(p => ({ ...p, account: e.target.value }))} style={{ ...input, width: '100%' }}>
                <option value="">— selecionar —</option>
                {REPASSE_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Referência</label>
              <input value={repasseForm.reference} onChange={e => setRepasseForm(p => ({ ...p, reference: e.target.value }))}
                style={{ ...input, width: '100%' }} placeholder="Número de comprovante, etc." />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Observação</label>
              <input value={repasseForm.notes} onChange={e => setRepasseForm(p => ({ ...p, notes: e.target.value }))}
                style={{ ...input, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setRepasseModal(null)}
                style={{ flex: 1, height: '38px', background: 'none', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '13px' }}>
                Cancelar
              </button>
              <button onClick={handleRepasse} disabled={pending || !repasseForm.amount || !repasseForm.paid_at}
                style={{ flex: 2, height: '38px', background: '#1D9E75', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500', opacity: (pending || !repasseForm.amount) ? 0.5 : 1 }}>
                {pending ? 'Registrando...' : 'Registrar repasse'}
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
  split, blockAmount, technicians, onSave, onDelete, onRepasse, pending,
}: {
  split: CommissionSplit
  blockAmount: number
  technicians: { id: string; name: string; region: string | null }[]
  onSave: (field: string, value: any) => void
  onDelete: () => void
  onRepasse?: () => void
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
      {/* Status + repasse */}
      <button
        onClick={onRepasse}
        disabled={!onRepasse || split.status === 'paid' || pending}
        style={{ fontSize: '10px', padding: '3px 6px', border: 'none', borderRadius: '4px', background: split.status === 'paid' ? 'rgba(29,158,117,0.15)' : onRepasse ? '#2A2A2A' : '#1A1A1A', color: statusColor, cursor: (onRepasse && split.status !== 'paid') ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
        title={`Pago: ¥${split.paid_amount.toLocaleString('ja-JP')} / ¥${split.amount.toLocaleString('ja-JP')}`}
      >
        {split.status === 'paid' ? '✓ Pago' : split.status === 'partial' ? `${paidPct}%` : onRepasse ? 'Repassar' : '—'}
      </button>
      {/* Remover */}
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '16px', padding: 0 }}>×</button>
    </div>
  )
}
