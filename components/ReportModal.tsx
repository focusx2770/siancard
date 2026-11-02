'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  X, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  DollarSign, 
  Building2,
  FileText,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId?: string | null;
  reportedUserName?: string | null;
  reportedListingId?: string | null;
  cardName?: string | null;
}

const scamCategories = [
  'โอนเงินแล้วไม่ส่งของ (โกงเงิน)',
  'ส่งการ์ดปลอม (Fake Card)',
  'สลิปโอนเงินปลอม / หลอกลวง',
  'การ์ดไม่ตรงปก / ปิดบังตำหนิอย่างหนัก',
  'พฤติกรรมหลอกลวงหรือคุกคามอื่นๆ',
];

export default function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  reportedListingId,
  cardName,
}: ReportModalProps) {
  const [category, setCategory] = useState(scamCategories[0]);
  const [scamAmount, setScamAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [description, setDescription] = useState('');

  // Evidence Images
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
          alert(`ไฟล์ "${file.name}" ต้องเป็นรูปภาพ JPG, PNG หรือ WEBP เท่านั้น`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          alert(`ไฟล์ "${file.name}" ขนาดเกิน 5MB`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setEvidenceFiles((prev) => [...prev, ...validFiles]);
        const previews = validFiles.map((f) => URL.createObjectURL(f));
        setEvidencePreviews((prev) => [...prev, ...previews]);
      }
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!description.trim()) {
      setErrorMsg('กรุณาระบุรายละเอียดเหตุการณ์');
      return;
    }

    setSubmitting(true);

    try {
      // 1. ตรวจสอบการล็อกอิน
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg('กรุณาเข้าสู่ระบบก่อนส่งรายงาน');
        setSubmitting(false);
        return;
      }

      // 2. อัปโหลดรูปภาพหลักฐาน (สลิป/แชท)
      const evidenceUrls: string[] = [];
      if (evidenceFiles.length > 0) {
        for (let i = 0; i < evidenceFiles.length; i++) {
          const file = evidenceFiles[i];
          const rawExt = file.name.split('.').pop() || 'jpg';
          const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
          const fileName = `evidence/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('card-images')
            .upload(fileName, file, {
              contentType: file.type || 'image/jpeg',
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('card-images')
              .getPublicUrl(fileName);
            evidenceUrls.push(publicUrl);
          }
        }
      }

      // 3. บันทึกลงตาราง reports
      const reasonText = `[${category}] ${description.trim()}`;
      const { error: insertError } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        reported_listing_id: reportedListingId || null,
        reason: reasonText,
        status: 'open',
        evidence_images: evidenceUrls,
        scam_amount: scamAmount ? Number(scamAmount) : null,
        bank_name: bankName.trim() || null,
        bank_account: bankAccount.trim() || null,
        account_name: accountName.trim() || null,
      });

      if (insertError) throw insertError;

      setIsSuccess(true);
    } catch (err: unknown) {
      console.error('Error submitting report:', err);
      setErrorMsg(err instanceof Error ? err.message : 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 my-8 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* ปิดหน้าต่าง */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-gray-900">ส่งรายงานและหลักฐานสำเร็จแล้ว!</h3>
            <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
              ทีมงานแอดมิน SianCard ได้รับรายงานและหลักฐานของคุณแล้ว จะทำการตรวจสอบประวัติและดำเนินการแบนผู้กระทำผิดอย่างเด็ดขาดโดยเร็วที่สุดครับ
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl shadow hover:bg-gray-800 transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-gray-900">แจ้งรายงานคนโกง / ผู้ขาย</h3>
                <p className="text-xs text-gray-500">
                  {reportedUserName ? `รายงาน: ${reportedUserName}` : 'รายงานประกาศหรือผู้ขายที่ไม่เหมาะสม'}
                  {cardName ? ` • การ์ด: ${cardName}` : ''}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* หมวดหมู่การโกง */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ประเภทพฤติกรรมโกง</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:border-red-500 focus:outline-none"
              >
                {scamCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* ยอดเงินความเสียหาย & ข้อมูลบัญชีคนโกง */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                  <span>ยอดเงินที่เสียหาย (บาท)</span>
                </label>
                <input
                  type="number"
                  placeholder="เช่น 1500"
                  value={scamAmount}
                  onChange={(e) => setScamAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span>ธนาคารคนโกง</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น กสิกรไทย, พร้อมเพย์"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">เลขที่บัญชี / พร้อมเพย์คนโกง</label>
                <input
                  type="text"
                  placeholder="เลขที่บัญชีคนโกง"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อบัญชีคนโกง</label>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล คนโกง"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* รายละเอียดเหตุการณ์ */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <span>ลำดับเหตุการณ์อย่างละเอียด <span className="text-red-500">*</span></span>
              </label>
              <textarea
                rows={3}
                placeholder="เล่ารายละเอียด เช่น ตกลงซื้อการ์ด โอนเงินวันที่ 2 พ.ย. แล้วผู้ขายบล็อกแชท ไม่ส่งของ..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:border-red-500 focus:outline-none"
                required
              />
            </div>

            {/* อัปโหลดรูปภาพหลักฐาน (สลิปโอนเงิน / แคปแชท) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                <span>📸 แนบรูปภาพหลักฐาน (สลิปโอนเงิน, ภาพแคปแชท, รูปการ์ดปลอม)</span>
                <span className="text-[10px] text-gray-400">{evidenceFiles.length} รูป</span>
              </label>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <label className="h-20 border-2 border-dashed border-red-200 hover:border-red-400 bg-red-50/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
                  <Upload className="h-5 w-5 text-red-500 mb-0.5" />
                  <span className="text-[10px] font-bold text-red-700">แนบรูป</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleSelectFiles}
                    className="hidden"
                  />
                </label>

                {evidencePreviews.map((src, idx) => (
                  <div key={idx} className="relative h-20 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={src} alt="evidence" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 bg-black/70 text-white p-0.5 rounded-full hover:bg-red-600 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ปุ่มกด Submit */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>กำลังส่งข้อมูล...</span>
                  </>
                ) : (
                  <span>ส่งรายงานให้แอดมิน</span>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

