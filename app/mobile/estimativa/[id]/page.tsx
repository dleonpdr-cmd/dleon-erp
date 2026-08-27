import { createSupabaseServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VehicleMap from '@/components/mobile/VehicleMap'

export default async function EstimativaMobilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  // Busca documento com case e vehicle
  const { data: doc, error } = await supabase
    .from('documents')
    .select(`
      id,
      doc_number,
      approval_status,
      operation_id,
      case_id,
      cases (
        case_number,
        vehicles ( plate, make, model, year )
      ),
      operations ( name )
    `)
    .eq('id', id)
    .single()

  if (error || !doc) notFound()

  // Busca itens do VehicleMap (source_type = 'mobile_estimate')
  const { data: items } = await supabase
    .from('document_items')
    .select('part_id, damage_level, unit_price')
    .eq('document_id', id)
    .eq('source_type', 'mobile_estimate')

  // Monta labels
  const c = doc.cases as any
  const v = c?.vehicles as any
  const vehicleLabel = v
    ? `${v.plate ?? c?.case_number ?? '—'} · ${v.make} ${v.model}`
    : `Doc ${doc.doc_number}`
  const op = doc.operations as any
  const operationLabel = op?.name ?? '—'

  return (
    <VehicleMap
      documentId={id}
      initialItems={(items ?? []) as Array<{
        part_id: string
        damage_level: string | null
        unit_price: number
      }>}
      vehicleLabel={vehicleLabel}
      operationLabel={operationLabel}
      approvalStatus={doc.approval_status ?? 'draft'}
    />
  )
}
