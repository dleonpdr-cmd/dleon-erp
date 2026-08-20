'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { renderToBuffer, Font, Document } from '@react-pdf/renderer'
import { createElement, type ComponentProps } from 'react'
import type { ReactElement } from 'react'
import path from 'path'
import EstimativaPDF from '@/components/estimativas/EstimativaPDF'

function registerFonts() {
  Font.register({
    family: 'NotoSansJP',
    fonts: [
      { src: path.join(process.cwd(), 'public/fonts/NotoSansJP-Regular.ttf'), fontWeight: 400 },
      { src: path.join(process.cwd(), 'public/fonts/NotoSansJP-Bold.ttf'),    fontWeight: 700 },
    ],
  })
}

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

  const { data: parts, error: partsError } = await supabase
    .from('vehicle_parts')
    .select('*')
    .eq('case_id', caseId)
  if (partsError) console.error('vehicle_parts query error:', partsError.message)

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
      // part_name pode vir como "Front Door RH" ou "front_door_rh"
      const raw = (p.part_name ?? p.part_key ?? '')
      const partKey = raw.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
      return {
        document_id: doc.id,
        sort_order: i,
        section: 'pdr' as const,
        item_type: 'pdr_repair',
        part_id: partKey,
        part_label: PART_LABEL_JA[partKey] ?? raw,
        dent_count: parseInt(String(p.dent_count ?? 0), 10),
        unit_price: Math.round(Number(p.subtotal ?? 0)),
        quantity: 1,
        subtotal: Math.round(Number(p.subtotal ?? 0)),
        source_type: 'inspection',
        original_price: Math.round(Number(p.subtotal ?? 0)),
      }
    })
    const { error: itemsError } = await supabase.from('document_items').insert(items)
    if (itemsError) throw new Error('Erro ao inserir itens: ' + itemsError.message)
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

export async function enviarEmailAction(
  docId: string,
  toEmail: string,
  mensagem: string,
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (!process.env.RESEND_API_KEY) return { error: 'RESEND_API_KEY não configurada' }

  // Busca documento + itens + cliente + veículo
  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single()
  if (!doc) return { error: 'Documento não encontrado' }

  const [itemsRes, customerRes, vehicleRes] = await Promise.all([
    supabase.from('document_items').select('*').eq('document_id', docId).order('sort_order'),
    doc.customer_id
      ? supabase.from('customers').select('*').eq('id', doc.customer_id).single()
      : Promise.resolve({ data: null, error: null }),
    doc.vehicle_id
      ? supabase.from('vehicles').select('*').eq('id', doc.vehicle_id).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  const items = itemsRes.data ?? []
  const customer = customerRes.data ?? null
  const vehicle = vehicleRes.data ?? null
  const meta = (doc.snapshot as { meta?: Record<string, string> } | null)?.meta ?? {}

  // Gera PDF
  registerFonts()
  const element = createElement(EstimativaPDF, { doc, items, customer, vehicle, meta })
  const pdfBuffer = await renderToBuffer(
    element as unknown as ReactElement<ComponentProps<typeof Document>>
  )

  const filename = `${doc.doc_number ?? docId}.pdf`

  // Envia via Resend
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: "D'LEON <onboarding@resend.dev>",
    to: [toEmail],
    subject: `御見積書 ${doc.doc_number} — D'LEON`,
    html: `
      <div style="font-family:sans-serif;color:#222;max-width:600px">
        <h2 style="color:#1B2744">御見積書 ${doc.doc_number}</h2>
        <p>${mensagem.replace(/\n/g, '<br>')}</p>
        <p>御見積金額（税込）: <strong>¥${Number(doc.total_amount).toLocaleString('ja-JP')}</strong></p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#888">D'LEON — BARROS LEON GABRIEL<br>080-1586-0585</p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBuffer),
      },
    ],
  })

  if (sendError) return { error: sendError.message }

  // Registra evento e atualiza send_status
  await Promise.all([
    supabase.from('document_events').insert({
      document_id: docId,
      event_type: 'sent',
      user_id: user.id,
      payload: { to: toEmail },
    }),
    supabase
      .from('documents')
      .update({ send_status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', docId),
  ])

  revalidatePath(`/estimativas/${docId}`)
  return { error: null }
}
