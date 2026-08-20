import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer'

const NAVY = '#1B2744'
const CYAN = '#00B8CF'
const BORD = '#D1D5DB'
const LBKG = '#F5F6F7'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', padding: '40px 48px 56px' },
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },

  // Header
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 6 },
  titleUnder: { height: 2, backgroundColor: CYAN, width: 180, marginTop: 6 },
  metaText: { fontSize: 8, color: '#444', lineHeight: 1.8, textAlign: 'right' },

  // Customer
  customerName: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subjectText: { fontSize: 8, marginBottom: 2 },
  openingText: { fontSize: 7, color: '#555' },

  // Total box
  totalBox: { flexDirection: 'row', border: `1px solid ${NAVY}`, marginBottom: 6, marginTop: 12 },
  totalLabel: { backgroundColor: NAVY, color: '#fff', padding: '8px 12px', fontSize: 9, fontFamily: 'Helvetica-Bold', justifyContent: 'center', width: 130 },
  totalValue: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', padding: '6px 16px' },
  totalNumber: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  condText: { fontSize: 7, color: '#666', marginBottom: 16 },

  // Section header
  secHead: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 5 },

  // Table
  table: { marginBottom: 16 },
  thRow: { flexDirection: 'row', backgroundColor: NAVY },
  th: { color: '#fff', fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4px 6px', borderRight: '1px solid #2d3a5c' },
  tdRow: { flexDirection: 'row', borderBottom: `1px solid ${BORD}` },
  td: { fontSize: 8, padding: '4px 6px', borderRight: `1px solid ${BORD}` },
  tdBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', padding: '4px 6px', borderRight: `1px solid ${BORD}` },
  tdLabel: { fontSize: 8, padding: '4px 6px', backgroundColor: LBKG, borderRight: `1px solid ${BORD}`, width: 70 },

  // Totals
  totRow: { flexDirection: 'row', borderBottom: `1px solid ${BORD}` },
  totCell: { fontSize: 8, padding: '5px 8px' },
  totCellR: { fontSize: 8, padding: '5px 8px', textAlign: 'right' },
  grandRow: { flexDirection: 'row', backgroundColor: NAVY },
  grandCell: { color: '#fff', fontSize: 9, fontFamily: 'Helvetica-Bold', padding: '6px 8px' },
  grandCellR: { color: '#fff', fontSize: 12, fontFamily: 'Helvetica-Bold', padding: '4px 8px', textAlign: 'right' },

  // Issuer
  issuerTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  issuerText: { fontSize: 7.5, lineHeight: 1.8, color: '#333' },
  sealBox: { border: '1.5px solid #aaa', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  sealText: { fontSize: 14, color: '#aaa' },

  // Notes
  notesTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  notesBox: { border: `1px solid ${BORD}`, padding: '6px 10px', fontSize: 8, lineHeight: 1.8, color: '#333' },
})

const fmt = (n: number) => '¥' + n.toLocaleString('ja-JP')

type DocItem = {
  section: string
  part_label?: string
  description?: string
  dent_count: number
  subtotal: number
}

type Props = {
  doc: Record<string, any>
  items: DocItem[]
  customer: Record<string, any> | null
  vehicle: Record<string, any> | null
  meta: Record<string, string>
}

export default function EstimativaPDF({ doc, items, customer, vehicle, meta }: Props) {
  const pdr  = items.filter(it => it.section === 'pdr')
  const anc  = items.filter(it => it.section === 'ancillary')
  const trav = items.filter(it => it.section === 'travel')

  const sum = (arr: DocItem[]) => arr.reduce((s, it) => s + (it.subtotal || 0), 0)
  const pdrSub  = sum(pdr)
  const ancSub  = sum(anc)
  const travSub = sum(trav)
  const pdrDents = pdr.reduce((s, it) => s + (it.dent_count || 0), 0)
  const subtotal = pdrSub + ancSub + travSub
  const taxAmt   = Math.round(subtotal * 0.1)
  const total    = subtotal + taxAmt

  const today  = new Date()
  const wareki = `令和${today.getFullYear() - 2018}年${today.getMonth() + 1}月${today.getDate()}日`

  const vehicleRows = [
    { label: '車名',    value: vehicle ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() : '—' },
    { label: '型式',    value: meta.vehicle_model_code || '—' },
    { label: '登録番号', value: vehicle?.plate || '—' },
    { label: '車台番号', value: meta.vehicle_vin || '—' },
    { label: '初度登録', value: meta.vehicle_first_reg || (vehicle?.year ? `${vehicle.year}年` : '—') },
    { label: '走行距離', value: meta.vehicle_km && !isNaN(Number(meta.vehicle_km)) ? `${Number(meta.vehicle_km).toLocaleString('ja-JP')}km` : '—' },
    { label: '事故内容', value: meta.vehicle_accident || doc.subject || '—' },
  ]

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
          <View>
            <Text style={s.title}>御　見　積　書</Text>
            <View style={s.titleUnder} />
          </View>
          <View>
            <Text style={s.metaText}>見積番号: {doc.doc_number}</Text>
            <Text style={s.metaText}>発行日: {wareki}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={{ marginBottom: 10 }}>
          <Text style={s.customerName}>{customer?.name ?? '—'}　様</Text>
          <Text style={s.subjectText}>件名：{doc.subject || '—'}</Text>
          <Text style={s.openingText}>平素は格別のご高配を賜り、厚く御礼申し上げます。下記の通り御見積り申し上げます。</Text>
        </View>

        {/* Total box */}
        <View style={s.totalBox}>
          <View style={s.totalLabel}><Text>御見積金額（税込）</Text></View>
          <View style={s.totalValue}><Text style={s.totalNumber}>{fmt(total)}</Text></View>
        </View>
        <Text style={s.condText}>{doc.conditions}</Text>

        {/* Vehicle */}
        <Text style={s.secHead}>■ 御見積車両</Text>
        <View style={[s.table, { border: `1px solid ${BORD}` }]}>
          {vehicleRows.map(r => (
            <View key={r.label} style={[s.row, { borderBottom: `1px solid ${BORD}` }]}>
              <Text style={s.tdLabel}>{r.label}</Text>
              <Text style={[s.td, { flex: 1 }]}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* PDR */}
        {pdr.length > 0 && (
          <View style={s.table}>
            <Text style={s.secHead}>■ ① デントリペア（PDR）作業工賞</Text>
            <View style={[s.thRow, { border: `1px solid ${NAVY}` }]}>
              <Text style={[s.th, { flex: 2 }]}>部位</Text>
              <Text style={[s.th, { width: 50, textAlign: 'right' }]}>凹み数</Text>
              <Text style={[s.th, { width: 80, textAlign: 'right' }]}>金額（税抜）</Text>
              <Text style={[s.th, { width: 80, textAlign: 'right', borderRight: 0 }]}>金額（税込）</Text>
            </View>
            {pdr.map((it, i) => (
              <View key={i} style={[s.tdRow, { border: `1px solid ${BORD}`, borderTop: 0 }]}>
                <Text style={[s.td, { flex: 2 }]}>{it.part_label || it.description || '—'}</Text>
                <Text style={[s.td, { width: 50, textAlign: 'right' }]}>{it.dent_count}発</Text>
                <Text style={[s.td, { width: 80, textAlign: 'right' }]}>{fmt(it.subtotal)}</Text>
                <Text style={[s.td, { width: 80, textAlign: 'right', borderRight: 0 }]}>{fmt(Math.round(it.subtotal * 1.1))}</Text>
              </View>
            ))}
            <View style={[s.tdRow, { border: `1px solid ${BORD}`, borderTop: 0 }]}>
              <Text style={[s.tdBold, { flex: 2 }]}>PDR作業工賞 小計</Text>
              <Text style={[s.tdBold, { width: 50, textAlign: 'right' }]}>{pdrDents}発</Text>
              <Text style={[s.tdBold, { width: 80, textAlign: 'right' }]}>{fmt(pdrSub)}</Text>
              <Text style={[s.tdBold, { width: 80, textAlign: 'right', borderRight: 0 }]}>{fmt(Math.round(pdrSub * 1.1))}</Text>
            </View>
          </View>
        )}

        {/* Ancillary */}
        {anc.length > 0 && (
          <View style={s.table}>
            <Text style={s.secHead}>■ ② 付帯費用</Text>
            <View style={[s.thRow, { border: `1px solid ${NAVY}` }]}>
              <Text style={[s.th, { flex: 2 }]}>項目</Text>
              <Text style={[s.th, { width: 90, textAlign: 'right' }]}>金額（税抜）</Text>
              <Text style={[s.th, { width: 90, textAlign: 'right', borderRight: 0 }]}>金額（税込）</Text>
            </View>
            {anc.map((it, i) => (
              <View key={i} style={[s.tdRow, { border: `1px solid ${BORD}`, borderTop: 0 }]}>
                <Text style={[s.td, { flex: 2 }]}>{it.description || it.part_label || '—'}</Text>
                <Text style={[s.td, { width: 90, textAlign: 'right' }]}>{fmt(it.subtotal)}</Text>
                <Text style={[s.td, { width: 90, textAlign: 'right', borderRight: 0 }]}>{fmt(Math.round(it.subtotal * 1.1))}</Text>
              </View>
            ))}
            <View style={[s.tdRow, { border: `1px solid ${BORD}`, borderTop: 0 }]}>
              <Text style={[s.tdBold, { flex: 2 }]}>小計</Text>
              <Text style={[s.tdBold, { width: 90, textAlign: 'right' }]}>{fmt(ancSub)}</Text>
              <Text style={[s.tdBold, { width: 90, textAlign: 'right', borderRight: 0 }]}>{fmt(Math.round(ancSub * 1.1))}</Text>
            </View>
          </View>
        )}

        {/* Travel */}
        {trav.length > 0 && (
          <View style={s.table}>
            <Text style={s.secHead}>■ ③ 遠方対応費</Text>
            <View style={[s.thRow, { border: `1px solid ${NAVY}` }]}>
              <Text style={[s.th, { flex: 2 }]}>項目</Text>
              <Text style={[s.th, { width: 90, textAlign: 'right' }]}>金額（税抜）</Text>
              <Text style={[s.th, { width: 90, textAlign: 'right', borderRight: 0 }]}>金額（税込）</Text>
            </View>
            {trav.map((it, i) => (
              <View key={i} style={[s.tdRow, { border: `1px solid ${BORD}`, borderTop: 0 }]}>
                <Text style={[s.td, { flex: 2 }]}>{it.description || it.part_label || '—'}</Text>
                <Text style={[s.td, { width: 90, textAlign: 'right' }]}>{fmt(it.subtotal)}</Text>
                <Text style={[s.td, { width: 90, textAlign: 'right', borderRight: 0 }]}>{fmt(Math.round(it.subtotal * 1.1))}</Text>
              </View>
            ))}
            <View style={[s.tdRow, { border: `1px solid ${BORD}`, borderTop: 0 }]}>
              <Text style={[s.tdBold, { flex: 2 }]}>小計</Text>
              <Text style={[s.tdBold, { width: 90, textAlign: 'right' }]}>{fmt(travSub)}</Text>
              <Text style={[s.tdBold, { width: 90, textAlign: 'right', borderRight: 0 }]}>{fmt(Math.round(travSub * 1.1))}</Text>
            </View>
          </View>
        )}

        {/* Grand total */}
        <Text style={s.secHead}>■ 御見積合計</Text>
        <View style={{ border: `1px solid ${BORD}`, marginBottom: 20 }}>
          <View style={s.totRow}>
            <Text style={[s.totCell, { flex: 1 }]}>税抜合計</Text>
            <Text style={[s.totCellR, { width: 100 }]}>{fmt(subtotal)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={[s.totCell, { flex: 1 }]}>消費税（10%）</Text>
            <Text style={[s.totCellR, { width: 100 }]}>{fmt(taxAmt)}</Text>
          </View>
          <View style={s.grandRow}>
            <Text style={[s.grandCell, { flex: 1 }]}>合計（税込）</Text>
            <Text style={[s.grandCellR, { width: 100 }]}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Issuer */}
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 20 }]}>
          <View>
            <Text style={s.issuerTitle}>【発行者】</Text>
            <Text style={s.issuerText}>D'LEON</Text>
            <Text style={s.issuerText}>登録番号：T5810906411674</Text>
            <Text style={s.issuerText}>担当者：BARROS LEON GABRIEL</Text>
            <Text style={s.issuerText}>連絡先：080-1586-0585（LEON KAMILA）</Text>
          </View>
          <View style={s.sealBox}>
            <Text style={s.sealText}>印</Text>
          </View>
        </View>

        {/* Notes */}
        {doc.notes ? (
          <View>
            <Text style={s.notesTitle}>【備考】</Text>
            <View style={s.notesBox}>
              <Text>{doc.notes}</Text>
            </View>
          </View>
        ) : null}

      </Page>
    </Document>
  )
}
