import { requirePerfil } from '@/lib/auth'

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  await requirePerfil('staff', 'admin')
  return <>{children}</>
}
