import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROTAS_PUBLICAS = ['/login']

const PERMISSOES: Record<string, string[]> = {
  '/customers':   ['staff', 'admin'],
  '/technicians': ['staff', 'admin'],
  '/pagamentos':  ['staff', 'admin'],
  '/commissions': ['staff', 'admin', 'orcamentista', 'tecnico'],
  '/cases':       ['staff', 'admin', 'orcamentista', 'tecnico'],
  '/vehicles':    ['staff', 'admin', 'orcamentista'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!url || !anonKey) {
    if (!ROTAS_PUBLICAS.includes(pathname))
      return NextResponse.redirect(new URL('/login', request.url))
    return response
  }

  // Cliente para autenticação (anon key + cookies)
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !ROTAS_PUBLICAS.includes(pathname))
    return NextResponse.redirect(new URL('/login', request.url))

  if (user && pathname === '/login')
    return NextResponse.redirect(new URL('/', request.url))

  if (user && serviceKey) {
    // Cliente service role para buscar perfil sem RLS bloqueando
    const admin = createServerClient(url, serviceKey, {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    })

    const { data: perfil } = await admin
      .from('perfis')
      .select('perfil')
      .eq('id', user.id)
      .single()

    const role = perfil?.perfil ?? 'tecnico'
    response.headers.set('x-user-role', role)

    for (const [rota, permitidos] of Object.entries(PERMISSOES)) {
      if (pathname.startsWith(rota) && !permitidos.includes(role)) {
        return NextResponse.redirect(new URL('/?acesso=negado', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
