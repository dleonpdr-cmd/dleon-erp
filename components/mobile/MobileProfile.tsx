'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { setSessionState } from '@/app/api/roles/actions'
import { ROLE_LABEL, ROLE_COLOR, type OperationalRole } from '@/app/api/roles/constants'
import type { CurrentTechnicianContext } from '@/app/api/roles/actions'

type Op = {
  operationId: string
  operationName: string
  primaryFunction: OperationalRole | null
  roles: OperationalRole[]
}

type Props = {
  userEmail: string
  ctx: CurrentTechnicianContext | null
  myOperations: Op[]
}

export default function MobileProfile({ userEmail, ctx, myOperations }: Props) {
  const router = useRouter()
  const [pending, startT] = useTransition()
  const [flash, setFlash] = useState('')

  function switchOperation(opId: string, role: OperationalRole) {
    startT(async () => {
      await setSessionState({ active_operation_id: opId, active_role: role })
      setFlash('Operação alterada')
      setTimeout(() => { setFlash(''); router.push('/mobile') }, 1000)
    })
  }

  function logout() {
    startT(async () => {
      // Clear session state then redirect to /login
      await setSessionState({ active_operation_id: null, active_role: null })
      router.push('/login')
    })
  }

  const initial = ctx?.technicianName?.charAt(0) ?? userEmail.charAt(0).toUpperCase()

  return (
    <div style={{ minHeight: '100dvh', background: '#0D0D0D', paddingBottom: '90px' }}>

      {flash && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', zIndex: 100, padding: '14px 20px', background: '#1D9E75', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
          {flash}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '32px 20px 24px', borderBottom: '1px solid #1A1A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1D9E7533', border: '2px solid #1D9E7555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#1D9E75', marginBottom: '12px' }}>
          {initial}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '700' }}>{ctx?.technicianName ?? 'Técnico'}</div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{userEmail}</div>
        {ctx && (
          <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '12px', background: `${ROLE_COLOR[ctx.activeRole]}22`, border: `1px solid ${ROLE_COLOR[ctx.activeRole]}44`, color: ROLE_COLOR[ctx.activeRole], fontSize: '12px', fontWeight: '600' }}>
            {ROLE_LABEL[ctx.activeRole]}
          </div>
        )}
      </div>

      {/* Operação atual */}
      {ctx && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>OPERAÇÃO ATUAL</div>
          <div style={{ background: '#141414', border: '1px solid #FF6B0033', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{ctx.operationName}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
              Papéis: {ctx.allowedRoles.map(r => ROLE_LABEL[r]).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Trocar operação */}
      {myOperations.length > 1 && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>TROCAR OPERAÇÃO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myOperations.map(op => {
              const isActive = op.operationId === ctx?.operationId
              const role = op.primaryFunction ?? op.roles[0]
              if (!role) return null
              return (
                <button
                  key={op.operationId}
                  onClick={() => !isActive && switchOperation(op.operationId, role)}
                  disabled={isActive || pending}
                  style={{ padding: '14px 16px', background: '#141414', border: `1px solid ${isActive ? '#FF6B00' : '#1E1E1E'}`, borderRadius: '12px', cursor: isActive ? 'default' : 'pointer', textAlign: 'left', opacity: pending ? 0.5 : 1 }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#F0EEE9' }}>{op.operationName}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                    {op.roles.map(r => ROLE_LABEL[r]).join(' · ')}
                    {isActive && <span style={{ color: '#FF6B00', marginLeft: '6px' }}>✓ ativo</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Links úteis */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>MAIS</div>
        <div style={{ background: '#141414', border: '1px solid #1E1E1E', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={logout}
            disabled={pending}
            style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#E24B4A', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #1A1A1A' }}
          >
            Trocar de conta
          </button>
          <a
            href="/"
            style={{ display: 'block', padding: '14px 16px', color: '#888', fontSize: '13px', textDecoration: 'none' }}
          >
            Abrir ERP completo →
          </a>
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', height: '72px', background: '#0D0D0D', borderTop: '1px solid #1A1A1A', display: 'flex' }}>
        <Link href="/mobile" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>🏠</span>Home
        </Link>
        <Link href="/mobile/queue" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>📋</span>Fila
        </Link>
        <Link href="/mobile/history" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#444', fontSize: '10px', textDecoration: 'none', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '20px' }}>📖</span>Histórico
        </Link>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#FF6B00', fontSize: '10px', borderTop: '2px solid #FF6B00' }}>
          <span style={{ fontSize: '20px' }}>👤</span>Perfil
        </div>
      </div>
    </div>
  )
}
