'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { salvarRascunhoAction, emitirEstimativaAction } from '@/app/api/estimativas/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocItem = {
  id?: string
  section: 'pdr' | 'ancillary' | 'travel'
  item_type?: string
  part_id?: string
  part_label?: string
  description?: string
  dent_count: number
  unit_price: number
  subtotal: number
  source_type?: string
  original_price?: number
  notes?: string
}

type Props = {
  doc: any
  items: DocItem[]
  customer: any
  vehicle: any
  caso: any
  meta: Record<string, string>
}

// ─── A4 Preview ───────────────────────────────────────────────────────────────

function A4Preview({ doc, items, subject, notes, conditions, customer, vehicle, meta }: {
  doc: any
  items: DocItem[]
  subject: string
  notes: string
  conditions: string
  customer: any
  vehicle: any
  meta: Record<string, string>
}) {
  const NAVY = '#1B2744'
  const CYAN = '#00B8CF'
  const BORD = '#D1D5DB'
  const LBKG = '#F5F6F7'

  const pdr  = items.filter(it => it.section === 'pdr')
  const anc  = items.filter(it => it.section === 'ancillary')
  const trav = items.filter(it => it.section === 'travel')

  const sumS     = (arr: DocItem[]) => arr.reduce((s, it) => s + (it.subtotal || 0), 0)
  const pdrSub   = sumS(pdr)
  const ancSub   = sumS(anc)
  const travSub  = sumS(trav)
  const pdrDents = pdr.reduce((s, it) => s + (it.dent_count || 0), 0)
  const subtotal = pdrSub + ancSub + travSub
  const taxAmt   = Math.round(subtotal * 0.1)
  const total    = subtotal + taxAmt

  const fmt = (n: number) => '¥' + n.toLocaleString('ja-JP')

  const today  = new Date()
  const wareki = `令和${today.getFullYear() - 2018}年${today.getMonth() + 1}月${today.getDate()}日`

  const TH: React.CSSProperties = {
    border: `1px solid ${NAVY}`, padding: '5px 8px',
    background: NAVY, color: '#fff', fontSize: '9px', fontWeight: '600',
  }
  const TD: React.CSSProperties  = { border: `1px solid ${BORD}`, padding: '5px 8px', fontSize: '9px' }
  const TDR: React.CSSProperties = { ...TD, textAlign: 'right' }
  const TDB: React.CSSProperties = { ...TD, fontWeight: '700' }
  const TDBR: React.CSSProperties = { ...TDR, fontWeight: '700' }

  const vehicleRows = [
    { label: '車名',    value: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() : '—' },
    { label: '型式',    value: meta.vehicle_model_code || '—' },
    { label: '登録番号', value: vehicle?.plate || '—' },
    { label: '車台番号', value: meta.vehicle_vin || '—' },
    { label: '初度登録', value: meta.vehicle_first_reg || (vehicle?.year ? `${vehicle.year}年` : '—') },
    { label: '走行距離', value: meta.vehicle_km ? `細4${Number(meta.vehicle_km).toLocaleString('ja-JP')}km` : '—' },
    { label: '事故内容', value: meta.vehicle_accident || subject || '—' },
  ]

  const SecHead = ({ num, title }: { num: string; title: string }) => (
    <div style={{ fontSize: '10px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>
      {'■'} {num} {title}
    </div>
  )

  const AncTable = ({ rows, sub }: { rows: DocItem[]; sub: number }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...TH, textAlign: 'left', width: '60%' }}>{'項目'}</th>
          <th style={{ ...TH, width: '20%', textAlign: 'right' }}>{'金額（税抜）'}</th>
          <th style={{ ...TH, width: '20%', textAlign: 'right' }}>{'金額（税込）'}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((it, i) => (
          <tr key={i}>
            <td style={TD}>{it.description || it.part_label || '—'}</td>
            <td style={TDR}>{fmt(it.subtotal)}</td>
            <td style={TDR}>{fmt(Math.round(it.subtotal * 1.1))}</td>
          </tr>
        ))}
        <tr>
          <td style={TDB}>{'小計'}</td>
          <td style={TDBR}>{fmt(sub)}</td>
          <td style={TDBR}>{fmt(Math.round(sub * 1.1))}</td>
        </tr>
      </tbody>
    </table>
  )

  return (
    <div
      id="a4-preview"
      style={{
        width: '794px', minHeight: '1123px', background: '#fff',
        padding: '48px 56px 64px',
        fontFamily: '"Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif',
        fontSize: '10px', color: '#1a1a1a', boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '30px', letterSpacing: '14px', color: NAVY, fontWeight: '700', margin: 0, lineHeight: 1 }}>
            {'御 見 積 書'}
          </h1>
          <div style={{ height: '2.5px', background: CYAN, marginTop: '8px', width: '230px' }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: '9px', lineHeight: 2, color: '#444', marginTop: '4px' }}>
          <div>{'見積番号'}: {doc.doc_number}</div>
          <div>{'発行日'}: {wareki}</div>
        </div>
      </div>

      {/* Customer */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '5px' }}>
          {customer?.name ?? '—'} {'様'}
        </div>
        <div style={{ fontSize: '9px', marginBottom: '3px' }}>{'件名：'}{subject || '—'}</div>
        <div style={{ fontSize: '8px', color: '#555' }}>
          {'平素は格別のご高配を赐り、厚く御礼申し上げます。下記の通り御見積り申し上げます。'}
        </div>
      </div>

      {/* Total box */}
      <div style={{ display: 'flex', border: `1px solid ${NAVY}`, marginBottom: '7px' }}>
        <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', minWidth: '165px' }}>
          {'御見積金額（税込）'}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '6px 20px' }}>
          <span style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '1px' }}>
            {'¥'}{total.toLocaleString('ja-JP')}
          </span>
        </div>
      </div>
      <div style={{ fontSize: '8px', color: '#666', marginBottom: '22px' }}>{conditions}</div>

      {/* Vehicle */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>
          {'■ 御見積車両'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {vehicleRows.map(row => (
              <tr key={row.label}>
                <td style={{ ...TD, width: '88px', background: LBKG, fontWeight: '500' }}>{row.label}</td>
                <td style={TD}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PDR items */}
      {pdr.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <SecHead num={'①'} title={'デントリペア（PDR）作業工賞'} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left', width: '36%' }}>{'部位'}</th>
                <th style={{ ...TH, width: '14%', textAlign: 'right' }}>{'凹み数'}</th>
                <th style={{ ...TH, width: '25%', textAlign: 'right' }}>{'金額（税抜）'}</th>
                <th style={{ ...TH, width: '25%', textAlign: 'right' }}>{'金額（税込）'}</th>
              </tr>
            </thead>
            <tbody>
              {pdr.map((it, i) => (
                <tr key={i}>
                  <td style={TD}>{it.part_label || it.description || '—'}</td>
                  <td style={TDR}>{it.dent_count}{'発'}</td>
                  <td style={TDR}>{fmt(it.subtotal)}</td>
                  <td style={TDR}>{fmt(Math.round(it.subtotal * 1.1))}</td>
                </tr>
              ))}
              <tr>
                <td style={TDB}>PDR{'作業工賞 小計'}</td>
                <td style={TDBR}>{pdrDents}{'発'}</td>
                <td style={TDBR}>{fmt(pdrSub)}</td>
                <td style={TDBR}>{fmt(Math.round(pdrSub * 1.1))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Ancillary */}
      {anc.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <SecHead num={'②'} title={'付帯費用'} />
          <AncTable rows={anc} sub={ancSub} />
        </div>
      )}

      {/* Travel */}
      {trav.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <SecHead num={'③'} title={'遠方対応費'} />
          <AncTable rows={trav} sub={travSub} />
        </div>
      )}

      {/* Grand total */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: NAVY, marginBottom: '6px' }}>
          {'■ 御見積合計'}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...TD, width: '60%' }}>{'税抜合計'}</td>
              <td style={TDR}>{fmt(subtotal)}</td>
            </tr>
            <tr>
              <td style={TD}>{'消費税（10%）'}</td>
              <td style={TDR}>{fmt(taxAmt)}</td>
            </tr>
            <tr>
              <td style={{ border: `1px solid ${NAVY}`, padding: '8px', background: NAVY, color: '#fff', fontWeight: '700', fontSize: '10px' }}>
                {'合計（税込）'}
              </td>
              <td style={{ border: `1px solid ${NAVY}`, padding: '8px', background: NAVY, color: '#fff', fontWeight: '700', fontSize: '14px', textAlign: 'right' }}>
                {fmt(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Issuer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ fontSize: '9px', lineHeight: 1.9 }}>
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>{'【発行者】'}</div>
          <div>D&apos;LEON</div>
          <div>{'登録番号：T5810906411674'}</div>
          <div>{'担当者：BARROS LEON GABRIEL'}</div>
          <div>{'連絡先：080-1586-0585（LEON KAMILA）'}</div>
          <div style={{ color: '#999', fontSize: '8px' }}>{'（住所・社印は正式版にて追記いたします）'}</div>
        </div>
        <div style={{ border: '1.5px solid #aaa', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#aaa', flexShrink: 0 }}>
          {'印'}
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div>
          <div style={{ fontWeight: '700', fontSize: '9px', marginBottom: '6px' }}>{'【備考】'}</div>
          <div style={{ border: `1px solid ${BORD}`, padding: '8px 12px', fontSize: '9px', lineHeight: 1.9, color: '#333' }}>
            {notes.split('\n').map((line, i) => (
              <div key={i}>{line || ' '}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Editor helpers ────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '6px',
  padding: '8px 10px', color: '#F0EEE9', fontSize: '12px', width: '100%',
  boxSizing: 'border-box', outline: 'none',
}
const LBL: React.CSSProperties = {
  fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block',
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export default function EstimativaShell({ doc, items: initItems, customer, vehicle, meta: initMeta }: Props) {
  const [subject,    setSubject]    = useState<string>(doc.subject ?? '')
  const [notes,      setNotes]      = useState<string>(doc.notes ?? '')
  const [conditions, setConditions] = useState<string>(doc.conditions ?? '有効期限：発行日よら30日間 ／ 納期：ご協議の上決定')
  const [items,      setItems]      = useState<DocItem[]>(initItems)
  const [meta,       setMeta]       = useState<Record<string, string>>(initMeta)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [docStatus,  setDocStatus]  = useState<string>(doc.doc_status)
  const [emitting,   setEmitting]   = useState(false)
  const [msg,        setMsg]        = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDraft = docStatus === 'draft'

  const doSave = useCallback(async (
    s: string, n: string, c: string, its: DocItem[], m: Record<string, string>
  ) => {
    setSaveStatus('saving')
    const res = await salvarRascunhoAction(doc.id, {
      subject: s, notes: n, conditions: c, items: its, ...m,
    })
    setSaveStatus(res.error ? 'error' : 'saved')
  }, [doc.id])

  useEffect(() => {
    if (!isDraft) return
    setSaveStatus('unsaved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doSave(subject, notes, conditions, items, meta), 2500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [subject, notes, conditions, items, meta, isDraft, doSave])

  function updateItem(idx: number, field: keyof DocItem, val: any) {
    setItems(prev => {
      const next = [...prev]
      const it: any = { ...next[idx], [field]: val }
      if (field === 'unit_price' || field === 'subtotal') it.subtotal = Number(val) || 0
      next[idx] = it as DocItem
      return next
    })
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function addItem(section: DocItem['section']) {
    setItems(prev => [...prev, {
      section,
      item_type: section === 'pdr' ? 'pdr_repair' : 'manual',
      part_label: '', description: '', dent_count: 0,
      unit_price: 0, subtotal: 0, source_type: 'manual',
    }])
  }

  async function handleEmit() {
    setEmitting(true); setMsg('')
    const res = await emitirEstimativaAction(doc.id)
    setEmitting(false)
    if (res.error) { setMsg('Erro: ' + res.error); return }
    setDocStatus('issued'); setMsg('発行しました！')
  }

  const subtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0)
  const taxAmt   = Math.round(subtotal * 0.1)
  const total    = subtotal + taxAmt
  const fmt      = (n: number) => '¥' + n.toLocaleString('ja-JP')

  const pdrItems  = items.filter(it => it.section === 'pdr')
  const ancItems  = items.filter(it => it.section === 'ancillary')
  const travItems = items.filter(it => it.section === 'travel')

  const statusColor: Record<string, string> = { draft: '#888', issued: '#1D9E75', cancelled: '#ef4444' }
  const statusLabel: Record<string, string> = { draft: 'RASCUNHO', issued: '発行済み', cancelled: 'Cancelado' }
  const saveLabel = { saved: 'Salvo ✓', saving: 'Salvando...', unsaved: 'Não salvo', error: 'Erro ao salvar' }[saveStatus]

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #1E1E1E' }}>
        {title}
      </div>
      {children}
    </div>
  )

  const AddBtn = ({ label, section }: { label: string; section: DocItem['section'] }) => (
    <button
      onClick={() => addItem(section)}
      style={{ width: '100%', marginTop: '6px', background: '#141414', border: '1px dashed #2A2A2A', color: '#666', borderRadius: '6px', padding: '6px', fontSize: '11px', cursor: 'pointer' }}
    >
      + {label}
    </button>
  )

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #dleon-print { display: block !important; }
          #a4-preview { box-shadow: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Hidden print target */}
      <div id="dleon-print" style={{ display: 'none' }}>
        <A4Preview doc={doc} items={items} subject={subject} notes={notes} conditions={conditions} customer={customer} vehicle={vehicle} meta={meta} />
      </div>

      <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ borderBottom: '1px solid #2A2A2A', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, background: '#0A0A0A', zIndex: 10 }}>
          <Link href={doc.case_id ? `/cases/${doc.case_id}` : '/cases'} style={{ color: '#555', textDecoration: 'none', fontSize: '13px' }}>&larr; {'案件'}</Link>
          <span style={{ color: '#2A2A2A' }}>|</span>
          <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#FF6B00' }}>{doc.doc_number}</span>
          <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '10px', background: `${statusColor[docStatus]}22`, color: statusColor[docStatus] }}>
            {statusLabel[docStatus]}
          </span>
          <span style={{ fontSize: '11px', color: saveStatus === 'error' ? '#ef4444' : '#555' }}>{saveLabel}</span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {msg && <span style={{ fontSize: '12px', color: msg.startsWith('Erro') ? '#ef4444' : '#22c55e' }}>{msg}</span>}
            <button
              onClick={() => window.print()}
              style={{ background: '#1A1A1A', color: '#CCC', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}
            >
              {'🖨'} PDF / {'印刷'}
            </button>
            {isDraft && (
              <button
                onClick={handleEmit}
                disabled={emitting || total === 0}
                style={{ background: '#FF6B00', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 18px', fontSize: '12px', fontWeight: '600', cursor: emitting || total === 0 ? 'not-allowed' : 'pointer', opacity: emitting || total === 0 ? 0.5 : 1 }}
              >
                {emitting ? '発行中...' : '発行する'}
              </button>
            )}
          </div>
        </div>

        {/* Split layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Editor */}
          <div style={{ borderRight: '1px solid #2A2A2A', overflowY: 'auto', padding: '24px 20px' }}>

            {/* Summary */}
            <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{'御見積合計（税込）'}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#FF6B00' }}>{fmt(total)}</div>
              <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>{'税抜'} {fmt(subtotal)} / {'消費税'} {fmt(taxAmt)}</div>
            </div>

            <Section title={'基本情報'}>
              <label style={LBL}>{'件名'}</label>
              <input style={{ ...INPUT, marginBottom: '10px' }} value={subject} onChange={e => setSubject(e.target.value)} disabled={!isDraft} placeholder={'例：雹害修理費用 御見積'} />
              <label style={LBL}>{'条件'}</label>
              <input style={INPUT} value={conditions} onChange={e => setConditions(e.target.value)} disabled={!isDraft} />
            </Section>

            <Section title={'車両情報（追加）'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { key: 'vehicle_km',         label: '走行距離 (km)' },
                  { key: 'vehicle_model_code',  label: '型式' },
                  { key: 'vehicle_vin',         label: '車台番号' },
                  { key: 'vehicle_first_reg',   label: '初度登録' },
                  { key: 'vehicle_accident',    label: '事故内容' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={LBL}>{f.label}</label>
                    <input
                      style={INPUT}
                      value={meta[f.key] ?? ''}
                      onChange={e => setMeta(prev => ({ ...prev, [f.key]: e.target.value }))}
                      disabled={!isDraft}
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section title={'① PDR 作業工賞'}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 20px', gap: '4px', marginBottom: '6px', padding: '0 2px' }}>
                <span style={{ fontSize: '10px', color: '#555' }}>{'部位'}</span>
                <span style={{ fontSize: '10px', color: '#555', textAlign: 'center' }}>{'発'}</span>
                <span style={{ fontSize: '10px', color: '#555', textAlign: 'right' }}>{'税抜金額'}</span>
                <span />
              </div>
              {pdrItems.map((it, i) => {
                const gi = items.indexOf(it)
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 20px', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                    <input style={{ ...INPUT, padding: '5px 8px', fontSize: '11px' }} value={it.part_label || ''} onChange={e => updateItem(gi, 'part_label', e.target.value)} disabled={!isDraft} placeholder={'部位名'} />
                    <input style={{ ...INPUT, padding: '5px 8px', fontSize: '11px', textAlign: 'center' }} type="number" value={it.dent_count || ''} onChange={e => updateItem(gi, 'dent_count', parseInt(e.target.value) || 0)} disabled={!isDraft} placeholder="0" />
                    <input style={{ ...INPUT, padding: '5px 8px', fontSize: '11px', textAlign: 'right' }} type="number" value={it.subtotal || ''} onChange={e => updateItem(gi, 'subtotal', parseInt(e.target.value) || 0)} disabled={!isDraft} placeholder="0" />
                    {isDraft && <button onClick={() => removeItem(gi)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px', padding: 0 }}>&times;</button>}
                  </div>
                )
              })}
              {isDraft && <AddBtn label={'行を追加'} section="pdr" />}
            </Section>

            <Section title={'② 付帯費用'}>
              {ancItems.map((it, i) => {
                const gi = items.indexOf(it)
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 20px', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                    <input style={{ ...INPUT, padding: '5px 8px', fontSize: '11px' }} value={it.description || ''} onChange={e => updateItem(gi, 'description', e.target.value)} disabled={!isDraft} placeholder={'項目名'} />
                    <input style={{ ...INPUT, padding: '5px 8px', fontSize: '11px', textAlign: 'right' }} type="number" value={it.subtotal || ''} onChange={e => updateItem(gi, 'subtotal', parseInt(e.target.value) || 0)} disabled={!isDraft} placeholder="0" />
                    {isDraft && <button onClick={() => removeItem(gi)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px', padding: 0 }}>&times;</button>}
                  </div>
                )
              })}
              {isDraft && <AddBtn label={'付帯費用を追加'} section="ancillary" />}
            </Section>

            <Section title={'③ 遠方対応賞'}>
              {travItems.map((it, i) => {
                const gi = items.indexOf(it)
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 20px', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                    <input style={{ ...INPUT, padding: '5px 8px', fontSize: '11px' }} value={it.description || ''} onChange={e => updateItem(gi, 'description', e.target.value)} disabled={!isDraft} placeholder={'項目名'} />
                    <input style={{ ...INPUT, padding: '5px 8px', fontSize: '11px', textAlign: 'right' }} type="number" value={it.subtotal || ''} onChange={e => updateItem(gi, 'subtotal', parseInt(e.target.value) || 0)} disabled={!isDraft} placeholder="0" />
                    {isDraft && <button onClick={() => removeItem(gi)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px', padding: 0 }}>&times;</button>}
                  </div>
                )
              })}
              {isDraft && <AddBtn label={'遠方対応賞を追加'} section="travel" />}
            </Section>

            <Section title={'備考'}>
              <textarea
                style={{ ...INPUT, height: '100px', resize: 'vertical' } as React.CSSProperties}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={!isDraft}
                placeholder={'1. 備考を入力してください\n2. 複数行対応です'}
              />
            </Section>
          </div>

          {/* Preview */}
          <div style={{ overflowY: 'auto', background: '#2C2C2E', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center', width: '794px', marginBottom: '-310px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
              <A4Preview doc={doc} items={items} subject={subject} notes={notes} conditions={conditions} customer={customer} vehicle={vehicle} meta={meta} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
