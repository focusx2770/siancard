'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, ArrowLeft, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [lineId, setLineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [checkingInitialSession, setCheckingInitialSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

  const getRedirectPath = () => {
    if (typeof window === 'undefined') return '/';
    const next = new URLSearchParams(window.location.search).get('next');
    return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
  };

  const getCallbackRedirectUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(getRedirectPath())}`;
  };

  useEffect(() => {
    // ตรวจสอบพารามิเตอร์ Error จาก Callback หรือ Redirect
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlError = searchParams.get('error');
      const urlMessage = searchParams.get('message');
      if (urlError) setErrorMsg(decodeURIComponent(urlError));
      if (urlMessage) setNoticeMsg(decodeURIComponent(urlMessage));
    }

    // ตรวจสอบว่าผู้ใช้มี Session อยู่แล้วหรือไม่ ถ้ามีให้ redirect ทันที
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        if (session) {
          router.replace(getRedirectPath());
        } else {
          setCheckingInitialSession(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        router.replace(getRedirectPath());
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // เข้าสู่ระบบด้วย Google
  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setNoticeMsg(null);
    setLoadingGoogle(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getCallbackRedirectUrl(),
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
      setLoadingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNoticeMsg(null);
    setCanResendConfirmation(false);
    setLoading(true);

    try {
      if (isRegister) {
        // สมัครสมาชิก พร้อมบันทึก metadata ลงใน auth.users อัตโนมัติ
        const finalDisplayName = displayName.trim() || email.split('@')[0];
        const finalLineId = lineId.trim() || null;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: finalDisplayName,
              line_id: finalLineId,
            },
            emailRedirectTo: getCallbackRedirectUrl(),
          },
        });

        if (error) throw error;

        // อัปเดตข้อมูลตาราง profiles เพิ่มเติมหากได้รับ Session ทันที (เช่น ปิด Confirm Email ไว้)
        if (data.session && data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: finalDisplayName,
            line_id: finalLineId,
            contact_email: email.trim(),
          });
          router.push(getRedirectPath());
        } else {
          setIsRegister(false);
          setNoticeMsg(`สมัครสมาชิกเรียบร้อยแล้ว! กรุณาตรวจสอบอีเมล ${email} และคลิกลิงก์ยืนยันตัวตนก่อนเข้าสู่ระบบ`);
        }
      } else {
        // เข้าสู่ระบบ
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        router.push(getRedirectPath());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการทำรายการ';
      const errorCode =
        typeof err === 'object' && err !== null && 'code' in err
          ? String(err.code)
          : '';

      if (errorCode === 'email_not_confirmed' || message.toLowerCase().includes('email not confirmed')) {
        setErrorMsg('อีเมลนี้ยังไม่ได้ยืนยัน กรุณากดลิงก์ในอีเมลก่อนเข้าสู่ระบบ');
        setCanResendConfirmation(true);
      } else if (errorCode === 'invalid_credentials' || message.toLowerCase().includes('invalid login credentials')) {
        setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง หากจำรหัสผ่านไม่ได้ให้เลือก “ลืมรหัสผ่าน”');
      } else {
        setErrorMsg(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setErrorMsg('กรุณากรอกอีเมลที่ใช้สมัครก่อน');
      return;
    }

    setErrorMsg(null);
    setNoticeMsg(null);
    setResendingConfirmation(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: getCallbackRedirectUrl(),
        },
      });

      if (error) throw error;
      setNoticeMsg(`ส่งลิงก์ยืนยันไปยัง ${email.trim()} แล้ว กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์สแปม`);
      setCanResendConfirmation(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ส่งอีเมลยืนยันไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setResendingConfirmation(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setErrorMsg('กรุณากรอกอีเมลที่ใช้สมัครก่อน');
      return;
    }

    setErrorMsg(null);
    setNoticeMsg(null);
    setSendingPasswordReset(true);

    try {
      const resetRedirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        `/auth/reset-password?next=${encodeURIComponent(getRedirectPath())}`
      )}`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectUrl,
      });

      if (error) throw error;
      setNoticeMsg(`ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยัง ${email.trim()} แล้ว กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์สแปม`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ส่งลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  if (checkingInitialSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-purple-600 font-medium animate-pulse">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0c1b] via-[#1a1530] to-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-purple-300 hover:text-white mb-6 transition group"
        >
          <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" /> กลับหน้าแรก
        </Link>

        {/* Logo Display */}
        <div className="flex justify-center mb-2">
          <div className="relative h-14 w-56 sm:h-16 sm:w-64">
            <Image
              src="/logo.png"
              alt="SianCard"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        <p className="text-xs sm:text-sm text-purple-200/70 font-medium">
          {isRegister ? 'สร้างบัญชีเพื่อเริ่มซื้อ-ขายการ์ดสะสม' : 'เข้าสู่ระบบเพื่อใช้งาน SianCard'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl border border-purple-100 rounded-3xl sm:px-10">
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {noticeMsg && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{noticeMsg}</span>
            </div>
          )}

          {/* ปุ่มเข้าสู่ระบบด้วย Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loading}
            className="w-full py-2.5 px-4 border border-gray-300 hover:border-gray-400 rounded-xl text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loadingGoogle ? 'กำลังเปิด Google...' : 'เข้าสู่ระบบด้วย Google'}</span>
          </button>

          {/* เส้นคั่น หรือ */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 font-semibold">หรือใช้อีเมลของคุณ</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ชื่อผู้ใช้งาน (Display Name) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="เช่น CardMaster99"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    LINE ID <span className="text-gray-400 font-normal">(สำหรับผู้ซื้อติดต่อ)</span>
                  </label>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="เช่น line_id_123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                อีเมล <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || loadingGoogle}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-purple-500/25 transition disabled:opacity-60 mt-3 cursor-pointer"
            >
              {loading ? 'กำลังทำรายการ...' : isRegister ? 'สร้างบัญชีผู้ใช้' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {canResendConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendingConfirmation}
              className="mt-3 w-full rounded-xl border border-purple-300 px-4 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendingConfirmation ? 'กำลังส่งอีเมล...' : 'ส่งอีเมลยืนยันอีกครั้ง'}
            </button>
          )}

          {!isRegister && (
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={sendingPasswordReset}
              className="mt-3 w-full text-center text-xs font-semibold text-purple-600 hover:underline disabled:opacity-60"
            >
              {sendingPasswordReset ? 'กำลังส่งลิงก์...' : 'ลืมรหัสผ่าน? ส่งลิงก์ตั้งรหัสผ่านใหม่'}
            </button>
          )}

          <div className="mt-6 text-center border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
                setNoticeMsg(null);
                setCanResendConfirmation(false);
              }}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition"
            >
              {isRegister ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
