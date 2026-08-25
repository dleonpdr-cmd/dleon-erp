'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTask, completeTask } from '@/app/api/workflow/actions'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'
import type { QueueItem, WorkflowTaskEvent } from '@/app/api/workflow/constants'
import MobileInspectionForm from './MobileInspectionForm'

const STEP_LABEL: Record<string, string> = {
  reception: 'Recepção', disassembly: 'Desmontagem', repair: 'PDR',
  inspection: 'Inspeção', rework: 'Repasse', assembly: 'Montagem',
  wash: 'Lavagem', polish: 'Polimento', paint: 'Pintura',
  parts: 'Peças', finalization: 'Finalização', custom: 'Custom',
}

const STATUS_LABEL: Record<string, string> = {
  queued: 'Na fila', in_progress: 'Em andamento',
  completed: 'Concluído', skipped: 'Pulado', cancelled: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  queued: '#888', in_progress: '#FF6B00',
  completed: '#1D9E75', skipped: '#555', cancelled: '#E24B4A',
}

const EVENT_LABEL: Record<string, string> = {
  started: 'Iniciado', completed: 'Concluído', skipped: 'Pulado',
  assigned: 'Atribuído', cancelled: 'Cancelado', priority_changed: 'Prioridade alterada',
  inspection_approved: 'Inspeção aprovada', inspection_failed: 'Repasse solicitado',
}

function useElapsed(startedAt: string | null) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!startedAt) { setSecs(0); return }
    const tick = () => setSecs(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function fmt(dt: string) {
  const d = new Date(dt)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

type Props = {
  ctx: CurrentTechnicianContext
  task: QueueItem
  events: WorkflowTaskEvent[]
  reworkStepId?: string
  nextInspectionStepId?: string
  assemblyStepId?: string
}

export default function MobileTaskDetail({ ctx, task, events, reworkStepId, nextInspectionStepId, assemblyStepId }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [flash, setFlash] = useState('')
  const [flashOk, setFlashOk] = useState(true)

  const timer = useElapsed(task.status === 'in_progress' ? task.started_at : null)

  function showFlash(msg: string, ok = true) {
    setFlash(msg); setFlashOk(ok)
    setTimeout(() => setFlash(''), 3500)
  }

  function handleStart() {
    startT(async () => {
      const r = await startTask(task.id, ctx.operationId)
      if (r.error) showFlash('Erro: ' + r.error, false)
      else { showFlash('Iniciado!'); router.refresh() }
    })
  }

  function handleComplete() {
    startT(async () => {
      const r = await completeTask(task.id, ctx.operationId)
      if (r.error) showFlash('Erro: ' + r.error, false)
      else {
        showFlash(task.step_type === 'rework' ? 'Repasse concluído ✓' : 'Enviado para inspeção ✓')
        setTimeout(() => router.push('/mobile'), 1200)
      }
    })
  }

  const isInspectionTask = task.step_type === 'inspection'
  const isPDRTask = ['repair', 'rework'].includes(task.step_type)
  const isMyTask =
    (ctx.activeRole === 'pdr_tech' && isPDRTask) ||
    (ctx.activeRole === 'inspector' && isInspectionTask) ||
    (ctx.activeRole === 'assembler' && ['disassembly', 'assembly'].includes(task.step_type))

  const inspectionResult = task.payload?.inspection_result as string | undefined

  const statusColor = STATUS_COLOR[task.status] ?? '#888'
  const vehicleName = `${task.vehicle_year} ${task.vehicle_make} ${task.vehicle_model}`
  const accentColor = isInspectionTask ? '#9B59B6' : '#FF6B00'

  return (
    <div style={{ minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '24px' }}>

      {flash && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', zIndex: 100, padding: '14px 20px', background: flashOk ? '#1D9E75' : '#E24B4A', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '20px', padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '700' }}>{vehicleName}</div>
          <div style={{ fontSize: '11px', color: '#555' }}>{task.vehicle_plate} · {task.case_number}</div>
        </div>
        <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '8px', background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
      </div>

      {/* Timer (se em andamento e não é inspeção ativa — a inspeção tem seu próprio form) */}
      {task.status === 'in_progress' && !isInspectionTask && (
        <div style={{ background: `${accentColor}11`, borderBottom: `1px solid ${accentColor}33`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', color: `${accentColor}88`, letterSpacing: '0.08em', fontWeight: '600' }}>EM ANDAMENTO</div>
            <div style={{ fontSize: '11px', color: `${accentColor}AA`, marginTop: '2px' }}>{STEP_LABEL[task.step_type] ?? task.step_type}{task.round > 1 ? ` · Round ${task.round}` : ''}</div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: accentColor, fontVariantNumeric: 'tabular-nums' }}>{timer}</div>
        </div>
      )}

      {/* Timer no header da inspeção em andamento */}
      {task.status === 'in_progress' && isInspectionTask && (
        <div style={{ background: '#9B59B611', borderBottom: '1px solid #9B59B633', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '11px', color: '#9B59B6AA' }}>
            INSPEÇÃO{task.round > 1 ? ` · Round ${task.round}` : ''}
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#9B59B6', fontVariantNumeric: 'tabular-nums' }}>{timer}</div>
        </div>
      )}

      {/* Info do veículo */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>VEÍCULO</div>
        <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#555' }}>Marca</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>{task.vehicle_make}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#555' }}>Modelo</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>{task.vehicle_model}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#555' }}>Ano</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>{task.vehicle_year}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#555' }}>Placa</div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>{task.vehicle_plate}</div>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1A1A1A' }}>
            <div style={{ fontSize: '10px', color: '#555' }}>Cliente</div>
            <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px' }}>{task.customer_name}</div>
          </div>
        </div>

        {/* Etapa atual */}
        <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', margin: '20px 0 10px' }}>ETAPA</div>
        <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{task.step_name}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
              {STEP_LABEL[task.step_type] ?? task.step_type}
              {task.round > 1 && ` · Round ${task.round}`}
            </div>
          </div>
          {task.status === 'queued' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#555' }}>Posição na fila</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: accentColor }}>#{task.queue_position}</div>
            </div>
          )}
        </div>
      </div>

      {/* === FORMULÁRIO DE INSPEÇÃO (quando inspeção em andamento) === */}
      {isMyTask && isInspectionTask && task.status === 'in_progress' && (
        <MobileInspectionForm
          task={task}
          operationId={ctx.operationId}
          reworkStepId={reworkStepId}
          nextInspectionStepId={nextInspectionStepId}
          assemblyStepId={assemblyStepId}
        />
      )}

      {/* === AÇÕES PADRÃO (PDR / Repasse / outros) === */}
      {isMyTask && !isInspectionTask && (
        <div style={{ padding: '0 20px', marginTop: '24px' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '12px' }}>AÇÕES</div>

          {task.status === 'queued' && (
            <button
              onClick={handleStart}
              disabled={pending}
              style={{ width: '100%', height: '56px', background: accentColor, border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: pending ? 0.6 : 1 }}
            >
              {pending ? 'Iniciando...' : '▶ Iniciar'}
            </button>
          )}

          {task.status === 'in_progress' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                href="/mobile"
                style={{ flex: '0 0 auto', height: '56px', padding: '0 22px', background: 'transparent', border: '2px solid #444', borderRadius: '14px', color: '#888', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Pausar
              </Link>
              <button
                onClick={handleComplete}
                disabled={pending}
                style={{ flex: 1, height: '56px', background: '#1D9E75', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: pending ? 0.6 : 1 }}
              >
                {pending ? '...' : task.step_type === 'rework' ? '✓ Concluir repasse' : '✓ Enviar para inspeção'}
              </button>
            </div>
          )}

          {task.status === 'completed' && (
            <div style={{ padding: '16px', background: '#1D9E7522', border: '1px solid #1D9E7544', borderRadius: '12px', textAlign: 'center', color: '#1D9E75', fontSize: '14px', fontWeight: '600' }}>
              ✓ Concluído em {task.finished_at ? fmt(task.finished_at) : '—'}
            </div>
          )}
        </div>
      )}

      {/* Resultado da inspeção concluída */}
      {isInspectionTask && task.status === 'completed' && (
        <div style={{ padding: '0 20px', marginTop: '20px' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>RESULTADO</div>
          {inspectionResult === 'approved' ? (
            <div style={{ padding: '16px', background: '#1D9E7522', border: '1px solid #1D9E7544', borderRadius: '12px', textAlign: 'center', color: '#1D9E75', fontSize: '14px', fontWeight: '600' }}>
              ✓ Aprovado em {task.finished_at ? fmt(task.finished_at) : '—'}
            </div>
          ) : inspectionResult === 'rework_needed' ? (
            <div style={{ padding: '16px', background: '#E24B4A22', border: '1px solid #E24B4A44', borderRadius: '12px', textAlign: 'center', color: '#E24B4A', fontSize: '14px', fontWeight: '600' }}>
              🔧 Enviado para repasse em {task.finished_at ? fmt(task.finished_at) : '—'}
            </div>
          ) : (
            <div style={{ padding: '16px', background: '#1D9E7522', border: '1px solid #1D9E7544', borderRadius: '12px', textAlign: 'center', color: '#1D9E75', fontSize: '14px', fontWeight: '600' }}>
              ✓ Concluído em {task.finished_at ? fmt(task.finished_at) : '—'}
            </div>
          )}
        </div>
      )}

      {/* Ações para inspeção na fila (queued) */}
      {isMyTask && isInspectionTask && task.status === 'queued' && (
        <div style={{ padding: '0 20px', marginTop: '24px' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '12px' }}>AÇÕES</div>
          <button
            onClick={handleStart}
            disabled={pending}
            style={{ width: '100%', height: '56px', background: '#9B59B6', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: pending ? 0.6 : 1 }}
          >
            {pending ? 'Iniciando...' : '▶ Iniciar inspeção'}
          </button>
        </div>
      )}

      {/* Histórico de eventos */}
      {events.length > 0 && (
        <div style={{ padding: '0 20px', marginTop: '24px' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>HISTÓRICO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#141414', border: '1px solid #1A1A1A', borderRadius: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{EVENT_LABEL[ev.event_type] ?? ev.event_type}</div>
                </div>
                <div style={{ fontSize: '10px', color: '#555' }}>{fmt(ev.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
