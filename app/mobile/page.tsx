import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveCurrentTechnician, getMyOperations } from '@/app/api/roles/actions'
import { getOperationQueue } from '@/app/api/workflow/actions'
import MobileSetup from '@/components/mobile/MobileSetup'
import MobileHomePDR from '@/components/mobile/MobileHomePDR'

export default async function MobilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolver contexto do técnico atual
  const ctx = await resolveCurrentTechnician()

  // Sem contexto → mostrar tela de seleção
  if (!ctx) {
    const myOps = await getMyOperations()
    return (
      <MobileSetup
        userEmail={user.email ?? ''}
        myOperations={myOps}
      />
    )
  }

  // Com contexto → carregar fila da operação
  const queue = await getOperationQueue(ctx.operationId)

  // Filtrar por função ativa
  const ROLE_STEP_TYPES: Record<string, string[]> = {
    pdr_tech:   ['repair', 'rework'],
    inspector:  ['inspection'],
    assembler:  ['disassembly', 'assembly'],
    supervisor: [], // vê tudo
    financial:  [],
    admin:      [],
  }
  const myStepTypes = ROLE_STEP_TYPES[ctx.activeRole] ?? []
  const myTasks = myStepTypes.length > 0
    ? queue.filter(t => myStepTypes.includes(t.step_type))
    : queue

  // Tarefa em andamento
  const currentTask = myTasks.find(t => t.status === 'in_progress')
  // Fila (queued)
  const queuedTasks = myTasks.filter(t => t.status === 'queued')

  // Tarefas aguardando outras equipes (inspection/assembly do mesmo técnico, queued)
  const waitingTasks = queue.filter(t =>
    ['inspection', 'assembly'].includes(t.step_type) &&
    t.status === 'queued'
  )

  // Home por função
  if (ctx.activeRole === 'pdr_tech') {
    return (
      <MobileHomePDR
        ctx={ctx}
        currentTask={currentTask ?? null}
        queuedTasks={queuedTasks}
        waitingTasks={waitingTasks}
      />
    )
  }

  // Fallback para outras funções (inspector, assembler, etc.) — redirecionar para fila
  redirect(`/mobile/queue?role=${ctx.activeRole}&op=${ctx.operationId}`)
}
