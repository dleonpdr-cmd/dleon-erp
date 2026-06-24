import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) redirect('/')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
      <aside style={{ background: '#141414', borderRight: '1px solid #2A2A2A', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px' }}>
        <div style={{ color: '#FF6B00', fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>D'LEON</div>
        <div style={{ color: '#888780', fontSize: '14px' }}>Paintless Dent Repair · 日本</div>
      </aside>
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        <LoginForm />
      </main>
    </div>
  )
}
