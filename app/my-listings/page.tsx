'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Listing, ListingStatus, Profile } from '@/types/database';
import {
  ArrowLeft,
  Tag,
  Trash2,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  Edit3,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  User,
  Search
} from 'lucide-react';

export default function MyListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'sold' | 'closed'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State สำหรับ Modal บันทึกการขาย
  const [soldModalListing, setSoldModalListing] = useState<Listing | null>(null);
  const [buyerQuery, setBuyerQuery] = useState('');
  const [buyerResults, setBuyerResults] = useState<Profile[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<Profile | null>(null);
  const [searchingBuyer, setSearchingBuyer] = useState(false);
  const [savingDeal, setSavingDeal] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        router.replace('/auth?next=%2Fmy-listings');
        return;
      }
      setUser(user);
      fetchMyListings(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        router.replace('/auth?next=%2Fmy-listings');
      } else {
        setUser(session.user);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function fetchMyListings(userId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        cards (*, games(*), card_sets(*)),
        profiles (*),
        listing_images (*)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my listings:', error);
      setFeedbackMsg({ type: 'error', text: 'โหลดรายการการ์ดของคุณไม่สำเร็จ' });
    } else {
      setListings(data || []);
    }
    setLoading(false);
  }

  // ค้นหาสมาชิกที่เป็นผู้ซื้อ
  useEffect(() => {
    if (!buyerQuery.trim() || buyerQuery.length < 2) {
      setBuyerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingBuyer(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '')
        .ilike('display_name', `%${buyerQuery}%`)
        .limit(5);

      setBuyerResults(data || []);
      setSearchingBuyer(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [buyerQuery, user?.id]);

  // เปลี่ยนสถานะประกาศ (Active, Sold, Closed)
  async function handleStatusChange(listingId: string, newStatus: ListingStatus) {
    if (!user) return;
    setActionLoading(listingId);
    setFeedbackMsg(null);

    const { error } = await supabase
      .from('listings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .eq('seller_id', user.id);

    if (error) {
      setFeedbackMsg({ type: 'error', text: 'เปลี่ยนสถานะไม่สำเร็จ: ' + error.message });
    } else {
      setListings((prev) =>
        prev.map((item) => (item.id === listingId ? { ...item, status: newStatus } : item))
      );
      setFeedbackMsg({
        type: 'success',
        text: newStatus === 'sold' ? 'บันทึกสถานะว่าขายแล้วเรียบร้อย!' : 'อัปเดตสถานะประกาศสำเร็จ',
      });
    }
    setActionLoading(null);
  }

  // บันทึกการขายพร้อมระบุผู้ซื้อเพื่อสร้าง Record Deal (ผู้ซื้อจะเข้ามารีวิวได้)
  async function handleCompleteDealWithBuyer() {
    if (!soldModalListing || !user) return;
    setSavingDeal(true);
    setFeedbackMsg(null);

    try {
      // 1. อัปเดต listing เป็น sold
      const { error: listingErr } = await supabase
        .from('listings')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', soldModalListing.id);

      if (listingErr) throw listingErr;

      // 2. ถ้ามีผู้ซื้อที่เลือก ให้สร้างแถวใน deals
      if (selectedBuyer && selectedBuyer.id) {
        const { error: dealErr } = await supabase.from('deals').insert({
          listing_id: soldModalListing.id,
          card_id: soldModalListing.card_id,
          seller_id: user.id,
          buyer_id: selectedBuyer.id,
          condition: soldModalListing.condition,
          price_thb: soldModalListing.price_thb,
        });

        if (dealErr) {
          console.error('Error inserting deal:', dealErr);
        }
      }

      setListings((prev) =>
        prev.map((item) => (item.id === soldModalListing.id ? { ...item, status: 'sold' } : item))
      );

      setFeedbackMsg({
        type: 'success',
        text: selectedBuyer
          ? `บันทึกการขายให้กับ ${selectedBuyer.display_name} สำเร็จ! ผู้ซื้อจะสามารถให้รีวิวคุณได้`
          : 'บันทึกสถานะว่าขายแล้วเรียบร้อย!',
      });

      // ปิด modal
      setSoldModalListing(null);
      setSelectedBuyer(null);
      setBuyerQuery('');
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกการขาย',
      });
    } finally {
      setSavingDeal(false);
    }
  }

  // อัปเดตราคาประกาศ
  async function handlePriceUpdate(listingId: string) {
    if (!user) return;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFeedbackMsg({ type: 'error', text: 'กรุณากรอกราคาที่ถูกต้อง' });
      return;
    }

    setActionLoading(listingId);
    setFeedbackMsg(null);

    const { error } = await supabase
      .from('listings')
      .update({ price_thb: priceNum, updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .eq('seller_id', user.id);

    if (error) {
      setFeedbackMsg({ type: 'error', text: 'อัปเดตราคาไม่สำเร็จ: ' + error.message });
    } else {
      setListings((prev) =>
        prev.map((item) => (item.id === listingId ? { ...item, price_thb: priceNum } : item))
      );
      setFeedbackMsg({ type: 'success', text: `ปรับราคาเป็น ฿${priceNum.toLocaleString()} เรียบร้อยแล้ว` });
      setEditingPriceId(null);
    }
    setActionLoading(null);
  }

  // ลบประกาศ
  async function handleDeleteListing(listingId: string, cardName: string) {
    if (!user) return;
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบประกาศ "${cardName}"?`);
    if (!confirmDelete) return;

    setActionLoading(listingId);
    setFeedbackMsg(null);

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('seller_id', user.id);

    if (error) {
      setFeedbackMsg({ type: 'error', text: 'ลบประกาศไม่สำเร็จ: ' + error.message });
    } else {
      setListings((prev) => prev.filter((item) => item.id !== listingId));
      setFeedbackMsg({ type: 'success', text: `ลบประกาศ "${cardName}" เรียบร้อยแล้ว` });
    }
    setActionLoading(null);
  }

  // กรองตามแท็บ
  const filteredListings = listings.filter((item) => {
    if (selectedTab === 'all') return true;
    return item.status === selectedTab;
  });

  // สถิติสรุป
  const activeCount = listings.filter((i) => i.status === 'active').length;
  const soldCount = listings.filter((i) => i.status === 'sold').length;
  const totalValue = listings
    .filter((i) => i.status === 'active')
    .reduce((sum, item) => sum + (Number(item.price_thb) * (item.quantity || 1)), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header โทนเข้มพรีเมียม */}
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

          <div className="flex items-center space-x-3">
            {user && (
              <Link
                href={`/sellers/${user.id}`}
                className="hidden sm:inline-flex items-center gap-1.5 border border-purple-800 text-purple-200 hover:bg-purple-900/50 hover:text-white px-3 py-2 rounded-xl font-medium text-xs transition"
                title="ดูหน้าโปรไฟล์ของคุณในมุมมองที่คนอื่นเห็น"
              >
                <User className="h-3.5 w-3.5" />
                <span>หน้าโปรไฟล์ผู้ขายของฉัน</span>
                <ExternalLink className="h-3 w-3 text-purple-400" />
              </Link>
            )}

            <Link
              href="/listings/create"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>ลงขายการ์ดเพิ่ม</span>
            </Link>

            <Link
              href="/"
              className="border border-purple-800 text-purple-200 hover:bg-purple-900/50 hover:text-white px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl font-medium text-xs transition inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">หน้าแรก</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* หัวข้อหน้า */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              การ์ดที่ฉันลงขาย <span className="text-purple-600">({listings.length})</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              จัดการรายการขาย อัปเดตราคา และบันทึกสถานะการขายของคุณได้ที่นี่
            </p>
          </div>

          {user && (
            <Link
              href={`/sellers/${user.id}`}
              className="sm:hidden inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              <span>ดูหน้าโปรไฟล์ผู้ขายของฉัน →</span>
            </Link>
          )}
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-2 text-sm ${feedbackMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
              }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">กำลังวางขาย (Active)</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{activeCount} ใบ</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ขายสำเร็จแล้ว (Sold)</p>
              <p className="text-2xl font-black text-green-600 mt-1">{soldCount} ใบ</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">มูลค่ารวมที่เปิดขาย</p>
              <p className="text-2xl font-black text-gray-900 mt-1">฿{totalValue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Tag className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200 mb-6 gap-2 sm:gap-6 overflow-x-auto">
          {[
            { key: 'all', label: 'ทั้งหมด', count: listings.length },
            { key: 'active', label: 'กำลังวางขาย', count: activeCount },
            { key: 'sold', label: 'ขายแล้ว', count: soldCount },
            { key: 'closed', label: 'ปิดประกาศ', count: listings.filter((i) => i.status === 'closed').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`pb-3 text-sm font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${selectedTab === tab.key
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${selectedTab === tab.key ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Listings Content */}
        {loading ? (
          <div className="text-center py-24 text-purple-600 font-medium animate-pulse">
            กำลังโหลดรายการการ์ดของคุณ...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">ไม่พบรายการการ์ดในหมวดหมู่นี้</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-6">
              คุณยังไม่มีการ์ดที่อยู่ในสถานะนี้ เริ่มลงประกาศขายการ์ดใบแรกของคุณได้ทันที
            </p>
            <Link
              href="/listings/create"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition"
            >
              <Plus className="h-4 w-4" />
              <span>ลงขายการ์ดทันที</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((item) => {
              const mainImage = item.listing_images?.[0]?.image_url || item.cards?.image_url;
              const isActionLoading = actionLoading === item.id;
              const isEditingPrice = editingPriceId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: รูปและการ์ด Info */}
                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={item.cards?.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Tag className="h-6 w-6" />
                        </div>
                      )}
                      <span className="absolute top-1 left-1 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {item.condition}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                          {item.cards?.games?.name || 'TCG'}
                        </span>
                        <span className="text-gray-400 font-medium truncate">
                          {item.cards?.card_sets?.name} ({item.cards?.card_sets?.code})
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base sm:text-lg mt-1 truncate">
                        {item.cards?.name}
                      </h3>

                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>จำนวน: <strong>{item.quantity} ใบ</strong></span>
                        <span>•</span>
                        <span>ลงเมื่อ: {new Date(item.created_at).toLocaleDateString('th-TH')}</span>
                      </div>

                      {/* แสดงสถานะปัจจุบัน */}
                      <div className="mt-2 flex items-center gap-2">
                        {item.status === 'active' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> กำลังวางขาย
                          </span>
                        )}
                        {item.status === 'sold' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-full">
                            ✓ ขายแล้ว
                          </span>
                        )}
                        {item.status === 'reserved' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            ติดจอง
                          </span>
                        )}
                        {item.status === 'closed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                            ปิดการขาย
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: ราคา & แก้ไขราคา */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 shrink-0">
                    <span className="text-xs text-gray-400 block font-medium">ราคาต่อใบ</span>
                    {isEditingPrice ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          min="1"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          className="w-24 px-2 py-1 text-sm border border-purple-500 rounded-lg focus:outline-none font-bold"
                          placeholder="ราคา"
                          autoFocus
                        />
                        <button
                          onClick={() => handlePriceUpdate(item.id)}
                          disabled={isActionLoading}
                          className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                          title="บันทึกราคา"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingPriceId(null)}
                          className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
                          title="ยกเลิก"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-purple-600">
                          ฿{item.price_thb.toLocaleString()}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPriceId(item.id);
                            setNewPrice(String(item.price_thb));
                          }}
                          className="text-gray-400 hover:text-purple-600 p-1 transition"
                          title="แก้ไขราคา"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions Buttons */}
                  <div className="flex items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 justify-end shrink-0">
                    {/* ดูหน้าสินค้า */}
                    <Link
                      href={`/listings/create/${item.id}`}
                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition border border-gray-200"
                      title="ดูหน้ารายละเอียดการ์ด"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    {/* ปุ่มเปิด Modal ขายแล้ว */}
                    {item.status === 'active' ? (
                      <button
                        onClick={() => {
                          setSoldModalListing(item);
                          setSelectedBuyer(null);
                          setBuyerQuery('');
                        }}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="ทำเครื่องหมายว่าขายแล้ว"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>ขายแล้ว</span>
                      </button>
                    ) : item.status === 'sold' || item.status === 'closed' ? (
                      <button
                        onClick={() => handleStatusChange(item.id, 'active')}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="นำกลับมาวางขายอีกครั้ง"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>วางขายใหม่</span>
                      </button>
                    ) : null}

                    {/* ปุ่มปิดการขายชั่วคราว */}
                    {item.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'closed')}
                        disabled={isActionLoading}
                        className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-medium transition cursor-pointer"
                        title="ปิดประกาศชั่วคราว"
                      >
                        ปิดประกาศ
                      </button>
                    )}

                    {/* ปุ่มลบประกาศ */}
                    <button
                      onClick={() => handleDeleteListing(item.id, item.cards?.name || 'การ์ด')}
                      disabled={isActionLoading}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition border border-red-200 cursor-pointer"
                      title="ลบประกาศนี้"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal บันทึกการขายสำเร็จ */}
        {soldModalListing && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>บันทึกการขายสำเร็จ</span>
                </h3>
                <button
                  onClick={() => setSoldModalListing(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-12 h-14 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={soldModalListing.listing_images?.[0]?.image_url || soldModalListing.cards?.image_url || ''}
                      alt={soldModalListing.cards?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{soldModalListing.cards?.name}</h4>
                    <p className="text-xs text-purple-700 font-medium">ราคา ฿{soldModalListing.price_thb.toLocaleString()} ({soldModalListing.condition})</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ระบุผู้ซื้อในระบบ <span className="text-purple-600 font-normal">(เพื่อให้ผู้ซื้อรีวิวคุณได้)</span>
                  </label>

                  {selectedBuyer ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-green-200 text-green-800 flex items-center justify-center font-bold text-xs">
                          {selectedBuyer.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{selectedBuyer.display_name}</p>
                          <p className="text-[11px] text-gray-500">{selectedBuyer.contact_email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedBuyer(null)}
                        className="text-xs text-red-500 hover:underline font-semibold"
                      >
                        เปลี่ยน
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้ซื้อ..."
                        value={buyerQuery}
                        onChange={(e) => setBuyerQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs focus:border-purple-500 focus:outline-none"
                      />

                      {buyerResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-30 divide-y">
                          {buyerResults.map((buyer) => (
                            <button
                              key={buyer.id}
                              type="button"
                              onClick={() => {
                                setSelectedBuyer(buyer);
                                setBuyerQuery('');
                                setBuyerResults([]);
                              }}
                              className="w-full p-2.5 text-left hover:bg-purple-50 flex items-center gap-2 transition"
                            >
                              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px]">
                                {buyer.display_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-gray-800">{buyer.display_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchingBuyer && (
                        <span className="text-[10px] text-gray-400 mt-1 block">กำลังค้นหา...</span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    * หากไม่ได้ขายให้สมาชิกในเว็บ สามารถกด "บันทึกว่าขายแล้ว" ได้ทันที
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSoldModalListing(null)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-100 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleCompleteDealWithBuyer}
                    disabled={savingDeal}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-60"
                  >
                    {savingDeal ? 'กำลังบันทึก...' : 'บันทึกว่าขายแล้ว'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
