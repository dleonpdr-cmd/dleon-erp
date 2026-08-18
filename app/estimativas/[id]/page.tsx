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
