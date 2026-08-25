'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'
import type { QueueItem, StepCount } from '@/app/api/workflow/constants'

// ─── Constantes ──────────────────────────────────────────────────────────────

const ACCENT      = '#F59E0B'
const ACCENT_DIM  = '#F59E0B18'
const ACCENT_BDR  = '#F59E0B44'

const STEP_COLOR: Record<string, string> = {
  repair:      '#FF6B00',
  rework:      '#E24B4A',
  inspection:  '#9B59B6',
  disassembly: '#E74C3C',
  assembly:    '#3498DB',
  default:     '#888',
}

const STEP_LABEL: Record<string, string> = {
  reception: 'Recepção', disassembly: 'Desmontagem', repair: 'PDR',
  inspection: 'Inspeção', rework: 'Repasse', assembly: 'Montagem',
  wash: 'Lavagem', polish: 'Polimento', paint: 'Pintura',
  parts: 'Peças', finalization: 'Finalização', custom: 'Custom',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMins(mins: number | null | undefined): string {
  if (!mins || mins <= 0) return '0min'
  const m = Math.round(mins)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}min`
}

function stepColor(type: string) {
  return STEP_COLOR[type] ?? STEP_COLOR.default
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  ctx: CurrentTechnicianContext
  queue: QueueItem[]       // queued + in_progress de toda a operação
  stepCounts: StepCount[]  // agregados por etapa
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function MobileHomeSupervisor({ ctx, queue, stepCounts }: Props) {
  const [filterStep, setFilterStep] = useState<string>('todos')

  // ── Dados derivados ───────────────────────────────────────────────────────
  const inProgress   = queue.filter(t => t.status === 'in_progress')
  const queued       = queue.filter(t => t.status === 'queued')

  // Etapas ativas (com tasks existentes)
  const activeStepCounts = stepCounts.filter(s => s.total_count > 0)

  // Gargalos: queued_count > 3 OU avg_wait > 60 OU maior avg_wait_minutes da operação
  const maxWaitStep = activeStepCounts.reduce<StepCount | null>((max, s) =>
    (s.avg_wait_minutes ?? 0) > (max?.avg_wait_minutes ?? 0) ? s : max, null
  )
  const bottlenecks = activeStepCounts.filter(s =>
    s.queued_count > 3 ||
    (s.avg_wait_minutes ?? 0) > 60 ||
    s.workflow_step_id === maxWaitStep?.workflow_step_id
  )

  // Chips de filtro: step_types únicos presentes na fila
  const uniqueStepTypes = Array.from(new Set(queued.map(t => t.step_type)))

  // Fila filtrada
  const filteredQueue = filterStep === 'todos'
    ? [...queued].sort((a, b) => (b.wait_minutes ?? 0) - (a.wait_minutes ?? 0))
    : [...queued.filter(t => t.step_type === filterStep)].sort((a, b) => (b.wait_minutes ?? 0) - (a.wait_minutes ?? 0))

  return (
    <div style={{ minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '90px' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1A1A1A' }}>
        <div style={{ fontSize: '13px', color: ACCENT, fontWeight: '700', letterSpacing: '0.08em', marginBottom: '4px' }}>
          SUPERVISOR
        </div>
        <div style={{ fontSize: '19px', fontWeight: '700', color: '#F0EEE9', marginBottom: '6px' }}>
          {ctx.operationName}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <KpiPill label="Em andamento" value={inProgress.length} color={ACCENT} />
          <KpiPill label="Na fila" value={queued.length} color="#888" />
          <KpiPill label="Concluídos" value={stepCounts.reduce((n, s) => n + s.completed_count, 0)} color="#1D9E75" />
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── LINHA DE PRODUÇÃO ──────────────────────────────────────────── */}
        {activeStepCounts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionLabel>LINHA DE PRODUÇÃO</SectionLabel>
            <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '14px', overflow: 'hidden' }}>
              {activeStepCounts.map((s, i) => {
                const color  = stepColor(s.step_type)
                const total  = s.total_count
                const pct    = total > 0 ? Math.round((s.completed_count / total) * 100) : 0
                const isLast = i === activeStepCounts.length - 1
                return (
                  <div key={s.workflow_step_id} style={{
                    padding: '12px 14px',
                    borderBottom: isLast ? 'none' : '1px solid #1A1A1A',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#F0EEE9' }}>
                          {STEP_LABEL[s.step_type] ?? s.step_name}
                        </span>
                        {s.in_progress_count > 0 && (
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', background: `${color}22`, color, border: `1px solid ${color}44` }}>
                            {s.in_progress_count} ativo{s.in_progress_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#555' }}>{pct}% ✓</span>
                    </div>
                    {/* Barra de progresso */}
                    <div style={{ height: '4px', background: '#1A1A1A', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                      {s.queued_count > 0 && (
                        <span style={{ fontSize: '10px', color: '#555' }}>{s.queued_count} aguardando</span>
                      )}
                      {s.avg_wait_minutes != null && s.avg_wait_minutes > 0 && (
                        <span style={{ fontSize: '10px', color: '#444' }}>média {fmtMins(s.avg_wait_minutes)}</span>
                      )}
                      <span style={{ fontSize: '10px', color: '#333', marginLeft: 'auto' }}>{s.completed_count}/{total} concluídos</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── EM ANDAMENTO ───────────────────────────────────────────────── */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionLabel>
              EM ANDAMENTO
              <span style={{ marginLeft: '8px', color: ACCENT }}>{inProgress.length} técnico{inProgress.length > 1 ? 's' : ''}</span>
            </SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inProgress.map(t => {
                const color = stepColor(t.step_type)
                return (
                  <Link key={t.id} href={`/mobile/task/${t.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: '#141414', border: `1px solid ${color}44`,
                      borderLeft: `3px solid ${color}`, borderRadius: '12px', padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#F0EEE9' }}>
                          {t.vehicle_year} {t.vehicle_make} {t.vehicle_model}
                        </div>
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                          {t.vehicle_plate}
                          {t.assigned_name ? ` · ${t.assigned_name}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: `${color}22`, color, border: `1px solid ${color}44`, fontWeight: '700' }}>
                          {STEP_LABEL[t.step_type] ?? t.step_type}
                        </span>
                        {t.work_minutes != null && t.work_minutes > 0 && (
                          <span style={{ fontSize: '10px', color: '#444' }}>{fmtMins(t.work_minutes)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── GARGALOS ───────────────────────────────────────────────────── */}
        {bottlenecks.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionLabel>⚠ GARGALOS</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bottlenecks.map(s => {
                const color   = stepColor(s.step_type)
                const isMaxWait = s.workflow_step_id === maxWaitStep?.workflow_step_id
                const isHighQueue = s.queued_count > 3
                const isHighWait  = (s.avg_wait_minutes ?? 0) > 60
                return (
                  <div key={s.workflow_step_id} style={{
                    background: '#141414',
                    border: `1px solid #E24B4A44`,
                    borderLeft: '3px solid #E24B4A',
                    borderRadius: '12px',
                    padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#F0EEE9' }}>
                          {STEP_LABEL[s.step_type] ?? s.step_name}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: '#E24B4A22', color: '#E24B4A', border: '1px solid #E24B4A44', fontWeight: '700' }}>
                          ⚠ GARGALO
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: `${color}22`, color, border: `1px solid ${color}44` }}>
                        {STEP_LABEL[s.step_type]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {isHighQueue && (
                        <span style={{ fontSize: '11px', color: '#E24B4A' }}>
                          {s.queued_count} na fila
                        </span>
                      )}
                      {(isHighWait || isMaxWait) && (
                        <span style={{ fontSize: '11px', color: isMaxWait && !isHighWait ? '#F59E0B' : '#E24B4A' }}>
                          {isMaxWait && !isHighWait ? '⏱ maior espera da op: ' : 'espera média: '}
                          {fmtMins(s.avg_wait_minutes)}
                        </span>
                      )}
                      {isMaxWait && isHighWait && (
                        <span style={{ fontSize: '11px', color: '#F59E0B' }}>⏱ maior espera da op</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── FILA COMPLETA ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>
            FILA COMPLETA
            <span style={{ marginLeft: '8px', color: '#555' }}>{queued.length} veículo{queued.length !== 1 ? 's' : ''}</span>
          </SectionLabel>

          {/* Chips de filtro */}
          {uniqueStepTypes.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <FilterChip
                label="TODOS"
                active={filterStep === 'todos'}
                color={ACCENT}
                onClick={() => setFilterStep('todos')}
              />
              {uniqueStepTypes.map(type => (
                <FilterChip
                  key={type}
                  label={STEP_LABEL[type] ?? type}
                  active={filterStep === type}
                  color={stepColor(type)}
                  onClick={() => setFilterStep(type)}
                />
              ))}
            </div>
          )}

          {filteredQueue.length === 0 && (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
              <div style={{ fontSize: '13px', color: '#555' }}>Nenhum veículo aguardando</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredQueue.map((t, i) => {
              const color = stepColor(t.step_type)
              return (
                <Link key={t.id} href={`/mobile/task/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#141414', border: '1px solid #1E1E1E',
                    borderRadius: '12px', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ fontSize: '11px', color: '#333', width: '22px', textAlign: 'center', flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#F0EEE9' }}>
                        {t.vehicle_year} {t.vehicle_make} {t.vehicle_model}
                      </div>
                      <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                        {t.vehicle_plate}
                        {t.customer_name ? ` · ${t.customer_name}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: `${color}22`, color, border: `1px solid ${color}44`, fontWeight: '700' }}>
                        {STEP_LABEL[t.step_type] ?? t.step_type}
                      </span>
                      {t.wait_minutes != null && t.wait_minutes > 0 && (
                        <span style={{ fontSize: '10px', color: '#444' }}>{fmtMins(t.wait_minutes)}</span>
                      )}
                      {t.priority === 'urgent' && (
                        <span style={{ fontSize: '10px', color: '#E24B4A', fontWeight: '700' }}>URGENTE</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── EMPTY STATE GLOBAL ─────────────────────────────────────────── */}
        {queue.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>✓</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0EEE9' }}>Operação vazia</div>
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Nenhuma task ativa ou na fila</div>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px', height: '72px',
        background: '#0D0D0D', borderTop: '1px solid #1A1A1A',
        display: 'flex',
      }}>
        <NavItem icon="🏠" label="Home" active href="/mobile" />
        <NavItem icon="📋" label="Fila"  href="/mobile/queue" />
        <NavItem icon="📖" label="Histórico" href="/mobile/history" />
        <NavItem icon="👤" label="Perfil" href="/mobile/profile" />
      </div>
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
      {children}
    </div>
  )
}

function KpiPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '10px', padding: '6px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>{label}</div>
    </div>
  )
}

function FilterChip({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: '28px', padding: '0 12px', borderRadius: '8px', border: 'none',
        cursor: 'pointer', fontSize: '11px', fontWeight: '600',
        background: active ? color : '#1A1A1A',
        color: active ? '#fff' : '#555',
      }}
    >
      {label}
    </button>
  )
}

function NavItem({ icon, label, active, href }: { icon: string; label: string; active?: boolean; href: string }) {
  const ACCENT_NAV = '#F59E0B'
  return (
    <Link href={href} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '3px', fontSize: '10px', textDecoration: 'none',
      color: active ? ACCENT_NAV : '#444',
      borderTop: active ? `2px solid ${ACCENT_NAV}` : '2px solid transparent',
    }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      {label}
    </Link>
  )
}
