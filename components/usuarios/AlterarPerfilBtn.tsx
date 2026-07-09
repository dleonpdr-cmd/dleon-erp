'use client'

import { useState, useTransition } from 'react'
import { alterarPerfil, toggleAtivo } from '@/app/api/usuarios/actions'

const PERFIS = ['tecnico', 'orcamentista', 'staff', 'admin']

interface Props {
  userId: string
  perfilAtual: string
  ativo: boolean
}

export default function AlterarPerfilBtn({ userId, perfilAtual, ativo }: Props) {
  const [perfil, setPerfil] = useState(perfilAtual)
  const [, startTransition] = useTransition()

  function handlePerfil(novoPerfil: string) {
    setPerfil(novoPerfil)
    startTransition(async () => {
      await alterarPerfil(userId, novoPerfil)
    })
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleAtivo(userId, !ativo)
    })
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select value={perfil} onChange={e => handlePerfil(e.target.value)}
        style={{ background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#F0EEE9' }}>
        {PERFIS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
      </select>
      <button onClick={handleToggle}
        style={{ background: ativo ? '#3A1C1C' : '#1C3A1C', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: ativo ? '#F87171' : '#4ADE80', cursor: 'pointer' }}>
        {ativo ? 'Desativar' : 'Ativar'}
      </button>
    </div>
  )
}
