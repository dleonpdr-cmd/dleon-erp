import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AdvanceStatusButton } from '@/components/cases/AdvanceStatusButton'

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: c } = await supabase.from('cases').select('*, customers(name, phone, email), vehicles(make, model, year, plate)').eq('id', id).single()
  if (!c) redirect('/cases')
  const { data: parts } = await supabase.from('vehicle_parts').select('*').eq('case_id', id)
  const { data: caseTechs } = await supabase.from('case_technicians').select('*, technicians(name, region)').eq('case_id', id)
  const statusOrder = ['draft','quoted','approved','in_progress','done','invoiced','received','paid']
  const statusLabel: any = { draft:'Rascunho', quoted:'Orçamento', approved:'Aprovado', in_progress:'Em execução', done:'Concluído', invoiced:'Faturado', received:'Recebido', paid:'Pago' }
  const statusColor: any = { draft:'#555', quoted:'#378ADD', approved:'#1D9E75', in_progress:'#FF6B00', done:'#1D9E75', invoiced:'#7F77DD', received:'#1D9E75', paid:'#888' }
  const currentIdx = statusOrder.indexOf(c.status)
  const nextStatus = statusOrder[currentIdx + 1] ?? null
  const nextLabel = nextStatus ? statusLabel[nextStatus] : null
  const card = { background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px', marginBottom: '12px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D'LEON</Link>
          <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
        </div>
        <span style={{ fontSize: '13px', color: '#555' }}>{user.email}</span>
      </div>
      <div style={{ maxWidth: '780px', margin: '32px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Link href="/cases" style={{ color: '#555', fontSize: '13px', textDecoration: 'none' }}>Casos</Link>
          <span style={{ color: '#333' }}>›</span>
          <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#FF6B00' }}>{c.case_number}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '500', fontFamily: 'monospace', color: '#FF6B00' }}>{c.case_number}</h1>
            <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{c.type === 'insurance' ? 'Seguro' : 'Particular'} · {c.region ?? '—'} · {new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '10px', background: `${statusColor[c.status]}20`, color: statusColor[c.status], fontWeight: '500' }}>{statusLabel[c.status]}</span>
            {nextStatus && <AdvanceStatusButton caseId={c.id} nextStatus={nextStatus} nextLabel={nextLabel} />}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div style={card}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '12px' }}>CLIENTE</div>
            <div style={{ fontSize: '11px', color: '#555' }}>Nome</div><div style={{ fontSize: '13px', fontWeight: '500' }}>{c.customers?.name ?? '—'}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '10px' }}>Telefone</div><div style={{ fontSize: '13px', fontWeight: '500' }}>{c.customers?.phone ?? '—'}</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '12px' }}>VEÍCULO</div>
            <div style={{ fontSize: '11px', color: '#555' }}>Modelo</div><div style={{ fontSize: '13px', fontWeight: '500' }}>{c.vehicles ? `${c.vehicles.make} ${c.vehicles.model} ${c.vehicles.year}` : '—'}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '10px' }}>Placa</div><div style={{ fontSize: '13px', fontWeight: '500' }}>{c.vehicles?.plate ?? '—'}</div>
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '12px' }}>TÉCNICOS</div>
          {caseTechs && caseTechs.length > 0 ? caseTechs.map((ct: any) => (
            <div key={ct.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1E1E1E' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#FF6B00' }}>
                {ct.technicians?.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: '500' }}>{ct.technicians?.name}</div><div style={{ fontSize: '11px', color: '#555' }}>{ct.technicians?.region}</div></div>
              <div style={{ fontSize: '12px', color: '#FF6B00' }}>{ct.split_pct}%</div>
            </div>
          )) : <div style={{ fontSize: '13px', color: '#555' }}>Nenhum técnico.</div>}
        </div>
        <div style={card}>
          <div style={{ fontSize: '12px', fontWeight: '500', color: '#555', marginBottom: '12px' }}>PEÇAS E AMASSADOS</div>
          {parts && parts.length > 0 ? parts.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1A1A1A', fontSize: '13px' }}>
              <span>{p.part_name}</span>
              <span style={{ color: '#888' }}>{p.dent_count.toLocaleString()} amassados</span>
              <span style={{ color: '#FF6B00' }}>¥{Number(p.subtotal).toLocaleString()}</span>
            </div>
          )) : <div style={{ fontSize: '13px', color: '#555' }}>Nenhuma peça.</div>}
          <div style={{ borderTop: '1px solid #2A2A2A', marginTop: '10px', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '4px' }}><span>Subtotal</span><span>¥{Number(c.quote_amount).toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '8px' }}><span>Imposto (10%)</span><span>¥{Number(c.tax_amount).toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '500', color: '#FF6B00' }}><span>Total</span><span>¥{Number(c.total_amount).toLocaleString()}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '16px', background: '#141414', borderRadius: '10px' }}>
          {statusOrder.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i <= currentIdx ? statusColor[c.status] : '#2A2A2A' }} />
              <span style={{ fontSize: '11px', color: i <= currentIdx ? '#F0EEE9' : '#333' }}>{statusLabel[s]}</span>
              {i < statusOrder.length - 1 && <span style={{ color: '#2A2A2A', marginLeft: '2px' }}>›</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
