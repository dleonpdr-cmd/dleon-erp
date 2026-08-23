'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  updateOperation, addOperationMember, linkCaseToOperation,
} from '@/app/api/operations/actions'
import {
  OP_STATUS_LABEL, OP_STATUS_COLOR, MEMBER_ROLE_LABEL,
  type Operation, type OperationMember,
  type OperationStatus, type MemberRole, type BudgetTypeDefault,
} from '@/app/api/operations/constants'

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px',
  padding: '20px', marginBottom: '16px',
}
const sTitle: React.CSSProperties = { fontSize: '11px', color: '#555', fontWeight: '600', marginBottom: '14px' }
const input: React.CSSProperties = {
  height: '36px', background: '#1A1A1A', border: '1px solid #2A2A2A',
  borderRadius: '6px', color: '#F0EEE9', fontSize: '12px', padding: '0 10px', outline: 'none',
}
const btn = (bg: string, color = '#fff'): React.CSSProperties => ({
  height: '34px', padding: '0 14px', background: bg, border: 'none',
  borderRadius: '6px', color, cursor: 'pointer', fontSize: '12px', fontWeight: '500',
})

const CASE_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho', quoted: 'Orçamento', approved: 'Aprovado',
  in_progress: 'Em execução', done: 'Concluído', invoiced: 'Faturado',
  received: 'Recebido', paid: 'Pago',
}
const CASE_STATUS_COLOR: Record<string, string> = {
  draft: '#555', quoted: '#378ADD', approved: '#1D9E75',
  in_progress: '#FF6B00', done: '#1D9E75', invoiced: '#7F77DD',
  received: '#1D9E75', paid: '#888',
}

// ─── Props ────────────────────────────────────────────────────────────────────

type CaseRow = {
  id: string; case_number: string; status: string; total_amount: number; created_at: string;
  customers: { name: string } | null; vehicles: { make: string; model: string; year: number; plate: string } | null
}

type Props = {
  operation: Operation
  cases: CaseRow[]
  members: OperationMember[]
  customers: { id: string; name: string }[]
  technicians: { id: string; name: string }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OperationShell({ operation: initial, cases: initialCases, members: initialMembers, customers, technicians }: Props) {
  const [op, setOp]           = useState(initial)
  const [members, setMembers] = useState(initialMembers)
  const [cases]               = useState(initialCases)
  const [msg, setMsg]         = useState('')
  const [pending, startT]     = useTransition()

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    name: op.name,
    customer_id: op.customer_id ?? '',
    status: op.status,
    budget_type_default: op.budget_type_default,
    target_vehicle_count: op.target_vehicle_count ? String(op.target_vehicle_count) : '',
    start_date: op.start_date ?? '',
    end_date: op.end_date ?? '',
    notes: op.notes ?? '',
  })

  // Add member modal
  const [addMemberModal, setAddMemberModal] = useState(false)
  const [selTech, setSelTech]       = useState('')
  const [selPrimary, setSelPrimary] = useState<MemberRole>('pdr_tech')
  const [selRoles, setSelRoles]     = useState<MemberRole[]>(['pdr_tech'])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  // ── Save edit ────────────────────────────────────────────────────────────────
  function handleSaveEdit() {
    startT(async () => {
      const r = await updateOperation(op.id, {
        name: editForm.name,
        customer_id: editForm.customer_id || null,
        status: editForm.status as OperationStatus,
        budget_type_default: editForm.budget_type_default as any,
        target_vehicle_count: editForm.target_vehicle_count ? Number(editForm.target_vehicle_count) : null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        notes: editForm.notes || null,
      })
      if (r.error) flash('Erro: ' + r.error)
      else {
        setOp(prev => ({
          ...prev,
          name: editForm.name,
          customer_id: editForm.customer_id || null,
          customer_name: customers.find(c => c.id === editForm.customer_id)?.name ?? prev.customer_name,
          status: editForm.status as OperationStatus,
          budget_type_default: editForm.budget_type_default as any,
          target_vehicle_count: editForm.target_vehicle_count ? Number(editForm.target_vehicle_count) : null,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          notes: editForm.notes || null,
        }))
        setEditMode(false)
        flash('Operação atualizada.')
      }
    })
  }

  // ── Add member ───────────────────────────────────────────────────────────────
  function handleAddMember() {
    if (!selTech) return
    startT(async () => {
      const r = await addOperationMember(op.id, selTech, selPrimary, selRoles)
      if (r.error) flash('Erro: ' + r.error)
      else {
        const tech = technicians.find(t => t.id === selTech)
        setMembers(prev => [...prev, {
          id: crypto.randomUUID(),
          operation_id: op.id,
          technician_id: selTech,
          primary_function: selPrimary,
          joined_at: new Date().toISOString(),
          left_at: null,
          technicians: tech ? { id: selTech, name: tech.name, role: null } : null,
          roles: selRoles,
        }])
        setAddMemberModal(false)
        setSelTech('')
        setSelRoles(['pdr_tech'])
        flash('Membro adicionado.')
      }
    })
  }

  function toggleRole(role: MemberRole) {
    setSelRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const statusColor = OP_STATUS_COLOR[op.status]

  return (
    <div>
      {/* Flash */}
      {msg && (
        <div style={{
          padding: '8px 14px', marginBottom: '16px', borderRadius: '6px', fontSize: '12px',
          background: msg.startsWith('Erro') ? 'rgba(226,75,74,0.1)' : 'rgba(29,158,117,0.1)',
          border: `1px solid ${msg.startsWith('Erro') ? '#E24B4A' : '#1D9E75'}`,
          color: msg.startsWith('Erro') ? '#F09595' : '#1D9E75',
        }}>
          {msg}
        </div>
      )}

      {/* ── Informações / Edição ──────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={sTitle}>INFORMAÇÕES</div>
          {!editMode
            ? <button onClick={() => setEditMode(true)} style={btn('#1A1A1A', '#888')}>Editar</button>
            : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setEditMode(false)} style={btn('#1A1A1A', '#888')}>Cancelar</button>
                <button onClick={handleSaveEdit} disabled={pending} style={btn('#FF6B00')}>Salvar</button>
              </div>
            )
          }
        </div>

        {!editMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Nome',             value: op.name },
              { label: 'Cliente',          value: op.customer_name ?? '—' },
              { label: 'Status',           value: OP_STATUS_LABEL[op.status] },
              { label: 'Orçamento padrão', value: op.budget_type_default === 'batch' ? 'Lote / Pátio' : 'Individual' },
              { label: 'Meta de veículos', value: op.target_vehicle_count ? String(op.target_vehicle_count) : '—' },
              { label: 'Início',           value: op.start_date ? new Date(op.start_date).toLocaleDateString('pt-BR') : '—' },
              { label: 'Fim previsto',     value: op.end_date   ? new Date(op.end_date).toLocaleDateString('pt-BR')   : '—' },
              { label: 'Workflow',         value: op.workflow_template_id ? 'Configurado' : 'Não configurado' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>{f.label.toUpperCase()}</div>
                <div style={{ fontSize: '13px', color: f.label === 'Workflow' && !op.workflow_template_id ? '#555' : '#F0EEE9' }}>{f.value}</div>
              </div>
            ))}
            {op.notes && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '10px', color: '#555', marginBottom: '2px' }}>OBSERVAÇÕES</div>
                <div style={{ fontSize: '13px', color: '#888' }}>{op.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Nome *</label>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ ...input, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Cliente</label>
              <select value={editForm.customer_id} onChange={e => setEditForm(f => ({ ...f, customer_id: e.target.value }))} style={{ ...input, width: '100%' }}>
                <option value="">— nenhum —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Status</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as OperationStatus }))} style={{ ...input, width: '100%' }}>
                {(['draft','active','paused','completed','cancelled'] as const).map(s => (
                  <option key={s} value={s}>{OP_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Orçamento padrão</label>
              <select value={editForm.budget_type_default} onChange={e => setEditForm(f => ({ ...f, budget_type_default: e.target.value as BudgetTypeDefault }))} style={{ ...input, width: '100%' }}>
                <option value="individual">Individual</option>
                <option value="batch">Lote / Pátio</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Meta de veículos</label>
              <input type="number" min="1" value={editForm.target_vehicle_count} onChange={e => setEditForm(f => ({ ...f, target_vehicle_count: e.target.value }))} style={{ ...input, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Data de início</label>
              <input type="date" value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} style={{ ...input, width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Data final prevista</label>
              <input type="date" value={editForm.end_date} onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))} style={{ ...input, width: '100%' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Observações</label>
              <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                style={{ ...input, height: 'auto', padding: '8px 10px', width: '100%', resize: 'vertical' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Workflow ──────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sTitle}>WORKFLOW</div>
        {op.workflow_template_id ? (
          <div style={{ fontSize: '13px', color: '#1D9E75' }}>✓ Template configurado</div>
        ) : (
          <div style={{ padding: '12px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>Workflow ainda não configurado</div>
            <div style={{ fontSize: '11px', color: '#333' }}>
              Os templates de workflow serão configurados na Fase 2 — Workflow Templates.
            </div>
          </div>
        )}
      </div>

      {/* ── Equipe ────────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={sTitle}>EQUIPE ({members.length} membro{members.length !== 1 ? 's' : ''})</div>
          <button onClick={() => setAddMemberModal(true)} style={btn('#1A1A1A', '#888')}>+ Adicionar</button>
        </div>

        {members.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#555', padding: '8px 0' }}>Nenhum membro na equipe ainda.</div>
        ) : (
          members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1A1A1A' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(255,107,0,0.1)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '13px', fontWeight: '600', color: '#FF6B00',
              }}>
                {m.technicians?.name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{m.technicians?.name ?? '—'}</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                  {m.roles.map(r => MEMBER_ROLE_LABEL[r]).join(' · ') || (m.primary_function ? MEMBER_ROLE_LABEL[m.primary_function] : '—')}
                </div>
              </div>
              {m.primary_function && (
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: '#1A1A1A', color: '#555' }}>
                  principal
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Casos ─────────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={sTitle}>CASOS VINCULADOS ({cases.length})</div>
          <Link href={`/cases/new?operation_id=${op.id}`} style={{
            fontSize: '12px', color: '#FF6B00', textDecoration: 'none', fontWeight: '500',
          }}>
            + Novo caso
          </Link>
        </div>

        {cases.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#555', padding: '8px 0' }}>Nenhum caso vinculado a esta operação.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 80px 90px', gap: '10px', padding: '6px 0', borderBottom: '1px solid #1A1A1A', marginBottom: '4px' }}>
              {['Nº', 'Veículo', 'Cliente', 'Status', 'Total'].map(h => (
                <span key={h} style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>{h}</span>
              ))}
            </div>
            {cases.map((c: any) => {
              const statusC = CASE_STATUS_COLOR[c.status] ?? '#555'
              return (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 80px 90px', gap: '10px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1A1A1A' }}>
                  <Link href={`/cases/${c.id}`} style={{ fontFamily: 'monospace', fontSize: '12px', color: '#FF6B00', textDecoration: 'none' }}>
                    {c.case_number}
                  </Link>
                  <div style={{ fontSize: '12px' }}>
                    {c.vehicles ? `${c.vehicles.make} ${c.vehicles.model} · ${c.vehicles.plate}` : '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{c.customers?.name ?? '—'}</div>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '5px', background: `${statusC}22`, color: statusC, textAlign: 'center' }}>
                    {CASE_STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <div style={{ fontSize: '12px', textAlign: 'right' }}>
                    ¥{Number(c.total_amount ?? 0).toLocaleString('ja-JP')}
                  </div>
                </div>
              )
            })}
            <div style={{ paddingTop: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>
              Total: ¥{cases.reduce((s: number, c: any) => s + Number(c.total_amount ?? 0), 0).toLocaleString('ja-JP')}
            </div>
          </>
        )}
      </div>

      {/* ── Modal: adicionar membro ───────────────────────────────────────────── */}
      {addMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '400px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Adicionar membro</h3>

            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Técnico</label>
            <select value={selTech} onChange={e => setSelTech(e.target.value)} style={{ ...input, width: '100%', marginBottom: '12px' }}>
              <option value="">— selecionar —</option>
              {technicians
                .filter(t => !members.some(m => m.technician_id === t.id))
                .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Funções nesta operação</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {(Object.keys(MEMBER_ROLE_LABEL) as MemberRole[]).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  style={{
                    padding: '4px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px',
                    border: selRoles.includes(role) ? '1px solid #FF6B00' : '1px solid #2A2A2A',
                    background: selRoles.includes(role) ? 'rgba(255,107,0,0.12)' : '#1A1A1A',
                    color: selRoles.includes(role) ? '#FF6B00' : '#555',
                  }}
                >
                  {MEMBER_ROLE_LABEL[role]}
                </button>
              ))}
            </div>

            <label style={{ fontSize: '11px', color: '#555', display: 'block', marginBottom: '4px' }}>Função principal (home do mobile)</label>
            <select value={selPrimary} onChange={e => setSelPrimary(e.target.value as MemberRole)} style={{ ...input, width: '100%', marginBottom: '16px' }}>
              {(Object.keys(MEMBER_ROLE_LABEL) as MemberRole[]).map(r => (
                <option key={r} value={r}>{MEMBER_ROLE_LABEL[r]}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setAddMemberModal(false)} style={{ ...btn('#1A1A1A', '#888'), flex: 1 }}>Cancelar</button>
              <button onClick={handleAddMember} disabled={!selTech || pending} style={{ ...btn('#FF6B00'), flex: 1 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
