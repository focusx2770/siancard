'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, Listing, CardCondition } from '@/types/database';
import { fetchExternalPrice, ExternalCardPrice } from '@/lib/card-price';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Tag, 
  User, 
  MessageSquare, 
  SlidersHorizontal, 
  TrendingDown, 
  BarChart2, 
  Globe, 
  Sparkles,
  ExternalLink,
  PlusCircle,
  ImageIcon
} from 'lucide-react';

function LoadingCardHub() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
      กำลังโหลดข้อมูลการ์ดและผู้ขาย...
    </div>
  );
}

export default function CardHubPage() {
  return (
    <Suspense fallback={<LoadingCardHub />}>
      <CardHubContent />
    </Suspense>
  );
}

function CardHubContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cardId = params.id;

  const [card, setCard] = useState<Card | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorters
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest'>('price_asc');

  // Price Stats
  const [marketStats, setMarketStats] = useState<{
    minPrice: number;
    maxPrice: number;
    medianPrice: number;
    sampleCount: number;
  } | null>(null);

  // External Price (Pokémon TCG API)
  const [externalPrice, setExternalPrice] = useState<ExternalCardPrice | null>(null);

  useEffect(() => {
    fetchCardAndListings();
  }, [cardId, selectedCondition, sortBy]);

  async function fetchCardAndListings() {
    setLoading(true);

    // 1. ดึงข้อมูลการ์ดใบนี้
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select('*, games(*), card_sets(*)')
      .eq('id', cardId)
      .single();

    if (cardError || !cardData) {
      console.error('Error fetching card:', cardError);
      setLoading(false);
      return;
    }
    setCard(cardData);

    // ดึงราคาอ้างอิงภายนอก (Pokémon TCG API)
    fetchExternalPrice(cardData.name, cardData.card_number, cardData.games?.name)
      .then((ext) => {
        if (ext && ext.marketPriceTHB) {
          setExternalPrice(ext);
        }
      })
      .catch(console.error);

    // 2. ดึงรายการขายการ์ดใบนี้ทั้งหมดจากร้านต่างๆ
    let query = supabase
      .from('listings')
      .select(`
        *,
        cards (*, games(*), card_sets(*)),
        profiles (*),
        listing_images (*)
      `)
      .eq('card_id', cardId)
      .eq('status', 'active');

    if (selectedCondition !== 'all') {
      query = query.eq('condition', selectedCondition);
    }

    if (sortBy === 'price_asc') {
      query = query.order('price_thb', { ascending: true });
    } else if (sortBy === 'price_desc') {
      query = query.order('price_thb', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: listingsData, error: listingsError } = await query;

    if (!listingsError && listingsData) {
      setListings(listingsData);

      // คำนวณราคากลาง / ต่ำสุด / สูงสุด
      if (listingsData.length > 0) {
        const prices = listingsData.map((l) => Number(l.price_thb)).sort((a, b) => a - b);
        const min = prices[0];
        const max = prices[prices.length - 1];
        const mid = Math.floor(prices.length / 2);
        const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

        setMarketStats({
          minPrice: min,
          maxPrice: max,
          medianPrice: median,
          sampleCount: prices.length,
        });
      } else {
        setMarketStats(null);
      }
    }

    setLoading(false);
  }

  if (loading && !card) {
    return <LoadingCardHub />;
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-gray-800 mb-2">ไม่พบข้อมูลการ์ด</h1>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold shadow"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const lowestPriceListing = listings.length > 0 ? listings[0] : null;

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
              href="/messages"
              className="p-2 text-purple-200 hover:text-white hover:bg-purple-900/40 rounded-xl transition border border-purple-800/60"
              title="กล่องข้อความ"
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
            <button
              onClick={() => router.back()}
              className="flex items-center text-xs font-semibold text-purple-200 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Card Header & Overview Box */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            
            {/* รูปการ์ดหลัก */}
            <div className="w-36 h-52 sm:w-44 sm:h-60 bg-gray-100 rounded-2xl overflow-hidden shrink-0 shadow-md border border-gray-200 flex items-center justify-center relative">
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-gray-300" />
              )}
            </div>

            {/* ข้อมูลการ์ด & สถิติราคา */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-100/70 px-3 py-1 rounded-full">
                <span>{card.games?.name}</span>
                <span>•</span>
                <span>{card.card_sets?.name} ({card.card_sets?.code})</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{card.name}</h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>หมายเลขการ์ด: <strong className="text-gray-800">{card.card_number || '-'}</strong></span>
                <span>ความหายาก: <strong className="text-purple-600">{card.rarity || '-'}</strong></span>
                <span>ภาษา: <strong className="text-gray-800">{card.language}</strong></span>
              </div>

              {/* สรุปราคาในตลาด SianCard & TCGPlayer */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200">
                  <span className="text-[11px] text-gray-500 block">ราคาเริ่มต้นบนเว็บ</span>
                  <span className="text-lg sm:text-xl font-black text-purple-700 mt-0.5 block">
                    {marketStats ? `฿${marketStats.minPrice.toLocaleString()}` : 'ยังไม่มีคนลงขาย'}
                  </span>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <span className="text-[11px] text-gray-500 block">ราคากลาง SianCard</span>
                  <span className="text-lg sm:text-xl font-bold text-gray-800 mt-0.5 block">
                    {marketStats ? `฿${marketStats.medianPrice.toLocaleString()}` : '-'}
                  </span>
                </div>

                {externalPrice && externalPrice.marketPriceTHB && (
                  <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-200 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1 justify-center md:justify-start">
                      <Globe className="h-3 w-3" /> TCGPlayer (EN)
                    </span>
                    <span className="text-lg sm:text-xl font-black text-indigo-700 mt-0.5 block">
                      ~฿{externalPrice.marketPriceTHB.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* ปุ่มมีใบนี้ อยากลงขาย */}
              <div className="pt-2 flex justify-center md:justify-start">
                <Link
                  href="/listings/create"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>มีใบนี้? ลงประกาศขายการ์ด</span>
                </Link>
              </div>

            </div>
          </div>
        </div>

        {/* ผู้ขายทั้งหมดที่ขายการ์ดใบนี้ (All Sellers Section) */}
        <div className="space-y-4">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-600" />
              <h2 className="font-extrabold text-base text-gray-900">
                ผู้ขายทั้งหมด ({listings.length} รายการ)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* ตัวกรองสภาพการ์ด */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                {['all', 'NM', 'LP', 'MP', 'HP'].map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setSelectedCondition(cond)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      selectedCondition === cond
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {cond === 'all' ? 'ทุกสภาพ' : cond}
                  </button>
                ))}
              </div>

              {/* ตัวเรียงลำดับราคา */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-gray-50 border border-gray-300 text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                <option value="price_asc">ราคา: ถูกสุดไปแพงสุด</option>
                <option value="price_desc">ราคา: แพงสุดไปถูกสุด</option>
                <option value="newest">ลงขายล่าสุด</option>
              </select>
            </div>
          </div>

          {/* รายการผู้ขาย */}
          {listings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
              <Tag className="h-10 w-10 mx-auto text-gray-300" />
              <p className="font-bold text-gray-600">ยังไม่มีผู้ขายลงประกาศการ์ดใบนี้ในสภาพที่เลือก</p>
              <p className="text-xs">เป็นคนแรกที่ลงขายการ์ดใบนี้ เพื่อให้ผู้ซื้อทักหาคุณก่อนใคร!</p>
              <Link
                href="/listings/create"
                className="inline-block px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow mt-2"
              >
                + ลงประกาศขายใบนี้
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {listings.map((item, index) => {
                const isLowest = index === 0 && sortBy === 'price_asc';
                const mainPhoto = item.listing_images?.[0]?.image_url || card.image_url;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-purple-300 ${
                      isLowest ? 'border-purple-400 bg-purple-50/20' : 'border-gray-200'
                    }`}
                  >
                    {/* ข้อมูลผู้ขาย & สภาพ */}
                    <div className="flex items-center gap-4">
                      {/* Thumbnail ภาพจริง */}
                      <Link
                        href={`/listings/create/${item.listing_code}`}
                        className="w-14 h-18 sm:w-16 sm:h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-xs relative group"
                      >
                        {mainPhoto ? (
                          <img
                            src={mainPhoto}
                            alt="listing"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-gray-300 m-auto" />
                        )}
                      </Link>

                      {/* ข้อมูลผู้ขาย */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs px-2.5 py-0.5 rounded-md bg-gray-900 text-white">
                            สภาพ {item.condition}
                          </span>
                          {isLowest && (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> ราคาดีที่สุด
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/sellers/${item.seller_id}`}
                          className="flex items-center gap-1.5 font-bold text-sm text-gray-900 hover:text-purple-600 transition"
                        >
                          {item.profiles?.avatar_url ? (
                            <img
                              src={item.profiles.avatar_url}
                              alt="seller"
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-gray-400" />
                          )}
                          <span>{item.profiles?.display_name || 'ผู้ขาย SianCard'}</span>
                          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                        </Link>

                        <p className="text-xs text-gray-400 truncate max-w-xs">
                          {item.description || 'สภาพดี พร้อมส่ง'} • มีของ {item.quantity} ใบ
                        </p>
                      </div>
                    </div>

                    {/* ราคา & ปุ่มสั่งซื้อ */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 gap-3">
                      <div>
                        <span className="text-[11px] text-gray-400 block sm:text-right">ราคา</span>
                        <span className="text-xl sm:text-2xl font-black text-purple-600">
                          ฿{Number(item.price_thb).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* ปุ่มทักแชท */}
                        <Link
                          href={`/messages?sellerId=${item.seller_id}&listingId=${item.id}`}
                          className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-xl border border-purple-200 transition flex items-center gap-1"
                          title="ทักแชทคุยกับผู้ขายรายนี้"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>ทักแชท</span>
                        </Link>

                        {/* ดูรายละเอียด */}
                        <Link
                          href={`/listings/create/${item.listing_code}`}
                          className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          ดูการ์ดจริง
                        </Link>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
