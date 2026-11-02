'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, PlusCircle, ShieldAlert, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUnreadMessagesCount } from '@/lib/chat-notifications';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        updateUnreadCount(user.id);
      }
    });

    const updateUnreadCount = (uid: string) => {
      getUnreadMessagesCount(uid).then(setUnreadChatCount);
    };

    // ตรวจจับ Realtime เมื่อมีข้อความใหม่
    const channel = supabase
      .channel('mobile-unread-chat-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) updateUnreadCount(user.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ซ่อน BottomNav ในหน้า auth
  if (pathname.startsWith('/auth')) {
    return null;
  }

  const navItems = [
    {
      label: 'หน้าแรก',
      href: '/',
      icon: Home,
      active: pathname === '/',
    },
    {
      label: 'เช็คคนโกง',
      href: '/blacklist',
      icon: ShieldAlert,
      active: pathname === '/blacklist',
      highlightRed: true,
    },
    {
      label: 'ลงขาย',
      href: user ? '/listings/create' : '/auth?next=%2Flistings%2Fcreate',
      icon: PlusCircle,
      active: pathname === '/listings/create',
      isCenter: true,
    },
    {
      label: 'แชท',
      href: '/messages',
      icon: MessageSquare,
      active: pathname.startsWith('/messages'),
      badge: unreadChatCount > 0 ? unreadChatCount : null,
    },
    {
      label: user ? 'โปรไฟล์' : 'เข้าสู่ระบบ',
      href: user ? '/profile' : '/auth',
      icon: User,
      active: pathname === '/profile' || pathname.startsWith('/my-listings'),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0c1b]/95 backdrop-blur-lg border-t border-purple-900/40 px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 border-2 border-[#0f0c1b] group-active:scale-95 transition">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold text-purple-300 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 relative transition ${
                item.active 
                  ? item.highlightRed ? 'text-red-400 font-bold' : 'text-purple-400 font-bold'
                  : item.highlightRed ? 'text-red-300/80 hover:text-red-300' : 'text-gray-400 hover:text-purple-300'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.highlightRed ? 'text-red-400' : ''}`} />
                {item.badge != null && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${item.highlightRed ? 'text-red-300 font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

