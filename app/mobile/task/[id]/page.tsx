import { redirect, notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveCurrentTechnician } from '@/app/api/roles/actions'
import { getTaskEvents } from '@/app/api/workflow/actions'
import MobileTaskDetail from '@/components/mobile/MobileTaskDetail'

export default async function MobileTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await resolveCurrentTechnician()
  if (!ctx) redirect('/mobile')

  // Buscar a task pelo id diretamente na view (sem filtro de status)
  const { data: task } = await supabase
    .from('v_workflow_queue')
    .select('*')
    .eq('id', id)
    .single()
  if (!task) notFound()

  const events = await getTaskEvents(id)

  return (
    <MobileTaskDetail ctx={ctx} task={task} events={events} />
  )
}
