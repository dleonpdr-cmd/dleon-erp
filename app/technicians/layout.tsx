import { requirePerfil } from '@/lib/auth'

export default async function TechniciansLayout({ children }: { children: React.ReactNode }) {
  await requirePerfil('staff', 'admin')
  return <>{children}</>
}
