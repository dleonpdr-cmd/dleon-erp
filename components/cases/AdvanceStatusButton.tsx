'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface Props {
  caseId: string
  nextStatus: string
  nextLabel: string
}

export function AdvanceStatusButton({ caseId, nextStatus, nextLabel }: Props) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)

  async function handleAdvance() {
    setLoading(true)
    await supabase.from('cases').update({ status: nextStatus }).eq('id', caseId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleAdvance}
      disabled={loading}
      style={{
        background: '#FF6B00',
        border: 'none',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '500',
        padding: '6px 14px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1
      }}
    >
      {loading ? 'Atualizando...' : `Avançar → ${nextLabel}`}
    </button>
  )
}
