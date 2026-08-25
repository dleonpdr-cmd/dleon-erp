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

function paineisLabel(n: number) {
  return n === 1 ? '1 painel' : `${n} painéis`
}

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
  const [panels, setPanels] = useState<Record<string, PanelState>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [doneMsg, setDoneMsg] = useState('')

  function setPanel(id: string, state: PanelState) {
    if (pending || done) return
    setPanels(prev => ({ ...prev, [id]: state }))
    if (state === 'ok') setNotes(prev => ({ ...prev, [id]: '' }))
  }

  const problems = PANELS.filter(p => panels[p.id] === 'problem')
  const okCount = PANELS.filter(p => panels[p.id] === 'ok').length
  const answeredCount = PANELS.filter(p => panels[p.id] != null).length
  const allAnswered = answeredCount === PANELS.length
  const hasProblems = problems.length > 0

  function handleSubmit() {
    if (!allAnswered || pending || done) return

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
      if (r.error) {
        alert('Erro: ' + r.error)
        return
      }
      setDone(true)
      setDoneMsg(hasProblems
        ? `${paineisLabel(problems.length)} com problema → Repasse`
        : 'Veículo aprovado!'
      )
      setTimeout(() => router.push('/mobile'), 1500)
    })
  }

  // Tela de conclusão
  if (done) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '44px', marginBottom: '16px' }}>{hasProblems ? '🔧' : '✅'}</div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: hasProblems ? '#E24B4A' : '#1D9E75', marginBottom: '8px' }}>
          ✓ Inspeção concluída
        </div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>{doneMsg}</div>
        <div style={{ fontSize: '12px', color: '#444' }}>Redirecionando...</div>
      </div>
    )
  }

  return (
    <div style={{ opacity: pending ? 0.6 : 1, transition: 'opacity 0.2s' }}>

      {/* Header com progresso em tempo real */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600' }}>VISTORIA</div>
          <div style={{ fontSize: '12px', color: answeredCount === PANELS.length ? '#1D9E75' : '#555', fontWeight: '600' }}>
            {answeredCount}/{PANELS.length} avaliados
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ height: '4px', background: '#1A1A1A', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{
            height: '100%',
            width: `${(answeredCount / PANELS.length) * 100}%`,
            background: hasProblems ? '#E24B4A' : '#1D9E75',
            transition: 'width 0.2s, background 0.2s',
            borderRadius: '2px',
          }} />
        </div>

        {/* Contador rápido */}
        {answeredCount > 0 && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
            {okCount > 0 && (
              <span style={{ fontSize: '11px', color: '#1D9E75' }}>✓ {paineisLabel(okCount)} OK</span>
            )}
            {problems.length > 0 && (
              <span style={{ fontSize: '11px', color: '#E24B4A' }}>⚠ {paineisLabel(problems.length)} com problema</span>
            )}
          </div>
        )}
      </div>

      {/* Lista de painéis */}
      <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {PANELS.map(panel => {
          const state = panels[panel.id]
          const isProb = state === 'problem'
          const isOk = state === 'ok'
          const borderColor = isProb ? '#E24B4A55' : isOk ? '#1D9E7533' : '#1E1E1E'
          const bg = isProb ? '#E24B4A08' : '#141414'

          return (
            <div
              key={panel.id}
              style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '14px', transition: 'border-color 0.15s, background 0.15s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isProb && <span style={{ fontSize: '14px' }}>⚠</span>}
                  <div style={{ fontSize: '14px', fontWeight: '600', color: isProb ? '#E24B4A' : '#F0EEE9' }}>
                    {panel.label}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPanel(panel.id, 'ok')}
                    disabled={pending}
                    style={{
                      height: '36px', padding: '0 16px', borderRadius: '10px',
                      border: `2px solid ${isOk ? '#1D9E75' : '#2A2A2A'}`,
                      background: isOk ? '#1D9E7522' : 'transparent',
                      color: isOk ? '#1D9E75' : '#555',
                      fontSize: '13px', fontWeight: '700', cursor: pending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setPanel(panel.id, 'problem')}
                    disabled={pending}
                    style={{
                      height: '36px', padding: '0 12px', borderRadius: '10px',
                      border: `2px solid ${isProb ? '#E24B4A' : '#2A2A2A'}`,
                      background: isProb ? '#E24B4A22' : 'transparent',
                      color: isProb ? '#E24B4A' : '#555',
                      fontSize: '13px', fontWeight: '700', cursor: pending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Problema
                  </button>
                </div>
              </div>

              {isProb && (
                <div style={{ marginTop: '12px' }}>
                  <textarea
                    placeholder="Observação para o técnico (opcional)"
                    value={notes[panel.id] ?? ''}
                    onChange={e => !pending && setNotes(prev => ({ ...prev, [panel.id]: e.target.value }))}
                    disabled={pending}
                    style={{
                      width: '100%', minHeight: '56px',
                      background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '8px',
                      padding: '10px', color: '#F0EEE9', fontSize: '13px', resize: 'none',
                      boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ marginTop: '8px', padding: '10px 12px', background: '#0D0D0D', border: '1px dashed #2A2A2A', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', fontSize: '12px' }}>
                    <span>📷</span><span>Foto — em breve</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumo + botão de envio */}
      <div style={{ padding: '20px' }}>
        {allAnswered && (
          <div style={{ marginBottom: '14px', padding: '14px 16px', background: '#141414', border: `1px solid ${hasProblems ? '#E24B4A33' : '#1D9E7533'}`, borderRadius: '12px' }}>
            <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>RESUMO</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#1D9E75' }}>{okCount}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>OK</div>
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: problems.length > 0 ? '#E24B4A' : '#444' }}>{problems.length}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>problema{problems.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            {problems.length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1A1A1A' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Painéis com problema:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {problems.map(p => (
                    <span key={p.id} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#E24B4A22', color: '#E24B4A', border: '1px solid #E24B4A33' }}>
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={pending || !allAnswered}
          style={{
            width: '100%', height: '58px',
            background: pending ? '#333' : !allAnswered ? '#1A1A1A' : hasProblems ? '#E24B4A' : '#1D9E75',
            border: 'none', borderRadius: '14px',
            color: (!allAnswered && !pending) ? '#444' : '#fff',
            fontSize: '16px', fontWeight: '700',
            cursor: (pending || !allAnswered) ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {pending
            ? 'Enviando...'
            : !allAnswered
            ? `Avalie mais ${paineisLabel(PANELS.length - answeredCount)}`
            : hasProblems
            ? `🔧 Enviar para repasse (${paineisLabel(problems.length)})`
            : '✓ Aprovar veículo'}
        </button>
      </div>
    </div>
  )
}
