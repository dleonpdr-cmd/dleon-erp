'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  updateWorkflowTemplate,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  reorderSteps,
} from '@/app/api/workflow/actions'
import {
  STEP_TYPE_LABEL, STEP_TYPE_COLOR,
  type WorkflowTemplate,
  type WorkflowStep,
  type StepType,
} from '@/app/api/workflow/constants'

// ─── Styles ───────────────────────────────────────────────────────────────────

const input: React.CSSProperties = {
  width: '100%', height: '38px', background: '#1A1A1A', border: '1px solid #2A2A2A',
  borderRadius: '6px', color: '#F0EEE9', fontSize: '13px', padding: '0 10px',
  outline: 'none', boxSizing: 'border-box',
}
const label: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#888', marginBottom: '5px' }
const card: React.CSSProperties = {
  background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '16px',
}
const sectionTitle: React.CSSProperties = { fontSize: '11px', color: '#555', fontWeight: '600', marginBottom: '14px' }
const btn = (color = '#FF6B00', ghost = false): React.CSSProperties => ({
  height: '34px', padding: '0 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
  border: ghost ? `1px solid ${color}44` : 'none',
  background: ghost ? 'transparent' : color,
  color: ghost ? color : '#fff',
})

const STEP_TYPES: StepType[] = [
  'reception', 'disassembly', 'repair', 'inspection', 'rework',
  'assembly', 'wash', 'polish', 'paint', 'parts', 'finalization', 'custom',
]

const ROLES = [
  { value: '', label: '— qualquer —' },
  { value: 'pdr_tech',   label: 'Técnico PDR' },
  { value: 'inspector',  label: 'Inspetor' },
  { value: 'assembler',  label: 'Desmontador/Montador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'financial',  label: 'Financeiro' },
  { value: 'admin',      label: 'Administrador' },
]

// ─── Main component ───────────────────────────────────────────────────────────

type Props = { template: WorkflowTemplate; initialSteps: WorkflowStep[] }

export default function WorkflowTemplateShell({ template, initialSteps }: Props) {
  const router = useRouter()
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Template edit state
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaName, setMetaName] = useState(template.name)
  const [metaDesc, setMetaDesc] = useState(template.description ?? '')

  // New step form
  const [showNewStep, setShowNewStep] = useState(false)
  const [newStep, setNewStep] = useState({
    name: '',
    step_type: 'disassembly' as StepType,
    responsible_role: '',
    auto_advance: true,
  })

  // Editing a step
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editStep, setEditStep] = useState<Partial<WorkflowStep>>({})

  // ─── Template meta ─────────────────────────────────────────────────────────

  async function saveMeta() {
    if (!metaName.trim()) return
    setSaving(true)
    const r = await updateWorkflowTemplate(template.id, {
      name: metaName.trim(),
      description: metaDesc.trim() || null,
    })
    setSaving(false)
    if (r.error) { setError(r.error); return }
    setEditingMeta(false)
    router.refresh()
  }

  // ─── Add step ──────────────────────────────────────────────────────────────

  async function addStep() {
    if (!newStep.name.trim()) { setError('Nome da etapa é obrigatório'); return }
    setSaving(true); setError('')
    const r = await createWorkflowStep({
      template_id: template.id,
      name: newStep.name.trim(),
      step_type: newStep.step_type,
      sort_order: steps.length,
      responsible_role: newStep.responsible_role || null,
      auto_advance: newStep.auto_advance,
    })
    setSaving(false)
    if (r.error) { setError(r.error); return }
    setShowNewStep(false)
    setNewStep({ name: '', step_type: 'disassembly', responsible_role: '', auto_advance: true })
    router.refresh()
  }

  // ─── Edit step ─────────────────────────────────────────────────────────────

  function startEditStep(s: WorkflowStep) {
    setEditingStepId(s.id)
    setEditStep({
      name: s.name,
      step_type: s.step_type,
      responsible_role: s.responsible_role ?? '',
      auto_advance: s.auto_advance,
    })
  }

  async function saveEditStep(s: WorkflowStep) {
    if (!editStep.name?.trim()) { setError('Nome obrigatório'); return }
    setSaving(true); setError('')
    const r = await updateWorkflowStep(s.id, template.id, {
      name: editStep.name?.trim(),
      step_type: editStep.step_type,
      responsible_role: (editStep.responsible_role as string) || null,
      auto_advance: editStep.auto_advance,
    })
    setSaving(false)
    if (r.error) { setError(r.error); return }
    setEditingStepId(null)
    router.refresh()
  }

  // ─── Delete step ───────────────────────────────────────────────────────────

  async function removeStep(s: WorkflowStep) {
    if (!confirm(`Remover etapa "${s.name}"?`)) return
    setSaving(true)
    await deleteWorkflowStep(s.id, template.id)
    setSaving(false)
    router.refresh()
  }

  // ─── Reorder ───────────────────────────────────────────────────────────────

  async function moveStep(idx: number, dir: 'up' | 'down') {
    const newSteps = [...steps]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newSteps.length) return
    ;[newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]]
    const reordered = newSteps.map((s, i) => ({ ...s, sort_order: i }))
    setSteps(reordered)
    await reorderSteps(template.id, reordered.map(s => ({ id: s.id, sort_order: s.sort_order })))
    router.refresh()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', marginBottom: '20px' }}>
        <Link href="/workflow-templates" style={{ color: '#555', textDecoration: 'none' }}>Templates</Link>
        <span>›</span>
        <span style={{ color: '#F0EEE9' }}>{template.name}</span>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '6px', fontSize: '12px', background: 'rgba(226,75,74,0.1)', border: '1px solid #E24B4A', color: '#F09595' }}>
          {error}
        </div>
      )}

      {/* Template meta */}
      <div style={card}>
        <div style={sectionTitle}>TEMPLATE</div>
        {editingMeta ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={label}>Nome *</label>
              <input value={metaName} onChange={e => setMetaName(e.target.value)} style={input} autoFocus />
            </div>
            <div>
              <label style={label}>Descrição</label>
              <textarea
                value={metaDesc}
                onChange={e => setMetaDesc(e.target.value)}
                rows={2}
                style={{ ...input, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveMeta} disabled={saving} style={btn()}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditingMeta(false)} style={btn('#555', true)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{template.name}</div>
              {template.description && <div style={{ fontSize: '12px', color: '#555' }}>{template.description}</div>}
            </div>
            <button onClick={() => setEditingMeta(true)} style={btn('#555', true)}>
              Editar
            </button>
          </div>
        )}
      </div>

      {/* Steps */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={sectionTitle}>ETAPAS DO FLUXO</div>
          <button onClick={() => setShowNewStep(true)} style={{ ...btn(), height: '30px', fontSize: '11px' }}>
            + Adicionar etapa
          </button>
        </div>

        {steps.length === 0 && !showNewStep && (
          <div style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: '13px' }}>
            Nenhuma etapa cadastrada. Adicione a primeira etapa do fluxo.
          </div>
        )}

        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {steps.map((s, idx) => {
            const color = STEP_TYPE_COLOR[s.step_type]
            const isEditing = editingStepId === s.id

            return (
              <div key={s.id} style={{
                background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px',
                borderLeft: `3px solid ${color}`,
              }}>
                {isEditing ? (
                  <div style={{ padding: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={label}>Nome *</label>
                        <input
                          value={editStep.name ?? ''}
                          onChange={e => setEditStep(p => ({ ...p, name: e.target.value }))}
                          style={input}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label style={label}>Tipo</label>
                        <select
                          value={editStep.step_type ?? 'custom'}
                          onChange={e => setEditStep(p => ({ ...p, step_type: e.target.value as StepType }))}
                          style={{ ...input, cursor: 'pointer' }}
                        >
                          {STEP_TYPES.map(t => (
                            <option key={t} value={t}>{STEP_TYPE_LABEL[t]}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={label}>Responsável</label>
                        <select
                          value={(editStep.responsible_role as string) ?? ''}
                          onChange={e => setEditStep(p => ({ ...p, responsible_role: e.target.value }))}
                          style={{ ...input, cursor: 'pointer' }}
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#888', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editStep.auto_advance ?? true}
                          onChange={e => setEditStep(p => ({ ...p, auto_advance: e.target.checked }))}
                        />
                        Avançar automaticamente ao concluir
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => saveEditStep(s)} disabled={saving} style={btn()}>
                        {saving ? '...' : 'Salvar'}
                      </button>
                      <button onClick={() => setEditingStepId(null)} style={btn('#555', true)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Order */}
                    <div style={{ width: '24px', height: '24px', background: `${color}22`, border: `1px solid ${color}44`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color, fontWeight: '600', flexShrink: 0 }}>
                      {idx + 1}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#F0EEE9' }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                        {STEP_TYPE_LABEL[s.step_type]}
                        {s.responsible_role && ` · ${ROLES.find(r => r.value === s.responsible_role)?.label ?? s.responsible_role}`}
                        {s.auto_advance && ' · auto-avança'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => moveStep(idx, 'up')}
                        disabled={idx === 0}
                        title="Mover para cima"
                        style={{ background: 'none', border: 'none', color: idx === 0 ? '#333' : '#888', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '14px', padding: '4px 6px' }}
                      >↑</button>
                      <button
                        onClick={() => moveStep(idx, 'down')}
                        disabled={idx === steps.length - 1}
                        title="Mover para baixo"
                        style={{ background: 'none', border: 'none', color: idx === steps.length - 1 ? '#333' : '#888', cursor: idx === steps.length - 1 ? 'default' : 'pointer', fontSize: '14px', padding: '4px 6px' }}
                      >↓</button>
                      <button
                        onClick={() => startEditStep(s)}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: '4px 6px' }}
                      >Editar</button>
                      <button
                        onClick={() => removeStep(s)}
                        style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '12px', padding: '4px 6px' }}
                      >Remover</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* New step form */}
          {showNewStep && (
            <div style={{ background: '#1A1A1A', border: '1px dashed #FF6B00', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: '#FF6B00', fontWeight: '600', marginBottom: '12px' }}>NOVA ETAPA</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={label}>Nome *</label>
                  <input
                    value={newStep.name}
                    onChange={e => setNewStep(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Desmontagem, PDR, Inspeção #1..."
                    style={input}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep() } }}
                  />
                </div>
                <div>
                  <label style={label}>Tipo</label>
                  <select
                    value={newStep.step_type}
                    onChange={e => setNewStep(p => ({ ...p, step_type: e.target.value as StepType }))}
                    style={{ ...input, cursor: 'pointer' }}
                  >
                    {STEP_TYPES.map(t => (
                      <option key={t} value={t}>{STEP_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={label}>Responsável</label>
                  <select
                    value={newStep.responsible_role}
                    onChange={e => setNewStep(p => ({ ...p, responsible_role: e.target.value }))}
                    style={{ ...input, cursor: 'pointer' }}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#888', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newStep.auto_advance}
                    onChange={e => setNewStep(p => ({ ...p, auto_advance: e.target.checked }))}
                  />
                  Avançar automaticamente ao concluir
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addStep} disabled={saving} style={btn()}>
                  {saving ? 'Adicionando...' : 'Adicionar'}
                </button>
                <button onClick={() => { setShowNewStep(false); setError('') }} style={btn('#555', true)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Visual flow summary */}
        {steps.length > 1 && (
          <div style={{ marginTop: '20px', padding: '14px', background: '#111', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>FLUXO</div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              {steps.map((s, idx) => {
                const color = STEP_TYPE_COLOR[s.step_type]
                return (
                  <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                      background: `${color}22`, color, border: `1px solid ${color}44`,
                    }}>
                      {s.name}
                    </span>
                    {idx < steps.length - 1 && (
                      <span style={{ color: '#333', fontSize: '12px' }}>→</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Link para operations */}
      <div style={{ marginTop: '8px' }}>
        <Link href="/workflow-templates" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>
          ← Voltar para templates
        </Link>
      </div>
    </>
  )
}
