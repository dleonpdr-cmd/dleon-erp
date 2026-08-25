'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTask, completeTask } from '@/app/api/workflow/actions'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'
import type { QueueItem } from '@/app/api/workflow/constants'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtWait(mins: number) {
  const m = Math.round(mins)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}min`
}

function fmtElapsed(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function useElapsed(startedAt: string | null | undefined) {
  const [sec, setSec] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!startedAt) { setSec(0); return }
    const base = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    setSec(Math.max(0, base))
    ref.current = setInterval(() => setSec(s => s + 1), 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [startedAt])

  return sec
}

// ─── Accent ─────────────────────────────────────────────────────────────────

const ACCENT = '#3498DB'          // azul — assembler
const ACCENT_DIM = '#3498DB22'
const ACCENT_BORDER = '#3498DB44'

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  ctx: CurrentTechnicianContext
  currentTask: QueueItem | null
  disassemblyTasks: QueueItem[]   // step_type === 'disassembly', queued
  assemblyTasks: QueueItem[]      // step_type === 'assembly',    queued
  repairStepId: string | undefined
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MobileHomeAssembler({
  ctx,
  currentTask,
  disassemblyTasks,
  assemblyTasks,
  repairStepId,
}: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)
  const [flash, setFlash] = useState('')
  const [flashOk, setFlashOk] = useState(true)

  const elapsed = useElapsed(currentTask?.started_at)

  function showFlash(msg: string, ok = true) {
    setFlash(msg); setFlashOk(ok)
    setTimeout(() => setFlash(''), 3000)
  }

  // ── Iniciar ──────────────────────────────────────────────────────────────
  function handleStart(task: QueueItem) {
    setActionId(task.id)
    startT(async () => {
      const r = await startTask(task.id, ctx.operationId)
      if (r.error) { showFlash('Erro: ' + r.error, false); setActionId(null) }
      else { router.push(`/mobile/task/${task.id}`) }
    })
  }

  // ── Concluir ─────────────────────────────────────────────────────────────
  function handleComplete(task: QueueItem) {
    setActionId(task.id)
    // Desmontagem → auto-cria task de reparo; Montagem → só conclui
    const opts = task.step_type === 'disassembly' && repairStepId
      ? { advanceToStepId: repairStepId }
      : undefined

    startT(async () => {
      const r = await completeTask(task.id, ctx.operationId, opts)
      if (r.error) { showFlash('Erro: ' + r.error, false); setActionId(null) }
      else {
        showFlash(
          task.step_type === 'disassembly'
            ? 'Desmontagem concluída — reparo criado na fila'
            : 'Montagem concluída!',
          true
        )
        setActionId(null)
        router.refresh()
      }
    })
  }

  const isDisassembly = currentTask?.step_type === 'disassembly'

  return (
    <div style={{ minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '90px' }}>

      {/* Flash */}
      {flash && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px', zIndex: 100,
          padding: '14px 20px',
          background: flashOk ? '#1D9E75' : '#E24B4A',
          color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'center',
        }}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '13px', color: ACCENT, fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px' }}>
          DESMONTADOR / MONTADOR
        </div>
        <div style={{ fontSize: '14px', color: '#888' }}>{ctx.operationName}</div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── TAREFA EM ANDAMENTO ─────────────────────────────────────────── */}
        {currentTask && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
              EM ANDAMENTO
            </div>

            <div style={{ background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`, borderRadius: '14px', padding: '16px' }}>
              {/* Veículo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#F0EEE9' }}>
                    {currentTask.vehicle_year} {currentTask.vehicle_make} {currentTask.vehicle_model}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{currentTask.vehicle_plate}</div>
                </div>
                <span style={{
                  fontSize: '10px', padding: '3px 10px', borderRadius: '8px',
                  background: isDisassembly ? '#FF6B0022' : ACCENT_DIM,
                  color: isDisassembly ? '#FF6B00' : ACCENT,
                  border: `1px solid ${isDisassembly ? '#FF6B0044' : ACCENT_BORDER}`,
                  fontWeight: '700',
                }}>
                  {isDisassembly ? 'DESMONTAGEM' : 'MONTAGEM'}
                </span>
              </div>

              {/* Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', color: '#555' }}>⏱</span>
                <span style={{ fontSize: '22px', fontWeight: '800', color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtElapsed(elapsed)}
                </span>
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  href={`/mobile/task/${currentTask.id}`}
                  style={{
                    flex: 1, height: '48px', borderRadius: '12px',
                    border: `1px solid ${ACCENT_BORDER}`,
                    background: 'transparent',
                    color: ACCENT, fontSize: '14px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Ver detalhes
                </Link>
                <button
                  onClick={() => handleComplete(currentTask)}
                  disabled={pending}
                  style={{
                    flex: 2, height: '48px', borderRadius: '12px',
                    border: 'none',
                    background: pending && actionId === currentTask.id ? '#333' : ACCENT,
                    color: '#fff', fontSize: '14px', fontWeight: '700',
                    cursor: pending ? 'not-allowed' : 'pointer',
                    opacity: pending && actionId === currentTask.id ? 0.6 : 1,
                  }}
                >
                  {pending && actionId === currentTask.id
                    ? 'Concluindo...'
                    : isDisassembly
                    ? '✓ Concluir desmontagem'
                    : '✓ Concluir montagem'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DESMONTAGEM (queued) ────────────────────────────────────────── */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
            DESMONTAGEM
            {disassemblyTasks.length > 0 && (
              <span style={{ marginLeft: '8px', color: '#FF6B00' }}>
                {disassemblyTasks.length} veículo{disassemblyTasks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {disassemblyTasks.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#333', fontSize: '13px' }}>
              Nenhum veículo aguardando desmontagem
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {disassemblyTasks.map((task, idx) => (
              <TaskCard
                key={task.id}
                task={task}
                idx={idx}
                accentColor="#FF6B00"
                label="DESMONTAGEM"
                btnLabel="▶ Iniciar desmontagem"
                blockedLabel="Finalize a tarefa atual primeiro"
                isBlocked={!!currentTask}
                isStarting={actionId === task.id && pending}
                onStart={() => handleStart(task)}
              />
            ))}
          </div>
        </div>

        {/* ── MONTAGEM (queued) ───────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
            MONTAGEM
            {assemblyTasks.length > 0 && (
              <span style={{ marginLeft: '8px', color: ACCENT }}>
                {assemblyTasks.length} veículo{assemblyTasks.length > 1 ? 's' : ''} pronto{assemblyTasks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {assemblyTasks.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#333', fontSize: '13px' }}>
              Nenhum veículo aguardando montagem
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assemblyTasks.map((task, idx) => (
              <TaskCard
                key={task.id}
                task={task}
                idx={idx}
                accentColor={ACCENT}
                label="MONTAGEM"
                btnLabel="▶ Iniciar montagem"
                blockedLabel="Finalize a tarefa atual primeiro"
                isBlocked={!!currentTask}
                isStarting={actionId === task.id && pending}
                onStart={() => handleStart(task)}
              />
            ))}
          </div>
        </div>

        {/* Empty state global */}
        {!currentTask && disassemblyTasks.length === 0 && assemblyTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>✓</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0EEE9' }}>Fila limpa</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Nenhuma tarefa pendente</div>
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px', height: '72px',
        background: '#0D0D0D', borderTop: '1px solid #1A1A1A',
        display: 'flex',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: ACCENT, fontSize: '10px', borderTop: `2px solid ${ACCENT}` }}>
          <span style={{ fontSize: '20px' }}>🏠</span>Home
        </div>
        <Link href="/mobile/queue" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>📋</span>Fila
        </Link>
        <Link href="/mobile/history" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>📖</span>Histórico
        </Link>
        <Link href="/mobile/profile" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>👤</span>Perfil
        </Link>
      </div>
    </div>
  )
}

// ─── TaskCard (local sub-component) ─────────────────────────────────────────

function TaskCard({
  task,
  idx,
  accentColor,
  label: _label,
  btnLabel,
  blockedLabel,
  isBlocked,
  isStarting,
  onStart,
}: {
  task: QueueItem
  idx: number
  accentColor: string
  label: string
  btnLabel: string
  blockedLabel: string
  isBlocked: boolean
  isStarting: boolean
  onStart: () => void
}) {
  return (
    <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '14px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0EEE9' }}>
            {task.vehicle_year} {task.vehicle_make} {task.vehicle_model}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{task.vehicle_plate}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {task.priority === 'urgent' && (
            <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', background: '#E24B4A22', color: '#E24B4A', border: '1px solid #E24B4A44', fontWeight: '700' }}>
              URGENTE
            </span>
          )}
          <span style={{ fontSize: '10px', color: '#444' }}>#{idx + 1}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {task.customer_name ?? ''}
        </div>
        <div style={{ fontSize: '11px', color: '#555' }}>
          {fmtWait(task.wait_minutes ?? 0)} aguardando
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={isBlocked || isStarting}
        style={{
          width: '100%',
          height: '52px',
          background: isBlocked ? '#1A1A1A' : accentColor,
          border: 'none',
          borderRadius: '12px',
          color: isBlocked ? '#555' : '#fff',
          fontSize: '15px',
          fontWeight: '700',
          cursor: (isBlocked || isStarting) ? 'not-allowed' : 'pointer',
          opacity: isStarting ? 0.6 : 1,
        }}
      >
        {isStarting ? 'Iniciando...' : isBlocked ? blockedLabel : btnLabel}
      </button>
    </div>
  )
}
