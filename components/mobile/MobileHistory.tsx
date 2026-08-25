'use client'

import Link from 'next/link'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'

const STEP_LABEL: Record<string, string> = {
  reception: 'Recepção', disassembly: 'Desmontagem', repair: 'PDR',
  inspection: 'Inspeção', rework: 'Repasse', assembly: 'Montagem',
  wash: 'Lavagem', polish: 'Polimento', paint: 'Pintura',
  parts: 'Peças', finalization: 'Finalização', custom: 'Custom',
}

const EVENT_ICON: Record<string, string> = {
  started: '▶', completed: '✓',
}

const EVENT_COLOR: Record<string, string> = {
  started: '#FF6B00', completed: '#1D9E75',
}

function fmt(dt: string) {
  const d = new Date(dt)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const isToday = d.toDateString() === today.toDateString()
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Hoje ${time}`
  if (isYesterday) return `Ontem ${time}`
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

type TaskInfo = {
  id: string
  step_type: string
  step_name: string
  round: number
  case_number: string
  customer_name: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_plate: string
}

type EventRow = {
  id: string
  task_id: string
  event_type: string
  created_at: string
  task: TaskInfo | null
}

type Props = {
  ctx: CurrentTechnicianContext
  events: EventRow[]
}

export default function MobileHistory({ ctx, events }: Props) {
  const grouped: Record<string, EventRow[]> = {}
  for (const ev of events) {
    if (!ev.task) continue
    const day = new Date(ev.created_at).toDateString()
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(ev)
  }
  const days = Object.keys(grouped)

  return (
    <div style={{ minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '90px' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '16px', fontWeight: '700' }}>Meu histórico</div>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{ctx.operationName} · {ctx.technicianName}</div>
      </div>

      <div style={{ padding: '16px' }}>
        {days.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📖</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0EEE9' }}>Histórico vazio</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Nenhuma atividade registrada</div>
          </div>
        )}

        {days.map(day => (
          <div key={day} style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
              {new Date(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {grouped[day].map(ev => {
                const t = ev.task!
                const color = EVENT_COLOR[ev.event_type] ?? '#888'
                const vehicleName = `${t.vehicle_year} ${t.vehicle_make} ${t.vehicle_model}`

                return (
                  <Link key={ev.id} href={`/mobile/task/${t.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#141414', border: '1px solid #1A1A1A', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color, flexShrink: 0, fontWeight: '700' }}>
                        {EVENT_ICON[ev.event_type] ?? '•'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#F0EEE9' }}>{vehicleName}</div>
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                          {t.vehicle_plate} · {STEP_LABEL[t.step_type] ?? t.step_type}
                          {t.round > 1 ? ` Round ${t.round}` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', color: '#555', textAlign: 'right', flexShrink: 0 }}>
                        {fmt(ev.created_at)}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', height: '72px', background: '#0D0D0D', borderTop: '1px solid #1A1A1A', display: 'flex' }}>
        <Link href="/mobile" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>🏠</span>Home
        </Link>
        <Link href="/mobile/queue" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>📋</span>Fila
        </Link>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#FF6B00', fontSize: '10px', borderTop: '2px solid #FF6B00' }}>
          <span style={{ fontSize: '20px' }}>📖</span>Histórico
        </div>
        <Link href="/mobile/profile" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>👤</span>Perfil
        </Link>
      </div>
    </div>
  )
}
