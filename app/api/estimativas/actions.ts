'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const PART_LABEL_JA: Record<string, string> = {
  roof:            'ルーフ',
  front_fender_rh: 'フロントフェンダーRH',
  front_fender_lh: 'フロントフェンダーLH',
  front_door_rh:   'フロントドアRH',
  front_door_lh:   'フロントドアLH',
  pillar_rh:       'ピラーRH',
  pillar_lh:       'ピラーLH',
  rear_door_rh:    'リヤドアRH',
  rear_door_lh:    'リヤドアLH',
  quarter_rh:      'クォーターパネルRH',
  quarter_lh:      'クォーターパネルLH',
  front_bumper:    'フロントバンパー',
  hood:            'フード',
  trunk:           'トランク',
  rear_bumper:     'リヤバンパー',
}

export async function criarEstimativaAction(caseId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: caso } = await supabase
    .from('cases')
    .select('*, customers(name, email, phone), vehicles(make, model, year, plate)')
    .eq('id', caseId)
    .single()
  if (!caso) throw new Error('Caso não encontrado')

  const { data: parts } = await supabase
    .from('vehicle_parts')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at')

  const subtotal = (parts ?? []).reduce((s: number, p: any) => s + Number(p.subtotal), 0)
  const taxAmount = Math.round(subtotal * 0.1)
  const total = subtotal + taxAmount

  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('doc_type', 'estimate')
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const docNumber = `DLN-${ymd}-${seq}`

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      doc_type: 'estimate',
      doc_number: docNumber,
      case_id: caseId,
      customer_id: caso.customer_id,
      vehicle_id: caso.vehicle_id,
      doc_status: 'draft',
      send_status: 'pending',
      approval_status: 'pending',
      subject: '雹害（ひょう害）修理費用 御見積',
      conditions: '有効期限：発行日より30日間 ／ 納期：ご協議の上決定',
      tax_rate: 0.10,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      created_by: user.id,
    })
    .select()
    .single()

  if (docError || !doc) throw new Error(docError?.message ?? 'Erro ao criar documento')

  if (parts && parts.length > 0) {
    const items = parts.map((p: any, i: number) => {
      const partKey = (p.part_name ?? '').toLowerCase().replace(/ /g, '_')
      return {
        document_id: doc.id,
        sort_order: i,
        section: 'pdr',
        item_type: 'pdr_repair',
        part_id: partKey,
        part_label: PART_LABEL_JA[partKey] ?? p.part_name,
        dent_count: p.dent_count,
        unit_price: Number(p.subtotal),
        quantity: 1,
        subtotal: Number(p.subtotal),
        source_type: 'inspection',
        original_price: Number(p.subtotal),
      }
    })
    await supabase.from('document_items').insert(items)
  }

  await supabase.from('document_events').insert({
    document_id: doc.id,
    event_type: 'created',
    user_id: user.id,
    payload: { case_id: caseId, doc_number: docNumber },
  })

  revalidatePath(`/cases/${caseId}`)
  redirect(`/estimativas/${doc.id}`)
}

export async function salvarRascunhoAction(
  docId: string,
  payload: {
    subject?: string
    notes?: string
    conditions?: string
    vehicle_km?: string
    vehicle_model_code?: string
    vehicle_vin?: string
    vehicle_first_reg?: string
    vehicle_accident?: string
    items?: any[]
  }
) {
  const supabase = await createSupabaseServerClient()

  const items = payload.items ?? []
  const subtotal = items.reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0)
  const taxAmount = Math.round(subtotal * 0.1)
  const total = subtotal + taxAmount

  const meta = {
    vehicle_km: payload.vehicle_km,
    vehicle_model_code: payload.vehicle_model_code,
    vehicle_vin: payload.vehicle_vin,
    vehicle_first_reg: payload.vehicle_first_reg,
    vehicle_accident: payload.vehicle_accident,
  }

  const { error } = await supabase
    .from('documents')
    .update({
      subject: payload.subject,
      notes: payload.notes,
      conditions: payload.conditions,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      snapshot: { meta },
      updated_at: new Date().toISOString(),
    })
    .eq('id', docId)
    .eq('doc_status', 'draft')

  if (error) return { error: error.message }

  if (payload.items !== undefined) {
    await supabase.from('document_items').delete().eq('document_id', docId)
    if (items.length > 0) {
      const rows = items.map((it: any, i: number) => ({
        document_id: docId,
        sort_order: i,
        section: it.section,
        item_type: it.item_type ?? 'pdr_repair',
        part_id: it.part_id,
        part_label: it.part_label,
        description: it.description,
        dent_count: it.dent_count ?? 0,
        unit_price: it.unit_price ?? it.subtotal ?? 0,
        quantity: it.quantity ?? 1,
        subtotal: it.subtotal ?? 0,
        source_type: it.source_type ?? 'manual',
        original_price: it.original_price,
        notes: it.notes,
      }))
      await supabase.from('document_items').insert(rows)
    }
  }

  return { error: null, subtotal, taxAmount, total }
}

export async function emitirEstimativaAction(docId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: doc } = await supabase
    .from('documents')
    .select('*, document_items(*)')
    .eq('id', docId)
    .single()
  if (!doc) return { error: 'Documento não encontrado' }
  if (doc.doc_status !== 'draft') return { error: 'Apenas rascunhos podem ser emitidos' }
  if (!doc.total_amount || doc.total_amount === 0) return { error: 'Total não pode ser zero' }

  const { error } = await supabase
    .from('documents')
    .update({
      doc_status: 'issued',
      issued_at: new Date().toISOString(),
      issued_by: user.id,
    })
    .eq('id', docId)

  if (error) return { error: error.message }

  await supabase.from('document_events').insert({
    document_id: docId,
    event_type: 'issued',
    user_id: user.id,
    payload: {},
  })

  revalidatePath(`/estimativas/${docId}`)
  return { error: null }
}
