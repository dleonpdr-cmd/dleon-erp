'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OperationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
export type BudgetTypeDefault = 'individual' | 'batch'
export type MemberRole = 'pdr_tech' | 'inspector' | 'assembler' | 'supervisor' | 'financial' | 'admin'

export type Operation = {
  id: string
  name: string
  status: OperationStatus
  budget_type_default: BudgetTypeDefault
  workflow_template_id: string | null
  start_date: string | null
  end_date: string | null
  target_vehicle_count: number | null
  notes: string | null
  created_at: string
  updated_at: string
  customer_id: string | null
  customer_name: string | null
  total_cases: number
  completed_cases: number
  in_progress_cases: number
  pending_cases: number
  total_amount: number
  active_members: number
}

export type OperationMember = {
  id: string
  operation_id: string
  technician_id: string
  primary_function: MemberRole | null
  joined_at: string
  left_at: string | null
  technicians: { id: string; name: string; role: string | null } | null
  roles: MemberRole[]
}

// ─── Listar operações ─────────────────────────────────────────────────────────

export async function getOperations(): Promise<Operation[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('v_operations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data ?? []) as Operation[]
}

// ─── Buscar uma operação ──────────────────────────────────────────────────────

export async function getOperation(id: string): Promise<Operation | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('v_operations')
    .select('*')
    .eq('id', id)
    .single()
  return (data as Operation) ?? null
}

// ─── Buscar casos de uma operação ─────────────────────────────────────────────

export async function getOperationCases(operationId: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('cases')
    .select('id, case_number, status, total_amount, created_at, customers(name), vehicles(make, model, year, plate)')
    .eq('operation_id', operationId)
    .order('created_at', { ascending: false })
  return data ?? []
}

// ─── Buscar membros de uma operação ──────────────────────────────────────────

export async function getOperationMembers(operationId: string): Promise<OperationMember[]> {
  const supabase = await createSupabaseServerClient()
  const { data: members } = await supabase
    .from('operation_members')
    .select('*, technicians(id, name, role), operation_member_roles(role)')
    .eq('operation_id', operationId)
    .is('left_at', null)
    .order('joined_at')

  return (members ?? []).map((m: any) => ({
    ...m,
    roles: (m.operation_member_roles ?? []).map((r: any) => r.role as MemberRole),
  }))
}

// ─── Criar operação ───────────────────────────────────────────────────────────

export async function createOperation(payload: {
  name: string
  customer_id?: string
  status?: OperationStatus
  budget_type_default?: BudgetTypeDefault
  target_vehicle_count?: number
  start_date?: string
  end_date?: string
  notes?: string
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase
    .from('operations')
    .insert([{
      name: payload.name.trim(),
      customer_id: payload.customer_id || null,
      status: payload.status ?? 'draft',
      budget_type_default: payload.budget_type_default ?? 'individual',
      target_vehicle_count: payload.target_vehicle_count ?? null,
      start_date: payload.start_date || null,
      end_date: payload.end_date || null,
      notes: payload.notes || null,
      created_by: user.id,
    }])
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/operations')
  return { id: data.id }
}

// ─── Atualizar operação ───────────────────────────────────────────────────────

export async function updateOperation(
  id: string,
  payload: Partial<{
    name: string
    customer_id: string | null
    status: OperationStatus
    budget_type_default: BudgetTypeDefault
    target_vehicle_count: number | null
    start_date: string | null
    end_date: string | null
    notes: string | null
    workflow_template_id: string | null
  }>
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('operations')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/operations')
  revalidatePath(`/operations/${id}`)
  return {}
}

// ─── Vincular caso a operação ─────────────────────────────────────────────────

export async function linkCaseToOperation(
  caseId: string,
  operationId: string | null
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('cases')
    .update({ operation_id: operationId })
    .eq('id', caseId)

  if (error) return { error: error.message }
  revalidatePath(`/operations/${operationId}`)
  revalidatePath(`/cases/${caseId}`)
  return {}
}

// ─── Adicionar membro ─────────────────────────────────────────────────────────

export async function addOperationMember(
  operationId: string,
  technicianId: string,
  primaryFunction: MemberRole,
  roles: MemberRole[]
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  // Upsert member
  const { data: member, error: memberErr } = await supabase
    .from('operation_members')
    .upsert([{
      operation_id: operationId,
      technician_id: technicianId,
      primary_function: primaryFunction,
      left_at: null,
    }], { onConflict: 'operation_id,technician_id' })
    .select('id')
    .single()

  if (memberErr || !member) return { error: memberErr?.message ?? 'Erro ao adicionar membro' }

  // Insert roles
  const roleRows = roles.map(r => ({ member_id: member.id, role: r }))
  if (roleRows.length > 0) {
    await supabase
      .from('operation_member_roles')
      .upsert(roleRows, { onConflict: 'member_id,role' })
  }

  revalidatePath(`/operations/${operationId}`)
  return {}
}

// ─── Labels e cores ───────────────────────────────────────────────────────────

export const OP_STATUS_LABEL: Record<OperationStatus, string> = {
  draft:     'Rascunho',
  active:    'Ativa',
  paused:    'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

export const OP_STATUS_COLOR: Record<OperationStatus, string> = {
  draft:     '#555',
  active:    '#1D9E75',
  paused:    '#FF6B00',
  completed: '#378ADD',
  cancelled: '#E24B4A',
}

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  pdr_tech:  'Técnico PDR',
  inspector: 'Inspetor',
  assembler: 'Desmontador/Montador',
  supervisor:'Supervisor',
  financial: 'Financeiro',
  admin:     'Administrador',
}
