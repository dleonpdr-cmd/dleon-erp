import { requirePerfil } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: perfil, error } = await admin
    .from('perfis')
    .select('perfil, ativo')
    .eq('id', user.id)
    .single()

  console.log('DEBUG CUSTOMERS LAYOUT:', { userId: user.id, perfil, error })

  if (!perfil || !['staff', 'admin'].includes(perfil.perfil)) {
    redirect('/?acesso=negado')
  }

  return <>{children}</>
}
