'use server'

import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function criarUsuario(email: string, senha: string, perfil: string) {
  try {
    const admin = adminClient()

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (error) return { error: error.message || 'Erro ao criar usuário no Auth' }
    if (!data?.user) return { error: 'Usuário não foi criado' }

    const { error: perfilError } = await admin.from('perfis').insert({
      id: data.user.id,
      perfil,
      ativo: true,
    })

    if (perfilError) return { error: perfilError.message || 'Erro ao salvar perfil' }

    revalidatePath('/usuarios')
    return { error: null }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

export async function alterarPerfil(userId: string, perfil: string) {
  const admin = adminClient()
  await admin.from('perfis').update({ perfil }).eq('id', userId)
  revalidatePath('/usuarios')
}

export async function toggleAtivo(userId: string, ativo: boolean) {
  const admin = adminClient()
  await admin.from('perfis').update({ ativo }).eq('id', userId)
  revalidatePath('/usuarios')
}
