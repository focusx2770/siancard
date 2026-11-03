'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Listing } from '@/types/database';
import { getWishlistIds, toggleWishlist } from '@/lib/wishlist';
import { getUnreadMessagesCount } from '@/lib/chat-notifications';
import { 
  Search, 
  SlidersHorizontal, 
  ShieldCheck, 
  Tag, 
  User, 
  Heart, 
  ArrowUpDown, 
  RotateCcw,
  Sparkles,
  MessageSquare,
  Camera,
  BookOpen,
  ShieldAlert,
  Lock,
  Home as HomeIcon,
  LayoutGrid,
  ShoppingBag,
  Info
} from 'lucide-react';
import HeroCategoryExplorer, { type HomeBanner } from '@/components/HeroCategoryExplorer';
import Navbar from '@/components/Navbar';

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [homeBanners, setHomeBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters & Sorting State
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // User & Wishlist State
  const [user, setUser] = useState<{ id?: string; email?: string | null } | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    fetchListings();
  }, [selectedCondition, selectedGame, sortBy]);

  useEffect(() => {
    async function fetchHomeBanners() {
      const { data, error } = await supabase
        .from('homepage_banners')
        .select('id, title, subtitle, image_url, target_url, button_text')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching homepage banners:', error);
        return;
      }
      setHomeBanners(data || []);
    }

    fetchHomeBanners();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkIfAdmin();
    });

    supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) {
        setUser(data.user);
        checkIfAdmin();
      } else {
        setUser(null);
        setIsAdminUser(false);
      }
    });

    async function checkIfAdmin() {
      try {
        const res = await fetch('/api/admin-auth');
        const data = await res.json();
        setIsAdminUser(!!data.isAdmin);
      } catch {
        setIsAdminUser(false);
      }
    }

    // โหลด Wishlist IDs
    getWishlistIds().then(setWishlistIds);

    const handleWishlistUpdated = () => {
      getWishlistIds().then(setWishlistIds);
    };
    window.addEventListener('wishlist-updated', handleWishlistUpdated);

    // ตรวจสอบจำนวนข้อความที่ยังไม่ได้อ่าน
    const updateUnread = () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          getUnreadMessagesCount(user.id).then(setUnreadChatCount);
        } else {
          setUnreadChatCount(0);
        }
      });
    };

    updateUnread();

    // ฟัง Realtime เพื่ออัปเดตแจ้งเตือนทันทีเมื่อมีแชทเข้ามาใหม่
    const chatChannel = supabase
      .channel('home-header-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        updateUnread();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('wishlist-updated', handleWishlistUpdated);
      supabase.removeChannel(chatChannel);
    };
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
    }
  }

  async function fetchListings() {
    setLoading(true);
    let query = supabase
      .from('listings')
      .select(`
        *,
        cards!inner (*, games!inner(*), card_sets(*)),
        profiles (display_name, avatar_url),
        listing_images (image_url)
      `)
      .eq('status', 'active');

    // กรองตามเกม
    if (selectedGame !== 'all') {
      query = query.eq('cards.games.slug', selectedGame);
    }

    // กรองตามสภาพการ์ด
    if (selectedCondition !== 'all') {
      query = query.eq('condition', selectedCondition);
    }

    // จัดเรียง
    if (sortBy === 'price_asc') {
      query = query.order('price_thb', { ascending: true });
    } else if (sortBy === 'price_desc') {
      query = query.order('price_thb', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching listings:', error);
    } else {
      setListings(data || []);
    }
    setLoading(false);
  }

  // กดปุ่มหัวใจ Wishlist
  async function handleToggleWishlist(e: React.MouseEvent, listingId: string) {
    e.preventDefault();
    e.stopPropagation();

    const isAdded = await toggleWishlist(listingId);
    setWishlistIds((prev) =>
      isAdded ? [...prev, listingId] : prev.filter((id) => id !== listingId)
    );
  }

  // รีเซ็ตตัวกรองทั้งหมด
  function handleResetFilters() {
    setSelectedGame('all');
    setSelectedCondition('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setSearchTerm('');
  }

  // กรองตามค้นหาชื่อ และกรองช่วงราคา
  const filteredListings = listings.filter((item) => {
    // กรองคำค้นหา
    const matchesSearch = item.cards?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // กรองราคาต่ำสุด
    const min = parseFloat(minPrice);
    if (!isNaN(min) && item.price_thb < min) return false;

    // กรองราคาสูงสุด
    const max = parseFloat(maxPrice);
    if (!isNaN(max) && item.price_thb > max) return false;

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#090715] text-white pb-20 selection:bg-purple-600 selection:text-white">
      {/* Top Navbar matching Mockup Design */}
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        user={user}
        isAdminUser={isAdminUser}
        unreadChatCount={unreadChatCount}
        wishlistCount={wishlistIds.length}
        onSignOut={handleSignOut}
        onSelectGame={(slug) => setSelectedGame(slug)}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Hero Category Explorer (Direct Mockup Design) */}
        <HeroCategoryExplorer
          selectedGame={selectedGame}
          onSelectGame={(slug) => setSelectedGame(slug)}
          banners={homeBanners}
        />
        
        <div id="card-listings-section" className="scroll-mt-20 grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
          
          {/* Sidebar Filters */}
          <div className="bg-[#110d24] p-6 rounded-3xl border border-purple-900/50 h-fit space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
              <div className="flex items-center space-x-2 font-bold text-white">
                <SlidersHorizontal className="h-5 w-5 text-purple-400" />
                <span>ตัวกรองการ์ด</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-purple-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                title="ล้างค่าตัวกรองทั้งหมด"
              >
                <RotateCcw className="h-3 w-3" />
                <span>รีเซ็ต</span>
              </button>
            </div>

            {/* จัดเรียงตาม (Sort) */}
            <div>
              <label className="text-xs font-bold text-purple-200 block mb-2 flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-purple-400" />
                <span>จัดเรียงตาม</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#181233] border border-purple-900/60 rounded-xl text-xs font-medium text-white focus:border-purple-400 focus:outline-none transition cursor-pointer"
              >
                <option value="newest" className="bg-[#181233] text-white">ลงขายล่าสุด (Newest)</option>
                <option value="price_asc" className="bg-[#181233] text-white">ราคา: ต่ำไปสูง (Low to High)</option>
                <option value="price_desc" className="bg-[#181233] text-white">ราคา: สูงไปต่ำ (High to Low)</option>
              </select>
            </div>

            {/* สภาพการ์ด (Condition) */}
            <div>
              <label className="text-xs font-bold text-purple-200 block mb-2">สภาพการ์ด (Condition)</label>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'NM', 'LP', 'MP', 'HP', 'DMG'].map((cond) => (
                  <button
                    key={cond}
                    onClick={() => setSelectedCondition(cond)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      selectedCondition === cond
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/40'
                        : 'bg-purple-950/40 text-purple-300 border border-purple-900/60 hover:bg-purple-900/50 hover:text-white'
                    }`}
                  >
                    {cond === 'all' ? 'ทั้งหมด' : cond}
                  </button>
                ))}
              </div>
            </div>

            {/* ช่วงราคา (Price Range) */}
            <div>
              <label className="text-xs font-bold text-purple-200 block mb-2">ช่วงราคา (บาท)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="ต่ำสุด"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-900/60 rounded-xl text-xs text-white bg-purple-950/40 focus:bg-purple-950/70 focus:border-purple-400 focus:outline-none placeholder-purple-400/40"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="สูงสุด"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-900/60 rounded-xl text-xs text-white bg-purple-950/40 focus:bg-purple-950/70 focus:border-purple-400 focus:outline-none placeholder-purple-400/40"
                />
              </div>
            </div>

          </div>

          {/* Listing Grid */}
          <div className="md:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                รายการการ์ด <span className="text-purple-400">({filteredListings.length} รายการ)</span>
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-24 text-purple-400 font-medium animate-pulse">
                กำลังโหลดข้อมูลการ์ด...
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-[#120e26] rounded-3xl border border-purple-900/50 p-12 text-center text-purple-200 shadow-xl">
                <Tag className="h-10 w-10 mx-auto text-purple-400/60 mb-2" />
                <p className="font-bold text-white text-base">ไม่พบรายการการ์ดที่คุณต้องการ</p>
                <p className="text-xs text-purple-300/70 mt-1">ลองเปลี่ยนคำค้นหา หรือกดรีเซ็ตตัวกรองดูครับ</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((item) => {
                  const mainImage = item.listing_images?.[0]?.image_url || item.cards?.image_url;
                  const isWishlisted = wishlistIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className="bg-[#130f28] rounded-3xl border border-purple-900/40 overflow-hidden hover:shadow-2xl hover:shadow-purple-900/40 hover:border-purple-500/80 transition duration-300 group flex flex-col relative"
                    >
                      {/* ปุ่มหัวใจ Wishlist */}
                      <button
                        onClick={(e) => handleToggleWishlist(e, item.id)}
                        className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition shadow-md cursor-pointer transform hover:scale-110 ${
                          isWishlisted
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-[#0e0a1f]/80 backdrop-blur-md text-gray-400 hover:text-red-400 border border-purple-900/50'
                        }`}
                        title={isWishlisted ? 'นำออกจากรายการโปรด' : 'บันทึกลงรายการโปรด'}
                      >
                        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500' : ''}`} />
                      </button>

                      <Link href={`/listings/create/${item.listing_code}`} className="block">
                        <div className="relative h-64 bg-[#181335] flex items-center justify-center overflow-hidden">
                          {mainImage ? (
                            <img
                              src={mainImage}
                              alt={item.cards?.name}
                              className="object-cover h-full w-full group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <Tag className="h-12 w-12 text-purple-400/40" />
                          )}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="bg-black/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md border border-white/10">
                              {item.condition}
                            </span>
                            {item.listing_images && item.listing_images.length > 0 && (
                              <span className="bg-purple-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-purple-400/30 flex items-center gap-1 shadow-sm">
                                <Camera className="h-2.5 w-2.5" />
                                รูปจริง {item.listing_images.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                      
                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs text-purple-400 font-semibold flex items-center justify-between">
                            <span>{item.cards?.games?.name || 'TCG'} • {item.cards?.card_sets?.code}</span>
                            {item.card_id && (
                              <Link
                                href={`/cards/${item.card_id}`}
                                className="text-[10px] text-purple-300 hover:text-white bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-md font-semibold transition"
                                title="ดูผู้ขายทั้งหมดที่ขายการ์ดใบนี้"
                              >
                                รวมทุกร้าน →
                              </Link>
                            )}
                          </div>
                          <Link href={`/listings/create/${item.listing_code}`}>
                            <h3 className="font-bold text-white text-base mt-1 line-clamp-1 group-hover:text-purple-300 transition">
                              {item.cards?.name}
                            </h3>
                          </Link>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-purple-900/40">
                          <span className="text-purple-400 font-black text-xl tracking-tight">
                            ฿{item.price_thb.toLocaleString()}
                          </span>
                          <Link
                            href={`/sellers/${item.seller_id}`}
                            className="text-xs text-purple-300/80 hover:text-white flex items-center gap-1 transition"
                            title="ดูโปรไฟล์และรีวิวผู้ขาย"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                            <span className="truncate max-w-[100px]">{item.profiles?.display_name || 'ผู้ขาย'}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
