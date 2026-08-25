import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { getWorkflowTemplates } from '@/app/api/workflow/actions'

export default async function WorkflowTemplatesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const templates = await getWorkflowTemplates()

  return (
    <AppShell userEmail={user.email}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>Templates de Workflow</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
            {templates.length} template(s) · Defina as etapas de cada tipo de operação
          </p>
        </div>
        <Link href="/workflow-templates/new" style={{
          background: '#FF6B00', color: '#fff', padding: '8px 18px',
          borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none',
        }}>
          + Novo template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div style={{
          background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px',
          padding: '48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔀</div>
          <div style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
            Nenhum template criado ainda
          </div>
          <p style={{ fontSize: '12px', color: '#444', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
            Templates definem o fluxo de etapas (Desmontagem → PDR → Inspeção → Montagem) que cada veículo percorre em uma operação.
          </p>
          <Link href="/workflow-templates/new" style={{
            display: 'inline-block', background: '#FF6B00', color: '#fff',
            padding: '8px 20px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none',
          }}>
            Criar primeiro template
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {templates.map(t => (
            <div key={t.id} style={{
              background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px',
              padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#F0EEE9', marginBottom: '4px' }}>
                  {t.name}
                </div>
                {t.description && (
                  <div style={{ fontSize: '12px', color: '#555' }}>{t.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                  background: t.is_active ? '#1D9E7522' : '#55555522',
                  color: t.is_active ? '#1D9E75' : '#555',
                  border: `1px solid ${t.is_active ? '#1D9E7544' : '#55555544'}`,
                }}>
                  {t.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <Link href={`/workflow-templates/${t.id}`} style={{
                  fontSize: '12px', color: '#FF6B00', textDecoration: 'none', fontWeight: '500',
                }}>
                  Editar →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
