'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setHasRecoverySession(Boolean(session));
      setCheckingSession(false);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setErrorMsg('ตรวจสอบลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาขอลิงก์ใหม่');
      }
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function getRedirectPath() {
    if (typeof window === 'undefined') return '/';
    const next = new URLSearchParams(window.location.search).get('next');
    return next?.startsWith('/') && !next.startsWith('//') ? next : '/';
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSuccessMsg('ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กำลังกลับไปยังหน้าก่อนหน้า...');
    window.setTimeout(() => router.replace(getRedirectPath()), 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0f0c1b] via-[#1a1530] to-gray-900 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-purple-100 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl">
        <Link href="/auth" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-800 transition">
          <ArrowLeft className="h-4 w-4" />
          กลับไปเข้าสู่ระบบ
        </Link>

        <div className="flex justify-center mb-4">
          <div className="relative h-12 w-48">
            <Image
              src="/logo.png"
              alt="SianCard"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-gray-900 text-center">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-1 text-xs text-gray-500 text-center">กำหนดรหัสผ่านใหม่สำหรับบัญชี SianCard ของคุณ</p>

        {checkingSession ? (
          <p className="mt-6 text-sm text-purple-600 font-medium text-center animate-pulse">กำลังตรวจสอบลิงก์ยืนยันตัวตน...</p>
        ) : !hasRecoverySession ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg || 'ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ'}</span>
            </div>
            <Link href="/auth" className="inline-block text-sm font-semibold text-purple-600 hover:underline">
              กลับไปขอลิงก์ใหม่
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">รหัสผ่านใหม่</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-60 mt-2 cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
