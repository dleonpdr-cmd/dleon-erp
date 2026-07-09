import { createServerClient } from '@supabase/ssr'
import { getUsuarioPerfil } from '@/lib/auth'
import NovoUsuarioBtn from '@/components/usuarios/NovoUsuarioBtn'
import AlterarPerfilBtn from '@/components/usuarios/AlterarPerfilBtn'

export const metadata = { title: "Usuários — D'LEON ERP" }

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  orcamentista: 'Orçamentista',
  tecnico: 'Técnico',
}

const PERFIL_COLOR: Record<string, string> = {
  admin:        'background:#4B1C1C;color:#F87171',
  staff:        'background:#1C3A4B;color:#60C4F8',
  orcamentista: 'background:#2A3A1C;color:#86EF6F',
  tecnico:      'background:#2A2A2A;color:#A1A1AA',
}

export default async function UsuariosPage() {
  await getUsuarioPerfil()

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: usuarios } = await admin
    .from('perfis')
    .select('id, perfil, ativo, created_at')
    .order('created_at', { ascending: false })

  // Buscar emails dos usuários
  const ids = (usuarios ?? []).map(u => u.id)
  const emailMap: Record<string, string> = {}

  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id)
    if (data?.user?.email) emailMap[id] = data.user.email
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D&apos;LEON</a>
          <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
          <span style={{ color: '#333', fontSize: '13px' }}>/ Usuários</span>
        </div>
        <NovoUsuarioBtn />
      </div>

      <div style={{ padding: '28px 32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '500' }}>Usuários</h1>
            <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
              {usuarios?.length ?? 0} usuários cadastrados
            </p>
          </div>
        </div>

        <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                {['E-mail', 'Perfil', 'Status', 'Desde', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#555', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(usuarios ?? []).map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {emailMap[u.id] ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', ...Object.fromEntries((PERFIL_COLOR[u.perfil] ?? 'background:#2A2A2A;color:#888').split(';').map(s => s.split(':'))) }}>
                      {PERFIL_LABEL[u.perfil] ?? u.perfil}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '10px', background: u.ativo ? '#1C3A1C' : '#3A1C1C', color: u.ativo ? '#4ADE80' : '#F87171' }}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#555' }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <AlterarPerfilBtn userId={u.id} perfilAtual={u.perfil} ativo={u.ativo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
