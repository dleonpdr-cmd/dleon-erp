'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  type OperationalRole,
  type TechnicianPermission,
  type TechnicianWithRoles,
  type UserSessionState,
} from './constants'

// ─── Técnico — dados + roles + permissões ────────────────────────────────────

export async function getTechnicianWithRoles(techId: string): Promise<TechnicianWithRoles | null> {
  const supabase = await createSupabaseServerClient()

  const [techRes, permsRes, membersRes] = await Promise.all([
    supabase
      .from('technicians')
      .select('id, name, role, primary_role, active, user_id')
      .eq('id', techId)
      .single(),
    supabase
      .from('technician_permissions')
      .select('permission')
      .eq('technician_id', techId),
    supabase
      .from('operation_members')
      .select('id, operation_id, primary_function, operations(name), operation_member_roles(role)')
      .eq('technician_id', techId)
      .is('left_at', null),
  ])

  if (techRes.error || !techRes.data) return null

  const tech = techRes.data
  const permissions = (permsRes.data ?? []).map(p => p.permission as TechnicianPermission)
  const operations = (membersRes.data ?? []).map((m: any) => ({
    operation_id:    m.operation_id,
    operation_name:  m.operations?.name ?? '',
    primary_function: m.primary_function as OperationalRole | null,
    roles:           (m.operation_member_roles ?? []).map((r: any) => r.role as OperationalRole),
    member_id:       m.id,
  }))

  return {
    id:           tech.id,
    name:         tech.name,
    role:         tech.role,
    primary_role: tech.primary_role as OperationalRole | null,
    active:       tech.active,
    user_id:      tech.user_id,
    permissions,
    operations,
  }
}

// ─── Atualizar função principal do técnico ───────────────────────────────────

export async function updateTechnicianPrimaryRole(
  techId: string,
  primaryRole: OperationalRole | null,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('technicians')
    .update({ primary_role: primaryRole })
    .eq('id', techId)
  if (error) return { error: error.message }
  revalidatePath(`/technicians/${techId}`)
  return {}
}

// ─── Vincular user_id ao técnico ─────────────────────────────────────────────

export async function linkUserToTechnician(
  techId: string,
  userId: string | null,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('technicians')
    .update({ user_id: userId })
    .eq('id', techId)
  if (error) return { error: error.message }
  revalidatePath(`/technicians/${techId}`)
  return {}
}

// ─── Permissões ──────────────────────────────────────────────────────────────

export async function setTechnicianPermissions(
  techId: string,
  permissions: TechnicianPermission[],
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Delete all existing and re-insert
  const { error: delErr } = await supabase
    .from('technician_permissions')
    .delete()
    .eq('technician_id', techId)
  if (delErr) return { error: delErr.message }

  if (permissions.length > 0) {
    const { error: insErr } = await supabase
      .from('technician_permissions')
      .insert(permissions.map(p => ({
        technician_id: techId,
        permission:    p,
        granted_by:    user?.id ?? null,
      })))
    if (insErr) return { error: insErr.message }
  }

  revalidatePath(`/technicians/${techId}`)
  return {}
}

// ─── Papéis numa operação ────────────────────────────────────────────────────

export async function setMemberRoles(
  memberId: string,
  roles: OperationalRole[],
  primaryFunction: OperationalRole | null,
  techId: string,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  // 1. Update primary_function
  const { error: pmErr } = await supabase
    .from('operation_members')
    .update({ primary_function: primaryFunction })
    .eq('id', memberId)
  if (pmErr) return { error: pmErr.message }

  // 2. Replace roles
  const { error: delErr } = await supabase
    .from('operation_member_roles')
    .delete()
    .eq('member_id', memberId)
  if (delErr) return { error: delErr.message }

  if (roles.length > 0) {
    const { error: insErr } = await supabase
      .from('operation_member_roles')
      .insert(roles.map(r => ({ member_id: memberId, role: r })))
    if (insErr) return { error: insErr.message }
  }

  revalidatePath(`/technicians/${techId}`)
  return {}
}

// ─── Vincular/desvincular técnico de operação ────────────────────────────────

export async function addTechnicianToOperation(
  techId: string,
  operationId: string,
  primaryFunction: OperationalRole,
  roles: OperationalRole[],
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  const { data: member, error: memErr } = await supabase
    .from('operation_members')
    .insert({ operation_id: operationId, technician_id: techId, primary_function: primaryFunction })
    .select('id')
    .single()
  if (memErr) return { error: memErr.message }

  if (roles.length > 0) {
    const { error: rolesErr } = await supabase
      .from('operation_member_roles')
      .insert(roles.map(r => ({ member_id: member.id, role: r })))
    if (rolesErr) return { error: rolesErr.message }
  }

  revalidatePath(`/technicians/${techId}`)
  return {}
}

export async function removeTechnicianFromOperation(
  memberId: string,
  techId: string,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('operation_members')
    .update({ left_at: new Date().toISOString() })
    .eq('id', memberId)
  if (error) return { error: error.message }
  revalidatePath(`/technicians/${techId}`)
  return {}
}

// ─── Session state ────────────────────────────────────────────────────────────

export async function getSessionState(): Promise<UserSessionState | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_session_state')
    .select('*')
    .eq('user_id', user.id)
    .single()
  return data as UserSessionState | null
}

export async function setSessionState(patch: {
  active_technician_id?: string | null
  active_operation_id?: string | null
  active_role?: OperationalRole | null
}): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('user_session_state')
    .upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() })
  if (error) return { error: error.message }
  return {}
}

// ─── Resolver técnico atual pelo user_id ─────────────────────────────────────

export type CurrentTechnicianContext = {
  technicianId: string
  technicianName: string
  operationId: string
  operationName: string
  activeRole: OperationalRole
  allowedRoles: OperationalRole[]
}

export async function resolveCurrentTechnician(): Promise<CurrentTechnicianContext | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Encontrar técnico vinculado a este usuário
  const { data: tech } = await supabase
    .from('technicians')
    .select('id, name')
    .eq('user_id', user.id)
    .single()
  if (!tech) return null

  // 2. Pegar session state
  const { data: session } = await supabase
    .from('user_session_state')
    .select('active_operation_id, active_role')
    .eq('user_id', user.id)
    .single()

  if (!session?.active_operation_id || !session?.active_role) return null

  // 3. Verificar se o técnico está na operação
  const { data: member } = await supabase
    .from('operation_members')
    .select('id, operation_member_roles(role), operations(name)')
    .eq('technician_id', tech.id)
    .eq('operation_id', session.active_operation_id)
    .is('left_at', null)
    .single()

  if (!member) return null

  const opData = member as any
  const allowedRoles = (opData.operation_member_roles ?? []).map((r: any) => r.role as OperationalRole)

  return {
    technicianId:   tech.id,
    technicianName: tech.name,
    operationId:    session.active_operation_id,
    operationName:  opData.operations?.name ?? '',
    activeRole:     session.active_role as OperationalRole,
    allowedRoles,
  }
}

// ─── Listar operações do técnico atual (para seleção de operação ativa) ───────

export async function getMyOperations(): Promise<{
  operationId: string
  operationName: string
  primaryFunction: OperationalRole | null
  roles: OperationalRole[]
}[]> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!tech) return []

  const { data: members } = await supabase
    .from('operation_members')
    .select('operation_id, primary_function, operations(name), operation_member_roles(role)')
    .eq('technician_id', tech.id)
    .is('left_at', null)
  if (!members) return []

  return (members as any[]).map(m => ({
    operationId:     m.operation_id,
    operationName:   m.operations?.name ?? '',
    primaryFunction: m.primary_function as OperationalRole | null,
    roles:           (m.operation_member_roles ?? []).map((r: any) => r.role as OperationalRole),
  }))
}

// ─── Listar operações disponíveis para seleção ───────────────────────────────

export async function getAvailableOperations(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('operations')
    .select('id, name')
    .eq('status', 'active')
    .order('name')
  return data ?? []
}

// ─── Listar usuários disponíveis para vincular ───────────────────────────────

export async function getAuthUsers(): Promise<{ id: string; email: string }[]> {
  const supabase = await createSupabaseServerClient()
  // Note: auth.users não é acessível via PostgREST direto.
  // Usamos a tabela 'users' do schema público se existir, ou retornamos vazio.
  // O admin deve obter o user_id manualmente por ora.
  const { data } = await supabase
    .from('users')
    .select('id, email')
    .order('email')
    .limit(100)
  return (data ?? []) as { id: string; email: string }[]
}
