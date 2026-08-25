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

  // Para tasks de inspeção: buscar step IDs do template para navegação do workflow
  let reworkStepId: string | undefined
  let nextInspectionStepId: string | undefined
  let assemblyStepId: string | undefined

  if (task.step_type === 'inspection') {
    // Busca o step atual para obter o template_id
    const { data: currentStep } = await supabase
      .from('workflow_steps')
      .select('id, template_id, step_type, sort_order')
      .eq('id', task.workflow_step_id)
      .single()

    if (currentStep?.template_id) {
      // Busca todos os steps ativos do template
      const { data: allSteps } = await supabase
        .from('workflow_steps')
        .select('id, step_type, sort_order')
        .eq('template_id', currentStep.template_id)
        .eq('is_active', true)
        .order('sort_order')

      if (allSteps) {
        // Encontra o step de repasse
        const reworkStep = allSteps.find(s => s.step_type === 'rework')
        reworkStepId = reworkStep?.id

        // Encontra o próximo step de inspeção (mesmo step ou posterior)
        const inspectionSteps = allSteps.filter(s => s.step_type === 'inspection')
        const nextInsp = inspectionSteps.find(s => s.sort_order >= currentStep.sort_order && s.id !== currentStep.id)
          ?? inspectionSteps.find(s => s.id === currentStep.id)
        nextInspectionStepId = nextInsp?.id

        // Encontra o step de montagem (para aprovação)
        const assemblyStep = allSteps.find(s => s.step_type === 'assembly')
        assemblyStepId = assemblyStep?.id
      }
    }
  }

  return (
    <MobileTaskDetail
      ctx={ctx}
      task={task}
      events={events}
      reworkStepId={reworkStepId}
      nextInspectionStepId={nextInspectionStepId}
      assemblyStepId={assemblyStepId}
    />
  )
}
