import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // ป้องกัน Open Redirect Vulnerability
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (code) {
    const supabase = await createClientServer()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session?.user) {
      const user = data.session.user

      // บันทึกหรือซิงค์ข้อมูล Profile (รองรับทั้ง Email Sign-in และ Google OAuth)
      const metadata = user.user_metadata || {}
      const displayName =
        metadata.display_name ||
        metadata.full_name ||
        metadata.name ||
        user.email?.split('@')[0] ||
        'User'
      const avatarUrl = metadata.avatar_url || metadata.picture || null

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          line_id: metadata.line_id || null,
          contact_email: user.email,
        },
        { onConflict: 'id' }
      )

      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // หากเกิดข้อผิดพลาดในการแลก token
  return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent('เข้าสู่ระบบไม่สำเร็จ หรือลิงก์หมดอายุแล้ว')}`)
}
