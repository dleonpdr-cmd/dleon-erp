'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ width: '100%', maxWidth: '360px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#F0EEE9' }}>Entrar no sistema</h1>
      <p style={{ fontSize: '14px', color: '#888780', marginBottom: '32px' }}>Use seu e-mail e senha cadastrados.</p>

      {error && (
        <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#F09595', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '14px' }}>
          <label htmlFor={emailId} style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888780', marginBottom: '6px' }}>E-mail</label>
          <input
            id={emailId}
            type="email"
            placeholder="voce@dleon.jp"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', height: '44px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '14px', padding: '0 14px', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor={passwordId} style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#888780', marginBottom: '6px' }}>Senha</label>
          <input
            id={passwordId}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', height: '44px', background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#F0EEE9', fontSize: '14px', padding: '0 14px', outline: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', height: '46px', background: '#FF6B00', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
