import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { getOperation } from '@/app/api/operations/actions'
import {
  getOperationQueue,
  getOperationStepCounts,
  getWorkflowSteps,
} from '@/app/api/workflow/actions'
import OperationQueueShell from '@/components/workflow/OperationQueueShell'

export default async function OperationQueuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const op = await getOperation(id)
  if (!op) notFound()

  // Busca steps do template atribuído (para o botão "Iniciar workflow" e para avançar etapas)
  const [queue, stepCounts, templateSteps] = await Promise.all([
    getOperationQueue(id),
    getOperationStepCounts(id),
    op.workflow_template_id
      ? getWorkflowSteps(op.workflow_template_id)
      : Promise.resolve([]),
  ])

  // Busca técnicos para atribuição
  const { data: technicians } = await supabase
    .from('technicians')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <AppShell userEmail={user.email}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555', marginBottom: '20px' }}>
        <Link href="/operations" style={{ color: '#555', textDecoration: 'none' }}>Operações</Link>
        <span>›</span>
        <Link href={`/operations/${id}`} style={{ color: '#555', textDecoration: 'none' }}>{op.name}</Link>
        <span>›</span>
        <span style={{ color: '#F0EEE9' }}>Fila</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>Fila — {op.name}</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
            {queue.length} tarefa(s) ativa(s)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/operations/${id}`} style={{
            height: '34px', padding: '0 14px', background: '#1A1A1A', border: '1px solid #2A2A2A',
            borderRadius: '6px', color: '#888', fontSize: '12px', display: 'inline-flex',
            alignItems: 'center', textDecoration: 'none',
          }}>
            ← Operação
          </Link>
        </div>
      </div>

      <OperationQueueShell
        operationId={id}
        operationName={op.name}
        initialQueue={queue}
        stepCounts={stepCounts}
        templateSteps={templateSteps}
        templateId={op.workflow_template_id}
        technicians={technicians ?? []}
      />
    </AppShell>
  )
}
