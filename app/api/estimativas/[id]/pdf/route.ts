import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Font } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import { createElement, type ReactElement, type ComponentProps } from 'react'
import path from 'path'
import EstimativaPDF from '@/components/estimativas/EstimativaPDF'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function registerFonts() {
  Font.register({
    family: 'NotoSansJP',
    fonts: [
      { src: path.join(process.cwd(), 'public/fonts/NotoSansJP-Regular.woff2'), fontWeight: 400 },
      { src: path.join(process.cwd(), 'public/fonts/NotoSansJP-Bold.woff2'),    fontWeight: 700 },
    ],
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  }

  const [itemsRes, customerRes, vehicleRes] = await Promise.all([
    supabase.from('document_items').select('*').eq('document_id', id).order('sort_order'),
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

  registerFonts()
  const element = createElement(EstimativaPDF, { doc, items, customer, vehicle, meta })
  // @react-pdf/renderer expects a Document element; cast via unknown to satisfy TS
  const buffer = await renderToBuffer(element as unknown as ReactElement<ComponentProps<typeof Document>>)
  const uint8 = new Uint8Array(buffer)

  const filename = `${doc.doc_number ?? id}.pdf`

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(uint8.length),
    },
  })
}
