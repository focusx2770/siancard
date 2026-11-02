import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // รับข้อมูล user จาก Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // รายการ Path ที่ต้องมีการล็อกอินก่อนเข้าใช้งาน
  const protectedRoutes = ['/listings/create', '/my-listings', '/profile', '/messages']
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // หากล็อกอินอยู่แล้วแต่พยายามเข้าหน้า /auth ให้พาไปหน้าหลักหรือหน้าที่ระบุ
  if (user && pathname === '/auth') {
    const nextParam = request.nextUrl.searchParams.get('next')
    const redirectTarget = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'
    return NextResponse.redirect(new URL(redirectTarget, request.url))
  }

  return supabaseResponse
}

