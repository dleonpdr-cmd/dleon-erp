'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setSessionState } from '@/app/api/roles/actions'
import { ROLE_LABEL, ROLE_COLOR, type OperationalRole } from '@/app/api/roles/constants'

type Op = {
  operationId: string
  operationName: string
  primaryFunction: OperationalRole | null
  roles: OperationalRole[]
}

type Props = {
  userEmail: string
  myOperations: Op[]
}

const S = {
  screen: { minHeight: '100dvh', display: 'flex', flexDirection: 'column' as const, padding: '24px 20px', background: '#0D0D0D' },
  logo: { fontSize: '11px', color: '#333', letterSpacing: '0.1em', marginBottom: '40px' },
  title: { fontSize: '22px', fontWeight: '700', marginBottom: '6px' },
  sub: { fontSize: '13px', color: '#555', marginBottom: '32px' },
  card: { background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '16px 18px', marginBottom: '12px', cursor: 'pointer' as const },
  cardActive: { background: '#1A1A1A', border: '1px solid #FF6B00', borderRadius: '12px', padding: '16px 18px', marginBottom: '12px', cursor: 'pointer' as const },
  bigBtn: { width: '100%', height: '54px', background: '#FF6B00', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer' as const, marginTop: '24px' },
  chip: (color: string, active: boolean) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px',
    borderRadius: '20px', fontSize: '13px', cursor: 'pointer' as const, marginRight: '8px', marginBottom: '8px',
    border: `1px solid ${active ? color : '#2A2A2A'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : '#555',
  }),
}

export default function MobileSetup({ userEmail, myOperations }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [selOp, setSelOp] = useState<string>(myOperations[0]?.operationId ?? '')
  const [selRole, setSelRole] = useState<OperationalRole | null>(
    myOperations[0]?.primaryFunction ?? myOperations[0]?.roles[0] ?? null
  )

  function selectOp(op: Op) {
    setSelOp(op.operationId)
    setSelRole(op.primaryFunction ?? op.roles[0] ?? null)
  }

  function confirm() {
    if (!selOp || !selRole) return
    startT(async () => {
      await setSessionState({ active_operation_id: selOp, active_role: selRole })
      router.refresh()
    })
  }

  const currentOp = myOperations.find(o => o.operationId === selOp)

  if (myOperations.length === 0) {
    return (
      <div style={S.screen}>
        <div style={S.logo}>D'LEON</div>
        <div style={S.title}>Olá 👋</div>
        <div style={S.sub}>{userEmail}</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>🔗</div>
          <div style={{ fontSize: '15px', fontWeight: '600' }}>Conta não vinculada</div>
          <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
            Peça ao administrador para vincular seu usuário a um técnico no ERP.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.screen}>
      <div style={S.logo}>D'LEON</div>
      <div style={S.title}>Selecionar operação</div>
      <div style={S.sub}>{userEmail}</div>

      {myOperations.map(op => (
        <div
          key={op.operationId}
          style={selOp === op.operationId ? S.cardActive : S.card}
          onClick={() => selectOp(op)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{op.operationName}</div>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selOp === op.operationId ? '#FF6B00' : '#2A2A2A'}`, background: selOp === op.operationId ? '#FF6B00' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selOp === op.operationId && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
            </div>
          </div>
          {op.roles.length > 0 && (
            <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
              {op.roles.map(r => ROLE_LABEL[r]).join(' · ')}
            </div>
          )}
        </div>
      ))}

      {currentOp && currentOp.roles.length > 1 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '10px' }}>TRABALHAR COMO</div>
          <div>
            {currentOp.roles.map(r => (
              <span key={r} style={S.chip(ROLE_COLOR[r], selRole === r)} onClick={() => setSelRole(r)}>
                {selRole === r ? '● ' : '○ '}{ROLE_LABEL[r]}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        style={{ ...S.bigBtn, opacity: (!selOp || !selRole || pending) ? 0.5 : 1 }}
        disabled={!selOp || !selRole || pending}
        onClick={confirm}
      >
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </div>
  )
}
