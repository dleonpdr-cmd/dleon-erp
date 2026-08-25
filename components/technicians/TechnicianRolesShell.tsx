'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateTechnicianPrimaryRole,
  setTechnicianPermissions,
  setMemberRoles,
  addTechnicianToOperation,
  removeTechnicianFromOperation,
} from '@/app/api/roles/actions'
import {
  ROLE_LABEL, ROLE_COLOR, ALL_ROLES, ALL_PERMISSIONS, PERMISSION_LABEL,
  type OperationalRole, type TechnicianPermission, type TechnicianWithRoles,
} from '@/app/api/roles/constants'

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#141414', border: '1px solid #2A2A2A',
  borderRadius: '10px', padding: '20px', marginBottom: '16px',
}
const sectionTitle: React.CSSProperties = {
  fontSize: '11px', color: '#555', fontWeight: '600',
  marginBottom: '14px', letterSpacing: '0.08em',
}
const chip = (color: string, active: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
  border: `1px solid ${active ? color : '#2A2A2A'}`,
  background: active ? `${color}22` : 'transparent',
  color: active ? color : '#555',
  transition: 'all 0.15s',
})
const btnPrimary: React.CSSProperties = {
  height: '32px', padding: '0 14px', background: '#FF6B00',
  border: 'none', borderRadius: '6px', color: '#fff',
  fontSize: '12px', fontWeight: '500', cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  height: '32px', padding: '0 14px', background: 'transparent',
  border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888',
  fontSize: '12px', cursor: 'pointer',
}
const inputStyle: React.CSSProperties = {
  height: '34px', padding: '0 10px', background: '#1A1A1A',
  border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9',
  fontSize: '13px', width: '100%', boxSizing: 'border-box',
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  tech: TechnicianWithRoles
  availableOperations: { id: string; name: string }[]
}

export default function TechnicianRolesShell({ tech, availableOperations }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)

  function flash(m: string, ok = true) {
    setMsg(m); setMsgOk(ok)
    setTimeout(() => setMsg(''), 4000)
  }

  // ─── Função principal ──────────────────────────────────────────────────────

  const [primaryRole, setPrimaryRole] = useState<OperationalRole | null>(tech.primary_role)

  function savePrimaryRole() {
    startT(async () => {
      const r = await updateTechnicianPrimaryRole(tech.id, primaryRole)
      if (r.error) flash('Erro: ' + r.error, false)
      else { flash('Função principal salva.'); router.refresh() }
    })
  }

  // ─── Permissões ───────────────────────────────────────────────────────────

  const [perms, setPerms] = useState<Set<TechnicianPermission>>(new Set(tech.permissions))

  function togglePerm(p: TechnicianPermission) {
    setPerms(prev => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p); else next.add(p)
      return next
    })
  }

  function savePerms() {
    startT(async () => {
      const r = await setTechnicianPermissions(tech.id, Array.from(perms))
      if (r.error) flash('Erro: ' + r.error, false)
      else { flash('Permissões salvas.'); router.refresh() }
    })
  }

  // ─── Papéis por operação ──────────────────────────────────────────────────

  type MemberState = {
    member_id: string
    primary_function: OperationalRole | null
    roles: Set<OperationalRole>
    dirty: boolean
  }

  const [members, setMembers] = useState<Record<string, MemberState>>(() => {
    const map: Record<string, MemberState> = {}
    for (const op of tech.operations) {
      map[op.member_id] = {
        member_id: op.member_id,
        primary_function: op.primary_function,
        roles: new Set(op.roles),
        dirty: false,
      }
    }
    return map
  })

  function toggleMemberRole(memberId: string, role: OperationalRole) {
    setMembers(prev => {
      const m = { ...prev[memberId] }
      const next = new Set(m.roles)
      if (next.has(role)) next.delete(role); else next.add(role)
      return { ...prev, [memberId]: { ...m, roles: next, dirty: true } }
    })
  }

  function setMemberPrimary(memberId: string, role: OperationalRole | null) {
    setMembers(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], primary_function: role, dirty: true },
    }))
  }

  function saveMember(memberId: string, techId: string) {
    const m = members[memberId]
    startT(async () => {
      const r = await setMemberRoles(memberId, Array.from(m.roles), m.primary_function, techId)
      if (r.error) flash('Erro: ' + r.error, false)
      else { flash('Papéis na operação salvos.'); router.refresh() }
    })
  }

  function removeFromOp(memberId: string) {
    startT(async () => {
      const r = await removeTechnicianFromOperation(memberId, tech.id)
      if (r.error) flash('Erro: ' + r.error, false)
      else { flash('Removido da operação.'); router.refresh() }
    })
  }

  // ─── Adicionar operação ────────────────────────────────────────────────────

  const linkedOpIds = new Set(tech.operations.map(o => o.operation_id))
  const freeOps = availableOperations.filter(o => !linkedOpIds.has(o.id))

  const [showAddOp, setShowAddOp] = useState(false)
  const [newOpId, setNewOpId] = useState('')
  const [newOpPrimary, setNewOpPrimary] = useState<OperationalRole>('pdr_tech')
  const [newOpRoles, setNewOpRoles] = useState<Set<OperationalRole>>(new Set(['pdr_tech']))

  function toggleNewOpRole(r: OperationalRole) {
    setNewOpRoles(prev => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r); else next.add(r)
      return next
    })
  }

  function addOp() {
    if (!newOpId) return
    startT(async () => {
      const r = await addTechnicianToOperation(tech.id, newOpId, newOpPrimary, Array.from(newOpRoles))
      if (r.error) flash('Erro: ' + r.error, false)
      else {
        flash('Vinculado à operação.')
        setShowAddOp(false)
        setNewOpId('')
        router.refresh()
      }
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Flash */}
      {msg && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px', borderRadius: '6px', fontSize: '12px',
          background: msgOk ? 'rgba(29,158,117,0.1)' : 'rgba(226,75,74,0.1)',
          border: `1px solid ${msgOk ? '#1D9E75' : '#E24B4A'}`,
          color: msgOk ? '#1D9E75' : '#F09595',
        }}>
          {msg}
        </div>
      )}

      {/* ── 1. Função principal ── */}
      <div style={card}>
        <div style={sectionTitle}>FUNÇÃO PRINCIPAL</div>
        <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>
          Define a Home padrão no app mobile quando nenhuma função específica está ativa.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {ALL_ROLES.map(r => (
            <span
              key={r}
              onClick={() => setPrimaryRole(primaryRole === r ? null : r)}
              style={chip(ROLE_COLOR[r], primaryRole === r)}
            >
              {primaryRole === r ? '● ' : '○ '}
              {ROLE_LABEL[r]}
            </span>
          ))}
        </div>
        <button
          onClick={savePrimaryRole}
          disabled={pending || primaryRole === tech.primary_role}
          style={{ ...btnPrimary, opacity: (pending || primaryRole === tech.primary_role) ? 0.5 : 1 }}
        >
          Salvar função principal
        </button>
      </div>

      {/* ── 2. Permissões especiais ── */}
      <div style={card}>
        <div style={sectionTitle}>PERMISSÕES ESPECIAIS</div>
        <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>
          Permissões de gestão, independentes do papel operacional.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {ALL_PERMISSIONS.map(p => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={perms.has(p)}
                onChange={() => togglePerm(p)}
                style={{ accentColor: '#FF6B00', width: '15px', height: '15px' }}
              />
              <span style={{ fontSize: '12px', color: perms.has(p) ? '#F0EEE9' : '#555' }}>
                {PERMISSION_LABEL[p]}
              </span>
            </label>
          ))}
        </div>
        <button onClick={savePerms} disabled={pending} style={{ ...btnPrimary, opacity: pending ? 0.5 : 1 }}>
          Salvar permissões
        </button>
      </div>

      {/* ── 3. Operações vinculadas ── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={sectionTitle}>OPERAÇÕES</div>
          {freeOps.length > 0 && (
            <button onClick={() => setShowAddOp(v => !v)} style={btnGhost}>
              {showAddOp ? 'Cancelar' : '+ Adicionar operação'}
            </button>
          )}
        </div>

        {/* Operações existentes */}
        {tech.operations.length === 0 && (
          <p style={{ fontSize: '12px', color: '#555' }}>
            {tech.name} ainda não está em nenhuma operação ativa.
          </p>
        )}

        {tech.operations.map(op => {
          const m = members[op.member_id]
          if (!m) return null
          return (
            <div key={op.member_id} style={{
              marginBottom: '14px', padding: '14px', background: '#111',
              borderRadius: '8px', border: '1px solid #1D1D1D',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{op.operation_name}</span>
                <button onClick={() => removeFromOp(op.member_id)} disabled={pending}
                  style={{ ...btnGhost, fontSize: '11px', height: '26px', padding: '0 10px', color: '#E24B4A', borderColor: '#E24B4A33' }}>
                  Remover
                </button>
              </div>

              {/* Função principal nessa operação */}
              <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>FUNÇÃO PRINCIPAL NA OPERAÇÃO</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {ALL_ROLES.map(r => (
                  <span
                    key={r}
                    onClick={() => setMemberPrimary(op.member_id, m.primary_function === r ? null : r)}
                    style={{ ...chip(ROLE_COLOR[r], m.primary_function === r), fontSize: '11px', padding: '3px 10px' }}
                  >
                    {m.primary_function === r ? '● ' : '○ '}{ROLE_LABEL[r]}
                  </span>
                ))}
              </div>

              {/* Papéis permitidos */}
              <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>PAPÉIS PERMITIDOS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {ALL_ROLES.map(r => (
                  <span
                    key={r}
                    onClick={() => toggleMemberRole(op.member_id, r)}
                    style={{ ...chip(ROLE_COLOR[r], m.roles.has(r)), fontSize: '11px', padding: '3px 10px' }}
                  >
                    {m.roles.has(r) ? '☑ ' : '☐ '}{ROLE_LABEL[r]}
                  </span>
                ))}
              </div>

              {m.dirty && (
                <button
                  onClick={() => saveMember(op.member_id, tech.id)}
                  disabled={pending}
                  style={{ ...btnPrimary, fontSize: '11px', height: '28px' }}
                >
                  Salvar papéis
                </button>
              )}
            </div>
          )
        })}

        {/* Formulário de nova operação */}
        {showAddOp && (
          <div style={{ marginTop: '12px', padding: '16px', background: '#111', borderRadius: '8px', border: '1px solid #2A2A2A' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>VINCULAR NOVA OPERAÇÃO</div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#555', marginBottom: '5px' }}>Operação</div>
              <select
                value={newOpId}
                onChange={e => setNewOpId(e.target.value)}
                style={{ ...inputStyle, height: '34px' }}
              >
                <option value="">— selecionar —</option>
                {freeOps.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>FUNÇÃO PRINCIPAL</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_ROLES.map(r => (
                  <span
                    key={r}
                    onClick={() => setNewOpPrimary(r)}
                    style={{ ...chip(ROLE_COLOR[r], newOpPrimary === r), fontSize: '11px', padding: '3px 10px' }}
                  >
                    {newOpPrimary === r ? '● ' : '○ '}{ROLE_LABEL[r]}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>PAPÉIS PERMITIDOS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_ROLES.map(r => (
                  <span
                    key={r}
                    onClick={() => toggleNewOpRole(r)}
                    style={{ ...chip(ROLE_COLOR[r], newOpRoles.has(r)), fontSize: '11px', padding: '3px 10px' }}
                  >
                    {newOpRoles.has(r) ? '☑ ' : '☐ '}{ROLE_LABEL[r]}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={addOp} disabled={pending || !newOpId} style={{ ...btnPrimary, opacity: (!newOpId || pending) ? 0.5 : 1 }}>
                Adicionar
              </button>
              <button onClick={() => setShowAddOp(false)} style={btnGhost}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
