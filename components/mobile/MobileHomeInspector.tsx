'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTask } from '@/app/api/workflow/actions'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'
import type { QueueItem } from '@/app/api/workflow/constants'

function fmtWait(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

type Props = {
  ctx: CurrentTechnicianContext
  currentTask: QueueItem | null
  queuedTasks: QueueItem[]
}

export default function MobileHomeInspector({ ctx, currentTask, queuedTasks }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [startingId, setStartingId] = useState<string | null>(null)
  const [flash, setFlash] = useState('')
  const [flashOk, setFlashOk] = useState(true)

  function showFlash(msg: string, ok = true) {
    setFlash(msg); setFlashOk(ok)
    setTimeout(() => setFlash(''), 3000)
  }

  function handleStart(task: QueueItem) {
    setStartingId(task.id)
    startT(async () => {
      const r = await startTask(task.id, ctx.operationId)
      if (r.error) { showFlash('Erro: ' + r.error, false); setStartingId(null) }
      else { router.push(`/mobile/task/${task.id}`) }
    })
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '90px' }}>
      {flash && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', zIndex: 100, padding: '14px 20px', background: flashOk ? '#1D9E75' : '#E24B4A', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '13px', color: '#9B59B6', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px' }}>INSPEÇÃO</div>
        <div style={{ fontSize: '14px', color: '#888' }}>{ctx.operationName}</div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Inspeção em andamento */}
        {currentTask && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>EM ANDAMENTO</div>
            <Link href={`/mobile/task/${currentTask.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#9B59B611', border: '1px solid #9B59B644', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#F0EEE9' }}>
                      {currentTask.vehicle_year} {currentTask.vehicle_make} {currentTask.vehicle_model}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{currentTask.vehicle_plate}</div>
                  </div>
                  {currentTask.round > 1 && (
                    <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', background: '#E24B4A22', color: '#E24B4A', border: '1px solid #E24B4A44', fontWeight: '700' }}>
                      REPASSE R{currentTask.round}
                    </span>
                  )}
                </div>
                {currentTask.assigned_name && (
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>👤 {currentTask.assigned_name}</div>
                )}
                <div style={{ height: '48px', background: '#9B59B622', border: '1px solid #9B59B644', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9B59B6', fontSize: '14px', fontWeight: '700' }}>
                  Continuar inspeção →
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Fila */}
        <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
          AGUARDANDO INSPEÇÃO
          {queuedTasks.length > 0 && (
            <span style={{ marginLeft: '8px', color: '#9B59B6' }}>
              {queuedTasks.length} veículo{queuedTasks.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {queuedTasks.length === 0 && !currentTask && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>✓</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0EEE9' }}>Fila limpa</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Nenhum veículo aguardando inspeção</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {queuedTasks.map((task, idx) => (
            <div key={task.id} style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0EEE9' }}>
                    {task.vehicle_year} {task.vehicle_make} {task.vehicle_model}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{task.vehicle_plate}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {task.round > 1 && (
                    <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', background: '#E24B4A22', color: '#E24B4A', border: '1px solid #E24B4A44', fontWeight: '700' }}>
                      REPASSE R{task.round}
                    </span>
                  )}
                  {task.priority === 'urgent' && task.round <= 1 && (
                    <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '8px', background: '#E24B4A22', color: '#E24B4A', border: '1px solid #E24B4A44', fontWeight: '700' }}>
                      URGENTE
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: '#444' }}>#{idx + 1}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {task.assigned_name ? `👤 ${task.assigned_name}` : ''}
                </div>
                <div style={{ fontSize: '11px', color: '#555' }}>
                  {fmtWait(task.wait_minutes ?? 0)} aguardando
                </div>
              </div>

              <button
                onClick={() => handleStart(task)}
                disabled={pending || !!currentTask}
                style={{
                  width: '100%',
                  height: '52px',
                  background: currentTask ? '#1A1A1A' : '#9B59B6',
                  border: 'none',
                  borderRadius: '12px',
                  color: currentTask ? '#555' : '#fff',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: (currentTask || pending) ? 'not-allowed' : 'pointer',
                  opacity: (startingId === task.id && pending) ? 0.6 : 1,
                }}
              >
                {startingId === task.id && pending
                  ? 'Iniciando...'
                  : currentTask
                  ? 'Finalize a inspeção atual primeiro'
                  : '▶ Iniciar inspeção'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', height: '72px', background: '#0D0D0D', borderTop: '1px solid #1A1A1A', display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#9B59B6', fontSize: '10px', borderTop: '2px solid #9B59B6' }}>
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
