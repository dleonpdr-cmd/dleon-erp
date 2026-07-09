'use client'

import { useState, useTransition } from 'react'
import { criarUsuario } from '@/app/api/usuarios/actions'

const PERFIS = ['tecnico', 'orcamentista', 'staff', 'admin']

export default function NovoUsuarioBtn() {
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState({ email: '', senha: '', perfil: 'tecnico' })
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [, startTransition] = useTransition()

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit() {
    setErro(null)
    if (!form.email || !form.senha) { setErro('E-mail e senha são obrigatórios'); return }
    if (form.senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres'); return }
    startTransition(async () => {
      const { error } = await criarUsuario(form.email, form.senha, form.perfil)
      if (error) { setErro(error); return }
      setSucesso(true)
      setTimeout(() => { setAberto(false); setSucesso(false); setForm({ email: '', senha: '', perfil: 'tecnico' }) }, 1500)
    })
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
        style={{ background: '#FF6B00', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
        + Novo usuário
      </button>

      {aberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', margin: '0 16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '20px' }}>Novo usuário</h2>

            {sucesso ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <p style={{ fontSize: '13px', color: '#4ADE80' }}>Usuário criado com sucesso!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '6px' }}>E-mail</label>
                  <input value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="tecnico@dleon.jp" type="email"
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#F0EEE9', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '6px' }}>Senha</label>
                  <input value={form.senha} onChange={e => set('senha', e.target.value)}
                    placeholder="mínimo 6 caracteres" type="password"
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#F0EEE9', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '6px' }}>Perfil</label>
                  <select value={form.perfil} onChange={e => set('perfil', e.target.value)}
                    style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#F0EEE9', boxSizing: 'border-box' }}>
                    {PERFIS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                {erro && <p style={{ fontSize: '12px', color: '#F87171', background: '#3A1C1C', padding: '8px 12px', borderRadius: '8px' }}>{erro}</p>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button onClick={() => setAberto(false)}
                    style={{ flex: 1, background: 'none', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '8px', fontSize: '13px', color: '#888', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSubmit}
                    style={{ flex: 2, background: '#FF6B00', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '500', color: '#fff', cursor: 'pointer' }}>
                    Criar usuário
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
