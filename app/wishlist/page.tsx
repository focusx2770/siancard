'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/database';
import { getWishlistIds, toggleWishlist } from '@/lib/wishlist';
import { 
  ArrowLeft, 
  Heart, 
  Tag, 
  ShieldCheck, 
  Trash2, 
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();

    const handleWishlistUpdated = () => {
      loadWishlist();
    };

    window.addEventListener('wishlist-updated', handleWishlistUpdated);
    return () => window.removeEventListener('wishlist-updated', handleWishlistUpdated);
  }, []);

  async function loadWishlist() {
    setLoading(true);
    const ids = await getWishlistIds();

    if (ids.length === 0) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        cards (*, games(*), card_sets(*)),
        profiles (*),
        listing_images (*)
      `)
      .in('id', ids);

    if (!error && data) {
      setWishlistItems(data);
    }
    setLoading(false);
  }

  async function handleRemove(listingId: string) {
    await toggleWishlist(listingId);
    setWishlistItems((prev) => prev.filter((item) => item.id !== listingId));
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
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

          <Link
            href="/"
            className="border border-purple-800 text-purple-200 hover:bg-purple-900/50 hover:text-white px-3.5 py-1.5 rounded-xl font-medium text-xs transition inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>กลับหน้าแรก</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-600 mb-2">
              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
              รายการโปรดของฉัน
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              การ์ดที่ถูกใจ <span className="text-purple-600">({wishlistItems.length})</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              รวบรวมการ์ดที่คุณกำลังเล็งไว้ เข้ามาเช็คราคาหรือติดต่อผู้ขายได้ตลอดเวลา
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-purple-600 font-medium animate-pulse">
            กำลังโหลดรายการโปรดของคุณ...
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">ยังไม่มีการ์ดในรายการโปรด</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-6">
              กดไอคอนหัวใจ ❤️ ที่มุมการ์ดใบใดก็ได้ในหน้าแรก เพื่อบันทึกการ์ดที่คุณสนใจ
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>เลือกดูการ์ดทั้งหมด</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => {
              const mainImage = item.listing_images?.[0]?.image_url || item.cards?.image_url;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-purple-300 transition duration-200 group flex flex-col relative"
                >
                  {/* ปุ่มลบออกจาก Wishlist */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-red-50 text-red-500 flex items-center justify-center shadow-md transition transform hover:scale-110 cursor-pointer"
                    title="นำออกจากรายการโปรด"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <Link href={`/listings/create/${item.listing_code}`} className="block">
                    <div className="relative h-64 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={item.cards?.name}
                          className="object-cover h-full w-full group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <Tag className="h-12 w-12 text-gray-300" />
                      )}
                      <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md border border-white/10">
                        {item.condition}
                      </span>
                    </div>
                  </Link>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-purple-600 font-semibold flex justify-between">
                        <span>{item.cards?.games?.name || 'TCG'}</span>
                        <span className="text-gray-400 font-normal">{item.cards?.card_sets?.code}</span>
                      </div>
                      <Link href={`/listings/create/${item.listing_code}`}>
                        <h3 className="font-bold text-gray-900 text-base mt-1 line-clamp-1 group-hover:text-purple-700 transition">
                          {item.cards?.name}
                        </h3>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-purple-600 font-black text-lg">
                        ฿{item.price_thb.toLocaleString()}
                      </span>
                      <Link
                        href={`/sellers/${item.seller_id}`}
                        className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 transition"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                        <span>{item.profiles?.display_name || 'ผู้ขาย'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
