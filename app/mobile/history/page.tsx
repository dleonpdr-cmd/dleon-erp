import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveCurrentTechnician } from '@/app/api/roles/actions'
import MobileHistory from '@/components/mobile/MobileHistory'

export default async function MobileHistoryPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await resolveCurrentTechnician()
  if (!ctx) redirect('/mobile')

  // 1. Busca os últimos eventos do usuário
  const { data: events } = await supabase
    .from('workflow_task_events')
    .select('id, task_id, event_type, created_at')
    .eq('user_id', user.id)
    .in('event_type', ['started', 'completed'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (!events || events.length === 0) {
    return <MobileHistory ctx={ctx} events={[]} />
  }

  // 2. Enriquece via view v_workflow_queue (tem todos os campos de veículo)
  const taskIds = [...new Set(events.map(e => e.task_id))]
  const { data: queueRows } = await supabase
    .from('v_workflow_queue')
    .select('id, step_type, step_name, round, case_number, customer_name, vehicle_make, vehicle_model, vehicle_year, vehicle_plate')
    .in('id', taskIds)

  const queueMap = new Map((queueRows ?? []).map(r => [r.id, r]))

  const enriched = events.map(ev => ({
    ...ev,
    task: queueMap.get(ev.task_id) ?? null,
  }))

  return <MobileHistory ctx={ctx} events={enriched} />
}
