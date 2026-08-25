import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveCurrentTechnician } from '@/app/api/roles/actions'
import { getOperationQueue } from '@/app/api/workflow/actions'
import MobileQueueView from '@/components/mobile/MobileQueueView'

export default async function MobileQueuePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await resolveCurrentTechnician()
  if (!ctx) redirect('/mobile')

  const queue = await getOperationQueue(ctx.operationId)

  return (
    <MobileQueueView ctx={ctx} queue={queue} />
  )
}
