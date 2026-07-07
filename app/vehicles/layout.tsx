import { requirePerfil } from '@/lib/auth'

export default async function VehiclesLayout({ children }: { children: React.ReactNode }) {
  await requirePerfil('staff', 'admin', 'orcamentista')
  return <>{children}</>
}
