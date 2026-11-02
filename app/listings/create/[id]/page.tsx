'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/database';
import { getWishlistIds, toggleWishlist } from '@/lib/wishlist';
import { fetchExternalPrice, ExternalCardPrice } from '@/lib/card-price';
import ReportModal from '@/components/ReportModal';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Tag, 
  MessageCircle, 
  Mail, 
  AlertTriangle, 
  Calendar, 
  User, 
  Heart, 
  TrendingDown, 
  BarChart2, 
  Sparkles,
  CheckCircle2,
  Globe,
  MessageSquare,
  Camera,
  ShieldAlert
} from 'lucide-react';

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
      กำลังโหลดข้อมูลการ์ด...
    </div>
  );
}

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ListingDetailContent />
    </Suspense>
  );
}

function ListingDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Wishlist State
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Market Price Stats State
  const [marketStats, setMarketStats] = useState<{
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    sampleCount: number;
  } | null>(null);

  // External Price State (Pokémon TCG API / TCGplayer)
  const [externalPrice, setExternalPrice] = useState<ExternalCardPrice | null>(null);

  // Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    fetchListingDetail();
    checkWishlist();
  }, [id]);

  async function checkWishlist() {
    const ids = await getWishlistIds();
    setIsWishlisted(ids.includes(id));
  }

  async function handleToggleWishlist() {
    const newState = await toggleWishlist(id);
    setIsWishlisted(newState);
  }

  async function fetchListingDetail() {
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        cards (*, games(*), card_sets(*)),
        profiles (*),
        listing_images (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching listing detail:', error);
    } else if (data) {
      setListing(data);
      const mainImg = data.listing_images?.[0]?.image_url || data.cards?.image_url;
      setSelectedImage(mainImg);

      // ดึงสถิติราคากลางของการ์ดใบนี้
      fetchPriceStats(data.card_id, data.condition, data.price_thb);

      // ดึงราคาอ้างอิงจากภายนอก (Pokémon TCG API)
      fetchExternalPrice(data.cards?.name, data.cards?.card_number, data.cards?.games?.name)
        .then((ext) => {
          if (ext && ext.marketPriceTHB) {
            setExternalPrice(ext);
          }
        })
        .catch((err) => console.error('Error fetching external price:', err));
    }
    setLoading(false);
  }

  // คำนวณราคากลางจากข้อมูลตลาดในระบบ
  async function fetchPriceStats(cardId: string, condition: string, currentPrice: number) {
    // 1. ดึงข้อมูลจาก View card_price_stats
    const { data: viewStats } = await supabase
      .from('card_price_stats')
      .select('*')
      .eq('card_id', cardId)
      .eq('condition', condition)
      .maybeSingle();

    if (viewStats && viewStats.median_price) {
      setMarketStats({
        medianPrice: Number(viewStats.median_price),
        minPrice: Number(viewStats.min_price),
        maxPrice: Number(viewStats.max_price),
        sampleCount: Number(viewStats.deal_count),
      });
      return;
    }

    // 2. Fallback: คำนวณจากประกาศการ์ดใบเดียวกันที่กำลังวางขายอยู่
    const { data: sameCardListings } = await supabase
      .from('listings')
      .select('price_thb')
      .eq('card_id', cardId)
      .eq('condition', condition);

    if (sameCardListings && sameCardListings.length > 0) {
      const prices = sameCardListings.map((l) => Number(l.price_thb)).sort((a, b) => a - b);
      const min = prices[0];
      const max = prices[prices.length - 1];
      const midIndex = Math.floor(prices.length / 2);
      const median = prices.length % 2 !== 0 ? prices[midIndex] : (prices[midIndex - 1] + prices[midIndex]) / 2;

      setMarketStats({
        medianPrice: median,
        minPrice: min,
        maxPrice: max,
        sampleCount: prices.length,
      });
    } else {
      // ถ้าไม่มีการ์ดอื่น ให้ยึดราคาของประกาศนี้เป็นฐาน
      setMarketStats({
        medianPrice: currentPrice,
        minPrice: currentPrice,
        maxPrice: currentPrice,
        sampleCount: 1,
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
        กำลังโหลดข้อมูลการ์ด...
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500 space-y-4 px-4">
        <p className="text-lg font-semibold text-gray-800">ไม่พบรายการขายนี้ หรือรายการอาจถูกลบไปแล้ว</p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-indigo-500 shadow-md transition"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  // รูปภาพทั้งหมด
  const allImages = [
    ...(listing.listing_images?.map((img) => img.image_url) || []),
    ...(listing.cards?.image_url ? [listing.cards.image_url] : []),
  ];

  // คำนวณความคุ้มค่าเทียบกับราคากลาง
  const currentPrice = Number(listing.price_thb);
  const medianPrice = marketStats?.medianPrice || currentPrice;
  const isLowerThanMarket = marketStats && currentPrice < medianPrice;
  const discountPercent = isLowerThanMarket
    ? Math.round(((medianPrice - currentPrice) / medianPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
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
            <Link
              href="/wishlist"
              className="p-2 text-purple-200 hover:text-white hover:bg-purple-900/40 rounded-xl transition border border-purple-800/60"
              title="ดูรายการโปรด"
            >
              <Heart className="h-4 w-4" />
            </Link>

            <button
              onClick={() => router.back()}
              className="flex items-center text-xs font-semibold text-purple-200 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> ย้อนกลับ
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* ฝั่งซ้าย: Gallery รูปภาพ */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-4 flex items-center justify-center h-[300px] sm:h-[420px] shadow-sm relative overflow-hidden">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={listing.cards?.name}
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              ) : (
                <Tag className="h-20 w-20 text-gray-300" />
              )}
              
              {/* ป้ายกำกับสภาพการ์ด & ป้ายรูปจริง */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                <span className="bg-black/75 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-md border border-white/10">
                  สภาพ {listing.condition}
                </span>
                {listing.listing_images?.some((img) => img.image_url === selectedImage) && (
                  <span className="bg-purple-600/90 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm border border-purple-400/30 flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    รูปถ่ายจริงของการ์ด
                  </span>
                )}
              </div>

              {/* ปุ่ม Wishlist บนรูป */}
              <button
                onClick={handleToggleWishlist}
                className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-110 cursor-pointer ${
                  isWishlisted
                    ? 'bg-red-50 text-red-500 border border-red-200'
                    : 'bg-white/90 backdrop-blur-md text-gray-400 hover:text-red-500'
                }`}
                title={isWishlisted ? 'นำออกจากรายการโปรด' : 'บันทึกลงรายการโปรด'}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>

            {/* Thumbnail List พร้อมป้ายระบุรูปจริง / รูปฐานข้อมูล */}
            {allImages.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5 text-purple-600" />
                  <span>รูปภาพทั้งหมด ({allImages.length} รูป - คลิกเพื่อดูรูปขยาย):</span>
                </span>
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {allImages.map((imgUrl, index) => {
                    const isRealPhoto = listing.listing_images?.some((img) => img.image_url === imgUrl);
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(imgUrl)}
                        className={`relative w-20 h-24 rounded-2xl border-2 overflow-hidden flex-shrink-0 transition cursor-pointer group ${
                          selectedImage === imgUrl ? 'border-purple-600 scale-95 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt={`thumbnail-${index}`} className="w-full h-full object-cover" />
                        <span className={`absolute bottom-0 inset-x-0 text-[9px] font-bold py-0.5 text-center text-white ${
                          isRealPhoto ? 'bg-purple-700/90' : 'bg-gray-800/80'
                        }`}>
                          {isRealPhoto ? `รูปจริง ${index + 1}` : 'ภาพทางการ'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ฝั่งขวา: รายละเอียด & สถิติราคากลาง & ปุ่มติดต่อขาย */}
          <div className="space-y-6">
            
            {/* หัวข้อและราคา */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-purple-700">
                <span className="bg-purple-100 px-2.5 py-1 rounded-md">{listing.cards?.games?.name || 'TCG'}</span>
                <span>•</span>
                <span>{listing.cards?.card_sets?.name} ({listing.cards?.card_sets?.code})</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{listing.cards?.name}</h1>
              <p className="text-sm text-gray-500">
                หมายเลขการ์ด: <span className="font-semibold text-gray-700">{listing.cards?.card_number || '-'}</span> | 
                ความหายาก: <span className="font-semibold text-purple-600">{listing.cards?.rarity || '-'}</span> | 
                ภาษา: <span className="font-semibold text-gray-700">{listing.cards?.language}</span>
              </p>

              <div className="pt-4 border-t border-gray-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">ราคาของผู้ขาย</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-purple-600">
                      ฿{currentPrice.toLocaleString()}
                    </span>
                    {discountPercent > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <TrendingDown className="h-3.5 w-3.5" />
                        ถูกกว่าตลาด {discountPercent}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium">คงเหลือ</span>
                  <span className="text-sm font-bold text-gray-700">{listing.quantity} ใบ</span>
                </div>
              </div>
            </div>

            {/* กล่องแสดงสถิติราคากลางตลาด (Market Price Guide Widget) */}
            {marketStats && (
              <div className="bg-gradient-to-br from-purple-50/60 via-indigo-50/40 to-white rounded-3xl border border-purple-200 p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-purple-600" />
                    <span className="font-bold text-sm text-gray-900">สถิติราคากลางตลาด (SianCard Price Guide)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                    สภาพ {listing.condition}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/80 p-3 rounded-2xl border border-purple-100 shadow-xs">
                    <span className="text-[11px] text-gray-400 block">ราคาต่ำสุด</span>
                    <span className="text-sm sm:text-base font-extrabold text-gray-800 mt-0.5 block">
                      ฿{marketStats.minPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border-2 border-purple-400 shadow-sm">
                    <span className="text-[11px] text-purple-700 font-bold block">ราคากลาง (Median)</span>
                    <span className="text-sm sm:text-base font-black text-purple-600 mt-0.5 block">
                      ฿{marketStats.medianPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-white/80 p-3 rounded-2xl border border-purple-100 shadow-xs">
                    <span className="text-[11px] text-gray-400 block">ราคาสูงสุด</span>
                    <span className="text-sm sm:text-base font-extrabold text-gray-800 mt-0.5 block">
                      ฿{marketStats.maxPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 pt-1 flex items-center justify-between">
                  <span>คำนวณจากประวัติการซื้อ-ขายและตลาดอ้างอิง ({marketStats.sampleCount} รายการ)</span>
                  {isLowerThanMarket ? (
                    <span className="font-bold text-green-600 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      ดีลราคาดี น่าซื้อ!
                    </span>
                  ) : (
                    <span className="font-medium text-gray-600">ราคายุติธรรมตามตลาด</span>
                  )}
                </div>

                {/* แสดงราคาตลาดสากลจาก Pokémon TCG API / TCGplayer */}
                {externalPrice && externalPrice.marketPriceTHB && (
                  <div className="mt-2 pt-3 border-t border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-white/60 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Globe className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="font-medium">ราคาตลาดโลก (TCGPlayer EN):</span>
                      <span className="font-bold text-purple-700">
                        ${externalPrice.marketPriceUSD} (~฿{externalPrice.marketPriceTHB.toLocaleString()})
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-600 bg-purple-100/80 px-2 py-0.5 rounded-full border border-purple-200">
                      Pokémon TCG API
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* รายละเอียดเพิ่มเติมจากผู้ขาย */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-3">
              <h2 className="font-bold text-gray-800 text-sm border-b pb-2">รายละเอียดจากผู้ขาย</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {listing.description || 'ผู้ขายไม่ได้ระบุรายละเอียดเพิ่มเติม'}
              </p>
              <div className="flex items-center text-xs text-gray-400 pt-2">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <span>ลงประกาศเมื่อ {new Date(listing.created_at).toLocaleDateString('th-TH')}</span>
              </div>
            </div>

            {/* การ์ดข้อมูลผู้ขาย & ช่องทางติดต่อ */}
            <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-xs bg-gradient-to-b from-white to-purple-50/40 space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/sellers/${listing.seller_id}`}
                  className="flex items-center space-x-3 group"
                >
                  {listing.profiles?.avatar_url ? (
                    <img src={listing.profiles.avatar_url} alt="seller" className="w-12 h-12 rounded-full object-cover border group-hover:scale-105 transition" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold group-hover:scale-105 transition">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-1.5 group-hover:text-purple-700 transition">
                      {listing.profiles?.display_name}
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-xs text-purple-600 font-medium hover:underline flex items-center gap-1">
                      ดูโปรไฟล์และรีวิวผู้ขาย →
                    </span>
                  </div>
                </Link>
              </div>

              {/* ปุ่ม Action สั่งซื้อ/ติดต่อ */}
              <div className="space-y-2 pt-2">
                {/* 1. ปุ่มทักแชทสดในระบบ (Real-time Chat) */}
                <Link
                  href={`/messages?sellerId=${listing.seller_id}&listingId=${listing.id}`}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-md transition cursor-pointer"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>ทักแชทสดผู้ขาย (คุยในระบบ)</span>
                </Link>

                {/* 2. ปุ่ม LINE หรือช่องทางสำรอง */}
                {listing.profiles?.line_id ? (
                  <a
                    href={`https://line.me/ti/p/~${listing.profiles.line_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-2xl flex items-center justify-center space-x-2 transition text-sm"
                  >
                    <MessageCircle className="h-4 w-4 text-[#06C755]" />
                    <span>ทัก LINE ผู้ขาย: {listing.profiles.line_id}</span>
                  </a>
                ) : (
                  <button
                    onClick={() => alert(`อีเมลติดต่อผู้ขาย: ${listing.profiles?.contact_email || 'ไม่ระบุ'}`)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-2xl flex items-center justify-center space-x-2 transition text-sm cursor-pointer"
                  >
                    <Mail className="h-4 w-4" />
                    <span>แสดงช่องทางติดต่อภายนอก</span>
                  </button>
                )}

                {/* ลิงก์ไปหน้ารวมผู้ขายของการ์ดใบนี้ */}
                {listing.card_id && (
                  <Link
                    href={`/cards/${listing.card_id}`}
                    className="block text-center text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline pt-1"
                  >
                    🔍 เปรียบเทียบผู้ขายทั้งหมดที่ขายการ์ดใบนี้ →
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-center text-xs text-gray-400 space-x-1 pt-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>เพื่อความปลอดภัย แนะนำให้นัดรับ หรือใช้บริการผ่านคนกลาง</span>
              </div>

              {/* ปุ่มแจ้งรายงานคนโกง / ปัญหารายการนี้ */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  className="text-[11px] text-red-500 hover:text-red-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="h-3 w-3" />
                  <span>พบพิรุธ หรือสงสัยว่าโกง? คลิกแจ้งรายงานที่นี่</span>
                </button>
              </div>
            </div>

            {/* Sticky Bottom Bar สำหรับสั่งซื้อบนมือถือ (Mobile Sticky Action Bar) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-purple-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-gray-500 block">ราคา</span>
                <span className="text-lg font-black text-purple-700">
                  ฿{Number(listing.price_thb).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/messages?sellerId=${listing.seller_id}&listingId=${listing.id}`}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>ทักแชทสด</span>
                </Link>
                {listing.profiles?.line_id && (
                  <a
                    href={`https://line.me/ti/p/~${listing.profiles.line_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-[#06C755] text-white rounded-xl shadow-md"
                    title="LINE"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Modal รายงานคนโกง */}
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedUserId={listing.seller_id}
          reportedUserName={listing.profiles?.display_name}
          reportedListingId={listing.id}
          cardName={listing.cards?.name}
        />
      </main>
    </div>
  );
}
