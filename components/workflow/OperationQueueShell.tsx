'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  startTask,
  completeTask,
  skipTask,
  assignTask,
  changeTaskPriority,
  startCaseWorkflow,
  submitInspection,
} from '@/app/api/workflow/actions'
import {
  STEP_TYPE_LABEL, STEP_TYPE_COLOR, TASK_STATUS_COLOR, TASK_STATUS_LABEL,
  PRIORITY_LABEL, PRIORITY_COLOR,
  type QueueItem,
  type StepCount,
  type TaskPriority,
} from '@/app/api/workflow/constants'
import type { WorkflowStep } from '@/app/api/workflow/constants'

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px',
  padding: '20px', marginBottom: '16px',
}
const sTitle: React.CSSProperties = { fontSize: '11px', color: '#555', fontWeight: '600' }
const btn = (bg: string, color = '#fff', ghost = false): React.CSSProperties => ({
  height: '30px', padding: '0 12px', background: ghost ? 'transparent' : bg,
  border: ghost ? `1px solid ${bg}44` : 'none',
  borderRadius: '6px', color: ghost ? bg : color,
  cursor: 'pointer', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap',
})

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  operationId: string
  operationName: string
  initialQueue: QueueItem[]
  stepCounts: StepCount[]
  templateSteps: WorkflowStep[]
  templateId: string | null
  technicians: { id: string; name: string }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OperationQueueShell({
  operationId, initialQueue, stepCounts, templateSteps, templateId, technicians,
}: Props) {
  const router = useRouter()
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue)
  const [msg, setMsg] = useState('')
  const [pending, startT] = useTransition()

  // Filter by step
  const [filterStep, setFilterStep] = useState<string>('all')

  // Inspection modal
  const [inspModal, setInspModal] = useState<QueueItem | null>(null)
  const [inspResult, setInspResult] = useState<'approved' | 'rework_needed'>('approved')
  const [inspNotes, setInspNotes] = useState('')

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  // ─── Group queue by step ──────────────────────────────────────────────────
  const allSteps = Array.from(
    new Map(queue.map(q => [q.workflow_step_id, { id: q.workflow_step_id, name: q.step_name, type: q.step_type, order: q.step_order }])).values()
  ).sort((a, b) => a.order - b.order)

  const filteredQueue = filterStep === 'all'
    ? queue
    : queue.filter(q => q.workflow_step_id === filterStep)

  const byStep = allSteps.reduce<Record<string, QueueItem[]>>((acc, s) => {
    acc[s.id] = filteredQueue.filter(q => q.workflow_step_id === s.id)
    return acc
  }, {})

  // ─── Actions ──────────────────────────────────────────────────────────────

  function doStart(task: QueueItem) {
    startT(async () => {
      const r = await startTask(task.id, operationId)
      if (r.error) flash('Erro: ' + r.error)
      else {
        setQueue(prev => prev.map(q => q.id === task.id ? { ...q, status: 'in_progress', started_at: new Date().toISOString() } : q))
        flash('Iniciado.')
        router.refresh()
      }
    })
  }

  function doComplete(task: QueueItem) {
    // Se for inspeção, abre modal
    if (task.step_type === 'inspection') {
      setInspModal(task)
      return
    }

    // Acha próximo step no template
    const currentStepIdx = templateSteps.findIndex(s => s.id === task.workflow_step_id)
    const nextStep = currentStepIdx >= 0 ? templateSteps[currentStepIdx + 1] : null

    startT(async () => {
      const r = await completeTask(task.id, operationId, {
        advanceToStepId: nextStep?.id,
      })
      if (r.error) flash('Erro: ' + r.error)
      else {
        setQueue(prev => prev.filter(q => q.id !== task.id))
        flash(nextStep ? `Concluído → ${nextStep.name}` : 'Concluído.')
        router.refresh()
      }
    })
  }

  function doSkip(task: QueueItem) {
    if (!confirm(`Pular esta etapa para ${task.case_number}?`)) return
    startT(async () => {
      const r = await skipTask(task.id, operationId)
      if (r.error) flash('Erro: ' + r.error)
      else {
        setQueue(prev => prev.filter(q => q.id !== task.id))
        flash('Etapa pulada.')
        router.refresh()
      }
    })
  }

  function doAssign(task: QueueItem, techId: string) {
    startT(async () => {
      await assignTask(task.id, techId || null, operationId)
      setQueue(prev => prev.map(q => q.id === task.id
        ? { ...q, assigned_to: techId || null, assigned_name: technicians.find(t => t.id === techId)?.name ?? null }
        : q
      ))
    })
  }

  function doPriority(task: QueueItem, priority: TaskPriority) {
    startT(async () => {
      await changeTaskPriority(task.id, priority, operationId)
      setQueue(prev => prev.map(q => q.id === task.id ? { ...q, priority } : q))
    })
  }

  async function doSubmitInspection() {
    if (!inspModal) return
    const currentStepIdx = templateSteps.findIndex(s => s.id === inspModal.workflow_step_id)
    // Próximo step após inspeção (se aprovado)
    const nextApprovalStep = templateSteps[currentStepIdx + 1]
    // Step de rework (procura o rework mais próximo antes da inspeção atual ou usa o step de rework do template)
    const reworkStep = templateSteps.find(s => s.step_type === 'rework')
    // Próxima inspeção (se reprovado, cria outra inspeção no próximo step de inspection)
    const nextInspStep = templateSteps.find((s, i) => i > currentStepIdx && s.step_type === 'inspection')

    startT(async () => {
      const r = await submitInspection(
        inspModal.id,
        operationId,
        inspResult,
        [],
        {
          reworkStepId: reworkStep?.id,
          nextInspectionStepId: nextInspStep?.id,
          nextStepAfterApproval: inspResult === 'approved' ? nextApprovalStep?.id : undefined,
          notes: inspNotes || undefined,
        }
      )
      if (r.error) flash('Erro: ' + r.error)
      else {
        setQueue(prev => prev.filter(q => q.id !== inspModal.id))
        setInspModal(null)
        setInspNotes('')
        flash(inspResult === 'approved' ? '✓ Aprovado' : 'Repasse criado.')
        router.refresh()
      }
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Flash */}
      {msg && (
        <div style={{
          padding: '8px 14px', marginBottom: '14px', borderRadius: '6px', fontSize: '12px',
          background: msg.startsWith('Erro') ? 'rgba(226,75,74,0.1)' : 'rgba(29,158,117,0.1)',
          border: `1px solid ${msg.startsWith('Erro') ? '#E24B4A' : '#1D9E75'}`,
          color: msg.startsWith('Erro') ? '#F09595' : '#1D9E75',
        }}>
          {msg}
        </div>
      )}

      {/* ── Dashboard: contagem por etapa ─────────────────────────────────── */}
      {stepCounts.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => setFilterStep('all')}
            style={{
              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
              border: filterStep === 'all' ? '1px solid #FF6B00' : '1px solid #2A2A2A',
              background: filterStep === 'all' ? 'rgba(255,107,0,0.1)' : '#141414',
              color: filterStep === 'all' ? '#FF6B00' : '#888',
            }}
          >
            Todas ({queue.length})
          </button>
          {stepCounts.map(sc => {
            const color = STEP_TYPE_COLOR[sc.step_type]
            const isActive = filterStep === sc.workflow_step_id
            return (
              <button
                key={sc.workflow_step_id}
                onClick={() => setFilterStep(isActive ? 'all' : sc.workflow_step_id)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
                  border: isActive ? `1px solid ${color}` : '1px solid #2A2A2A',
                  background: isActive ? `${color}18` : '#141414',
                  color: isActive ? color : '#888',
                }}
              >
                {sc.step_name}
                {' '}
                <span style={{ fontWeight: '700' }}>{sc.active_count}</span>
                {sc.completed_count > 0 && (
                  <span style={{ color: '#1D9E75', marginLeft: '4px', fontSize: '10px' }}>✓{sc.completed_count}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── No template / no tasks ────────────────────────────────────────── */}
      {!templateId && (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔀</div>
          <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Nenhum template de workflow atribuído</div>
          <p style={{ fontSize: '12px', color: '#444' }}>Atribua um template na página da operação para ativar a fila.</p>
        </div>
      )}

      {templateId && queue.length === 0 && stepCounts.every(sc => sc.active_count === 0) && (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>✅</div>
          <div style={{ fontSize: '14px', color: '#555' }}>Fila vazia — nenhuma tarefa ativa</div>
          <p style={{ fontSize: '12px', color: '#444', marginTop: '6px' }}>Acesse um caso e inicie o workflow para adicionar veículos à fila.</p>
        </div>
      )}

      {/* ── Steps com tasks ───────────────────────────────────────────────── */}
      {allSteps
        .filter(s => (byStep[s.id] ?? []).length > 0)
        .filter(s => filterStep === 'all' || filterStep === s.id)
        .map(step => {
          const color = STEP_TYPE_COLOR[step.type]
          const tasks = byStep[step.id] ?? []

          return (
            <div key={step.id} style={{ ...card, borderLeft: `3px solid ${color}` }}>
              {/* Step header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '10px', fontSize: '11px',
                  background: `${color}18`, color, border: `1px solid ${color}44`,
                }}>
                  {STEP_TYPE_LABEL[step.type]}
                </span>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{step.name}</div>
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#555' }}>
                  {tasks.filter(t => t.status === 'in_progress').length} em andamento · {tasks.filter(t => t.status === 'queued').length} na fila
                </div>
              </div>

              {/* Task list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.map((task) => {
                  const statusColor = TASK_STATUS_COLOR[task.status]
                  const inProgress = task.status === 'in_progress'

                  return (
                    <div key={task.id} style={{
                      background: '#1A1A1A',
                      border: `1px solid ${inProgress ? '#FF6B0033' : '#2A2A2A'}`,
                      borderRadius: '8px', padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Position badge */}
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: inProgress ? 'rgba(255,107,0,0.15)' : '#222',
                          border: `1px solid ${inProgress ? '#FF6B00' : '#2A2A2A'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '600',
                          color: inProgress ? '#FF6B00' : '#555',
                        }}>
                          {inProgress ? '▶' : task.queue_position}
                        </div>

                        {/* Vehicle info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>
                              {task.vehicle_make} {task.vehicle_model}
                            </span>
                            <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                              {task.vehicle_plate}
                            </span>
                            <span style={{ fontSize: '10px', color: '#555' }}>
                              {task.case_number}
                            </span>
                            {/* Priority */}
                            {task.priority !== 'normal' && (
                              <span style={{
                                fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                background: `${PRIORITY_COLOR[task.priority]}22`,
                                color: PRIORITY_COLOR[task.priority],
                                border: `1px solid ${PRIORITY_COLOR[task.priority]}44`,
                              }}>
                                {PRIORITY_LABEL[task.priority]}
                              </span>
                            )}
                            {task.round > 1 && (
                              <span style={{ fontSize: '10px', color: '#9B59B6', background: '#9B59B622', padding: '1px 6px', borderRadius: '4px', border: '1px solid #9B59B644' }}>
                                Round {task.round}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#555', marginTop: '3px' }}>
                            {task.customer_name}
                            {task.assigned_name && <> · <span style={{ color: '#888' }}>→ {task.assigned_name}</span></>}
                            {inProgress && task.started_at && (
                              <span style={{ color: '#FF6B00', marginLeft: '6px' }}>
                                ⏱ {Math.round((Date.now() - new Date(task.started_at).getTime()) / 60000)} min
                              </span>
                            )}
                            {!inProgress && (
                              <span style={{ color: '#555', marginLeft: '6px' }}>
                                aguardando {Math.round(task.wait_minutes)} min
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {/* Assign */}
                          <select
                            value={task.assigned_to ?? ''}
                            onChange={e => doAssign(task, e.target.value)}
                            disabled={pending}
                            style={{
                              height: '30px', background: '#141414', border: '1px solid #2A2A2A',
                              borderRadius: '6px', color: '#888', fontSize: '11px', padding: '0 8px',
                              outline: 'none', cursor: 'pointer',
                            }}
                          >
                            <option value="">— atribuir —</option>
                            {technicians.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>

                          {/* Priority toggle */}
                          <select
                            value={task.priority}
                            onChange={e => doPriority(task, e.target.value as TaskPriority)}
                            disabled={pending}
                            style={{
                              height: '30px', background: '#141414', border: `1px solid ${PRIORITY_COLOR[task.priority]}44`,
                              borderRadius: '6px', color: PRIORITY_COLOR[task.priority], fontSize: '11px',
                              padding: '0 8px', outline: 'none', cursor: 'pointer',
                            }}
                          >
                            <option value="urgent">Urgente</option>
                            <option value="normal">Normal</option>
                            <option value="low">Baixa</option>
                          </select>

                          {/* Start / Complete */}
                          {task.status === 'queued' && (
                            <button onClick={() => doStart(task)} disabled={pending} style={btn('#FF6B00')}>
                              Iniciar
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <>
                              <button onClick={() => doSkip(task)} disabled={pending} style={btn('#555', '#888', true)}>
                                Pular
                              </button>
                              <button onClick={() => doComplete(task)} disabled={pending} style={btn('#1D9E75')}>
                                {step.type === 'inspection' ? 'Inspecionar' : 'Concluir'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      }

      {/* ── Modal de inspeção ─────────────────────────────────────────────── */}
      {inspModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '420px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>Resultado da Inspeção</h3>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '20px' }}>
              {inspModal.vehicle_make} {inspModal.vehicle_model} · {inspModal.vehicle_plate}
              {inspModal.round > 1 && <span style={{ color: '#9B59B6' }}> · Round {inspModal.round}</span>}
            </div>

            {/* Resultado */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              {[
                { value: 'approved', label: '✓ Aprovado', color: '#1D9E75' },
                { value: 'rework_needed', label: '✗ Repasse', color: '#E24B4A' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setInspResult(opt.value as typeof inspResult)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '8px', cursor: 'pointer',
                    border: inspResult === opt.value ? `2px solid ${opt.color}` : '1px solid #2A2A2A',
                    background: inspResult === opt.value ? `${opt.color}18` : '#1A1A1A',
                    color: inspResult === opt.value ? opt.color : '#555',
                    fontSize: '13px', fontWeight: '600',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Observações */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Observações</label>
              <textarea
                value={inspNotes}
                onChange={e => setInspNotes(e.target.value)}
                placeholder="Descreva os pontos encontrados..."
                rows={3}
                style={{
                  width: '100%', background: '#1A1A1A', border: '1px solid #2A2A2A',
                  borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '8px 10px',
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            {inspResult === 'rework_needed' && (
              <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(226,75,74,0.2)', borderRadius: '6px', fontSize: '11px', color: '#E24B4A' }}>
                Será criada uma task de Repasse + nova Inspeção (Round {inspModal.round + 1}) para este veículo.
              </div>
            )}
            {inspResult === 'approved' && (
              <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: '6px', fontSize: '11px', color: '#1D9E75' }}>
                Veículo aprovado. Será avançado para a próxima etapa do workflow.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setInspModal(null); setInspNotes('') }} style={{ ...btn('#555', '#888', true), flex: 1 }}>Cancelar</button>
              <button onClick={doSubmitInspection} disabled={pending} style={{ ...btn(inspResult === 'approved' ? '#1D9E75' : '#E24B4A'), flex: 1 }}>
                {pending ? '...' : inspResult === 'approved' ? 'Confirmar aprovação' : 'Criar repasse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
