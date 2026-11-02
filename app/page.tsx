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
  Lock
} from 'lucide-react';

const gameCategories = [
  { slug: 'all', name: 'ทั้งหมด', emoji: '🃏' },
  { slug: 'pokemon', name: 'Pokémon', emoji: '⚡' },
  { slug: 'onepiece', name: 'One Piece', emoji: '🏴‍☠️' },
  { slug: 'yugioh', name: 'Yu-Gi-Oh!', emoji: '🧙' },
];

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
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
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header / Navbar */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center space-x-2 group shrink-0">
            <div className="relative h-9 w-32 sm:h-10 sm:w-44 flex items-center">
              <Image
                src="/logo.png"
                alt="SianCard Logo"
                fill
                priority
                className="object-contain object-left group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <span className="hidden lg:inline text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
              TCG Marketplace
            </span>
          </Link>
          
          {/* ช่องค้นหาบน Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-4 sm:mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-purple-400" />
              <input
                type="text"
                placeholder="ค้นหาการ์ด เช่น Pikachu, Luffy, Charizard..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-purple-950/40 border border-purple-900/60 rounded-xl text-white placeholder-purple-300/50 text-sm focus:bg-purple-950/70 focus:border-purple-400 focus:outline-none transition shadow-inner"
              />
            </div>
          </div>

          {/* Action Buttons บน Desktop & Mobile */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* ปุ่มศูนย์คนโกง Blacklist (แสดงทั้ง Desktop และ Mobile) */}
            <Link
              href="/blacklist"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold text-red-300 hover:text-white bg-red-950/40 hover:bg-red-900/60 rounded-xl transition border border-red-700/60 shadow-xs"
              title="ศูนย์ตรวจสอบคนโกง & บัญชีดำ"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">เช็คคนโกง</span>
            </Link>

            {/* ปุ่มวิธีใช้งานเว็บ (Guide) */}
            <Link
              href="/guide"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-900/40 rounded-xl transition border border-purple-800/60"
              title="คู่มือวิธีใช้งานเว็บ SianCard"
            >
              <BookOpen className="h-3.5 w-3.5 text-purple-400" />
              <span>วิธีใช้งาน</span>
            </Link>

            {/* ปุ่มกล่องข้อความแชท พร้อมจุดแจ้งเตือน Unread Badge */}
            <Link
              href="/messages"
              className="relative p-2 text-purple-200 hover:text-white hover:bg-purple-900/40 rounded-xl transition border border-purple-800/60 flex items-center justify-center"
              title="กล่องข้อความแชท"
            >
              <MessageSquare className="h-4 w-4" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 animate-bounce shadow-md shadow-red-500/50">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </Link>

            {/* ปุ่มรายการโปรด Wishlist (แสดงเฉพาะ desktop เพราะมือถือมี bottom nav) */}
            <Link
              href="/wishlist"
              className="hidden sm:flex relative p-2 text-purple-200 hover:text-white hover:bg-purple-900/40 rounded-xl transition border border-purple-800/60 items-center justify-center"
              title="รายการการ์ดที่ชอบ (Wishlist)"
            >
              <Heart className={`h-4 w-4 ${wishlistIds.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            {/* ปุ่มลงขายบน Desktop */}
            <Link
              href={user ? '/listings/create' : '/auth?next=%2Flistings%2Fcreate'}
              className="hidden sm:inline-flex bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm hover:shadow-purple-500/25 whitespace-nowrap"
            >
              + ลงขาย
            </Link>

            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/my-listings"
                  className="hidden md:inline-flex border border-purple-700/60 text-purple-200 hover:bg-purple-900/40 hover:text-white px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition items-center gap-1.5"
                >
                  <Tag className="h-3.5 w-3.5 text-purple-400" />
                  <span>การ์ดของฉัน</span>
                </Link>
                <Link
                  href="/profile"
                  className="border border-purple-700/60 text-purple-200 hover:bg-purple-900/40 hover:text-white px-2.5 sm:px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition flex items-center gap-1.5"
                >
                  <User className="h-3.5 w-3.5 text-purple-400" />
                  <span className="hidden md:inline">โปรไฟล์</span>
                </Link>

                {/* ปุ่มแอดมินหลังบ้าน (จะแสดงเฉพาะเมื่อล็อกอินด้วยบัญชีแอดมินเท่านั้น) */}
                {isAdminUser && (
                  <Link
                    href="/admin"
                    className="border border-red-500/60 bg-red-950/20 text-red-300 hover:bg-red-950/50 hover:text-white px-2.5 sm:px-3 py-2 rounded-xl font-medium text-xs sm:text-sm transition flex items-center gap-1.5 animate-pulse"
                    title="แดชบอร์ดแอดมินหลังบ้าน"
                  >
                    <Lock className="h-3.5 w-3.5 text-red-400" />
                    <span className="hidden lg:inline">หลังบ้าน</span>
                  </Link>
                )}

                <button
                  onClick={handleSignOut}
                  className="border border-purple-800 text-purple-300 hover:bg-purple-900/50 hover:text-white px-2.5 sm:px-3 py-2 rounded-xl font-medium text-xs transition"
                >
                  ออก
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="border border-purple-800 text-purple-200 hover:bg-purple-900/50 hover:text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-medium text-xs sm:text-sm transition whitespace-nowrap"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>

        {/* ช่องค้นหาเฉพาะบน Mobile */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-purple-400" />
            <input
              type="text"
              placeholder="ค้นหาการ์ด เช่น Pikachu, Luffy, OP05..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-purple-950/40 border border-purple-900/60 rounded-xl text-white placeholder-purple-300/50 text-sm focus:bg-purple-950/70 focus:border-purple-400 focus:outline-none transition shadow-inner"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        
        {/* แท็บเลือกเกม (Game Categories Bar) */}
        <div className="flex items-center justify-between gap-2 pb-4 mb-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none">
            {gameCategories.map((game) => (
              <button
                key={game.slug}
                onClick={() => setSelectedGame(game.slug)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shadow-xs ${
                  selectedGame === game.slug
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/20 shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
                }`}
              >
                <span className="text-base">{game.emoji}</span>
                <span>{game.name}</span>
              </button>
            ))}
          </div>

          <Link
            href="/guide"
            className="shrink-0 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 border border-purple-200 hover:bg-purple-100 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5 text-purple-600" />
            <span className="hidden sm:inline">คู่มือวิธีใช้งานเว็บ</span>
            <span className="sm:hidden">วิธีใช้</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Sidebar Filters */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 h-fit space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 font-bold text-gray-800">
                <SlidersHorizontal className="h-5 w-5 text-purple-600" />
                <span>ตัวกรองการ์ด</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1 transition"
                title="ล้างค่าตัวกรองทั้งหมด"
              >
                <RotateCcw className="h-3 w-3" />
                <span>รีเซ็ต</span>
              </button>
            </div>

            {/* จัดเรียงตาม (Sort) */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2 flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-purple-600" />
                <span>จัดเรียงตาม</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:border-purple-500 focus:outline-none transition cursor-pointer"
              >
                <option value="newest">ลงขายล่าสุด (Newest)</option>
                <option value="price_asc">ราคา: ต่ำไปสูง (Low to High)</option>
                <option value="price_desc">ราคา: สูงไปต่ำ (High to Low)</option>
              </select>
            </div>

            {/* สภาพการ์ด (Condition) */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">สภาพการ์ด (Condition)</label>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'NM', 'LP', 'MP', 'HP', 'DMG'].map((cond) => (
                  <button
                    key={cond}
                    onClick={() => setSelectedCondition(cond)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      selectedCondition === cond
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    {cond === 'all' ? 'ทั้งหมด' : cond}
                  </button>
                ))}
              </div>
            </div>

            {/* ช่วงราคา (Price Range) */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">ช่วงราคา (บาท)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="ต่ำสุด"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 bg-gray-50 focus:bg-white focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="สูงสุด"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 bg-gray-50 focus:bg-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

          </div>

          {/* Listing Grid */}
          <div className="md:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                รายการการ์ด <span className="text-purple-600">({filteredListings.length} รายการ)</span>
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-24 text-purple-600 font-medium animate-pulse">
                กำลังโหลดข้อมูลการ์ด...
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
                <Tag className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-gray-700">ไม่พบรายการการ์ดที่คุณต้องการ</p>
                <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดรีเซ็ตตัวกรองดูครับ</p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl transition"
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
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-purple-300 transition duration-200 group flex flex-col relative"
                    >
                      {/* ปุ่มหัวใจ Wishlist */}
                      <button
                        onClick={(e) => handleToggleWishlist(e, item.id)}
                        className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition shadow-md cursor-pointer transform hover:scale-110 ${
                          isWishlisted
                            ? 'bg-red-50 text-red-500'
                            : 'bg-white/80 backdrop-blur-md text-gray-400 hover:text-red-500'
                        }`}
                        title={isWishlisted ? 'นำออกจากรายการโปรด' : 'บันทึกลงรายการโปรด'}
                      >
                        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500' : ''}`} />
                      </button>

                      <Link href={`/listings/create/${item.id}`} className="block">
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
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="bg-black/75 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md border border-white/10">
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
                          <div className="text-xs text-purple-600 font-semibold flex items-center justify-between">
                            <span>{item.cards?.games?.name || 'TCG'} • {item.cards?.card_sets?.code}</span>
                            {item.card_id && (
                              <Link
                                href={`/cards/${item.card_id}`}
                                className="text-[10px] text-purple-700 hover:text-purple-900 hover:underline bg-purple-50 px-1.5 py-0.5 rounded font-semibold"
                                title="ดูผู้ขายทั้งหมดที่ขายการ์ดใบนี้"
                              >
                                รวมทุกร้าน →
                              </Link>
                            )}
                          </div>
                          <Link href={`/listings/create/${item.id}`}>
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
                            className="text-xs text-gray-500 hover:text-purple-700 flex items-center gap-1 transition"
                            title="ดูโปรไฟล์และรีวิวผู้ขาย"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
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
