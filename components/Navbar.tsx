'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, 
  Home as HomeIcon, 
  LayoutGrid, 
  ShoppingCart, 
  BookOpen, 
  Info, 
  Bell, 
  ChevronDown, 
  Tag, 
  User, 
  Heart, 
  ShieldAlert, 
  Lock, 
  LogOut, 
  Plus,
  MessageSquare
} from 'lucide-react';

interface NavbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  user: { id?: string; email?: string | null } | null;
  isAdminUser: boolean;
  unreadChatCount: number;
  wishlistCount: number;
  onSignOut: () => void;
  onSelectGame?: (game: string) => void;
}

export default function Navbar({
  searchTerm,
  setSearchTerm,
  user,
  isAdminUser,
  unreadChatCount,
  wishlistCount,
  onSignOut,
  onSelectGame,
}: NavbarProps) {
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setCategoryMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090715]/95 backdrop-blur-md border-b border-purple-900/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left Section: Logo & Main Navigation */}
        <div className="flex items-center gap-6 lg:gap-8 shrink-0">
          {/* Logo SianCard */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-32 sm:h-10 sm:w-36 flex items-center">
              <Image
                src="/logo.png"
                alt="SianCard Logo"
                fill
                priority
                className="object-contain object-left group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          </Link>

          {/* Desktop Navigation Links (Mockup Style) */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-purple-200/90">
            {/* 1. หน้าแรก (Active Pill) */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30 hover:bg-purple-500 transition"
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>หน้าแรก</span>
            </Link>

            {/* 2. หมวดหมู่ (Dropdown) */}
            <div className="relative" ref={categoryMenuRef}>
              <button
                type="button"
                onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-purple-950/60 hover:text-white transition cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                <span>หมวดหมู่</span>
                <ChevronDown className={`w-3 h-3 text-purple-400 transition-transform ${categoryMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Category Dropdown */}
              {categoryMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#120e26] border border-purple-800/60 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] uppercase font-bold text-purple-400 px-3 py-1 tracking-wider">
                    แฟรนไชส์หลัก
                  </div>
                  <button
                    onClick={() => {
                      onSelectGame?.('pokemon');
                      setCategoryMenuOpen(false);
                      handleScrollTo('card-listings-section');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900/50 rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>🔴</span>
                    <span>Pokémon</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectGame?.('onepiece');
                      setCategoryMenuOpen(false);
                      handleScrollTo('card-listings-section');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900/50 rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>🏴‍☠️</span>
                    <span>One Piece</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectGame?.('yugioh');
                      setCategoryMenuOpen(false);
                      handleScrollTo('card-listings-section');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900/50 rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>🧙</span>
                    <span>Yu-Gi-Oh!</span>
                  </button>
                  <div className="border-t border-purple-900/50 my-1" />
                  <button
                    onClick={() => {
                      onSelectGame?.('all');
                      setCategoryMenuOpen(false);
                      handleScrollTo('hero-categories');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-purple-300 hover:text-white hover:bg-purple-900/40 rounded-xl transition cursor-pointer"
                  >
                    ดูหมวดหมู่ทั้งหมด →
                  </button>
                </div>
              )}
            </div>

            {/* 3. ตลาดซื้อขาย */}
            <button
              type="button"
              onClick={() => handleScrollTo('card-listings-section')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-purple-950/60 hover:text-white transition cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
              <span>ตลาดซื้อขาย</span>
            </button>

            {/* 4. ฐานข้อมูลการ์ด */}
            <Link
              href="/guide"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-purple-950/60 hover:text-white transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>ฐานข้อมูลการ์ด</span>
            </Link>

            {/* 5. เกี่ยวกับเรา */}
            <Link
              href="/guide"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-purple-950/60 hover:text-white transition"
            >
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>เกี่ยวกับเรา</span>
            </Link>
          </nav>
        </div>

        {/* Right Section: Search Bar, Notifications, Action & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 justify-end max-w-xl">
          
          {/* Mockup Search Bar: Long, Rounded-Full, Clean */}
          <div className="relative w-full max-w-xs sm:max-w-sm hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาการ์ดที่คุณต้องการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#120d26]/80 hover:bg-[#150f2e] focus:bg-[#171033] border border-purple-900/50 focus:border-purple-400 rounded-full text-xs text-white placeholder-purple-300/40 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* ปุ่ม + ลงขาย (Sleek Gradient Pill) */}
          <Link
            href={user ? '/listings/create' : '/auth?next=%2Flistings%2Fcreate'}
            className="hidden md:inline-flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-full font-bold text-xs shadow-md shadow-purple-600/30 transition transform hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ลงขาย</span>
          </Link>

          {/* Notification Bell (Direct from Mockup) */}
          <Link
            href="/messages"
            className="relative w-9 h-9 rounded-full bg-[#120d26]/80 hover:bg-purple-950/80 border border-purple-900/50 hover:border-purple-500 text-purple-200 hover:text-white flex items-center justify-center transition shrink-0"
            title="การแจ้งเตือน & ข้อความ"
          >
            <Bell className="w-4 h-4" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center px-1 animate-pulse shadow-md shadow-red-500/50">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </Link>

          {/* User Profile Avatar with Glowing Border (From Mockup) */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-9 h-9 rounded-full ring-2 ring-purple-500/70 hover:ring-purple-400 transition-all cursor-pointer overflow-hidden flex items-center justify-center bg-gradient-to-tr from-purple-900 to-pink-600 shrink-0 shadow-md shadow-purple-500/20"
              title={user ? 'เมนูผู้ใช้งาน' : 'เข้าสู่ระบบ'}
            >
              {user ? (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs bg-purple-900">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#120e26] border border-purple-800/60 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                {user ? (
                  <>
                    <div className="px-3 py-2 border-b border-purple-900/50 mb-1">
                      <p className="text-[11px] text-purple-400 font-medium">เข้าสู่ระบบด้วย</p>
                      <p className="text-xs font-bold text-white truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-900/50 rounded-xl transition"
                    >
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      <span>โปรไฟล์ของฉัน</span>
                    </Link>

                    <Link
                      href="/my-listings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-900/50 rounded-xl transition"
                    >
                      <Tag className="w-3.5 h-3.5 text-purple-400" />
                      <span>การ์ดที่ลงขาย</span>
                    </Link>

                    <Link
                      href="/wishlist"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-900/50 rounded-xl transition"
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-3.5 h-3.5 text-red-400" />
                        <span>รายการโปรด (Wishlist)</span>
                      </div>
                      {wishlistCount > 0 && (
                        <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded-full font-bold">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/messages"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-900/50 rounded-xl transition"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                        <span>กล่องข้อความ</span>
                      </div>
                      {unreadChatCount > 0 && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                          {unreadChatCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/blacklist"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-300 hover:text-red-200 hover:bg-red-950/40 rounded-xl transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      <span>ศูนย์เช็คคนโกง</span>
                    </Link>

                    {isAdminUser && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 rounded-xl transition"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>แดชบอร์ดแอดมิน</span>
                      </Link>
                    )}

                    <div className="border-t border-purple-900/50 my-1" />

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-purple-900/40 rounded-xl transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 border-b border-purple-900/50 mb-1">
                      <p className="text-xs font-bold text-white">ยินดีต้อนรับสู่ SianCard</p>
                      <p className="text-[10px] text-purple-300/70">เข้าสู่ระบบเพื่อเริ่มซื้อขายการ์ด</p>
                    </div>

                    <Link
                      href="/auth"
                      onClick={() => setUserMenuOpen(false)}
                      className="block text-center py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition my-1"
                    >
                      เข้าสู่ระบบ / ลงทะเบียน
                    </Link>

                    <Link
                      href="/blacklist"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-300 hover:text-red-200 hover:bg-red-950/40 rounded-xl transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      <span>ศูนย์เช็คคนโกง</span>
                    </Link>

                    <Link
                      href="/guide"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-900/40 rounded-xl transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>วิธีใช้งานเว็บ</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Mobile Search Input */}
      <div className="sm:hidden px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาการ์ดที่คุณต้องการ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#120d26] border border-purple-900/50 focus:border-purple-400 rounded-full text-xs text-white placeholder-purple-300/40 focus:outline-none transition shadow-inner"
          />
        </div>
      </div>
    </header>
  );
}
