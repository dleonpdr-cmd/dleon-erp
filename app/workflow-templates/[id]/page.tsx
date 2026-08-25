import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { getWorkflowTemplate, getWorkflowSteps } from '@/app/api/workflow/actions'
import WorkflowTemplateShell from '@/components/workflow/WorkflowTemplateShell'

export default async function WorkflowTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [template, steps] = await Promise.all([
    getWorkflowTemplate(id),
    getWorkflowSteps(id),
  ])

  if (!template) redirect('/workflow-templates')

  return (
    <AppShell userEmail={user.email}>
      <WorkflowTemplateShell template={template} initialSteps={steps} />
    </AppShell>
  )
}
