import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  Camera, 
  MessageSquare, 
  ShieldCheck, 
  PlusCircle, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2,
  Tag,
  Star,
  Globe
} from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-50 shadow-md">
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

          <Link
            href="/"
            className="flex items-center text-xs font-semibold text-purple-200 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> กลับหน้าแรก
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-[#0f0c1b] to-purple-950 text-white py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3.5 py-1 text-xs font-bold text-purple-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            คู่มือสำหรับผู้ใช้งาน SianCard
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            วิธีใช้งานเว็บ <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">เซียนการ์ด</span>
          </h1>
          <p className="text-sm text-purple-200 max-w-xl mx-auto leading-relaxed">
            แหล่งรวมการ์ดสะสม TCG ยอดนิยม ซื้อ-ขายปลอดภัย เช็คราคากลางอ้างอิง TCGPlayer คุยแชทสดในระบบ และดูรูปถ่ายจริงของการ์ดได้ทุกใบ
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 -mt-6 space-y-10">
        
        {/* สำหรับผู้ซื้อ (Buyer Guide) */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
              🛒
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">ขั้นตอนสำหรับผู้ซื้อ (How to Buy)</h2>
              <p className="text-xs text-gray-500">วิธีค้นหาการ์ด เปรียบเทียบราคา และติดต่อผู้ขาย</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="bg-purple-50/40 rounded-2xl p-5 border border-purple-100 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                1
              </div>
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <Search className="h-4 w-4 text-purple-600" />
                ค้นหา & เช็คราคากลาง
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                พิมพ์ชื่อการ์ดที่ต้องการ หรือเลือกหมวดเกม (Pokémon, One Piece, Yu-Gi-Oh!) พร้อมดูกล่อง <strong>SianCard Price Guide</strong> และราคาตลาดโลกจาก <strong>TCGPlayer</strong> เพื่อไม่ให้ซื้อแพงเกินราคาตลาด
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-purple-50/40 rounded-2xl p-5 border border-purple-100 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                2
              </div>
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-purple-600" />
                ตรวจดูรูปถ่ายจริง & สภาพ
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                สังเกตป้าย <span className="bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded text-[10px]">📸 รูปจริง</span> เพื่อดูภาพถ่ายการ์ดจริงจากผู้ขาย ซูมตรวจขอบ มุม รอยขนแมว และระดับสภาพการ์ด (NM, LP, MP)
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-purple-50/40 rounded-2xl p-5 border border-purple-100 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                3
              </div>
              <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                ทักแชทสด & นัดรับ
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                กดปุ่ม <strong>&quot;ทักแชทสดผู้ขาย&quot;</strong> เพื่อสอบถามรายละเอียด ขอดูคลิปเพิ่มเติม ต่อรองราคา หรือนัดรับตามแนวรถไฟฟ้า/ร้านการ์ดได้อย่างสะดวก
              </p>
            </div>

          </div>
        </section>

        {/* สำหรับผู้ขาย (Seller Guide) */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
            <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
              🏷️
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">ขั้นตอนสำหรับผู้ขาย (How to Sell)</h2>
              <p className="text-xs text-gray-500">ลงขายง่าย รวดเร็ว พร้อมฐานข้อมูลอัจฉริยะ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 space-y-2">
              <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">สเต็ป 1</span>
              <h4 className="font-bold text-xs text-gray-900">เลือกหรือเพิ่มการ์ด</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                ค้นหาการ์ดในระบบ หากไม่พบ สามารถกด <em>&quot;ค้นหาจากฐานข้อมูลสากล (Pokémon API)&quot;</em> หรือ <em>&quot;กรอกข้อมูลการ์ดเอง&quot;</em> ได้ทันที
              </p>
            </div>

            <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 space-y-2">
              <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">สเต็ป 2</span>
              <h4 className="font-bold text-xs text-gray-900">ระบุสภาพ & ใช้ราคาแนะนำ</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                เลือกสภาพการ์ด (NM/LP/MP) ระบบจะคำนวณราคาตลาดโลก TCGPlayer ให้อัตโนมัติ สามารถกดปุ่ม <strong>&quot;ใช้ราคานี้&quot;</strong> ได้เลย
              </p>
            </div>

            <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 space-y-2">
              <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">สเต็ป 3</span>
              <h4 className="font-bold text-xs text-gray-900">อัปโหลดรูปจริงของการ์ด</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                ถ่ายภาพจริงด้านหน้า ด้านหลัง และมุมการ์ดให้คมชัด เพื่อสร้างความมั่นใจให้ผู้ซื้อและปิดการขายได้ไวขึ้น
              </p>
            </div>

            <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 space-y-2">
              <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">สเต็ป 4</span>
              <h4 className="font-bold text-xs text-gray-900">ปิดดีล & รับรีวิว</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                เมื่อขายสำเร็จ ไปที่เมนู <strong>&quot;การ์ดของฉัน&quot;</strong> กดทำเครื่องหมาย <em>&quot;ขายแล้ว&quot;</em> เพื่อบันทึกประวัติและรับคะแนนดาวรีวิว
              </p>
            </div>

          </div>
        </section>

        {/* มาตรฐานสภาพการ์ด (Card Condition Standards) */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <Tag className="h-5 w-5 text-purple-600" />
            มาตรฐานการประเมินสภาพการ์ด (Condition Guide)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-1">
              <span className="inline-block bg-green-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md">NM</span>
              <div className="font-bold text-xs text-gray-900">Near Mint (95%+)</div>
              <p className="text-[11px] text-gray-500">สภาพสวยคมกริบ ไร้รอย หรือมีรอยขอบขาวเล็กน้อยจนแทบมองไม่เห็น</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-1">
              <span className="inline-block bg-blue-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md">LP</span>
              <div className="font-bold text-xs text-gray-900">Lightly Played (85%+)</div>
              <p className="text-[11px] text-gray-500">มีรอยขอบขาวเล็กน้อย รอยขนแมวเบาบาง ไม่ส่งผลต่อภาพรวม</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-1">
              <span className="inline-block bg-amber-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md">MP</span>
              <div className="font-bold text-xs text-gray-900">Moderately Played</div>
              <p className="text-[11px] text-gray-500">มีรอยขอบขาวชัดเจน รอยขูดขีด หรือมุมการ์ดเริ่มมีรอยพับเล็กๆ</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-1">
              <span className="inline-block bg-orange-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md">HP</span>
              <div className="font-bold text-xs text-gray-900">Heavily Played</div>
              <p className="text-[11px] text-gray-500">รอยชำรุดมาก รอยพับชัดเจน แต่ยังอ่านการ์ดและใส่ซองเล่นได้</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-1">
              <span className="inline-block bg-red-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md">DMG</span>
              <div className="font-bold text-xs text-gray-900">Damaged</div>
              <p className="text-[11px] text-gray-500">การ์ดฉีกขาด เปียกน้ำ มีรอยพับหัก หรือรอยขีดเขียน</p>
            </div>
          </div>
        </section>

        {/* ข้อควรระวัง & ความปลอดภัย (Safety First) */}
        <section className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-extrabold text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span>คำแนะนำเพื่อความปลอดภัยในการซื้อ-ขาย (Safety Tips)</span>
          </div>

          <ul className="text-xs text-amber-900 space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>สำหรับการ์ดราคาสูง:</strong> แนะนำให้นัดรับตรวจสภาพการ์ดจริงด้วยตนเองตามแนวรถไฟฟ้า หรือตามร้านการ์ด (LGS) ที่มีคนพลุกพล่าน</li>
            <li><strong>ตรวจดูโปรไฟล์ผู้ขาย:</strong> ตรวจสอบป้ายยืนยันตัวตน <ShieldCheck className="h-3.5 w-3.5 text-green-600 inline" /> และรีวิวจากผู้ซื้อคนก่อนๆ ในหน้าโปรไฟล์ร้านค้า</li>
            <li><strong>กรณีส่งพัสดุ:</strong> แนะนำให้ผู้ขายถ่ายคลิปวิดีโอขณะแพ็คการ์ดลงกล่อง และผู้ซื้อถ่ายคลิปขณะแกะกล่องพัสดุเป็นหลักฐานเสมอ</li>
          </ul>
        </section>

        {/* ปุ่มลัดเริ่มต้นใช้งาน */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-md transition text-center text-sm"
          >
            🔍 เริ่มต้นค้นหาการ์ด
          </Link>
          <Link
            href="/listings/create"
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-bold rounded-2xl transition text-center text-sm"
          >
            + ลงประกาศขายการ์ดของคุณ
          </Link>
        </div>

      </main>
    </div>
  );
}

