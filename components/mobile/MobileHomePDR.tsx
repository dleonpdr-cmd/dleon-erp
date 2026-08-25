'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTask, completeTask } from '@/app/api/workflow/actions'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'
import type { QueueItem } from '@/app/api/workflow/constants'

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  screen:  { minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '90px' },
  header:  { padding: '20px 20px 0', borderBottom: '1px solid #1A1A1A', paddingBottom: '16px' },
  section: { padding: '20px 20px 0' },
  label:   { fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' },
  card:    (border = '#2A2A2A') => ({
    background: '#141414', border: `1px solid ${border}`, borderRadius: '14px',
    padding: '16px', marginBottom: '12px',
  }),
  bigBtn: (color = '#FF6B00', secondary = false) => ({
    flex: 1, height: '54px', background: secondary ? 'transparent' : color,
    border: secondary ? `2px solid ${color}` : 'none',
    borderRadius: '12px', color: secondary ? color : '#fff',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer' as const,
  }),
  badge: (color: string) => ({
    fontSize: '10px', padding: '3px 8px', borderRadius: '8px',
    background: `${color}22`, color, border: `1px solid ${color}44`,
  }),
  tab: (active: boolean) => ({
    flex: 1, height: '100%', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center', gap: '3px',
    color: active ? '#FF6B00' : '#444', fontSize: '10px', textDecoration: 'none',
    borderTop: active ? '2px solid #FF6B00' : '2px solid transparent',
    background: 'none', border: 'none', cursor: 'pointer' as const,
    borderTopColor: active ? '#FF6B00' : 'transparent',
  }),
}

// ─── Timer ────────────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  ctx: CurrentTechnicianContext
  currentTask: QueueItem | null
  queuedTasks: QueueItem[]
  waitingTasks: QueueItem[]
}

export default function MobileHomePDR({ ctx, currentTask, queuedTasks, waitingTasks }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [flash, setFlash] = useState('')
  const [flashOk, setFlashOk] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'queue' | 'history'>('home')

  const timer = useElapsed(currentTask?.started_at ?? null)

  function showFlash(msg: string, ok = true) {
    setFlash(msg); setFlashOk(ok)
    setTimeout(() => setFlash(''), 3500)
  }

  function iniciar(taskId: string) {
    startT(async () => {
      const r = await startTask(taskId, ctx.operationId)
      if (r.error) showFlash('Erro: ' + r.error, false)
      else { showFlash('Tarefa iniciada.'); router.refresh() }
    })
  }

  function concluir(taskId: string, isRework: boolean) {
    startT(async () => {
      const r = await completeTask(taskId, ctx.operationId)
      if (r.error) showFlash('Erro: ' + r.error, false)
      else {
        showFlash(isRework ? 'Repasse concluído — aguardando inspeção.' : 'Concluído ✓')
        router.refresh()
      }
    })
  }

  const repairs = queuedTasks.filter(t => t.step_type === 'repair')
  const reworks = queuedTasks.filter(t => t.step_type === 'rework')

  return (
    <div style={S.screen}>

      {/* Flash */}
      {flash && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px', zIndex: 100,
          padding: '14px 20px', fontSize: '13px', fontWeight: '600',
          background: flashOk ? '#1D9E75' : '#E24B4A', color: '#fff',
          textAlign: 'center',
        }}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>D'LEON</div>
            <div style={{ fontSize: '19px', fontWeight: '700' }}>
              Bom trabalho, {ctx.technicianName.split(' ')[0]}
            </div>
          </div>
          <Link href="/mobile/profile" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1D9E7533', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: '#1D9E75', textDecoration: 'none' }}>
            {ctx.technicianName.charAt(0)}
          </Link>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>{ctx.operationName}</span>
          <span style={S.badge('#FF6B00')}>Técnico PDR</span>
        </div>
      </div>

      {/* ── CARRO ATUAL ── */}
      <div style={S.section}>
        <div style={S.label}>CARRO ATUAL</div>

        {currentTask ? (
          <div style={{ ...S.card('#FF6B0055'), borderLeft: '4px solid #FF6B00' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>{currentTask.vehicle_year} {currentTask.vehicle_make} {currentTask.vehicle_model}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{currentTask.vehicle_plate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#555' }}>
                  {currentTask.step_type === 'rework' ? 'REPASSE' : 'PDR'}
                  {currentTask.round > 1 && ` · Round ${currentTask.round}`}
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF6B00', fontVariantNumeric: 'tabular-nums' }}>
                  {timer}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <Link
                href={`/mobile/task/${currentTask.id}`}
                style={{ ...S.bigBtn('#FF6B00', true), display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flex: '0 0 auto', padding: '0 20px', height: '54px', borderRadius: '12px' }}
              >
                Abrir
              </Link>
              <button
                onClick={() => concluir(currentTask.id, currentTask.step_type === 'rework')}
                disabled={pending}
                style={{ ...S.bigBtn('#1D9E75'), opacity: pending ? 0.6 : 1 }}
              >
                {currentTask.step_type === 'rework' ? 'Concluir repasse' : 'Enviar para inspeção'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card(), padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔧</div>
            <div style={{ fontSize: '13px', color: '#555' }}>Nenhum carro em andamento</div>
            {queuedTasks.length > 0 && (
              <button
                onClick={() => iniciar(queuedTasks[0].id)}
                disabled={pending}
                style={{ marginTop: '16px', height: '46px', padding: '0 28px', background: '#FF6B00', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                {pending ? 'Iniciando...' : `Iniciar próximo`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MINHA FILA ── */}
      {(repairs.length > 0 || reworks.length > 0) && (
        <div style={S.section}>
          <div style={S.label}>MINHA FILA</div>

          {repairs.length > 0 && (
            <div style={S.card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>Reparos</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{repairs.length} veículo(s) aguardando</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#FF6B00' }}>{repairs.length}</div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {repairs.slice(0, 3).map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#111', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#555', width: '16px' }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>{t.vehicle_year} {t.vehicle_make} {t.vehicle_model}</div>
                      <div style={{ fontSize: '11px', color: '#555' }}>{t.vehicle_plate}</div>
                    </div>
                    {!currentTask && (
                      <button
                        onClick={() => iniciar(t.id)}
                        disabled={pending}
                        style={{ height: '30px', padding: '0 14px', background: '#FF6B00', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Iniciar
                      </button>
                    )}
                  </div>
                ))}
                {repairs.length > 3 && (
                  <Link href="/mobile/queue" style={{ fontSize: '12px', color: '#FF6B00', textDecoration: 'none', textAlign: 'center', padding: '8px' }}>
                    Ver todos ({repairs.length}) →
                  </Link>
                )}
              </div>
            </div>
          )}

          {reworks.length > 0 && (
            <div style={{ ...S.card('#9B59B655'), borderLeft: '4px solid #9B59B6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#9B59B6' }}>⚡ Repasse</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{reworks.length} veículo(s) — prioridade</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#9B59B6' }}>{reworks.length}</div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reworks.map(t => (
                  <div key={t.id} style={{ padding: '10px 12px', background: '#111', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{t.vehicle_year} {t.vehicle_make} {t.vehicle_model}</div>
                      <span style={S.badge('#9B59B6')}>Round {t.round}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>{t.vehicle_plate}</div>
                    {!currentTask && (
                      <button
                        onClick={() => iniciar(t.id)}
                        disabled={pending}
                        style={{ width: '100%', height: '38px', background: '#9B59B622', border: '1px solid #9B59B644', borderRadius: '8px', color: '#9B59B6', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Iniciar repasse
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AGUARDANDO OUTRAS EQUIPES ── */}
      {waitingTasks.length > 0 && (
        <div style={S.section}>
          <div style={S.label}>AGUARDANDO OUTRAS EQUIPES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {waitingTasks.slice(0, 4).map(t => {
              const stepLabel = t.step_type === 'inspection' ? 'Inspeção' : 'Montagem'
              const stepColor = t.step_type === 'inspection' ? '#9B59B6' : '#3498DB'
              const waitMins = Math.round((Date.now() - new Date(t.requested_at ?? t.created_at).getTime()) / 60000)
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#141414', border: '1px solid #1A1A1A', borderRadius: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{t.vehicle_year} {t.vehicle_make} {t.vehicle_model}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{t.vehicle_plate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={S.badge(stepColor)}>{stepLabel}</div>
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                      #{t.queue_position} na fila · {waitMins}min
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!currentTask && queuedTasks.length === 0 && waitingTasks.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>Fila limpa!</div>
          <div style={{ fontSize: '13px', color: '#555' }}>Nenhuma tarefa pendente no momento.</div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px', height: '72px',
        background: '#0D0D0D', borderTop: '1px solid #1A1A1A',
        display: 'flex',
      }}>
        <button onClick={() => setActiveTab('home')} style={S.tab(activeTab === 'home')}>
          <span style={{ fontSize: '20px' }}>🏠</span>
          Home
        </button>
        <Link href="/mobile/queue" style={{ ...S.tab(false), textDecoration: 'none' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          Fila
        </Link>
        <Link href="/mobile/history" style={{ ...S.tab(false), textDecoration: 'none' }}>
          <span style={{ fontSize: '20px' }}>📖</span>
          Histórico
        </Link>
        <Link href="/mobile/profile" style={{ ...S.tab(false), textDecoration: 'none' }}>
          <span style={{ fontSize: '20px' }}>👤</span>
          Perfil
        </Link>
      </div>
    </div>
  )
}
