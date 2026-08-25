'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startCaseWorkflow } from '@/app/api/workflow/actions'
import {
  STEP_TYPE_LABEL, STEP_TYPE_COLOR, TASK_STATUS_LABEL, TASK_STATUS_COLOR, PRIORITY_LABEL,
  type CaseWorkflowStatus,
  type WorkflowTask,
  type StepType,
} from '@/app/api/workflow/constants'

type Props = {
  caseId: string
  operationId: string
  operationName: string
  templateId: string | null
  currentStatus: CaseWorkflowStatus | null
  tasks: WorkflowTask[]
  // Steps do template para mostrar o nome
  stepNames: Record<string, string>   // stepId → name
  stepTypes: Record<string, string>   // stepId → step_type
}

export default function CaseWorkflowSection({
  caseId, operationId, operationName, templateId,
  currentStatus, tasks, stepNames, stepTypes,
}: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [msg, setMsg] = useState('')

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  function handleStart() {
    if (!templateId) return
    startT(async () => {
      const r = await startCaseWorkflow(operationId, caseId, templateId)
      if (r.error) flash('Erro: ' + r.error)
      else {
        flash('Workflow iniciado.')
        router.refresh()
      }
    })
  }

  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'skipped')
  const activeTask = tasks.find(t => t.status === 'queued' || t.status === 'in_progress')

  return (
    <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#555' }}>WORKFLOW</div>
        <Link href={`/operations/${operationId}/queue`} style={{ fontSize: '12px', color: '#FF6B00', textDecoration: 'none' }}>
          Ver fila →
        </Link>
      </div>

      {/* Flash */}
      {msg && (
        <div style={{
          padding: '8px 12px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px',
          background: msg.startsWith('Erro') ? 'rgba(226,75,74,0.1)' : 'rgba(29,158,117,0.1)',
          border: `1px solid ${msg.startsWith('Erro') ? '#E24B4A' : '#1D9E75'}`,
          color: msg.startsWith('Erro') ? '#F09595' : '#1D9E75',
        }}>
          {msg}
        </div>
      )}

      {/* Sem template */}
      {!templateId && (
        <div style={{ fontSize: '12px', color: '#555', padding: '8px 0' }}>
          A operação <em>{operationName}</em> não tem template de workflow.{' '}
          <Link href={`/operations/${operationId}`} style={{ color: '#FF6B00', textDecoration: 'none' }}>Configurar →</Link>
        </div>
      )}

      {/* Com template, ainda não iniciado */}
      {templateId && !activeTask && tasks.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: '#555' }}>Workflow ainda não iniciado para este caso.</div>
          <button
            onClick={handleStart}
            disabled={pending}
            style={{
              height: '32px', padding: '0 16px', background: '#FF6B00', border: 'none',
              borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: '600',
              cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Iniciando...' : 'Iniciar Workflow'}
          </button>
        </div>
      )}

      {/* Status atual */}
      {activeTask && (
        <div style={{ marginBottom: '12px' }}>
          {(() => {
            const color = STEP_TYPE_COLOR[(stepTypes[activeTask.workflow_step_id] ?? 'custom') as StepType] ?? '#555'
            const stepName = stepNames[activeTask.workflow_step_id] ?? activeTask.task_type
            const statusColor = TASK_STATUS_COLOR[activeTask.status]
            return (
              <div style={{
                padding: '12px 14px', background: '#1A1A1A', borderRadius: '8px',
                borderLeft: `3px solid ${color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                    background: `${color}22`, color, border: `1px solid ${color}44`,
                  }}>
                    {STEP_TYPE_LABEL[(stepTypes[activeTask.workflow_step_id] ?? 'custom') as StepType]}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{stepName}</span>
                  {activeTask.round > 1 && (
                    <span style={{ fontSize: '10px', color: '#9B59B6', background: '#9B59B622', padding: '2px 6px', borderRadius: '4px' }}>
                      Round {activeTask.round}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: `${statusColor}22`, color: statusColor }}>
                    {TASK_STATUS_LABEL[activeTask.status]}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#555' }}>
                  Prioridade: {PRIORITY_LABEL[activeTask.priority]}
                  {activeTask.started_at && (
                    <span style={{ marginLeft: '10px', color: '#FF6B00' }}>
                      ⏱ em andamento há {Math.round((Date.now() - new Date(activeTask.started_at).getTime()) / 60000)} min
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Historico */}
      {completedTasks.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: '#333', marginBottom: '8px' }}>HISTÓRICO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {completedTasks.map(t => {
              const color = STEP_TYPE_COLOR[(stepTypes[t.workflow_step_id] ?? 'custom') as StepType] ?? '#555'
              const statusColor = TASK_STATUS_COLOR[t.status]
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#111', borderRadius: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', flex: 1 }}>
                    {stepNames[t.workflow_step_id] ?? t.task_type}
                    {t.round > 1 && <span style={{ color: '#9B59B6', marginLeft: '4px', fontSize: '10px' }}>Round {t.round}</span>}
                  </span>
                  <span style={{ fontSize: '10px', color: statusColor }}>
                    {TASK_STATUS_LABEL[t.status]}
                  </span>
                  {t.finished_at && (
                    <span style={{ fontSize: '10px', color: '#333' }}>
                      {new Date(t.finished_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Workflow finalizado */}
      {templateId && !activeTask && tasks.length > 0 && completedTasks.length === tasks.length && (
        <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: '6px', fontSize: '12px', color: '#1D9E75' }}>
          ✓ Todas as etapas concluídas
        </div>
      )}
    </div>
  )
}
