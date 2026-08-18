'use client'
import { useState, useTransition } from 'react'
import { criarEstimativaAction } from '@/app/api/estimativas/actions'

export function CriarEstimativaBtn({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await criarEstimativaAction(caseId)
      } catch (err: unknown) {
        // NEXT_REDIRECT must be re-thrown so Next.js can perform navigation
        if (
          err != null &&
          typeof err === 'object' &&
          'digest' in err &&
          typeof (err as { digest: unknown }).digest === 'string' &&
          (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
        ) {
          throw err
        }
        setError(err instanceof Error ? err.message : 'Erro ao criar estimativa')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        disabled={pending}
        onClick={handleClick}
        style={{
          background: '#1B2744',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? '作成中...' : '+ 見積書 を作成'}
      </button>
      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444' }}>{error}</span>
      )}
    </div>
  )
}
