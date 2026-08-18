'use client'
import { useTransition } from 'react'
import { criarEstimativaAction } from '@/app/api/estimativas/actions'

export function CriarEstimativaBtn({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => criarEstimativaAction(caseId))}
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
  )
}
