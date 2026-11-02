'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardCondition } from '@/types/database';
import { 
  Search, 
  Upload, 
  X, 
  ArrowLeft, 
  Image as ImageIcon, 
  Sparkles, 
  Globe, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  ChevronRight,
  Database
} from 'lucide-react';
import { fetchExternalPrice, ExternalCardPrice } from '@/lib/card-price';

export default function CreateListingPage() {
  const router = useRouter();

  // State สำหรับค้นหาและเลือกการ์ด
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [externalPrice, setExternalPrice] = useState<ExternalCardPrice | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // State ฟังก์ชันที่ 1: ดึงสดจาก Pokémon TCG API
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [savingGlobalCard, setSavingGlobalCard] = useState(false);

  // State ฟังก์ชันที่ 2: กรอกข้อมูลการ์ดเอง (Custom Card Entry)
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGameId, setCustomGameId] = useState<number>(1);
  const [customSetCode, setCustomSetCode] = useState('');
  const [customSetName, setCustomSetName] = useState('');
  const [customCardNumber, setCustomCardNumber] = useState('');
  const [customRarity, setCustomRarity] = useState('');
  const [customLanguage, setCustomLanguage] = useState<'TH' | 'EN' | 'JP'>('EN');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [savingCustomCard, setSavingCustomCard] = useState(false);

  // State ฟอร์มลงขาย
  const [condition, setCondition] = useState<CardCondition>('NM');
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [description, setDescription] = useState<string>('');

  // State อัปโหลดรูปภาพจริง
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/auth?next=%2Flistings%2Fcreate');
      } else if (active) {
        setCheckingAuth(false);
      }
    });

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Error checking authentication:', error);
        setErrorMsg('ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        setCheckingAuth(false);
        return;
      }
      if (!data.user) {
        router.replace('/auth?next=%2Flistings%2Fcreate');
        return;
      }
      setCheckingAuth(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // ค้นหาการ์ดจาก DB กลางแบบ Autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('cards')
        .select('*, games(*), card_sets(*)')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ดึงราคาอ้างอิงภายนอกจาก Pokémon TCG API เมื่อเลือกการ์ด
  useEffect(() => {
    if (!selectedCard) {
      setExternalPrice(null);
      return;
    }
    let active = true;
    setLoadingPrice(true);
    fetchExternalPrice(selectedCard.name, selectedCard.card_number, selectedCard.games?.name)
      .then((res) => {
        if (active && res && res.marketPriceTHB) {
          setExternalPrice(res);
        } else if (active) {
          setExternalPrice(null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch external price:', err);
      })
      .finally(() => {
        if (active) setLoadingPrice(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCard]);

  // ฟังก์ชันค้นหาจากฐานข้อมูลสากล (Pokémon TCG API)
  const handleSearchGlobal = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingGlobal(true);
    setGlobalSearchResults([]);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/pokemon-search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data.cards) {
        setGlobalSearchResults(data.cards);
      }
    } catch (err) {
      console.error('Error searching global:', err);
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  // เลือกการ์ดจากฐานข้อมูลสากล และบันทึกลง Supabase DB อัตโนมัติ
  const handleSelectGlobalCard = async (globalCard: any) => {
    setSavingGlobalCard(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 1, // Pokémon
          name: globalCard.name,
          cardNumber: globalCard.cardNumber,
          rarity: globalCard.rarity,
          language: 'EN',
          imageUrl: globalCard.imageUrl,
          setName: globalCard.setName,
          setCode: globalCard.setCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save card');

      setSelectedCard(data.card);
      setGlobalSearchResults([]);
      setSearchQuery('');

      // ถ้ามีราคาตลาด แนะนำราคาให้อัตโนมัติ
      if (globalCard.marketPriceTHB) {
        setPrice(String(globalCard.marketPriceTHB));
      }
    } catch (err: any) {
      console.error('Error saving global card:', err);
      setErrorMsg(err.message || 'บันทึกการ์ดไม่สำเร็จ');
    } finally {
      setSavingGlobalCard(false);
    }
  };

  // บันทึกการ์ดที่กรอกข้อมูลเอง (Custom Card Entry)
  const handleSaveCustomCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setErrorMsg('กรุณาระบุชื่อการ์ด');
      return;
    }

    setSavingCustomCard(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: customGameId,
          name: customName.trim(),
          cardNumber: customCardNumber.trim() || null,
          rarity: customRarity.trim() || null,
          language: customLanguage,
          imageUrl: customImageUrl.trim() || null,
          setCode: customSetCode.trim() || null,
          setName: customSetName.trim() || customSetCode.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save card');

      setSelectedCard(data.card);
      setShowCustomForm(false);
      setSearchQuery('');
      // รีเซ็ตฟอร์มกรอกเอง
      setCustomName('');
      setCustomCardNumber('');
      setCustomRarity('');
      setCustomSetCode('');
      setCustomSetName('');
      setCustomImageUrl('');
    } catch (err: any) {
      console.error('Error saving custom card:', err);
      setErrorMsg(err.message || 'บันทึกการ์ดไม่สำเร็จ');
    } finally {
      setSavingCustomCard(false);
    }
  };

  // เลือกรูปภาพจากเครื่อง พร้อมระบบ Validation (ตรวจชนิดไฟล์ & ขนาด)
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const file of filesArray) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
          alert(`ไฟล์ "${file.name}" ไม่ใช่รูปภาพที่รองรับ (รองรับเฉพาะ JPG, PNG, WEBP)`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินไป (จำกัดขนาดไม่เกิน 5MB ต่อรูป)`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setImages((prev) => [...prev, ...validFiles]);
        const previews = validFiles.map((file) => URL.createObjectURL(file));
        setImagePreviews((prev) => [...prev, ...previews]);
      }
    }
  };

  // ลบรูปที่เลือกไว้
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ส่งข้อมูลลงประกาศ (Submit Form)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCard) {
      setErrorMsg('กรุณาเลือกการ์ดที่ต้องการขายจากฐานข้อมูล');
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMsg('กรุณาระบุราคาที่ถูกต้อง');
      return;
    }

    setSubmitting(true);

    try {
      // 1. ดึง User ที่ล็อกอินอยู่
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        router.replace('/auth?next=%2Flistings%2Fcreate');
        return;
      }

      // 2. สร้างแถว Listing ใน Table `listings`
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .insert({
          seller_id: user.id,
          card_id: selectedCard.id,
          condition: condition,
          price_thb: Number(price),
          quantity: Number(quantity),
          description: description || null,
          status: 'active',
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // 3. อัปโหลดรูปจริงขึ้น Storage Bucket (`card-images`) และเพิ่มลง Table `listing_images`
      if (images.length > 0 && listingData) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const rawExt = file.name.split('.').pop() || 'jpg';
          const fileExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
          const fileName = `${listingData.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('card-images')
            .upload(fileName, file, {
              contentType: file.type || 'image/jpeg',
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found') || uploadError.message.includes('bucket')) {
              alert('แจ้งเตือน: ยังไม่ได้สร้าง Storage Bucket "card-images" ใน Supabase กรุณารันไฟล์ storage_setup.sql ใน Supabase SQL Editor เพื่อให้ระบบบันทึกรูปถ่ายจริงได้ครับ');
            }
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('card-images')
              .getPublicUrl(fileName);

            const { error: insertImgErr } = await supabase.from('listing_images').insert({
              listing_id: listingData.id,
              image_url: publicUrl,
              sort_order: i,
            });
            if (insertImgErr) {
              console.error('Insert image error:', insertImgErr);
            }
          }
        }
      }

      // ลงขายสำเร็จ นำกลับไปหน้าแรก
      router.push('/');
    } catch (err: unknown) {
      console.error('Error creating listing:', err);
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลงขายการ์ด');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
        กำลังตรวจสอบการเข้าสู่ระบบ...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header โทนเดียวกับหน้าแรก */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
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

          <button
            onClick={() => router.back()}
            className="flex items-center text-xs font-semibold text-purple-200 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
          </button>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-3xl mx-auto px-4 mt-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-800 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            ผู้ขาย SianCard
          </div>
          <h1 className="text-2xl font-black text-gray-900">ลงประกาศขายการ์ด</h1>
          <p className="text-sm text-gray-500 mt-0.5">เลือกการ์ดจากฐานข้อมูล ระบุสภาพ ราคา และใส่ภาพถ่ายจริง</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl">
              {errorMsg}
            </div>
          )}

          {/* สเต็ปที่ 1: เลือกการ์ดจากฐานข้อมูล */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-base flex items-center">
                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs flex items-center justify-center mr-2 shadow-sm">1</span>
                การ์ดที่จะขาย
              </h2>
              {!selectedCard && !showCustomForm && (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>เพิ่มการ์ดใหม่ด้วยตนเอง</span>
                </button>
              )}
            </div>

            {!selectedCard ? (
              showCustomForm ? (
                /* ฟอร์มกรอกข้อมูลการ์ดเอง (Custom Card Entry) */
                <div className="p-5 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-purple-900">
                      <Plus className="h-4 w-4 text-purple-600" />
                      <span>กรอกข้อมูลการ์ดใหม่ (กรณีไม่มีในระบบ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="text-xs text-gray-500 hover:text-gray-800"
                    >
                      ยกเลิก
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        ชื่อการ์ด <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น Monkey D. Luffy, Charizard ex, บลูอายส์ ไวท์ ดราก้อน..."
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">การ์ดเกม</label>
                        <select
                          value={customGameId}
                          onChange={(e) => setCustomGameId(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:border-purple-500 focus:outline-none"
                        >
                          <option value={1}>⚡ Pokémon</option>
                          <option value={2}>🏴‍☠️ One Piece</option>
                          <option value={3}>🧙 Yu-Gi-Oh!</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ภาษาการ์ด</label>
                        <select
                          value={customLanguage}
                          onChange={(e) => setCustomLanguage(e.target.value as any)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:border-purple-500 focus:outline-none"
                        >
                          <option value="EN">EN (อังกฤษ)</option>
                          <option value="TH">TH (ไทย)</option>
                          <option value="JP">JP (ญี่ปุ่น)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">รหัสชุด / ชื่อชุด (Set)</label>
                        <input
                          type="text"
                          placeholder="เช่น OP-05, 151, SV03a..."
                          value={customSetCode}
                          onChange={(e) => setCustomSetCode(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">หมายเลขการ์ด (Number)</label>
                        <input
                          type="text"
                          placeholder="เช่น 199/165, OP05-060..."
                          value={customCardNumber}
                          onChange={(e) => setCustomCardNumber(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ความหายาก (Rarity)</label>
                        <input
                          type="text"
                          placeholder="เช่น Secret Rare, SAR, SR..."
                          value={customRarity}
                          onChange={(e) => setCustomRarity(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ลิงก์ภาพการ์ด (ถ้ามี)</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={customImageUrl}
                          onChange={(e) => setCustomImageUrl(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCustomForm(false)}
                        className="flex-1 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomCard}
                        disabled={savingCustomCard || !customName.trim()}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50 cursor-pointer"
                      >
                        {savingCustomCard ? 'กำลังบันทึก...' : 'บันทึกและเลือกการ์ดนี้'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* กล่องค้นหาปกติ + ปุ่มดึงสากล */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อการ์ด หรือเลขชุดเพื่อค้นหา (เช่น Pikachu, OP05, Charizard)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none text-sm transition"
                    />
                  </div>

                  {/* Dropdown ผลการค้นหาจากฐานข้อมูลในระบบ */}
                  {searchResults.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100">
                      <div className="p-2 bg-gray-50 text-[11px] font-bold text-gray-500">
                        พบในฐานข้อมูล SianCard ({searchResults.length} ใบ)
                      </div>
                      {searchResults.map((card) => (
                        <div
                          key={card.id}
                          onClick={() => {
                            setSelectedCard(card);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="p-3 hover:bg-purple-50/70 cursor-pointer flex items-center space-x-3 transition"
                        >
                          {card.image_url ? (
                            <img src={card.image_url} alt={card.name} className="w-10 h-14 object-cover rounded shadow-xs" />
                          ) : (
                            <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm text-gray-800">{card.name}</div>
                            <div className="text-xs text-purple-700 font-medium">
                              {card.games?.name} • {card.card_sets?.name || card.card_number} • {card.rarity}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isSearching && (
                    <div className="text-xs text-purple-600 px-1 animate-pulse">กำลังค้นหาในฐานข้อมูล SianCard...</div>
                  )}

                  {/* แถบตัวเลือกเมื่อค้นหาไม่พบ หรืออยากหาจากแหล่งสากล */}
                  {searchQuery.trim().length >= 2 && (
                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-2">
                      <div className="text-xs text-gray-600 flex items-center gap-1 font-medium">
                        <Database className="h-3.5 w-3.5 text-purple-600" />
                        <span>ไม่พบการ์ดที่ต้องการ หรือต้องการดึงข้อมูลทางการ?</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {/* ปุ่มดึงสดจาก Pokémon TCG API */}
                        <button
                          type="button"
                          onClick={handleSearchGlobal}
                          disabled={isSearchingGlobal}
                          className="px-3 py-1.5 bg-white border border-purple-300 hover:border-purple-500 text-purple-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Globe className="h-3.5 w-3.5 text-purple-600" />
                          <span>{isSearchingGlobal ? 'กำลังค้นหาจาก Pokémon API...' : 'ค้นหาจากฐานข้อมูลสากล (Pokémon TCG)'}</span>
                        </button>

                        {/* ปุ่มกรอกข้อมูลเอง */}
                        <button
                          type="button"
                          onClick={() => setShowCustomForm(true)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>กรอกข้อมูลการ์ดเอง</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ผลการค้นหาจาก Pokémon TCG API สากล */}
                  {globalSearchResults.length > 0 && (
                    <div className="mt-3 bg-purple-50/40 border border-purple-200 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <Globe className="h-4 w-4 text-purple-600" />
                          <span>ผลการค้นหาจาก Pokémon TCG API ({globalSearchResults.length} ใบ)</span>
                        </div>
                        <span className="text-[10px] text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                          คลิกเพื่อบันทึกและเลือกทันที
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                        {globalSearchResults.map((gCard) => (
                          <div
                            key={gCard.id}
                            onClick={() => !savingGlobalCard && handleSelectGlobalCard(gCard)}
                            className="bg-white p-2.5 rounded-xl border border-gray-200 hover:border-purple-500 hover:shadow-md cursor-pointer flex items-center gap-3 transition"
                          >
                            {gCard.imageUrl ? (
                              <img src={gCard.imageUrl} alt={gCard.name} className="w-10 h-14 object-cover rounded shadow-xs shrink-0" />
                            ) : (
                              <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center shrink-0">
                                <ImageIcon className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-gray-900 truncate">{gCard.name}</div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {gCard.setName} ({gCard.cardNumber}) • {gCard.rarity}
                              </div>
                              {gCard.marketPriceTHB && (
                                <div className="text-[11px] font-black text-purple-600 mt-0.5">
                                  ~฿{gCard.marketPriceTHB.toLocaleString()} (${gCard.marketPriceUSD})
                                </div>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-purple-400 shrink-0" />
                          </div>
                        ))}
                      </div>

                      {savingGlobalCard && (
                        <div className="text-xs text-purple-700 animate-pulse text-center font-bold">
                          กำลังบันทึกการ์ดลงในฐานข้อมูล SianCard...
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )
            ) : (
              /* การ์ดที่เลือกแล้ว */
              <div className="flex items-center justify-between p-4 bg-purple-50/70 border border-purple-200 rounded-2xl">
                <div className="flex items-center space-x-4">
                  {selectedCard.image_url && (
                    <img src={selectedCard.image_url} alt={selectedCard.name} className="w-12 h-16 object-cover rounded-md shadow-sm" />
                  )}
                  <div>
                    <div className="font-bold text-gray-900">{selectedCard.name}</div>
                    <div className="text-xs text-purple-800 font-medium">
                      {selectedCard.games?.name} | {selectedCard.card_sets?.name || selectedCard.card_sets?.code || '-'} ({selectedCard.card_number || '-'})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-100/80 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                >
                  เปลี่ยนการ์ด
                </button>
              </div>
            )}
          </div>

          {/* สเต็ปที่ 2: กรอกรายละเอียดและสภาพการ์ด */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800 text-base flex items-center">
              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs flex items-center justify-center mr-2 shadow-sm">2</span>
              สภาพและราคา
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">สภาพการ์ด (Condition)</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['NM', 'LP', 'MP', 'HP', 'DMG'] as CardCondition[]).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(cond)}
                      className={`py-2 text-sm font-bold rounded-xl border transition ${
                        condition === cond
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ราคา (บาท)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="เช่น 1500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-sm transition"
                    required
                  />
                  {loadingPrice && (
                    <div className="text-[11px] text-purple-600 animate-pulse flex items-center gap-1 mt-1.5 font-medium">
                      <Globe className="h-3 w-3 shrink-0" />
                      <span>กำลังตรวจสอบราคาตลาดสากล...</span>
                    </div>
                  )}
                  {externalPrice && externalPrice.marketPriceTHB && (
                    <div className="mt-2 p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-700">
                        <div className="flex items-center gap-1 font-semibold text-purple-800">
                          <Globe className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                          <span>ราคาตลาดโลก (TCGPlayer)</span>
                        </div>
                        <div className="mt-0.5">
                          ~฿{externalPrice.marketPriceTHB.toLocaleString()} (${externalPrice.marketPriceUSD})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrice(String(externalPrice.marketPriceTHB))}
                        className="text-[11px] bg-purple-600 hover:bg-purple-700 text-white font-bold px-2 py-1 rounded-lg transition shrink-0 cursor-pointer shadow-xs"
                      >
                        ใช้ราคานี้
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">จำนวน (ใบ)</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-sm transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">รายละเอียดเพิ่มเติม (ตัวเลือก)</label>
                <textarea
                  rows={3}
                  placeholder="เช่น สภาพมุมคมกริบ ใส่ซองสองชั้น, นัดรับได้ตามแนว BTS..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-sm transition"
                />
              </div>
            </div>
          </div>

          {/* สเต็ปที่ 3: อัปโหลดรูปถ่ายจริงของการ์ด */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800 text-base flex items-center">
              <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs flex items-center justify-center mr-2 shadow-sm">3</span>
              รูปจริงของการ์ด
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* ปุ่มอัปโหลด */}
              <label className="h-28 border-2 border-dashed border-gray-300 hover:border-purple-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-purple-50/50 transition">
                <Upload className="h-6 w-6 text-purple-500 mb-1" />
                <span className="text-xs font-semibold text-gray-600">เพิ่มรูปภาพ</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>

              {/* แสดงตัวอย่างรูปภาพ */}
              {imagePreviews.map((src, index) => (
                <div key={index} className="relative h-28 border rounded-2xl overflow-hidden group shadow-xs">
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-600 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ปุ่ม Submit */}
          <div className="flex space-x-4 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 border border-gray-300 font-bold rounded-xl text-gray-700 hover:bg-gray-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-white rounded-xl shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'กำลังลงประกาศ...' : 'ลงประกาศขายการ์ด'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
