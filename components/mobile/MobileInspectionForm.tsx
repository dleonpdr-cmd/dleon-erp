'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitInspection } from '@/app/api/workflow/actions'
import type { QueueItem } from '@/app/api/workflow/constants'

const PANELS = [
  { id: 'roof',          label: 'Teto' },
  { id: 'bonnet',        label: 'Capô' },
  { id: 'l_front_door',  label: 'Porta Dianteira Esq' },
  { id: 'r_front_door',  label: 'Porta Dianteira Dir' },
  { id: 'l_rear_door',   label: 'Porta Traseira Esq' },
  { id: 'r_rear_door',   label: 'Porta Traseira Dir' },
  { id: 'l_front_wing',  label: 'Para-lama Dianteiro Esq' },
  { id: 'r_front_wing',  label: 'Para-lama Dianteiro Dir' },
  { id: 'l_rear_fender', label: 'Para-lama Traseiro Esq' },
  { id: 'r_rear_fender', label: 'Para-lama Traseiro Dir' },
  { id: 'trunk',         label: 'Tampa do Porta-malas' },
  { id: 'l_sill',        label: 'Soleira Esq' },
  { id: 'r_sill',        label: 'Soleira Dir' },
]

type PanelState = 'ok' | 'problem' | null

type Props = {
  task: QueueItem
  operationId: string
  reworkStepId?: string
  nextInspectionStepId?: string
  assemblyStepId?: string
}

export default function MobileInspectionForm({ task, operationId, reworkStepId, nextInspectionStepId, assemblyStepId }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [flash, setFlash] = useState('')
  const [flashOk, setFlashOk] = useState(true)
  const [panels, setPanels] = useState<Record<string, PanelState>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  function showFlash(msg: string, ok = true) {
    setFlash(msg); setFlashOk(ok)
    setTimeout(() => setFlash(''), 4000)
  }

  function setPanel(id: string, state: PanelState) {
    setPanels(prev => ({ ...prev, [id]: state }))
    if (state === 'ok') setNotes(prev => ({ ...prev, [id]: '' }))
  }

  const problems = PANELS.filter(p => panels[p.id] === 'problem')
  const answeredCount = PANELS.filter(p => panels[p.id] != null).length
  const allAnswered = answeredCount === PANELS.length

  function handleSubmit() {
    if (!allAnswered) {
      showFlash(`Avalie todos os painéis (${PANELS.length - answeredCount} restantes)`, false)
      return
    }

    const hasProblems = problems.length > 0
    const findings = problems.map(p => ({
      part_id: p.id,
      part_label: p.label,
      severity: 'major' as const,
      notes: notes[p.id] || undefined,
    }))

    startT(async () => {
      const r = await submitInspection(
        task.id,
        operationId,
        hasProblems ? 'rework_needed' : 'approved',
        findings,
        hasProblems
          ? { reworkStepId, nextInspectionStepId }
          : { nextStepAfterApproval: assemblyStepId }
      )
      if (r.error) { showFlash('Erro: ' + r.error, false); return }
      setSubmitted(true)
      setTimeout(() => router.push('/mobile'), 1800)
    })
  }

  if (submitted) {
    const hasProblems = problems.length > 0
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>{hasProblems ? '🔧' : '✅'}</div>
        <div style={{ fontSize: '17px', fontWeight: '700', color: hasProblems ? '#E24B4A' : '#1D9E75' }}>
          {hasProblems
            ? `${problems.length} painel${problems.length > 1 ? 's' : ''} → Repasse`
            : 'Veículo aprovado!'}
        </div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '8px' }}>Redirecionando...</div>
      </div>
    )
  }

  return (
    <div>
      {flash && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', zIndex: 100, padding: '14px 20px', background: flashOk ? '#1D9E75' : '#E24B4A', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
          {flash}
        </div>
      )}

      <div style={{ padding: '20px' }}>

        {/* Progresso */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600' }}>VISTORIA</div>
            <div style={{ fontSize: '11px', color: '#555' }}>{answeredCount}/{PANELS.length} painéis</div>
          </div>
          <div style={{ height: '4px', background: '#1A1A1A', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(answeredCount / PANELS.length) * 100}%`, background: problems.length > 0 ? '#E24B4A' : '#1D9E75', transition: 'width 0.2s, background 0.2s', borderRadius: '2px' }} />
          </div>
          {problems.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#E24B4A' }}>
              {problems.length} painel{problems.length > 1 ? 's' : ''} com problema
            </div>
          )}
        </div>

        {/* Lista de painéis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {PANELS.map(panel => {
            const state = panels[panel.id]
            const borderColor = state === 'problem' ? '#E24B4A44' : state === 'ok' ? '#1D9E7533' : '#1E1E1E'
            return (
              <div
                key={panel.id}
                style={{ background: '#141414', border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '14px', transition: 'border-color 0.15s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#F0EEE9' }}>{panel.label}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPanel(panel.id, 'ok')}
                      style={{
                        height: '36px', padding: '0 16px', borderRadius: '10px',
                        border: `2px solid ${state === 'ok' ? '#1D9E75' : '#2A2A2A'}`,
                        background: state === 'ok' ? '#1D9E7522' : 'transparent',
                        color: state === 'ok' ? '#1D9E75' : '#555',
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      }}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setPanel(panel.id, 'problem')}
                      style={{
                        height: '36px', padding: '0 12px', borderRadius: '10px',
                        border: `2px solid ${state === 'problem' ? '#E24B4A' : '#2A2A2A'}`,
                        background: state === 'problem' ? '#E24B4A22' : 'transparent',
                        color: state === 'problem' ? '#E24B4A' : '#555',
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      }}
                    >
                      Problema
                    </button>
                  </div>
                </div>

                {state === 'problem' && (
                  <div style={{ marginTop: '12px' }}>
                    <textarea
                      placeholder="Observação para o técnico (opcional)"
                      value={notes[panel.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [panel.id]: e.target.value }))}
                      style={{
                        width: '100%', minHeight: '60px',
                        background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px',
                        padding: '10px', color: '#F0EEE9', fontSize: '13px', resize: 'none',
                        boxSizing: 'border-box', fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ marginTop: '8px', padding: '10px 12px', background: '#0D0D0D', border: '1px dashed #2A2A2A', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', fontSize: '12px' }}>
                      <span>📷</span>
                      <span>Foto — em breve</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Botão de envio */}
        <button
          onClick={handleSubmit}
          disabled={pending}
          style={{
            width: '100%', height: '58px',
            background: !allAnswered ? '#1A1A1A' : problems.length > 0 ? '#E24B4A' : '#1D9E75',
            border: 'none', borderRadius: '14px',
            color: !allAnswered ? '#444' : '#fff',
            fontSize: '16px', fontWeight: '700',
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending
            ? 'Enviando...'
            : !allAnswered
            ? `Avalie mais ${PANELS.length - answeredCount} painel${PANELS.length - answeredCount > 1 ? 's' : ''}`
            : problems.length > 0
            ? `🔧 Enviar para repasse (${problems.length} painel${problems.length > 1 ? 's' : ''})`
            : '✓ Aprovar veículo'}
        </button>
      </div>
    </div>
  )
}
