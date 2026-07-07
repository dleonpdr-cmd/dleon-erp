import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type Perfil = 'tecnico' | 'orcamentista' | 'staff' | 'admin'

export async function getUsuarioPerfil() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('perfil, ativo')
    .eq('id', user.id)
    .single()

  return {
    user,
    perfil: (perfil?.perfil ?? 'tecnico') as Perfil,
    ativo: perfil?.ativo ?? false,
  }
}

export async function requirePerfil(...perfisPermitidos: Perfil[]) {
  const { user, perfil, ativo } = await getUsuarioPerfil()

  if (!ativo) redirect('/?acesso=inativo')
  if (!perfisPermitidos.includes(perfil)) redirect('/?acesso=negado')

  return { user, perfil }
}
