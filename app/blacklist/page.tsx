'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Report } from '@/types/database';
import ReportModal from '@/components/ReportModal';
import { 
  ShieldAlert, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  Building2, 
  FileText, 
  DollarSign, 
  Eye, 
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';

function LoadingBlacklist() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-600 font-medium animate-pulse">
      กำลังโหลดข้อมูลศูนย์คนโกง...
    </div>
  );
}

export default function BlacklistPage() {
  return (
    <Suspense fallback={<LoadingBlacklist />}>
      <BlacklistContent />
    </Suspense>
  );
}

function BlacklistContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    fetchBlacklist();
  }, []);

  async function fetchBlacklist() {
    setLoading(true);
    // ดึงเฉพาะเคสที่ตัดสินว่าโกงแล้ว (status = 'resolved')
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter_profile:profiles!reporter_id(display_name),
        reported_profile:profiles!reported_user_id(display_name, avatar_url)
      `)
      .eq('status', 'resolved')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
    setLoading(false);
  }

  // ค้นหาตามชื่อคนโกง เลขบัญชี หรือชื่อธนาคาร
  const filteredReports = reports.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const sellerName = r.reported_profile?.display_name?.toLowerCase() || '';
    const accountNum = r.bank_account?.toLowerCase() || '';
    const accName = r.account_name?.toLowerCase() || '';
    const bank = r.bank_name?.toLowerCase() || '';
    const reason = r.reason.toLowerCase();

    return (
      sellerName.includes(term) ||
      accountNum.includes(term) ||
      accName.includes(term) ||
      bank.includes(term) ||
      reason.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-9 w-36">
              <Image
                src="/logo.png"
                alt="SianCard Logo"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>+ แจ้งคนโกง</span>
            </button>
            <Link
              href="/"
              className="flex items-center text-xs font-semibold text-purple-200 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> หน้าแรก
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-[#0f0c1b] to-red-950 text-white py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-400/30 px-3.5 py-1 text-xs font-bold text-red-300">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            ศูนย์ตรวจสอบประวัติคนโกง & บัญชีดำ SianCard
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            เช็คชื่อคนโกง & เลขบัญชี <span className="text-red-400">ก่อนโอนเงิน</span>
          </h1>
          <p className="text-sm text-red-200/90 max-w-xl mx-auto leading-relaxed">
            ค้นหาประวัติมิจฉาชีพในวงการการ์ดสะสม มีหลักฐานสลิปและภาพแชทประกอบ เพื่อความปลอดภัยสูงสุดของคุณ
          </p>

          {/* กล่องค้นหาคนโกง */}
          <div className="max-w-xl mx-auto pt-3">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="พิมพ์ชื่อคนขาย, เลขที่บัญชีธนาคาร หรือเบอร์พร้อมเพย์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white text-gray-900 rounded-2xl shadow-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <h2 className="text-base font-extrabold text-gray-900">
              รายชื่อมิจฉาชีพที่ถูกแบน ({filteredReports.length} บัญชี)
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            มีหลักฐานสลิป/แชทยืนยันทุกเคส
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-red-600 font-medium animate-pulse">
            กำลังโหลดข้อมูลบัญชีดำ...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500 space-y-2 shadow-xs">
            <ShieldCheck className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="font-bold text-base text-gray-800">
              {searchTerm ? 'ไม่พบประวัติการโกงตามคำค้นหานี้' : 'ยังไม่มีรายชื่อมิจฉาชีพในระบบ'}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              หากคุณพบผู้ขายที่มีพฤติกรรมน่าสงสัยหรือโดนโกงเงิน สามารถกดปุ่ม &quot;แจ้งคนโกง&quot; เพื่อให้แอดมินตรวจสอบได้ทันที
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-3xl border border-red-200 p-6 space-y-4 shadow-xs hover:shadow-md transition"
              >
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full">
                        บัญชีดำ (BANNED)
                      </span>
                      <span className="text-xs text-gray-400">
                        ยืนยันเมื่อ {new Date(report.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mt-1">
                      ชื่อผู้ขาย: <span className="text-red-600">{report.reported_profile?.display_name || report.account_name || 'มิจฉาชีพ'}</span>
                    </h3>
                  </div>

                  {report.scam_amount && (
                    <div className="bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-2xl text-right">
                      <span className="text-[10px] text-red-600 font-medium block">ยอดเงินที่โกง</span>
                      <span className="text-lg font-black text-red-600">
                        ฿{Number(report.scam_amount).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* บัญชีธนาคารคนโกง */}
                {(report.bank_name || report.bank_account || report.account_name) && (
                  <div className="bg-red-50/60 border border-red-200 p-3.5 rounded-2xl text-xs space-y-1">
                    <div className="font-bold text-red-800 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-red-600" />
                      <span>ข้อมูลบัญชีธนาคารคนโกง:</span>
                    </div>
                    <div className="text-gray-800 flex flex-wrap gap-x-6 gap-y-1">
                      <span>ธนาคาร: <strong>{report.bank_name || '-'}</strong></span>
                      <span>เลขบัญชี: <strong className="text-red-600 font-mono text-sm">{report.bank_account || '-'}</strong></span>
                      <span>ชื่อบัญชี: <strong>{report.account_name || '-'}</strong></span>
                    </div>
                  </div>
                )}

                {/* เหตุการณ์ */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-700">พฤติการณ์การโกง:</span>
                  <p className="text-xs text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded-2xl border border-gray-100 leading-relaxed">
                    {report.reason}
                  </p>
                </div>

                {/* รูปภาพหลักฐาน (สลิป/แชท) */}
                {report.evidence_images && report.evidence_images.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                      <span>ภาพหลักฐานที่ผ่านการตรวจสอบ ({report.evidence_images.length} ภาพ - คลิกเพื่อดูรูปใหญ่):</span>
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {report.evidence_images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPreviewImage(img)}
                          className="w-20 h-28 rounded-xl overflow-hidden border border-gray-200 shrink-0 relative group cursor-pointer hover:border-red-500 transition"
                        >
                          <img src={img} alt="proof" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye className="h-5 w-5 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Modal ดูรูปหลักฐานขยายใหญ่ */}
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

      {/* Modal แจ้งรายงานคนโกง */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          fetchBlacklist();
        }}
      />
    </div>
  );
}

