# Diagnóstico: botão "見積書 を作成" não aparece após deploy na Vercel

## Contexto
- Next.js 16.2.9 + React 19 + TypeScript strict mode
- Deploy via Vercel com auto-deploy no push para main
- O botão foi commitado e deu push com sucesso (confirmado pelo terminal)
- Já corrigimos erros de TypeScript anteriores (conditional await → Promise.all, doSave sem tipos)
- Mesmo após o fix e novo push, o botão ainda não aparece na página do caso

## Sintoma
O botão `<CriarEstimativaBtn caseId={c.id} />` está importado e usado em `app/cases/[id]/page.tsx` linha 47, mas não aparece no browser após deploy.

## Pergunta central
**O que ainda pode estar impedindo o build de incluir esses arquivos no deploy?**
Analise cada arquivo abaixo e responda:
1. Há algum erro de TypeScript que quebraria o build com `strict: true`?
2. Há algum problema de import/export que impede o bundle?
3. Há algum erro de runtime que faria a página crashar antes de renderizar o botão?
4. Que outras causas podem fazer um componente importado não aparecer no Vercel?

---

## tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  }
}
```

---

## package.json (dependências relevantes)
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.12.0",
    "@supabase/supabase-js": "^2.108.2",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

---

## app/cases/[id]/page.tsx  (Server Component — usa o botão)
```tsx
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AdvanceStatusButton } from '@/components/cases/AdvanceStatusButton'
import { CriarEstimativaBtn } from '@/components/cases/CriarEstimativaBtn'

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: c } = await supabase.from('cases').select('*, customers(name, phone, email), vehicles(make, model, year, plate)').eq('id', id).single()
  if (!c) redirect('/cases')
  const { data: parts } = await supabase.from('vehicle_parts').select('*').eq('case_id', id)
  const { data: caseTechs } = await supabase.from('case_technicians').select('*, technicians(name, region)').eq('case_id', id)
  const statusOrder = ['draft','quoted','approved','in_progress','done','invoiced','received','paid']
  const statusLabel: any = { draft:'Rascunho', quoted:'Orçamento', approved:'Aprovado', in_progress:'Em execução', done:'Concluído', invoiced:'Faturado', received:'Recebido', paid:'Pago' }
  const statusColor: any = { draft:'#555', quoted:'#378ADD', approved:'#1D9E75', in_progress:'#FF6B00', done:'#1D9E75', invoiced:'#7F77DD', received:'#1D9E75', paid:'#888' }
  const currentIdx = statusOrder.indexOf(c.status)
  const nextStatus = statusOrder[currentIdx + 1] ?? null
  const nextLabel = nextStatus ? statusLabel[nextStatus] : null
  const card = { background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      {/* ... navbar ... */}
      <div style={{ maxWidth: '780px', margin: '32px auto', padding: '0 24px' }}>
        {/* ... breadcrumb ... */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'monospace', color: '#FF6B00' }}>{c.case_number}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '10px', background: `${statusColor[c.status]}20`, color: statusColor[c.status], fontWeight: '500' }}>{statusLabel[c.status]}</span>
            {nextStatus && <AdvanceStatusButton caseId={c.id} nextStatus={nextStatus} nextLabel={nextLabel} />}
            <CriarEstimativaBtn caseId={c.id} />
          </div>
        </div>
        {/* ... rest of page ... */}
      </div>
    </div>
  )
}
```

---

## components/cases/CriarEstimativaBtn.tsx  (Client Component)
```tsx
'use client'
import { useState, useTransition } from 'react'
import { criarEstimativaAction } from '@/app/api/estimativas/actions'

export function CriarEstimativaBtn({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await criarEstimativaAction(caseId)
      } catch (err: unknown) {
        if (
          err != null &&
          typeof err === 'object' &&
          'digest' in err &&
          typeof (err as { digest: unknown }).digest === 'string' &&
          (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
        ) {
          throw err
        }
        setError(err instanceof Error ? err.message : 'Erro ao criar estimativa')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        disabled={pending}
        onClick={handleClick}
        style={{
          background: '#1B2744',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? '作成中...' : '+ 見積書 を作成'}
      </button>
      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444' }}>{error}</span>
      )}
    </div>
  )
}
```

---

## app/api/estimativas/actions.ts  (Server Actions)
```ts
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const PART_LABEL_JA: Record<string, string> = {
  roof: 'ルーフ',
  front_fender_rh: 'フロントフェンダーRH',
  front_fender_lh: 'フロントフェンダーLH',
  front_door_rh: 'フロントドアRH',
  front_door_lh: 'フロントドアLH',
  pillar_rh: 'ピラーRH',
  pillar_lh: 'ピラーLH',
  rear_door_rh: 'リヤドアRH',
  rear_door_lh: 'リヤドアLH',
  quarter_rh: 'クォーターパネルRH',
  quarter_lh: 'クォーターパネルLH',
  front_bumper: 'フロントバンパー',
  hood: 'フード',
  trunk: 'トランク',
  rear_bumper: 'リヤバンパー',
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
```

---

## app/estimativas/[id]/page.tsx  (Server Component — destino após criação)
```tsx
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import EstimativaShell from '@/components/estimativas/EstimativaShell'

export default async function EstimativaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()
  if (!doc) redirect('/cases')

  const [itemsRes, customerRes, vehicleRes, casoRes] = await Promise.all([
    supabase.from('document_items').select('*').eq('document_id', id).order('sort_order'),
    doc.customer_id
      ? supabase.from('customers').select('*').eq('id', doc.customer_id).single()
      : Promise.resolve({ data: null, error: null }),
    doc.vehicle_id
      ? supabase.from('vehicles').select('*').eq('id', doc.vehicle_id).single()
      : Promise.resolve({ data: null, error: null }),
    doc.case_id
      ? supabase.from('cases').select('*').eq('id', doc.case_id).single()
      : Promise.resolve({ data: null, error: null }),
  ])

  const meta = (doc.snapshot as { meta?: Record<string, string> } | null)?.meta ?? {}

  return (
    <EstimativaShell
      doc={doc}
      items={itemsRes.data ?? []}
      customer={customerRes.data}
      vehicle={vehicleRes.data}
      caso={casoRes.data}
      meta={meta}
    />
  )
}
```

---

## components/estimativas/EstimativaShell.tsx  (Client Component — ~554 linhas, trecho crítico)
```tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { salvarRascunhoAction, emitirEstimativaAction } from '@/app/api/estimativas/actions'

export type DocItem = {
  id?: string
  section: 'pdr' | 'ancillary' | 'travel'
  item_type?: string
  part_id?: string
  part_label?: string
  description?: string
  dent_count: number
  unit_price: number
  subtotal: number
  source_type?: string
  original_price?: number
  notes?: string
}

type Props = {
  doc: any
  items: DocItem[]
  customer: any
  vehicle: any
  caso: any
  meta: Record<string, string>
}

// A4Preview function omitted for brevity — pure render, no hooks, no TypeScript issues

export default function EstimativaShell({ doc, items: initItems, customer, vehicle, meta: initMeta }: Props) {
  const [subject,    setSubject]    = useState<string>(doc.subject ?? '')
  const [notes,      setNotes]      = useState<string>(doc.notes ?? '')
  const [conditions, setConditions] = useState<string>(doc.conditions ?? '有効期限：発行日よら30日間 ／ 納期：ご協議の上決定')
  const [items,      setItems]      = useState<DocItem[]>(initItems)
  const [meta,       setMeta]       = useState<Record<string, string>>(initMeta)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [docStatus,  setDocStatus]  = useState<string>(doc.doc_status)
  const [emitting,   setEmitting]   = useState(false)
  const [msg,        setMsg]        = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraft = docStatus === 'draft'

  const doSave = useCallback(async (
    s: string, n: string, c: string, its: DocItem[], m: Record<string, string>
  ) => {
    setSaveStatus('saving')
    const res = await salvarRascunhoAction(doc.id, {
      subject: s, notes: n, conditions: c, items: its, ...m,
    })
    setSaveStatus(res.error ? 'error' : 'saved')
  }, [doc.id])

  useEffect(() => {
    if (!isDraft) return
    setSaveStatus('unsaved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doSave(subject, notes, conditions, items, meta), 2500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [subject, notes, conditions, items, meta, isDraft, doSave])

  // ... rest of component
}
```

---

## Perguntas específicas para o diagnóstico

1. **Tem erro de TypeScript** em qualquer um desses arquivos com `strict: true` + Next.js 16 + React 19?  
   — Em especial: o `caso` está na interface `Props` mas não é destructurado na assinatura da função `EstimativaShell`. Isso dá erro ou warning?

2. **O `actions.ts` está em `app/api/estimativas/`** — o Next.js App Router trata esse caminho como uma API Route ou como um módulo normal de Server Actions? O arquivo tem `'use server'` no topo, mas o diretório `api/` pode confundir o roteador?

3. **O `EstimativaShell` usa `export default`** mas é importado como `import EstimativaShell from ...` — OK. Mas o `CriarEstimativaBtn` usa `export function` (named export) e é importado como `import { CriarEstimativaBtn } from ...` — está correto?

4. **Alguma coisa no `EstimativaShell.tsx` (554 linhas)** poderia causar um erro de compilação que faria o build falhar silenciosamente e o Vercel servir a versão anterior (sem o botão)?

5. **Qual a forma mais rápida de confirmar se o build está passando ou não?** (além de ver os logs da Vercel)

Por favor, identifique qualquer problema e forneça o código corrigido completo para cada arquivo afetado.
