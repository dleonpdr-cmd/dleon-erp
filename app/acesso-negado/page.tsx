import Link from 'next/link'

export default function AcessoNegadoPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px' }}>Acesso negado</h1>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '24px' }}>Você não tem permissão para acessar esta página.</p>
        <Link href="/" style={{ background: '#FF6B00', color: '#fff', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}>
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
