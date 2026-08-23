'use client'

import { useState, useTransition } from 'react'
import type { WorkOrder } from '@/app/api/work-orders/actions'
import {
  startRepair,
  pauseRepair,
  finishRepair,
  returnToRepair,
  markReadyToInvoice,
  updateItemStatus,
  submitQC,
  addTechnician,
} from '@/app/api/work-orders/actions'
import {
  WO_STATUS_LABEL, WO_STATUS_COLOR,
  ITEM_STATUS_LABEL, ITEM_STATUS_COLOR,
  PAUSE_REASON_LABEL, QC_CHECKS, WO_EVENT_LABEL,
  getNextAction, formatWorkedTime,
} from '@/app/api/work-orders/constants'

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#141414', border: '1px solid #2A2A2A',
  borderRadius: '10px', padding: '20px', marginBottom: '16px',
}
const input: React.CSSProperties = {
  height: '36px', background: '#1A1A1A', border: '1px solid #2A2A2A',
  borderRadius: '6px', color: '#F0EEE9', fontSize: '12px',
  padding: '0 10px', outline: 'none', width: '100%',
}
const btn = (bg: string, color = '#fff'): React.CSSProperties => ({
  height: '36px', padding: '0 16px', background: bg, border: 'none',
  borderRadius: '6px', color, cursor: 'pointer', fontSize: '12px',
  fontWeight: '500', whiteSpace: 'nowrap' as const,
})

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  workOrder: WorkOrder
  technicians: { id: string; name: string }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkOrderShell({ workOrder: initial, technicians }: Props) {
  const [wo, setWo]         = useState<WorkOrder>(initial)
  const [msg, setMsg]       = useState('')
  const [pending, startT]   = useTransition()
  const [pauseModal, setPauseModal] = useState(false)
  const [pauseReason, setPauseReason] = useState('lunch')
  const [pauseNotes, setPauseNotes]   = useState('')
  const [qcMode, setQcMode]   = useState(false)
  const [qcItems, setQcItems] = useState<Record<string, { result: string; notes: string }>>(
    Object.fromEntries(QC_CHECKS.map(c => [c.key, { result: 'pending', notes: '' }]))
  )
  const [qcNotes, setQcNotes]           = useState('')
  const [qcRejReason, setQcRejReason]   = useState('')
  const [addTechModal, setAddTechModal] = useState(false)
  const [selectedTech, setSelectedTech] = useState('')

  const nextAction = getNextAction(wo)
  const activePause = wo.pauses.find(p => !p.ended_at)

  // Compute worked time
  const workedMin = (() => {
    if (!wo.started_at) return 0
    const end = wo.finished_at ? new Date(wo.finished_at) : new Date()
    const total = (end.getTime() - new Date(wo.started_at).getTime()) / 60000
    const paused = wo.pauses.reduce((acc, p) => {
      const ps = new Date(p.started_at).getTime()
      const pe = p.ended_at ? new Date(p.ended_at).getTime() : Date.now()
      return acc + (pe - ps) / 60000
    }, 0)
    return Math.max(0, Math.round(total - paused))
  })()

  function act(fn: () => Promise<void>) {
    startT(async () => {
      await fn()
    })
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  // ── Actions ──────────────────────────────────────────────────────────────────

  function handleStart() {
    act(async () => {
      const r = await startRepair(wo.id)
      if (r.error) flash('Erro: ' + r.error)
      else {
        setWo(prev => ({ ...prev, status: 'in_progress', started_at: prev.started_at ?? new Date().toISOString() }))
        flash('Reparo iniciado!')
      }
    })
  }

  function handlePause() {
    act(async () => {
      const r = await pauseRepair(wo.id, pauseReason, pauseNotes || undefined)
      if (r.error) flash('Erro: ' + r.error)
      else {
        setPauseModal(false)
        setWo(prev => ({
          ...prev, status: 'paused',
          pauses: [...prev.pauses, { id: crypto.randomUUID(), reason: pauseReason, reason_notes: pauseNotes || null, started_at: new Date().toISOString(), ended_at: null }],
        }))
        flash('Serviço pausado.')
      }
    })
  }

  function handleResume() {
    act(async () => {
      const r = await startRepair(wo.id)
      if (r.error) flash('Erro: ' + r.error)
      else {
        setWo(prev => ({
          ...prev, status: 'in_progress',
          pauses: prev.pauses.map(p => !p.ended_at ? { ...p, ended_at: new Date().toISOString() } : p),
        }))
        flash('Reparo retomado!')
      }
    })
  }

  function handleFinish() {
    act(async () => {
      const r = await finishRepair(wo.id)
      if (r.error) flash('Erro: ' + r.error)
      else { setWo(prev => ({ ...prev, status: 'waiting_qc', finished_at: new Date().toISOString() })); flash('Aguardando QC.') }
    })
  }

  function handleReturnToRepair() {
    act(async () => {
      const r = await returnToRepair(wo.id)
      if (r.error) flash('Erro: ' + r.error)
      else { setWo(prev => ({ ...prev, status: 'in_progress', finished_at: null })); flash('Retornou para reparo.') }
    })
  }

  function handleReadyToInvoice() {
    act(async () => {
      const r = await markReadyToInvoice(wo.id)
      if (r.error) flash('Erro: ' + r.error)
      else { setWo(prev => ({ ...prev, status: 'ready_to_invoice' })); flash('Pronto para faturar!') }
    })
  }

  function handleItemStatus(itemId: string, status: 'pending' | 'in_progress' | 'completed' | 'issue') {
    act(async () => {
      const r = await updateItemStatus(itemId, wo.id, status)
      if (r.error) flash('Erro: ' + r.error)
      else setWo(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, status, completed_at: status === 'completed' ? new Date().toISOString() : null } : i),
      }))
    })
  }

  function handleSubmitQC(approved: boolean) {
    if (!wo.quality_check) return
    act(async () => {
      const items = QC_CHECKS.map(c => ({ check_key: c.key, result: qcItems[c.key]?.result ?? 'pending', notes: qcItems[c.key]?.notes || undefined }))
      const r = await submitQC(wo.id, wo.quality_check!.id, items, approved, qcRejReason || undefined, qcNotes || undefined)
      if (r.error) flash('Erro: ' + r.error)
      else {
        setQcMode(false)
        setWo(prev => ({ ...prev, status: approved ? 'completed' : 'qc_rejected', qc_approved_at: approved ? new Date().toISOString() : null }))
        flash(approved ? 'QC aprovado! OS concluída.' : 'QC reprovado.')
      }
    })
  }

  function handleAddTech() {
    if (!selectedTech) return
    act(async () => {
      const r = await addTechnician(wo.id, selectedTech)
      if (r.error) flash('Erro: ' + r.error)
      else {
        setAddTechModal(false)
        const tech = technicians.find(t => t.id === selectedTech)
        setWo(prev => ({
          ...prev,
          technicians: [...prev.technicians, { id: crypto.randomUUID(), work_order_id: wo.id, technician_id: selectedTech, role: 'assistant', added_at: new Date().toISOString(), removed_at: null, technicians: tech ? { id: selectedTech, name: tech.name, role: null } : null }],
        }))
        flash(`${tech?.name} adicionado.`)
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Msg flash */}
      {msg && (
        <div style={{ padding: '8px 14px', marginBottom: '16px', borderRadius: '6px', fontSize: '12px', background: msg.startsWith('Erro') ? 'rgba(226,75,74,0.1)' : 'rgba(29,158,117,0.1)', border: `1px solid ${msg.startsWith('Erro') ? '#E24B4A' : '#1D9E75'}`, color: msg.startsWith('Erro') ? '#F09595' : '#1D9E75' }}>
          {msg}
        </div>
      )}

      {/* Próxima ação */}
      {!['cancelled', 'ready_to_invoice'].includes(wo.status) && (
        <div style={{ ...card, background: '#0D1A14', border: '1px solid #1D9E7544', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', color: '#1D9E75', marginBottom: '4px' }}>PRÓXIMA AÇÃO</div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#1D9E75' }}>{nextAction.label}</div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Status', value: WO_STATUS_LABEL[wo.status], color: WO_STATUS_COLOR[wo.status] },
          { label: 'Responsável', value: wo.responsible?.name ?? '—', color: '#F0EEE9' },
          { label: 'Início', value: wo.started_at ? new Date(wo.started_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—', color: '#F0EEE9' },
          { label: 'Tempo efetivo', value: formatWorkedTime(workedMin), color: wo.status === 'in_progress' ? '#FF6B00' : '#F0EEE9' },
          { label: 'QC', value: wo.quality_check?.status === 'approved' ? '✓ Aprovado' : wo.quality_check?.status === 'rejected' ? '✗ Reprovado' : wo.status === 'waiting_qc' ? 'Em revisão' : 'Pendente', color: wo.quality_check?.status === 'approved' ? '#1D9E75' : wo.quality_check?.status === 'rejected' ? '#E24B4A' : '#555' },
        ].map(k => (
          <div key={k.label} style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Botões de ação */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {wo.status === 'waiting' && (
          <button onClick={handleStart} disabled={pending} style={btn('#1D9E75')}>▶ Iniciar reparo</button>
        )}
        {wo.status === 'in_progress' && (<>
          <button onClick={() => setPauseModal(true)} disabled={pending} style={btn('#2A2A2A', '#888')}>⏸ Pausar</button>
          <button onClick={handleFinish} disabled={pending} style={btn('#FF6B00')}>✓ Finalizar reparo</button>
        </>)}
        {wo.status === 'paused' && (
          <button onClick={handleResume} disabled={pending} style={btn('#FF6B00')}>▶ Retomar reparo</button>
        )}
        {wo.status === 'waiting_qc' && !qcMode && wo.quality_check && (
          <button onClick={() => setQcMode(true)} style={btn('#7F77DD')}>🔍 Iniciar QC</button>
        )}
        {wo.status === 'qc_rejected' && (
          <button onClick={handleReturnToRepair} disabled={pending} style={btn('#FF6B00')}>↩ Retornar para reparo</button>
        )}
        {wo.status === 'completed' && (
          <button onClick={handleReadyToInvoice} disabled={pending} style={btn('#1D9E75')}>$ Marcar pronto para faturar</button>
        )}
        {wo.status === 'ready_to_invoice' && wo.document_id && (
          <a href={`/estimativas/${wo.document_id}`} style={{ ...btn('#1D9E75'), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            Criar 請求書 →
          </a>
        )}
        <button onClick={() => setAddTechModal(true)} style={btn('#1A1A1A', '#888')}>+ Técnico</button>
      </div>

      {/* Painéis */}
      <div style={card}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>
          PAINÉIS — {wo.items.filter(i => i.status === 'completed').length}/{wo.items.length} concluídos
        </div>
        {wo.items.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#555', padding: '12px 0' }}>Nenhum painel vinculado a esta OS.</div>
        ) : (
          wo.items.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 140px', gap: '10px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1A1A1A' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{item.part_label}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>{item.dent_count} dentes · ¥{Number(item.subtotal).toLocaleString('ja-JP')}</div>
              </div>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: `${ITEM_STATUS_COLOR[item.status]}22`, color: ITEM_STATUS_COLOR[item.status], textAlign: 'center' }}>
                {ITEM_STATUS_LABEL[item.status]}
              </span>
              <div style={{ fontSize: '10px', color: '#555' }}>
                {item.completed_at ? new Date(item.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
              {['in_progress', 'waiting'].includes(wo.status) && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {item.status !== 'in_progress' && (
                    <button onClick={() => handleItemStatus(item.id, 'in_progress')} disabled={pending}
                      style={{ fontSize: '10px', padding: '3px 7px', background: '#FF6B0022', color: '#FF6B00', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Iniciar
                    </button>
                  )}
                  {item.status !== 'completed' && (
                    <button onClick={() => handleItemStatus(item.id, 'completed')} disabled={pending}
                      style={{ fontSize: '10px', padding: '3px 7px', background: '#1D9E7522', color: '#1D9E75', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      ✓ OK
                    </button>
                  )}
                  {item.status !== 'issue' && (
                    <button onClick={() => handleItemStatus(item.id, 'issue')} disabled={pending}
                      style={{ fontSize: '10px', padding: '3px 7px', background: '#E24B4A22', color: '#E24B4A', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      ⚠
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Técnicos */}
      <div style={card}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '12px' }}>EQUIPE</div>
        {wo.technicians.length === 0
          ? <div style={{ fontSize: '13px', color: '#555' }}>Nenhum técnico atribuído.</div>
          : wo.technicians.map(wt => (
            <div key={wt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1A1A1A' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: wt.role === 'lead' ? 'rgba(255,107,0,0.15)' : 'rgba(29,158,117,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: wt.role === 'lead' ? '#FF6B00' : '#1D9E75' }}>
                {wt.technicians?.name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px' }}>{wt.technicians?.name}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>{wt.role === 'lead' ? 'Responsável' : 'Auxiliar'}</div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Timeline */}
      <div style={card}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>TIMELINE</div>
        {wo.events.length === 0
          ? <div style={{ fontSize: '13px', color: '#555' }}>Nenhum evento registrado.</div>
          : [...wo.events].reverse().map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #1A1A1A' }}>
              <div style={{ fontSize: '11px', color: '#555', minWidth: '90px' }}>
                {new Date(ev.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#F0EEE9' }}>{WO_EVENT_LABEL[ev.event_type] ?? ev.event_type}</div>
                {ev.payload?.reason_notes && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{ev.payload.reason_notes}</div>}
                {ev.payload?.rejection_reason && <div style={{ fontSize: '11px', color: '#E24B4A', marginTop: '2px' }}>{ev.payload.rejection_reason}</div>}
                {ev.payload?.part_label && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{ev.payload.part_label}</div>}
              </div>
            </div>
          ))
        }
      </div>

      {/* QC Checklist */}
      {qcMode && wo.quality_check && (
        <div style={card}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>Checklist de QC</div>
          {QC_CHECKS.map(c => (
            <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px' }}>{c.label}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['approved', 'rejected', 'na'] as const).map(r => (
                  <button key={r} onClick={() => setQcItems(p => ({ ...p, [c.key]: { ...p[c.key], result: r } }))}
                    style={{ flex: 1, height: '30px', border: 'none', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', fontWeight: '500',
                      background: qcItems[c.key]?.result === r ? (r === 'approved' ? '#1D9E75' : r === 'rejected' ? '#E24B4A' : '#555') : '#2A2A2A',
                      color: qcItems[c.key]?.result === r ? '#fff' : '#555',
                    }}>
                    {r === 'approved' ? '✓' : r === 'rejected' ? '✗' : 'N/A'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: '12px', marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Observação geral</label>
            <input value={qcNotes} onChange={e => setQcNotes(e.target.value)} style={input} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Motivo da reprovação (se houver)</label>
            <input value={qcRejReason} onChange={e => setQcRejReason(e.target.value)} style={input} placeholder="Ex: Roof ainda apresenta ondulação..." />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setQcMode(false)} style={btn('#2A2A2A', '#888')}>Cancelar</button>
            <button onClick={() => handleSubmitQC(false)} disabled={pending || !qcRejReason} style={btn('#E24B4A')}>✗ Reprovar QC</button>
            <button onClick={() => handleSubmitQC(true)} disabled={pending} style={btn('#1D9E75')}>✓ Aprovar QC</button>
          </div>
        </div>
      )}

      {/* Modal de pausa */}
      {pauseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '360px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}>Pausar serviço</h3>
            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Motivo</label>
            <select value={pauseReason} onChange={e => setPauseReason(e.target.value)} style={{ ...input, marginBottom: '10px' }}>
              {Object.entries(PAUSE_REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Observação (opcional)</label>
            <input value={pauseNotes} onChange={e => setPauseNotes(e.target.value)} style={{ ...input, marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPauseModal(false)} style={btn('#2A2A2A', '#888')}>Cancelar</button>
              <button onClick={handlePause} disabled={pending} style={{ ...btn('#FF6B00'), flex: 1 }}>Confirmar pausa</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar técnico */}
      {addTechModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '320px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}>Adicionar técnico</h3>
            <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} style={{ ...input, marginBottom: '16px' }}>
              <option value="">— selecionar —</option>
              {technicians
                .filter(t => !wo.technicians.some(wt => wt.technician_id === t.id))
                .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setAddTechModal(false)} style={btn('#2A2A2A', '#888')}>Cancelar</button>
              <button onClick={handleAddTech} disabled={!selectedTech || pending} style={{ ...btn('#1D9E75'), flex: 1 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
