'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTask } from '@/app/api/workflow/actions'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'
import type { QueueItem } from '@/app/api/workflow/constants'

const ROLE_STEP_TYPES: Record<string, string[]> = {
  pdr_tech:   ['repair', 'rework'],
  inspector:  ['inspection'],
  assembler:  ['disassembly', 'assembly'],
  supervisor: [],
  financial:  [],
  admin:      [],
}

const STEP_LABEL: Record<string, string> = {
  reception: 'Recepção', disassembly: 'Desmontagem', repair: 'PDR',
  inspection: 'Inspeção', rework: 'Repasse', assembly: 'Montagem',
  wash: 'Lavagem', polish: 'Polimento', paint: 'Pintura',
  parts: 'Peças', finalization: 'Finalização', custom: 'Custom',
}

const STEP_COLOR: Record<string, string> = {
  repair: '#FF6B00', rework: '#9B59B6', inspection: '#3498DB',
  disassembly: '#E74C3C', assembly: '#2ECC71', default: '#888',
}

function vehicleName(t: QueueItem) {
  return `${t.vehicle_year} ${t.vehicle_make} ${t.vehicle_model}`
}

type Props = {
  ctx: CurrentTechnicianContext
  queue: QueueItem[]
}

export default function MobileQueueView({ ctx, queue }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [flash, setFlash] = useState('')
  const [tab, setTab] = useState<'mine' | 'all'>('mine')

  const myStepTypes = ROLE_STEP_TYPES[ctx.activeRole] ?? []
  const myTasks = tab === 'mine' && myStepTypes.length > 0
    ? queue.filter(t => myStepTypes.includes(t.step_type))
    : queue

  const waiting  = myTasks.filter(t => t.status === 'queued')
  const active   = myTasks.filter(t => t.status === 'in_progress')

  function iniciar(taskId: string) {
    startT(async () => {
      const r = await startTask(taskId, ctx.operationId)
      if (r.error) { setFlash('Erro: ' + r.error); setTimeout(() => setFlash(''), 3000) }
      else router.refresh()
    })
  }

  const hasActive = active.length > 0

  return (
    <div style={{ minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '90px' }}>

      {flash && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', zIndex: 100, padding: '14px 20px', background: '#E24B4A', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/mobile" style={{ color: '#888', textDecoration: 'none', fontSize: '20px' }}>←</Link>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700' }}>Fila de trabalho</div>
          <div style={{ fontSize: '11px', color: '#555' }}>{ctx.operationName}</div>
        </div>
        <div style={{ marginLeft: 'auto', background: '#FF6B0022', color: '#FF6B00', fontSize: '13px', fontWeight: '700', padding: '4px 12px', borderRadius: '12px', border: '1px solid #FF6B0044' }}>
          {waiting.length}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1A1A1A' }}>
        {(['mine', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, height: '42px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: tab === t ? '#FF6B00' : '#555', borderBottom: tab === t ? '2px solid #FF6B00' : '2px solid transparent' }}>
            {t === 'mine' ? 'Minha fila' : 'Toda a operação'}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Em andamento */}
        {active.length > 0 && (
          <>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>EM ANDAMENTO</div>
            {active.map(t => {
              const color = STEP_COLOR[t.step_type] ?? STEP_COLOR.default
              return (
                <Link key={t.id} href={`/mobile/task/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#141414', border: `1px solid ${color}55`, borderLeft: `4px solid ${color}`, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0EEE9' }}>{vehicleName(t)}</div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{t.vehicle_plate}</div>
                      </div>
                      <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '8px', background: `${color}22`, color, border: `1px solid ${color}44` }}>
                        {STEP_LABEL[t.step_type] ?? t.step_type}
                      </span>
                    </div>
                    {t.assigned_name && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#555' }}>→ {t.assigned_name}</div>
                    )}
                  </div>
                </Link>
              )
            })}
          </>
        )}

        {/* Aguardando */}
        {waiting.length > 0 && (
          <>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px', marginTop: active.length > 0 ? '16px' : 0 }}>AGUARDANDO — {waiting.length}</div>
            {waiting.map((t, i) => {
              const color = STEP_COLOR[t.step_type] ?? STEP_COLOR.default
              const isMyType = myStepTypes.includes(t.step_type)
              return (
                <div key={t.id} style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#444', width: '20px', textAlign: 'center' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#F0EEE9' }}>{vehicleName(t)}</div>
                      <div style={{ fontSize: '11px', color: '#555' }}>{t.vehicle_plate} · {t.wait_minutes}min esperando</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: `${color}22`, color, border: `1px solid ${color}44` }}>
                        {STEP_LABEL[t.step_type] ?? t.step_type}
                      </span>
                      {isMyType && !hasActive && (
                        <button
                          onClick={() => iniciar(t.id)}
                          disabled={pending}
                          style={{ height: '30px', padding: '0 12px', background: '#FF6B00', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          Iniciar
                        </button>
                      )}
                      {isMyType && (
                        <Link href={`/mobile/task/${t.id}`} style={{ height: '30px', padding: '0 10px', background: '#1A1A1A', border: '1px solid #333', borderRadius: '7px', color: '#888', fontSize: '11px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                          Ver
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {waiting.length === 0 && active.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0EEE9' }}>Fila vazia</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Nenhum trabalho pendente</div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', height: '72px', background: '#0D0D0D', borderTop: '1px solid #1A1A1A', display: 'flex' }}>
        <Link href="/mobile" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>🏠</span>Home
        </Link>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#FF6B00', fontSize: '10px', borderTop: '2px solid #FF6B00' }}>
          <span style={{ fontSize: '20px' }}>📋</span>Fila
        </div>
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
