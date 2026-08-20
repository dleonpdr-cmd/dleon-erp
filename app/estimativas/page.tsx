import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

export default async function EstimativasPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: docs } = await supabase
    .from('documents')
    .select('*, customers(name), vehicles(make, model), cases(case_number)')
    .eq('doc_type', 'estimate')
    .order('created_at', { ascending: false })

  const statusColor: Record<string, string> = {
    draft: '#888', issued: '#1D9E75', cancelled: '#ef4444',
  }
  const statusLabel: Record<string, string> = {
    draft: 'Rascunho', issued: '発行済み', cancelled: 'Cancelado',
  }

  return (
    <AppShell userEmail={user.email}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500' }}>見積書</h1>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{docs?.length ?? 0} documento(s)</p>
        </div>
      </div>

      <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 90px 90px 80px', padding: '10px 16px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A' }}>
          {['番号', 'Cliente', 'Caso', 'Total', 'Status', 'Data'].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: '500', color: '#555' }}>{h}</span>
          ))}
        </div>

        {docs && docs.length > 0 ? docs.map((d: any) => (
          <Link
            key={d.id}
            href={`/estimativas/${d.id}`}
            style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 90px 90px 80px',
              padding: '12px 16px', borderBottom: '1px solid #1A1A1A',
              alignItems: 'center', textDecoration: 'none', color: 'inherit',
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#FF6B00' }}>{d.doc_number}</div>
            <div style={{ fontSize: '13px' }}>{d.customers?.name ?? '—'}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#555' }}>{d.cases?.case_number ?? '—'}</div>
            <div style={{ fontSize: '13px', color: '#FF6B00', fontWeight: '500' }}>
              ¥{Number(d.total_amount).toLocaleString('ja-JP')}
            </div>
            <div>
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '10px',
                background: `${statusColor[d.doc_status] ?? '#888'}22`,
                color: statusColor[d.doc_status] ?? '#888',
              }}>
                {statusLabel[d.doc_status] ?? d.doc_status}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>
              {new Date(d.created_at).toLocaleDateString('pt-BR')}
            </div>
          </Link>
        )) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: '13px' }}>
            Nenhuma 見積書 criada ainda.
          </div>
        )}
      </div>
    </AppShell>
  )
}
