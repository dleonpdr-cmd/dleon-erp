import { requirePerfil } from '@/lib/auth'

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  await requirePerfil('admin')
  return <>{children}</>
}
