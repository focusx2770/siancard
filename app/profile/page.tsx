'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  MessageCircle, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Eye, 
  Tag, 
  CheckCircle2, 
  Calendar,
  ShieldCheck
} from 'lucide-react';

export default function MyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [lineId, setLineId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Stats
  const [myListingsCount, setMyListingsCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [createdAt, setCreatedAt] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);

  // KYC Verification State
  const [verificationRequest, setVerificationRequest] = useState<any | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyFullName, setVerifyFullName] = useState('');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyBankName, setVerifyBankName] = useState('กสิกรไทย (KBANK)');
  const [verifyBankAccount, setVerifyBankAccount] = useState('');
  const [verifyAccountName, setVerifyAccountName] = useState('');
  const [verifyFacebookUrl, setVerifyFacebookUrl] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        router.replace('/auth?next=%2Fprofile');
        return;
      }
      setUser(user);
      fetchProfileData(user.id, user.email || '');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        router.replace('/auth?next=%2Fprofile');
      } else {
        setUser(session.user);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function fetchProfileData(userId: string, userEmail: string) {
    setLoading(true);

    // 1. ดึงข้อมูล Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setDisplayName(profile.display_name || '');
      setLineId(profile.line_id || '');
      setContactEmail(profile.contact_email || userEmail);
      setAvatarUrl(profile.avatar_url || null);
      setCreatedAt(profile.created_at || '');
      setIsVerified(!!profile.show_contact);
    } else {
      // ถ้ายังไม่มีโปรไฟล์ในตาราง ให้ตั้งค่าเริ่มต้น
      setDisplayName(userEmail.split('@')[0]);
      setContactEmail(userEmail);
    }

    // ดึงสถานะคำขอยืนยันตัวตน (ถ้ามี)
    try {
      const { data: vReq } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vReq) setVerificationRequest(vReq);
    } catch {
      // ข้ามถ้ายังไม่มีตาราง
    }

    // 2. ดึงสถิติของตัวเอง
    const { count: totalListings } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId);

    const { count: totalSold } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'sold');

    const { count: totalReviews } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId);

    setMyListingsCount(totalListings || 0);
    setSoldCount(totalSold || 0);
    setReviewsCount(totalReviews || 0);

    setLoading(false);
  }

  // เลือกรูปจากเครื่อง พร้อมตรวจสอบความถูกต้อง
  const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_AVATAR_SIZE = 3 * 1024 * 1024; // 3MB

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ALLOWED_AVATAR_TYPES.includes(file.type.toLowerCase())) {
        alert('กรุณาเลือกไฟล์ภาพถ่ายนามสกุล JPG, PNG หรือ WEBP');
        return;
      }
      if (file.size > MAX_AVATAR_SIZE) {
        alert('ไฟล์รูปโปรไฟล์ต้องมีขนาดไม่เกิน 3MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // บันทึกการแก้ไขโปรไฟล์
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'กรุณาระบุชื่อผู้ใช้งาน (Display Name)' });
      return;
    }

    setSaving(true);
    setFeedbackMsg(null);

    try {
      let finalAvatarUrl = avatarUrl;

      // 1. ถ้ามีการเลือกรูปใหม่ อัปโหลดขึ้น Supabase Storage Bucket ('card-images' หรือ 'avatars')
      if (avatarFile) {
        const rawExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

        // อัปโหลดไปยัง bucket
        const { error: uploadError } = await supabase.storage
          .from('card-images')
          .upload(fileName, avatarFile, { 
            upsert: true,
            contentType: avatarFile.type || 'image/jpeg',
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('card-images')
            .getPublicUrl(fileName);
          finalAvatarUrl = publicUrl;
          setAvatarUrl(publicUrl);
        } else {
          console.warn('Storage upload error, skipping avatar upload:', uploadError);
        }
      }

      // 2. อัปเดตตาราง profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          line_id: lineId.trim() || null,
          contact_email: contactEmail.trim() || user.email,
          avatar_url: finalAvatarUrl,
        });

      if (updateError) throw updateError;

      setFeedbackMsg({ type: 'success', text: 'บันทึกข้อมูลโปรไฟล์ของคุณเรียบร้อยแล้ว!' });
    } catch (err: unknown) {
      console.error('Error saving profile:', err);
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ',
      });
    } finally {
      setSaving(false);
    }
  };

  // ส่งคำขอยืนยันตัวตนผู้ขาย (KYC)
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!verifyFullName.trim()) {
      alert('กรุณาระบุชื่อ-นามสกุลจริง');
      return;
    }
    if (!verifyBankAccount.trim() || !verifyAccountName.trim()) {
      alert('กรุณาระบุข้อมูลบัญชีธนาคารสำหรับรับเงินและตรวจสอบความถูกต้อง');
      return;
    }
    if (!termsAccepted) {
      alert('กรุณากดยอมรับข้อตกลงและเงื่อนไขการเป็นผู้ขาย Verified');
      return;
    }
    if (!idCardFile || !selfieFile) {
      alert('กรุณาอัปโหลดรูปภาพให้ครบทั้ง 2 ภาพ (รูปบัตรประชาชน และรูปถ่ายหน้าคู่บัตร)');
      return;
    }

    setSubmittingVerify(true);
    try {
      // 1. อัปโหลดรูปบัตร ปชช.
      const idExt = idCardFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const idFileName = `kyc/${user.id}/idcard_${Date.now()}.${idExt}`;
      const { error: idUploadErr } = await supabase.storage
        .from('card-images')
        .upload(idFileName, idCardFile, { contentType: idCardFile.type || 'image/jpeg' });
      if (idUploadErr) throw idUploadErr;

      const { data: { publicUrl: idCardUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(idFileName);

      // 2. อัปโหลดรูปคู่บัตร
      const selfieExt = selfieFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const selfieFileName = `kyc/${user.id}/selfie_${Date.now()}.${selfieExt}`;
      const { error: selfieUploadErr } = await supabase.storage
        .from('card-images')
        .upload(selfieFileName, selfieFile, { contentType: selfieFile.type || 'image/jpeg' });
      if (selfieUploadErr) throw selfieUploadErr;

      const { data: { publicUrl: selfieUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(selfieFileName);

      // 3. บันทึกคำขอลงตาราง verification_requests
      const { data: newReq, error: insertErr } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          full_name: verifyFullName.trim(),
          phone_number: verifyPhone.trim() || null,
          bank_name: verifyBankName,
          bank_account: verifyBankAccount.trim(),
          account_name: verifyAccountName.trim(),
          facebook_url: verifyFacebookUrl.trim() || null,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          id_card_photo: idCardUrl,
          selfie_photo: selfieUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setVerificationRequest(newReq);
      setShowVerifyModal(false);
      setFeedbackMsg({
        type: 'success',
        text: 'ส่งหลักฐานยืนยันตัวตนเรียบร้อยแล้ว! แอดมินจะตรวจสอบและอนุมัติป้ายให้โดยเร็ว',
      });
    } catch (err: any) {
      alert('ส่งข้อมูลไม่สำเร็จ: ' + (err.message || 'เกิดข้อผิดพลาด'));
    } finally {
      setSubmittingVerify(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
        กำลังโหลดข้อมูลโปรไฟล์...
      </div>
    );
  }

  const currentDisplayAvatar = avatarPreview || avatarUrl;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header โทนเข้มพรีเมียม */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-9 w-36 sm:w-40">
              <Image
                src="/logo.png"
                alt="SianCard Logo"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            {user && (
              <Link
                href={`/sellers/${user.id}`}
                className="hidden sm:inline-flex items-center gap-1.5 border border-purple-800 text-purple-200 hover:bg-purple-900/50 hover:text-white px-3 py-2 rounded-xl font-medium text-xs transition"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>มุมมองที่คนอื่นเห็น</span>
              </Link>
            )}

            <Link
              href="/"
              className="border border-purple-800 text-purple-200 hover:bg-purple-900/50 hover:text-white px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl font-medium text-xs transition inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">หน้าแรก</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 mt-8">
        
        {/* หัวข้อหน้า */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              โปรไฟล์ของฉัน (My Profile)
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              จัดการข้อมูลส่วนตัว ชื่อที่แสดง และช่องทางติดต่อสำหรับผู้ซื้อ
            </p>
          </div>

          {user && (
            <Link
              href={`/sellers/${user.id}`}
              className="sm:hidden inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:underline"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>ดูโปรไฟล์สาธารณะของฉัน →</span>
            </Link>
          )}
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-2 text-sm shadow-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* สถิติสรุปผู้ขาย */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs text-center">
            <span className="text-xs text-gray-500 font-medium block">การ์ดที่ลงขาย</span>
            <span className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5 block">{myListingsCount}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs text-center">
            <span className="text-xs text-gray-500 font-medium block">ขายสำเร็จแล้ว</span>
            <span className="text-xl sm:text-2xl font-black text-green-600 mt-0.5 block">{soldCount}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs text-center">
            <span className="text-xs text-gray-500 font-medium block">รีวิวที่ได้รับ</span>
            <span className="text-xl sm:text-2xl font-black text-amber-500 mt-0.5 block">{reviewsCount}</span>
          </div>
        </div>

        {/* แถบสถานะ Verified Seller (KYC) */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl border bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isVerified 
                ? 'bg-green-100 text-green-600 border border-green-200'
                : verificationRequest?.status === 'pending'
                ? 'bg-amber-100 text-amber-600 border border-amber-200'
                : 'bg-purple-100 text-purple-600 border border-purple-200'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-900">ป้ายยืนยันตัวตนผู้ขาย (Verified Seller)</h3>
                {isVerified ? (
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-300">
                    ยืนยันตัวตนแล้ว ✓
                  </span>
                ) : verificationRequest?.status === 'pending' ? (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                    รอแอดมินตรวจสอบ ⏳
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ยังไม่ยืนยัน
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {isVerified
                  ? 'บัญชีของคุณได้รับตราสัญลักษณ์ผู้ขายที่น่าเชื่อถือแล้ว ผู้ซื้อจะมั่นใจในการสั่งซื้อมากขึ้น'
                  : verificationRequest?.status === 'pending'
                  ? 'คุณได้ส่งหลักฐานแล้ว อยู่ระหว่างการตรวจสอบโดยทีมงาน (มักใช้เวลาไม่เกิน 24 ชม.)'
                  : 'ส่งภาพถ่ายบัตรประชาชนเพื่อรับตราสัญลักษณ์ ป้องกันการแอบอ้าง และเพิ่มยอดขาย'}
              </p>
            </div>
          </div>

          {!isVerified && verificationRequest?.status !== 'pending' && (
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0 cursor-pointer"
            >
              + ขอยืนยันตัวตน
            </button>
          )}
        </div>

        {/* กล่องแก้ไขโปรไฟล์ */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* ส่วนอัปโหลดรูป Avatar */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center font-black text-3xl shadow-md overflow-hidden border-4 border-white">
                  {currentDisplayAvatar ? (
                    <img
                      src={currentDisplayAvatar}
                      alt={displayName || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase() || <User className="h-10 w-10 text-white/80" />
                  )}
                </div>

                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-md cursor-pointer transition transform hover:scale-105"
                  title="เปลี่ยนรูปโปรไฟล์"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="text-center sm:text-left">
                <h3 className="font-bold text-gray-900 text-base">รูปโปรไฟล์ (Avatar)</h3>
                <p className="text-xs text-gray-500 mt-1">
                  แนะนำเป็นไฟล์ภาพสี่เหลี่ยมจัตุรัส (JPG หรือ PNG) ขนาดไม่เกิน 5MB
                </p>
                {createdAt && (
                  <p className="text-xs text-purple-700 font-medium mt-2 flex items-center justify-center sm:justify-start gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    เป็นสมาชิกเมื่อ {new Date(createdAt).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* ช่องกรอกข้อมูล */}
            <div className="space-y-4">
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
                    placeholder="เช่น SianCardMaster99"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  />
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">ชื่อนี้จะแสดงให้ผู้ซื้อเห็นเวลาคุณลงขายการ์ด</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  LINE ID <span className="text-purple-600 font-normal">(สำคัญมากสำหรับให้ผู้ซื้อติดต่อ)</span>
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-2.5 h-4 w-4 text-green-500" />
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="เช่น line_id_123"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  />
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">เมื่อผู้ซื้อสนใจการ์ดของคุณ จะสามารถกดปุ่ม "ทัก LINE ผู้ขาย" ได้ทันที</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  อีเมลติดต่อ (Contact Email)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div className="pt-4 flex items-center justify-between border-t border-gray-100 gap-4">
              {user && (
                <Link
                  href={`/sellers/${user.id}`}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Eye className="h-4 w-4 text-purple-600" />
                  <span>ดูหน้าโปรไฟล์สาธารณะ</span>
                </Link>
              )}

              <button
                type="submit"
                disabled={saving}
                className="ml-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลโปรไฟล์'}</span>
              </button>
            </div>

          </form>
        </div>

      </main>

      {/* Modal ยื่นคำขอยืนยันตัวตน (KYC) */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">ยื่นคำขอยืนยันตัวตน (KYC)</h3>
                  <p className="text-xs text-gray-500">รับป้าย Verified Seller เพิ่มความน่าเชื่อถือ</p>
                </div>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ชื่อ-นามสกุลจริงตามบัตรประชาชน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={verifyFullName}
                  onChange={(e) => setVerifyFullName(e.target.value)}
                  placeholder="เช่น นาย สมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={verifyPhone}
                    onChange={(e) => setVerifyPhone(e.target.value)}
                    placeholder="เช่น 0812345678"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ลิงก์ Facebook / โปรไฟล์โซเชียล
                  </label>
                  <input
                    type="url"
                    value={verifyFacebookUrl}
                    onChange={(e) => setVerifyFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* ข้อมูลบัญชีธนาคารรับเงิน */}
              <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 space-y-3">
                <span className="text-xs font-black text-purple-900 block">
                  💳 บัญชีธนาคารสำหรับรับเงิน (ต้องตรงกับชื่อบัตรประชาชน)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">ธนาคาร <span className="text-red-500">*</span></label>
                    <select
                      value={verifyBankName}
                      onChange={(e) => setVerifyBankName(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:border-purple-500 focus:outline-none"
                    >
                      <option value="กสิกรไทย (KBANK)">กสิกรไทย (KBANK)</option>
                      <option value="ไทยพาณิชย์ (SCB)">ไทยพาณิชย์ (SCB)</option>
                      <option value="กรุงเทพ (BBL)">กรุงเทพ (BBL)</option>
                      <option value="กรุงไทย (KTB)">กรุงไทย (KTB)</option>
                      <option value="กรุงศรีอยุธยา (BAY)">กรุงศรี (BAY)</option>
                      <option value="ทหารไทยธนชาต (TTB)">TTB</option>
                      <option value="พร้อมเพย์ (PromptPay)">พร้อมเพย์ (PromptPay)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">เลขบัญชี / พร้อมเพย์ <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={verifyBankAccount}
                      onChange={(e) => setVerifyBankAccount(e.target.value)}
                      placeholder="เช่น 123-4-56789-0"
                      className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">ชื่อบัญชี <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={verifyAccountName}
                      onChange={(e) => setVerifyAccountName(e.target.value)}
                      placeholder="เช่น นาย สมชาย ใจดี"
                      className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  1. รูปถ่ายหน้าบัตรประชาชน <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => e.target.files && setIdCardFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  * สามารถใช้ปากกาหรือกระดาษเขียนทับว่า &quot;สำหรับยืนยันตัวตน SianCard เท่านั้น&quot; ได้
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  2. รูปถ่ายหน้าคู่กับบัตรประชาชน (Selfie) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => e.target.files && setSelfieFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  * ถ่ายให้เห็นใบหน้าและบัตรชัดเจน เพื่อยืนยันว่าตรงกับตัวจริง
                </span>
              </div>

              {/* ข้อตกลงและเงื่อนไขการเป็น Verified Seller (Terms & Conditions) */}
              <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl space-y-2 text-xs text-amber-900">
                <span className="font-black flex items-center gap-1.5 text-amber-800">
                  ⚠️ ข้อกำหนดและความรับผิดชอบของผู้ขาย Verified
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800/90 leading-relaxed">
                  <li>ข้าพเจ้ายืนยันว่าข้อมูลบัตรประชาชนและบัญชีธนาคารเป็นของจริงและเป็นของข้าพเจ้าแต่เพียงผู้เดียว</li>
                  <li>ข้าพเจ้าสัญญาว่าจะส่งมอบการ์ดแท้ สภาพตรงตามรูปถ่าย และแพ็คสินค้าอย่างแน่นหนาปลอดภัย</li>
                  <li>หากมีพฤติกรรมฉ้อโกง หลอกลวง หรือไม่ส่งมอบสินค้า ข้าพเจ้ายินยอมให้ทีมงาน SianCard ระงับบัญชีถาวร และเปิดเผยข้อมูลเพื่อดำเนินคดีตามกฎหมายอย่างถึงที่สุด</li>
                </ul>
                <div className="pt-2 border-t border-amber-200/60 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms-check"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="terms-check" className="font-bold text-xs text-amber-900 cursor-pointer select-none">
                    ข้าพเจ้าได้อ่าน เข้าใจ และยอมรับข้อตกลงและเงื่อนไขข้างต้นทุกประการ
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingVerify}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {submittingVerify ? 'กำลังอัปโหลด...' : 'ส่งเอกสารยืนยัน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

