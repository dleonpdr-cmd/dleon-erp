'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import AppShell from '@/components/AppShell'

const PECAS_LABELS: Record<string, string> = {
  roof:            'ルーフ (Teto)',
  front_fender_rh: 'フロントフェンダー RH',
  front_fender_lh: 'フロントフェンダー LH',
  front_door_rh:   'フロントドア RH',
  front_door_lh:   'フロントドア LH',
  pillar_rh:       'ピラー RH',
  pillar_lh:       'ピラー LH',
  rear_door_rh:    'リヤドア RH',
  rear_door_lh:    'リヤドア LH',
  quarter_rh:      'クォーターパネル RH',
  quarter_lh:      'クォーターパネル LH',
  front_bumper:    'フロントバンパー',
  hood:            'フード (Capô)',
  trunk:           'トランク',
  rear_bumper:     'リヤバンパー',
}

const NIVEIS = ['Leve', 'Médio', 'Grave'] as const
type Precos = Record<string, Record<string, number>>

export default function PrecosPage() {
  const [precos, setPrecos]     = useState<Precos>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from('tabela_precos').select('*')
      if (!data) return
      const rec: Precos = {}
      data.forEach((r: any) => {
        if (!rec[r.peca_id]) rec[r.peca_id] = {}
        rec[r.peca_id][r.nivel] = r.valor
      })
      setPrecos(rec)
    }
    carregar()
  }, [])

  function atualizar(peca: string, nivel: string, valor: string) {
    setPrecos(prev => ({
      ...prev,
      [peca]: { ...prev[peca], [nivel]: parseInt(valor) || 0 },
    }))
  }

  async function salvar() {
    setSalvando(true)
    setMsg('')
    const rows: any[] = []
    Object.entries(precos).forEach(([peca_id, niveis]) => {
      Object.entries(niveis).forEach(([nivel, valor]) => {
        rows.push({ peca_id, nivel, valor })
      })
    })
    const { error } = await supabase
      .from('tabela_precos')
      .upsert(rows, { onConflict: 'peca_id,nivel' })
    setSalvando(false)
    setMsg(error ? 'Erro: ' + error.message : 'Tabela salva com sucesso!')
  }

  const inputStyle: React.CSSProperties = {
    width: '88px',
    background: '#1A1A1A',
    border: '1px solid #2A2A2A',
    borderRadius: '6px',
    padding: '6px 8px',
    color: '#F0EEE9',
    fontSize: '13px',
    textAlign: 'right',
    outline: 'none',
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Tabela de Preços PDR</h1>
          <p style={{ color: '#666', fontSize: '13px', margin: '4px 0 0' }}>Valores em ¥ — editáveis pelo administrador</p>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          style={{ background: '#FF6B00', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.6 : 1 }}
        >
          {salvando ? 'Salvando...' : 'Salvar tabela'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '12px 16px', background: msg.startsWith('Erro') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: '1px solid ' + (msg.startsWith('Erro') ? '#ef4444' : '#22c55e'), borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: msg.startsWith('Erro') ? '#ef4444' : '#22c55e' }}>
          {msg}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
            <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#666', fontWeight: '500' }}>Peça</th>
            {NIVEIS.map(n => (
              <th key={n} style={{ textAlign: 'center', padding: '10px 12px', fontSize: '12px', color: '#666', fontWeight: '500' }}>{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(PECAS_LABELS).map((peca, i) => (
            <tr key={peca} style={{ borderBottom: '1px solid #161616', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
              <td style={{ padding: '8px 12px', fontSize: '13px', color: '#CCC' }}>{PECAS_LABELS[peca]}</td>
              {NIVEIS.map(nivel => (
                <td key={nivel} style={{ padding: '6px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ color: '#555', fontSize: '12px' }}>¥</span>
                    <input
                      type="number"
                      value={precos[peca]?.[nivel] ?? ''}
                      onChange={e => atualizar(peca, nivel, e.target.value)}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#FF6B00')}
                      onBlur={e => (e.target.style.borderColor = '#2A2A2A')}
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '32px', padding: '20px', background: '#111', borderRadius: '10px', border: '1px solid #2A2A2A' }}>
        <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multiplicadores (fixos)</p>
        <p style={{ margin: '4px 0', fontSize: '13px', color: '#AAA' }}>Alumínio: <strong style={{ color: '#FF6B00' }}>+30%</strong></p>
        <p style={{ margin: '4px 0', fontSize: '13px', color: '#AAA' }}>Press Line: <strong style={{ color: '#FF6B00' }}>+25%</strong></p>
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#444' }}>Para alterar os multiplicadores, edite lib/tabela-precos.ts</p>
      </div>
    </AppShell>
  )
}
