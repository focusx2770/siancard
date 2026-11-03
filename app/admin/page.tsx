'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Report, Profile, Listing } from '@/types/database';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Tag,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Search,
  DollarSign,
  Building2,
  FileText,
  ExternalLink,
  Eye,
  Trash2,
  Lock,
  Sparkles,
  ImagePlus,
  Plus,
  Pencil,
  Save
} from 'lucide-react';
import type { HomeBanner } from '@/components/HeroCategoryExplorer';

interface AdminBanner extends HomeBanner {
  image_path: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

function LoadingAdmin() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-purple-400 font-medium animate-pulse">
      กำลังโหลดแดชบอร์ดแอดมิน...
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingAdmin />}>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'verifications' | 'listings' | 'users' | 'banners'>('reports');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Stats State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    openReports: 0,
    bannedUsers: 0,
    pendingVerifications: 0,
  });

  // Data State
  const [reports, setReports] = useState<Report[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerTargetUrl, setBannerTargetUrl] = useState('');
  const [bannerButtonText, setBannerButtonText] = useState('');
  const [bannerSortOrder, setBannerSortOrder] = useState('0');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Filter for reports
  const [reportFilter, setReportFilter] = useState<'all' | 'open' | 'resolved' | 'dismissed'>('open');

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ระบบ PIN & Key ยืนยันสิทธิ์ Admin 2 ชั้น
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    setLoading(true);
    setAccessDeniedMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth?next=%2Fadmin');
      return;
    }
    setCurrentUser(user);

    // ตรวจสอบสิทธิ์แอดมินผ่าน Server API (เช็ค Email Whitelist และ Role ใน Supabase)
    try {
      const res = await fetch('/api/admin-auth');
      const data = await res.json();

      if (!data.isAdmin) {
        setIsAdmin(false);
        setAccessDeniedMessage('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะบัญชีแอดมินเท่านั้น)');
        setLoading(false);
        return;
      }

      // เป็นแอดมินจริง
      setIsAdmin(true);

      if (data.verified) {
        setIsPinUnlocked(true);
        await fetchAdminData();
      }
    } catch {
      setIsAdmin(false);
      setAccessDeniedMessage('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    }

    setLoading(false);
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError('');
    setPinVerifying(true);

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'รหัส PIN หรือ Admin Key ไม่ถูกต้อง');
      } else {
        setIsPinUnlocked(true);
        await fetchAdminData();
      }
    } catch {
      setPinError('เกิดข้อผิดพลาดในการตรวจสอบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setPinVerifying(false);
    }
  }

  async function fetchAdminData() {
    try {
      // 1. ดึงรายงานคนโกงทั้งหมด
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          reporter_profile:profiles!reporter_id(*),
          reported_profile:profiles!reported_user_id(*),
          listings(*, cards(*))
        `)
        .order('created_at', { ascending: false });

      if (reportsData) setReports(reportsData);

      // 2. ดึงประกาศทั้งหมด
      const { data: listingsData } = await supabase
        .from('listings')
        .select(`
          *,
          cards(*),
          profiles(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (listingsData) setListings(listingsData);

      // 3. ดึงผู้ใช้งานทั้งหมด
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (usersData) setUsers(usersData);

      // 4. ดึงคำขอยืนยันตัวตน KYC
      const { data: verifsData } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profile:profiles!user_id(*)
        `)
        .order('created_at', { ascending: false });

      if (verifsData) setVerifications(verifsData);

      const { data: bannerData, error: bannerError } = await supabase
        .from('homepage_banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (bannerError) {
        console.error('Error fetching homepage banners:', bannerError);
        setBannerMessage(`โหลดแบนเนอร์ไม่สำเร็จ: ${bannerError.message}`);
      } else {
        setBanners(bannerData || []);
      }

      // สรุปตัวเลข
      const openCount = reportsData?.filter((r) => r.status === 'open').length || 0;
      const bannedCount = usersData?.filter((u) => u.is_banned).length || 0;
      const activeListCount = listingsData?.filter((l) => l.status === 'active').length || 0;
      const pendingVerifsCount = verifsData?.filter((v: any) => v.status === 'pending').length || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        activeListings: activeListCount,
        openReports: openCount,
        bannedUsers: bannedCount,
        pendingVerifications: pendingVerifsCount,
      });
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }

  // แอดมินตัดสินว่าโกง & แบนผู้ใช้ทันที
  async function handleBanScammer(report: Report) {
    if (!confirm(`ยืนยันการตัดสินว่าโกง และแบนผู้ใช้ "${report.reported_profile?.display_name || 'คนนี้'}" หรือไม่?`)) return;

    try {
      // 1. อัปเดตสถานะ Report เป็น 'resolved'
      await supabase
        .from('reports')
        .update({ status: 'resolved', admin_notes: 'ตัดสินว่ามีความผิดจริงและระงับการใช้งานบัญชีถาวร' })
        .eq('id', report.id);

      // 2. แบนผู้ใช้ในตาราง profiles
      if (report.reported_user_id) {
        await supabase
          .from('profiles')
          .update({ is_banned: true })
          .eq('id', report.reported_user_id);

        // 3. ปิดประกาศขายทั้งหมดของผู้ใช้คนนี้
        await supabase
          .from('listings')
          .update({ status: 'closed' })
          .eq('seller_id', report.reported_user_id);
      }

      alert('ดำเนินการแบนผู้กระทำผิดและปิดประกาศขายเรียบร้อยแล้ว');
      fetchAdminData();
    } catch (err) {
      console.error('Error banning scammer:', err);
      alert('เกิดข้อผิดพลาดในการแบนผู้ใช้');
    }
  }

  // แอดมินยกฟ้อง (หลักฐานไม่พอ)
  async function handleDismissReport(reportId: string) {
    if (!confirm('ยืนยันยกเลิกคำร้องรายงานนี้หรือไม่?')) return;

    try {
      await supabase
        .from('reports')
        .update({ status: 'dismissed', admin_notes: 'หลักฐานไม่เพียงพอ' })
        .eq('id', reportId);

      alert('ยกเลิกรายงานเรียบร้อย');
      fetchAdminData();
    } catch (err) {
      console.error('Error dismissing report:', err);
    }
  }

  // ลบประกาศไม่เหมาะสม
  async function handleDeleteListing(listingId: string) {
    if (!confirm('ยืนยันการลบประกาศนี้ออกจากระบบ?')) return;
    try {
      await supabase.from('listings').delete().eq('id', listingId);
      alert('ลบประกาศสำเร็จ');
      fetchAdminData();
    } catch (err) {
      console.error('Error deleting listing:', err);
    }
  }

  // อนุมัติ / ปฏิเสธคำขอยืนยันตัวตน KYC
  async function handleApproveVerification(reqItem: any) {
    if (!confirm(`ยืนยันการอนุมัติให้ "${reqItem.full_name}" ได้รับป้าย Verified Seller หรือไม่?`)) return;

    try {
      const { error } = await supabase.rpc('review_verification_request', {
        p_request_id: reqItem.id,
        p_status: 'approved',
        p_admin_notes: null,
      });
      if (error) throw error;

      alert(`อนุมัติให้คุณ ${reqItem.full_name} เรียบร้อยแล้ว`);
      await fetchAdminData();
    } catch (err) {
      console.error('Error approving verification:', err);
      alert('อนุมัติไม่สำเร็จ กรุณาตรวจสอบว่ารัน migration verified_seller_status.sql ใน Supabase แล้ว');
    }
  }

  async function handleRejectVerification(reqItem: any) {
    const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธ (เช่น รูปไม่ชัด, เอกสารไม่ครบ):', 'ภาพถ่ายไม่ชัดเจน กรุณาถ่ายใหม่');
    if (!reason) return;

    try {
      const { error } = await supabase.rpc('review_verification_request', {
        p_request_id: reqItem.id,
        p_status: 'rejected',
        p_admin_notes: reason,
      });
      if (error) throw error;

      alert('ปฏิเสธคำขอเรียบร้อยแล้ว');
      await fetchAdminData();
    } catch (err) {
      console.error('Error rejecting verification:', err);
      alert('ปฏิเสธคำขอไม่สำเร็จ กรุณาตรวจสอบว่ารัน migration verified_seller_status.sql ใน Supabase แล้ว');
    }
  }

  async function handlePreviewVerificationDocument(path: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const legacyPublicPrefix = `${supabaseUrl}/storage/v1/object/public/card-images/kyc/`;
    if (supabaseUrl && path.startsWith(legacyPublicPrefix)) {
      setPreviewImage(path);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(path, 300);
      if (error) throw error;
      setPreviewImage(data.signedUrl);
    } catch (err: unknown) {
      console.error('Error opening verification document:', err);
      alert('เปิดเอกสารยืนยันตัวตนไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และการตั้งค่า private bucket');
    }
  }

  function resetBannerForm() {
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerTargetUrl('');
    setBannerButtonText('');
    setBannerSortOrder(String(banners.length));
    setBannerIsActive(true);
    setBannerImageFile(null);
    setBannerMessage(null);
  }

  function handleEditBanner(banner: AdminBanner) {
    setEditingBannerId(banner.id);
    setBannerTitle(banner.title);
    setBannerSubtitle(banner.subtitle || '');
    setBannerTargetUrl(banner.target_url || '');
    setBannerButtonText(banner.button_text || '');
    setBannerSortOrder(String(banner.sort_order));
    setBannerIsActive(banner.is_active);
    setBannerImageFile(null);
    setBannerMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSaveBanner(e: React.FormEvent) {
    e.preventDefault();
    setBannerMessage(null);

    const title = bannerTitle.trim();
    const targetUrl = bannerTargetUrl.trim();
    if (!title) {
      setBannerMessage('กรุณากรอกหัวข้อแบนเนอร์');
      return;
    }
    if (!editingBannerId && !bannerImageFile) {
      setBannerMessage('กรุณาเลือกรูปแบนเนอร์');
      return;
    }
    if (bannerImageFile && !['image/jpeg', 'image/png', 'image/webp'].includes(bannerImageFile.type)) {
      setBannerMessage('รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP');
      return;
    }
    if (bannerImageFile && bannerImageFile.size > 8 * 1024 * 1024) {
      setBannerMessage('รูปแบนเนอร์ต้องมีขนาดไม่เกิน 8 MB');
      return;
    }
    const isInternalUrl = targetUrl.startsWith('/') && !targetUrl.startsWith('//');
    const isHttpUrl = /^https?:\/\//i.test(targetUrl);
    if (targetUrl && !isInternalUrl && !isHttpUrl) {
      setBannerMessage('ลิงก์ต้องเริ่มด้วย / หรือ http:// หรือ https://');
      return;
    }

    setBannerSaving(true);
    let uploadedPath: string | null = null;
    const previousBanner = banners.find((banner) => banner.id === editingBannerId);
    try {
      let imagePath = previousBanner?.image_path || '';
      let imageUrl = previousBanner?.image_url || '';
      if (bannerImageFile) {
        const extension = bannerImageFile.type === 'image/png' ? 'png' : bannerImageFile.type === 'image/webp' ? 'webp' : 'jpg';
        uploadedPath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('banner-images')
          .upload(uploadedPath, bannerImageFile, { contentType: bannerImageFile.type });
        if (uploadError) throw uploadError;

        imagePath = uploadedPath;
        const { data: { publicUrl } } = supabase.storage.from('banner-images').getPublicUrl(imagePath);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('homepage_banners').upsert({
        ...(editingBannerId ? { id: editingBannerId } : {}),
        title,
        subtitle: bannerSubtitle.trim() || null,
        image_url: imageUrl,
        image_path: imagePath,
        target_url: targetUrl || null,
        button_text: targetUrl ? bannerButtonText.trim() || 'ดูเพิ่มเติม' : null,
        is_active: bannerIsActive,
        sort_order: Number.isFinite(Number(bannerSortOrder)) ? Number(bannerSortOrder) : banners.length,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      if (uploadedPath && previousBanner?.image_path) {
        const { error: removeError } = await supabase.storage.from('banner-images').remove([previousBanner.image_path]);
        if (removeError) console.error('Error removing replaced banner image:', removeError);
      }

      resetBannerForm();
      await fetchAdminData();
    } catch (err: unknown) {
      console.error('Error saving homepage banner:', err);
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from('banner-images').remove([uploadedPath]);
        if (cleanupError) console.error('Error cleaning up uploaded banner image:', cleanupError);
      }
      setBannerMessage(err instanceof Error ? `บันทึกแบนเนอร์ไม่สำเร็จ: ${err.message}` : 'บันทึกแบนเนอร์ไม่สำเร็จ');
    } finally {
      setBannerSaving(false);
    }
  }

  async function handleDeleteBanner(banner: AdminBanner) {
    if (!confirm(`ยืนยันลบแบนเนอร์ "${banner.title}" หรือไม่?`)) return;

    const { error } = await supabase.from('homepage_banners').delete().eq('id', banner.id);
    if (error) {
      console.error('Error deleting homepage banner:', error);
      alert(`ลบแบนเนอร์ไม่สำเร็จ: ${error.message}`);
      return;
    }

    const { error: storageError } = await supabase.storage.from('banner-images').remove([banner.image_path]);
    if (storageError) console.error('Error deleting banner image:', storageError);
    if (editingBannerId === banner.id) resetBannerForm();
    await fetchAdminData();
  }

  async function handleToggleBanner(banner: AdminBanner) {
    const { error } = await supabase
      .from('homepage_banners')
      .update({ is_active: !banner.is_active, updated_at: new Date().toISOString() })
      .eq('id', banner.id);
    if (error) {
      console.error('Error toggling homepage banner:', error);
      alert(`เปลี่ยนสถานะแบนเนอร์ไม่สำเร็จ: ${error.message}`);
      return;
    }
    setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, is_active: !item.is_active } : item));
  }

  // มอบ/ยกเลิกป้าย Verified Seller แบบแมนนวลในแท็บจัดการสมาชิก
  async function handleToggleVerified(userId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase.rpc('admin_set_profile_verified', {
        p_user_id: userId,
        p_is_verified: !currentStatus,
      });
      if (error) throw error;

      await fetchAdminData();
    } catch (err) {
      console.error('Error toggling verified:', err);
      alert('เปลี่ยนสถานะ Verified ไม่สำเร็จ กรุณาตรวจสอบว่ารัน migration verified_seller_status.sql ใน Supabase แล้ว');
    }
  }

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.status === reportFilter;
  });

  return (
    <div className="min-h-screen bg-[#0d0b14] text-gray-100 flex flex-col">
      {/* Header หลังบ้าน */}
      <header className="bg-[#151221] border-b border-purple-900/40 sticky top-0 z-40 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="relative h-8 w-32 flex items-center">
              <Image src="/logo.png" alt="SianCard" fill priority className="object-contain" />
            </Link>
            <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
              <Lock className="h-3 w-3" /> แดชบอร์ดแอดมิน
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/blacklist"
              className="text-xs text-purple-300 hover:text-white flex items-center gap-1 bg-purple-900/30 border border-purple-700/50 px-3 py-1.5 rounded-xl transition"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              <span>ดูศูนย์คนโกง (Blacklist)</span>
            </Link>

            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft className="h-4 w-4" /> กลับหน้าร้าน
            </Link>
          </div>
        </div>
      </header>

      {/* ถ้าผู้ใช้ไม่ได้มี Role admin */}
      {!loading && !isAdmin && (
        <main className="max-w-md w-full mx-auto px-4 py-20 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-950/50">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">จำกัดสิทธิ์เฉพาะแอดมิน</h1>
          <p className="text-sm text-gray-400 mb-6">
            {accessDeniedMessage || 'บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงแดชบอร์ดนี้'}
          </p>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition"
            >
              กลับสู่หน้าร้าน
            </Link>
            <Link
              href="/profile"
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold transition"
            >
              ดูโปรไฟล์
            </Link>
          </div>
        </main>
      )}

      {/* ถ้าเป็น Admin แต่ยังไม่ได้ปลดล็อก PIN / Secret Key */}
      {!loading && isAdmin && !isPinUnlocked && (
        <main className="max-w-md w-full mx-auto px-4 py-20 flex-1 flex flex-col items-center justify-center">
          <div className="w-full bg-[#171426] border border-purple-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-3 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">ระบบรักษาความปลอดภัย 2 ชั้น</h2>
              <p className="text-xs text-gray-400 mt-1">
                กรุณาระบุรหัส PIN หรือ Admin Key ประจำระบบเพื่อเข้าสู่แดชบอร์ด
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Admin PIN / Master Secret
                </label>
                <input
                  type="password"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="กรอกรหัส PIN (เช่น 6 หลัก)"
                  autoFocus
                  className="w-full px-4 py-3 bg-[#0d0b14] border border-purple-900/60 rounded-xl text-center text-lg tracking-widest text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-xs placeholder:tracking-normal placeholder:text-gray-600"
                />
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pinVerifying || !inputPin}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-purple-900/30"
              >
                {pinVerifying ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัสเข้าใช้งาน'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-purple-900/30 text-center">
              <p className="text-[11px] text-gray-500">
                สิทธิ์แอดมิน: <span className="text-purple-400">{currentUser?.email}</span>
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Main Content (แสดงเฉพาะ Admin ที่ปลดล็อก PIN แล้ว) */}
      {!loading && isAdmin && isPinUnlocked && (
      <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-6 flex-1">

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              resetBannerForm();
              setActiveTab('banners');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            เพิ่มแบนเนอร์
          </button>
        </div>

        {/* Stat Cards Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#171426] border border-purple-900/40 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>รายงานคนโกงรอตรวจ</span>
              <ShieldAlert className="h-4 w-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400">{stats.openReports} เคส</div>
          </div>

          <div className="bg-[#171426] border border-purple-900/40 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>บัญชีที่ถูกแบน</span>
              <XCircle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{stats.bannedUsers} บัญชี</div>
          </div>

          <div className="bg-[#171426] border border-purple-900/40 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>ประกาศการ์ดที่กำลังขาย</span>
              <Tag className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300">{stats.activeListings} รายการ</div>
          </div>

          <div className="bg-[#171426] border border-purple-900/40 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>สมาชิกทั้งหมด</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400">{stats.totalUsers} คน</div>
          </div>
        </div>

        {/* Navigation Tabs (Scrollable on Mobile) */}
        <div className="flex items-center gap-2 border-b border-purple-900/40 pb-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === 'reports'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-purple-900/30'
              }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>รายงานคนโกง ({stats.openReports})</span>
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === 'verifications'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-purple-900/30'
              }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>ตรวจบัตร KYC ({stats.pendingVerifications})</span>
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === 'listings'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-purple-900/30'
              }`}
          >
            <Tag className="h-4 w-4" />
            <span>ประกาศขาย ({stats.activeListings})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-purple-900/30'
              }`}
          >
            <Users className="h-4 w-4" />
            <span>สมาชิก ({stats.totalUsers})</span>
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${activeTab === 'banners'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-purple-900/30'
              }`}
          >
            <ImagePlus className="h-4 w-4" />
            <span>แบนเนอร์ ({banners.length})</span>
          </button>
        </div>

        {activeTab === 'banners' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <form onSubmit={handleSaveBanner} className="h-fit space-y-4 rounded-2xl border border-purple-900/40 bg-[#171426] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-white">{editingBannerId ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์ใหม่'}</h3>
                {editingBannerId && (
                  <button type="button" onClick={resetBannerForm} className="text-xs text-gray-400 hover:text-white">
                    ยกเลิกแก้ไข
                  </button>
                )}
              </div>

              {bannerMessage && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
                  {bannerMessage}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">หัวข้อ *</label>
                <input
                  required
                  maxLength={120}
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full rounded-xl border border-purple-900/60 bg-[#0d0b14] px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                  placeholder="เช่น เลือกหมวดหมู่ที่คุณสนใจ"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">ข้อความรอง</label>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full resize-y rounded-xl border border-purple-900/60 bg-[#0d0b14] px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                  placeholder="คำอธิบายสั้นๆ ใต้หัวข้อ"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  รูปแบนเนอร์ {editingBannerId ? '(ไม่เลือกเพื่อใช้รูปเดิม)' : '*'}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={!editingBannerId}
                  onChange={(e) => setBannerImageFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-900/60 file:px-3 file:py-2 file:font-semibold file:text-purple-100 hover:file:bg-purple-800"
                />
                <p className="mt-1 text-[11px] text-gray-500">JPG, PNG หรือ WEBP ไม่เกิน 8 MB แนะนำภาพแนวนอน 16:5</p>
                {bannerImageFile && <p className="mt-1 text-xs text-purple-300">{bannerImageFile.name}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-300">ลิงก์ปลายทาง</label>
                  <input
                    type="text"
                    value={bannerTargetUrl}
                    onChange={(e) => setBannerTargetUrl(e.target.value)}
                    className="w-full rounded-xl border border-purple-900/60 bg-[#0d0b14] px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                    placeholder="/guide หรือ https://..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-300">ข้อความปุ่ม</label>
                  <input
                    maxLength={30}
                    value={bannerButtonText}
                    onChange={(e) => setBannerButtonText(e.target.value)}
                    className="w-full rounded-xl border border-purple-900/60 bg-[#0d0b14] px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                    placeholder="ดูเพิ่มเติม"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={bannerIsActive}
                    onChange={(e) => setBannerIsActive(e.target.checked)}
                    className="accent-purple-600"
                  />
                  แสดงบนหน้าแรก
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  ลำดับ
                  <input
                    type="number"
                    value={bannerSortOrder}
                    onChange={(e) => setBannerSortOrder(e.target.value)}
                    className="w-20 rounded-lg border border-purple-900/60 bg-[#0d0b14] px-2 py-1.5 text-sm text-white"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={bannerSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-500 disabled:opacity-60"
              >
                {editingBannerId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {bannerSaving ? 'กำลังบันทึก...' : editingBannerId ? 'บันทึกแบนเนอร์' : 'เพิ่มแบนเนอร์'}
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-200">รายการแบนเนอร์ ({banners.length})</h3>
              {banners.length === 0 ? (
                <div className="rounded-2xl border border-purple-900/40 bg-[#171426] p-8 text-center text-sm text-gray-400">
                  ยังไม่มีแบนเนอร์ เพิ่มรายการแรกได้จากแบบฟอร์มนี้
                </div>
              ) : (
                banners.map((banner) => (
                  <div key={banner.id} className="overflow-hidden rounded-2xl border border-purple-900/40 bg-[#171426]">
                    <div className="relative h-32 sm:h-40">
                      <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
                      <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${banner.is_active ? 'bg-green-500/90 text-white' : 'bg-gray-900/90 text-gray-300'}`}>
                        {banner.is_active ? 'กำลังแสดง' : 'ปิดใช้งาน'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{banner.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-400">{banner.subtitle || 'ไม่มีข้อความรอง'}</p>
                        <p className="mt-1 text-[11px] text-purple-300">ลำดับ {banner.sort_order}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => handleToggleBanner(banner)} className="rounded-lg border border-purple-800 px-2.5 py-2 text-xs text-gray-200 hover:bg-purple-900/40">
                          {banner.is_active ? 'ซ่อน' : 'แสดง'}
                        </button>
                        <button type="button" onClick={() => handleEditBanner(banner)} className="rounded-lg border border-purple-800 p-2 text-purple-200 hover:bg-purple-900/40" title="แก้ไข">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteBanner(banner)} className="rounded-lg border border-red-900/70 p-2 text-red-300 hover:bg-red-950/50" title="ลบ">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 1: จัดการรายงานคนโกง พร้อมดูหลักฐาน (Scam Reports Management) */}
        {activeTab === 'reports' && (
          <div className="space-y-4">

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">สถานะ:</span>
              {(['open', 'resolved', 'dismissed', 'all'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setReportFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${reportFilter === st
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#171426] text-gray-400 hover:text-white border border-purple-900/30'
                    }`}
                >
                  {st === 'open' && '🔴 รอดำเนินการ'}
                  {st === 'resolved' && '✅ ตัดสินว่าโกง (แบนแล้ว)'}
                  {st === 'dismissed' && '⚪ ยกฟ้อง/หลักฐานไม่พอ'}
                  {st === 'all' && 'ทั้งหมด'}
                </button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <div className="bg-[#171426] border border-purple-900/30 rounded-3xl p-12 text-center text-gray-500 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                <p className="font-bold text-gray-300">ไม่มีรายการรายงานในหมวดนี้</p>
                <p className="text-xs">ตลาด SianCard ปลอดภัย ไร้มิจฉาชีพค้างการตรวจสอบ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredReports.map((report) => {
                  const isResolved = report.status === 'resolved';
                  const isDismissed = report.status === 'dismissed';

                  return (
                    <div
                      key={report.id}
                      className={`bg-[#171426] border rounded-2xl p-5 space-y-4 shadow-sm transition ${report.status === 'open'
                          ? 'border-red-500/60 bg-red-950/10'
                          : 'border-purple-900/40'
                        }`}
                    >
                      {/* Top Bar of Report */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/30 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase bg-red-500 text-white">
                              {report.status === 'open' ? 'รอดำเนินการ' : report.status === 'resolved' ? 'ตัดสินว่าโกง (แบนแล้ว)' : 'ยกฟ้อง'}
                            </span>
                            <span className="text-xs text-gray-400">
                              รายงานเมื่อ {new Date(report.created_at).toLocaleString('th-TH')}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-gray-200">
                            ผู้รายงาน: <span className="text-purple-300">{report.reporter_profile?.display_name || 'สมาชิก'}</span> ➔ ผู้ถูกรายงาน:{' '}
                            <span className="text-red-400 font-black">{report.reported_profile?.display_name || 'ผู้ขาย'}</span>
                          </div>
                        </div>

                        {/* ยอดเงินความเสียหาย */}
                        {report.scam_amount && (
                          <div className="bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-xl text-right">
                            <span className="text-[10px] text-red-300 block">มูลค่าความเสียหาย</span>
                            <span className="text-base font-black text-red-400">
                              ฿{Number(report.scam_amount).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ข้อมูลบัญชีคนโกง */}
                      {(report.bank_name || report.bank_account || report.account_name) && (
                        <div className="bg-[#1f1a33] p-3 rounded-xl border border-purple-900/40 text-xs space-y-1">
                          <div className="font-bold text-amber-300 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>ข้อมูลบัญชีที่ผู้แจ้งระบุว่าโกง:</span>
                          </div>
                          <div className="text-gray-300 flex flex-wrap gap-x-4">
                            <span>ธนาคาร: <strong>{report.bank_name || '-'}</strong></span>
                            <span>เลขบัญชี: <strong className="text-red-300 font-mono">{report.bank_account || '-'}</strong></span>
                            <span>ชื่อบัญชี: <strong>{report.account_name || '-'}</strong></span>
                          </div>
                        </div>
                      )}

                      {/* ข้อความเหตุการณ์ */}
                      <div className="space-y-1">
                        <span className="text-[11px] text-gray-400 block font-semibold">รายละเอียดเหตุการณ์:</span>
                        <p className="text-xs text-gray-200 bg-[#120f1e] p-3 rounded-xl border border-purple-950 whitespace-pre-line leading-relaxed">
                          {report.reason}
                        </p>
                      </div>

                      {/* แกลเลอรีรูปภาพหลักฐาน (สลิป/แชท) */}
                      {report.evidence_images && report.evidence_images.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            <span>หลักฐานที่แนบมา ({report.evidence_images.length} ภาพ - คลิกเพื่อดูรูปขยาย):</span>
                          </span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {report.evidence_images.map((imgUrl, idx) => (
                              <button
                                key={idx}
                                onClick={() => setPreviewImage(imgUrl)}
                                className="w-20 h-28 rounded-xl overflow-hidden border border-purple-700/50 shrink-0 relative group cursor-pointer hover:border-purple-400 transition"
                              >
                                <img src={imgUrl} alt="evidence" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <Eye className="h-5 w-5 text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons สำหรับแอดมิน */}
                      {report.status === 'open' && (
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-purple-900/30">
                          <button
                            type="button"
                            onClick={() => handleDismissReport(report.id)}
                            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            ยกฟ้อง (หลักฐานไม่พอ)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBanScammer(report)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>ตัดสินว่าโกง & แบนผู้ขายถาวร</span>
                          </button>
                        </div>
                      )}

                      {report.admin_notes && (
                        <div className="text-[11px] text-gray-400 bg-purple-950/20 px-3 py-1.5 rounded-lg border border-purple-900/30">
                          บันทึกแอดมิน: {report.admin_notes}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* Tab KYC: ตรวจบัตรยืนยันตัวตนผู้ขาย (Verification Requests) */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-200">
                รายการขอยืนยันตัวตนผู้ขาย ({verifications.length})
              </h3>
            </div>

            {verifications.length === 0 ? (
              <div className="bg-[#171426] border border-purple-900/40 rounded-2xl p-8 text-center text-gray-400 text-sm">
                ยังไม่มีคำขอยืนยันตัวตนเข้ามาในระบบ
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {verifications.map((v) => (
                  <div
                    key={v.id}
                    className="bg-[#171426] border border-purple-900/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/30 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center font-bold text-purple-300">
                          {v.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-2">
                            <span>{v.full_name}</span>
                            <span className="text-xs text-gray-400 font-normal">
                              (@{v.profile?.display_name || 'user'})
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            เบอร์โทร: <strong className="text-purple-300 font-mono">{v.phone_number || '-'}</strong> | อีเมล: {v.profile?.contact_email || '-'}
                          </div>
                          {v.facebook_url && (
                            <div className="text-[11px] text-blue-400 mt-0.5">
                              Facebook: <a href={v.facebook_url} target="_blank" rel="noreferrer" className="underline hover:text-blue-300">{v.facebook_url}</a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {v.status === 'pending' && (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold px-2.5 py-1 rounded-xl">
                            รอการตรวจสอบ
                          </span>
                        )}
                        {v.status === 'approved' && (
                          <span className="bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-bold px-2.5 py-1 rounded-xl">
                            ✓ อนุมัติแล้ว
                          </span>
                        )}
                        {v.status === 'rejected' && (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold px-2.5 py-1 rounded-xl">
                            ✕ ปฏิเสธแล้ว
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ข้อมูลบัญชีธนาคารรับเงิน & การยอมรับข้อตกลง */}
                    <div className="bg-[#120f1e] p-3 rounded-xl border border-purple-900/40 text-xs space-y-1">
                      <div className="font-bold text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>บัญชีธนาคารสำหรับรับเงิน:</span>
                        </span>
                        {v.terms_accepted && (
                          <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> ยอมรับเงื่อนไขความรับผิดชอบแล้ว
                          </span>
                        )}
                      </div>
                      <div className="text-gray-300 flex flex-wrap gap-x-4">
                        <span>ธนาคาร: <strong>{v.bank_name || '-'}</strong></span>
                        <span>เลขบัญชี: <strong className="text-purple-300 font-mono">{v.bank_account || '-'}</strong></span>
                        <span>ชื่อบัญชี: <strong className="text-white">{v.account_name || '-'}</strong></span>
                      </div>
                    </div>

                    {/* รูปภาพบัตรประชาชน และรูปเซลฟี่คู่บัตร */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-purple-300">
                        ภาพเอกสารหลักฐาน (คลิกเพื่อดูรูปขยายใหญ่):
                      </span>
                      <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div>
                          <span className="text-[11px] text-gray-400 block mb-1">1. รูปบัตรประชาชน</span>
                          <button
                            type="button"
                            onClick={() => handlePreviewVerificationDocument(v.id_card_photo)}
                            className="w-full h-36 rounded-xl overflow-hidden border border-purple-800/50 relative group cursor-pointer hover:border-purple-400 transition"
                          >
                            <div className="w-full h-full bg-purple-950/40 flex flex-col items-center justify-center gap-2 text-purple-200">
                              <Eye className="h-6 w-6" />
                              <span className="text-[11px]">ดูเอกสารส่วนตัว</span>
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="h-6 w-6 text-white" />
                            </div>
                          </button>
                        </div>

                        <div>
                          <span className="text-[11px] text-gray-400 block mb-1">2. รูปถ่ายหน้าคู่บัตร (Selfie)</span>
                          <button
                            type="button"
                            onClick={() => handlePreviewVerificationDocument(v.selfie_photo)}
                            className="w-full h-36 rounded-xl overflow-hidden border border-purple-800/50 relative group cursor-pointer hover:border-purple-400 transition"
                          >
                            <div className="w-full h-full bg-purple-950/40 flex flex-col items-center justify-center gap-2 text-purple-200">
                              <Eye className="h-6 w-6" />
                              <span className="text-[11px]">ดูเอกสารส่วนตัว</span>
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="h-6 w-6 text-white" />
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {v.admin_notes && (
                      <div className="text-xs text-red-400 bg-red-950/20 p-2.5 rounded-xl border border-red-900/30">
                        เหตุผลการปฏิเสธ: {v.admin_notes}
                      </div>
                    )}

                    {/* ปุ่มอนุมัติ / ปฏิเสธสำหรับแอดมิน */}
                    {v.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-900/30">
                        <button
                          type="button"
                          onClick={() => handleRejectVerification(v)}
                          className="px-4 py-2 bg-gray-800 hover:bg-red-950/40 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          ปฏิเสธคำขอ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveVerification(v)}
                          className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>อนุมัติและมอบป้าย Verified</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: จัดการประกาศขายการ์ด (Listings) */}
        {activeTab === 'listings' && (
          <div className="bg-[#171426] border border-purple-900/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-purple-900/40 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-200">รายการประกาศขายทั้งหมด ({listings.length})</h3>
            </div>
            <div className="divide-y divide-purple-950 max-h-[600px] overflow-y-auto">
              {listings.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-purple-950/20 transition">
                  <div className="flex items-center gap-3">
                    {item.cards?.image_url ? (
                      <img src={item.cards.image_url} alt="card" className="w-10 h-14 object-cover rounded shadow-xs" />
                    ) : (
                      <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center text-xs">No img</div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-gray-200">{item.cards?.name}</div>
                      <div className="text-xs text-purple-300">
                        ผู้ขาย: {item.profiles?.display_name} • สภาพ {item.condition} • ฿{Number(item.price_thb).toLocaleString()}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                        }`}>
                        สถานะ: {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/listings/create/${item.listing_code}`}
                      target="_blank"
                      className="p-2 text-gray-400 hover:text-white"
                      title="ดูประกาศ"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteListing(item.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition"
                      title="ลบประกาศนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: จัดการสมาชิก (Users & Verification) */}
        {activeTab === 'users' && (
          <div className="bg-[#171426] border border-purple-900/40 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-purple-900/40 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-200">รายชื่อสมาชิกในระบบ ({users.length})</h3>
            </div>
            <div className="divide-y divide-purple-950 max-h-[600px] overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-4 hover:bg-purple-950/20 transition">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-900/60 text-purple-300 flex items-center justify-center font-bold">
                        {u.display_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-gray-200 flex items-center gap-1.5">
                        {u.display_name}
                        {u.is_verified && (
                          <span title="Verified Seller">
                            <ShieldCheck className="h-4 w-4 text-green-400" />
                          </span>
                        )}
                        {u.is_banned && (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-1.5 rounded">
                            BANNED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        LINE: {u.line_id || '-'} | อีเมล: {u.contact_email || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => u.id && handleToggleVerified(u.id, !!u.is_verified)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl border transition ${u.is_verified
                          ? 'border-green-600/50 text-green-400 bg-green-950/20 hover:bg-green-950/40'
                          : 'border-gray-700 text-gray-400 hover:text-white'
                        }`}
                    >
                      {u.is_verified ? '✓ ป้าย Verified แล้ว' : '+ ให้ป้าย Verified'}
                    </button>

                    <Link
                      href={`/sellers/${u.id}`}
                      target="_blank"
                      className="p-2 text-gray-400 hover:text-white"
                      title="ดูโปรไฟล์"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      )}

      {/* Modal ดูรูปภาพหลักฐานขยายใหญ่ */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img src={previewImage} alt="proof full" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
