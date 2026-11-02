import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    const expectedPin = process.env.ADMIN_SECRET_PIN || '889922';

    if (!pin || pin !== expectedPin) {
      return NextResponse.json({ error: 'รหัส PIN หรือ Admin Key ไม่ถูกต้อง' }, { status: 401 });
    }

    // ตรวจสอบ session ของผู้ใช้ปัจจุบันผ่าน Supabase SSR
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component / route handler handling
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    // ตรวจสอบทั้งจาก ADMIN_EMAILS (whitelist ใน .env) หรือ profile role = 'admin'
    const adminEmailsConfig = process.env.ADMIN_EMAILS || '';
    const adminEmailList = adminEmailsConfig
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isEmailAdmin = user.email && adminEmailList.includes(user.email.toLowerCase());

    // ตรวจสอบ role ในตาราง profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isRoleAdmin = profile?.role === 'admin';

    // ถ้าไม่ตรงทั้ง Email whitelist และ Role ใน profiles
    if (!isEmailAdmin && !isRoleAdmin) {
      return NextResponse.json(
        { error: 'บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งานแอดมิน (อีเมลหรือ Role ไม่ตรงตามที่กำหนด)' },
        { status: 403 }
      );
    }

    // PIN ถูกต้อง และบัญชีเป็น Admin
    const response = NextResponse.json({ success: true, message: 'ยืนยันตัวตนแอดมินสำเร็จ' });
    
    // ตั้ง HTTP-only cookie เป็นตั๋ว session ชั่วคราวสำหรับหน้า admin (อายุ 8 ชั่วโมง)
    response.cookies.set('admin_session_verified', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบ' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const isSessionVerified = cookieStore.get('admin_session_verified')?.value === 'true';

    // ตรวจสอบ user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ isAdmin: false, verified: false });
    }

    // ตรวจสอบ Email Whitelist
    const adminEmailsConfig = process.env.ADMIN_EMAILS || '';
    const adminEmailList = adminEmailsConfig
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isEmailAdmin = !!(user.email && adminEmailList.includes(user.email.toLowerCase()));

    // ตรวจสอบ role ในตาราง profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isRoleAdmin = profile?.role === 'admin';
    const isUserAdmin = isEmailAdmin || isRoleAdmin;

    return NextResponse.json({
      isAdmin: isUserAdmin,
      verified: isUserAdmin && isSessionVerified,
      email: user.email,
    });
  } catch {
    return NextResponse.json({ isAdmin: false, verified: false });
  }
}
