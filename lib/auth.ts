import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

export type Perfil = 'tecnico' | 'orcamentista' | 'staff' | 'admin'

export async function getUsuarioPerfil() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Usa service role para bypassar RLS ao buscar perfil
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: perfil } = await admin
    .from('perfis')
    .select('perfil, ativo')
    .eq('id', user.id)
    .single()

  return {
    user,
    perfil: (perfil?.perfil ?? 'tecnico') as Perfil,
    ativo: perfil?.ativo ?? true,
  }
}

export async function requirePerfil(...perfisPermitidos: Perfil[]) {
  const { user, perfil, ativo } = await getUsuarioPerfil()
  if (!ativo) redirect('/acesso-negado')
  if (!perfisPermitidos.includes(perfil)) redirect('/acesso-negado')
  return { user, perfil }
}
