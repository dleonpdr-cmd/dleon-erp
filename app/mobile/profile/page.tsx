import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveCurrentTechnician, getMyOperations, setSessionState } from '@/app/api/roles/actions'
import MobileProfile from '@/components/mobile/MobileProfile'

export default async function MobileProfilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await resolveCurrentTechnician()
  const myOps = await getMyOperations()

  return (
    <MobileProfile
      userEmail={user.email ?? ''}
      ctx={ctx}
      myOperations={myOps}
    />
  )
}
