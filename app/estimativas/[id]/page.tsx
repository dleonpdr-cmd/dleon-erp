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

  const { data: items } = await supabase
    .from('document_items')
    .select('*')
    .eq('document_id', id)
    .order('sort_order')

  const { data: customer } = doc.customer_id
    ? await supabase.from('customers').select('*').eq('id', doc.customer_id).single()
    : { data: null }

  const { data: vehicle } = doc.vehicle_id
    ? await supabase.from('vehicles').select('*').eq('id', doc.vehicle_id).single()
    : { data: null }

  const { data: caso } = doc.case_id
    ? await supabase.from('cases').select('*').eq('id', doc.case_id).single()
    : { data: null }

  const meta = (doc.snapshot as any)?.meta ?? {}

  return (
    <EstimativaShell
      doc={doc}
      items={items ?? []}
      customer={customer}
      vehicle={vehicle}
      caso={caso}
      meta={meta}
    />
  )
}
