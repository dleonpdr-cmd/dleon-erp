'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Dashboard',        href: '/' },
  { label: 'Operações',        href: '/operations' },
  { label: 'Casos',            href: '/cases' },
  { label: 'Ordens de Serviço', href: '/work-orders' },
  { label: '見積書',            href: '/estimativas' },
  { label: 'Clientes',         href: '/customers' },
  { label: 'Veículos',         href: '/vehicles' },
  { label: 'Técnicos',         href: '/technicians' },
  { label: 'Tabela de Preços', href: '/precos' },
  { label: 'Comissões',        href: '/commissions' },
  { label: 'Pagamentos',       href: '/pagamentos' },
  { label: 'Usuários',         href: '/usuarios' },
]

export default function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string
}) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#F0EEE9', fontFamily: 'system-ui' }}>
      {/* Top bar */}
      <div style={{ borderBottom: '1px solid #2A2A2A', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ color: '#FF6B00', fontSize: '18px', fontWeight: '600', textDecoration: 'none' }}>D&apos;LEON</Link>
          <span style={{ color: '#555', fontSize: '13px' }}>ERP</span>
        </div>
        {userEmail && <span style={{ fontSize: '13px', color: '#555' }}>{userEmail}</span>}
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 'calc(100vh - 57px)' }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid #2A2A2A', padding: '20px 0' }}>
          {NAV.map(item => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display: 'block',
                  padding: '8px 20px',
                  fontSize: '13px',
                  color: active ? '#FF6B00' : '#888',
                  background: active ? 'rgba(255,107,0,0.08)' : 'transparent',
                  borderRight: active ? '2px solid #FF6B00' : 'none',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
