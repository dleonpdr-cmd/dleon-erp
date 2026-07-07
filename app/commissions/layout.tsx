import { requirePerfil } from '@/lib/auth'

export default async function CommissionsLayout({ children }: { children: React.ReactNode }) {
  await requirePerfil('staff', 'admin', 'orcamentista', 'tecnico')
  return <>{children}</>
}
