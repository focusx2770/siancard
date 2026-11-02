'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Conversation, Message, Profile, Listing } from '@/types/database';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  User,
  ExternalLink,
  CheckCheck,
  Sparkles,
  Tag,
  Clock,
  AlertCircle,
  ShoppingBag,
  UploadCloud,
  CheckCircle2,
  DollarSign,
  Star,
  Building2,
  Image as ImageIcon
} from 'lucide-react';

function LoadingMessages() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
      กำลังโหลดข้อความ...
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingMessages />}>
      <MessagesContent />
    </Suspense>
  );
}

interface ConversationItem {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  otherUser: Profile | null;
  listing?: Listing | null;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const directConversationId = searchParams.get('conversationId');
  const targetSellerId = searchParams.get('sellerId');
  const targetListingId = searchParams.get('listingId');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // Deal & Review State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDeal, setReviewDeal] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // เลื่อนลงไปล่างสุดของแชทเสมอ
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. ตรวจสอบการเข้าสู่ระบบ
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/auth?next=%2Fmessages');
      } else {
        setCurrentUserId(user.id);
      }
    });
  }, [router]);

  // 2. โหลดหรือสร้าง Conversation เมื่อทราบ User
  useEffect(() => {
    if (!currentUserId) return;

    async function initConversations() {
      setLoadingList(true);
      try {
        // หากส่ง targetSellerId เข้ามาเพื่อทักแชทใหม่
        if (targetSellerId && targetSellerId !== currentUserId) {
          // ตรวจสอบว่ามีห้องแชทเดิมอยู่แล้วหรือไม่
          let query = supabase
            .from('conversations')
            .select('*')
            .or(`and(buyer_id.eq.${currentUserId},seller_id.eq.${targetSellerId}),and(buyer_id.eq.${targetSellerId},seller_id.eq.${currentUserId})`);

          if (targetListingId) {
            query = query.eq('listing_id', targetListingId);
          }

          const { data: existing, error: existError } = await query.limit(1);

          if (existError && existError.message.includes('Could not find the table')) {
            setTableMissing(true);
            setLoadingList(false);
            return;
          }

          if (existing && existing.length > 0) {
            setActiveConversationId(existing[0].id);
          } else {
            // สร้างห้องแชทใหม่
            const { data: created, error: createError } = await supabase
              .from('conversations')
              .insert({
                buyer_id: currentUserId,
                seller_id: targetSellerId,
                listing_id: targetListingId || null,
              })
              .select()
              .single();

            if (!createError && created) {
              setActiveConversationId(created.id);
            }
          }
        } else if (directConversationId) {
          setActiveConversationId(directConversationId);
        }

        // ดึงรายการ Conversation ทั้งหมดของฉัน
        if (currentUserId) {
          await fetchUserConversations(currentUserId);
        }
      } catch (err) {
        console.error('Error init conversations:', err);
      } finally {
        setLoadingList(false);
      }
    }

    initConversations();
  }, [currentUserId, targetSellerId, targetListingId, directConversationId]);

  // ดึงรายการห้องแชททั้งหมดของผู้ใช้
  async function fetchUserConversations(userId: string) {
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        listings (*, cards(*))
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (convError) {
      if (convError.message.includes('Could not find the table')) {
        setTableMissing(true);
      }
      return;
    }

    if (!convData) return;

    // รวบรวม user IDs เพื่อดึง Profile ของคู่สนทนา
    const otherUserIds = convData.map((c) => (c.buyer_id === userId ? c.seller_id : c.buyer_id));
    const uniqueIds = Array.from(new Set(otherUserIds));

    let profilesMap: Record<string, Profile> = {};
    if (uniqueIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uniqueIds);

      if (profilesData) {
        profilesMap = Object.fromEntries(profilesData.map((p) => [p.id, p]));
      }
    }

    // ดึงข้อความล่าสุดของแต่ละห้อง
    const formatted: ConversationItem[] = [];
    for (const c of convData) {
      const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
      const otherProf = profilesMap[otherId] || { display_name: 'ผู้ใช้ SianCard', avatar_url: null };

      // ดึงข้อความล่าสุด
      const { data: lastMsgData } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      formatted.push({
        id: c.id,
        listing_id: c.listing_id,
        buyer_id: c.buyer_id,
        seller_id: c.seller_id,
        created_at: c.created_at,
        updated_at: c.updated_at,
        otherUser: otherProf,
        listing: c.listings,
        lastMessage: lastMsgData?.content || 'เริ่มการสนทนาใหม่',
        lastMessageTime: lastMsgData?.created_at || c.created_at,
      });
    }

    setConversations(formatted);

    // ถ้ายังไม่ได้เลือกห้อง และมีห้องอยู่แล้ว ให้เปิดห้องแรก
    if (!activeConversationId && formatted.length > 0 && !targetSellerId) {
      setActiveConversationId(formatted[0].id);
    }
  }

  // 3. โหลดข้อความในห้องแชทที่เลือก + Realtime Subscribe
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    // ดึงประวัติข้อความ
    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles(*)
        `)
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

      if (!error && data && isMounted) {
        setMessages(data);
      }
    }

    loadMessages();

    // สมัคร Realtime ฟังข้อความใหม่ในห้องนี้
    const channel = supabase
      .channel(`chat_${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // ดึงโปรไฟล์ของผู้ส่ง
          const { data: senderProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single();

          if (isMounted) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, { ...newMsg, sender_profile: senderProf || undefined }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  // ส่งข้อความ
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !activeConversationId || !currentUserId || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: currentUserId,
          content: text,
        })
        .select('*, sender_profile:profiles(*)')
        .single();

      if (!error && data) {
        // อัปเดต updated_at ของ conversation
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversationId);

        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }

  // ส่งข้อความช่วยเหลือทั่วไป
  async function sendSystemActionMessage(content: string) {
    if (!activeConversationId || !currentUserId) return;
    try {
      const { data } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: currentUserId,
          content,
        })
        .select('*, sender_profile:profiles(*)')
        .single();

      if (data) {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', activeConversationId);

        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      }
    } catch (err) {
      console.error('Error sending action message:', err);
    }
  }

  // ผู้ซื้อส่งข้อเสนอต่อรองราคา (Offer)
  async function handleSendOffer(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(offerPrice);
    if (isNaN(p) || p <= 0) {
      alert('กรุณาระบุราคาที่ถูกต้อง');
      return;
    }

    const offerPayload = `[OFFER_CARD]:${JSON.stringify({
      price: p,
      cardName: activeConv?.listing?.cards?.name || 'การ์ดสะสม',
      status: 'pending',
    })}`;

    await sendSystemActionMessage(offerPayload);
    setShowOfferModal(false);
    setOfferPrice('');
  }

  // ผู้ขายกดยอมรับข้อเสนอ และบันทึกดีล (Deal)
  async function handleAcceptOffer(offerData: any) {
    if (!activeConv || !currentUserId || !activeConv.listing) return;
    if (!confirm(`ยืนยันการตกลงขายในราคา ฿${Number(offerData.price).toLocaleString()} หรือไม่?`)) return;

    try {
      // 1. สร้าง Record ในตาราง deals
      const { data: newDeal, error: dealErr } = await supabase
        .from('deals')
        .insert({
          listing_id: activeConv.listing.id,
          card_id: activeConv.listing.card_id,
          seller_id: activeConv.seller_id,
          buyer_id: activeConv.buyer_id,
          condition: activeConv.listing.condition || 'NM',
          price_thb: Number(offerData.price),
        })
        .select()
        .single();

      if (dealErr) throw dealErr;

      // 2. อัปเดต listing เป็น sold
      await supabase
        .from('listings')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', activeConv.listing.id);

      // 3. ส่งข้อความแจ้งในแชท
      const dealAcceptPayload = `[DEAL_CONFIRMED]:${JSON.stringify({
        dealId: newDeal.id,
        price: Number(offerData.price),
        sellerId: activeConv.seller_id,
        buyerId: activeConv.buyer_id,
        cardName: activeConv.listing.cards?.name || 'การ์ดสะสม',
      })}`;

      await sendSystemActionMessage(dealAcceptPayload);
      alert('บันทึกการตกลงซื้อขายสำเร็จ! ผู้ซื้อสามารถแนบสลิปและให้รีวิวได้แล้ว');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกดีล: ' + err.message);
    }
  }

  // ผู้ซื้อแนบสลิปการโอนเงิน
  async function handleUploadSlip(e: React.FormEvent) {
    e.preventDefault();
    if (!slipFile || !currentUserId || !activeConversationId) return;

    setUploadingSlip(true);
    try {
      const ext = slipFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `slips/${currentUserId}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('card-images')
        .upload(fileName, slipFile, { contentType: slipFile.type || 'image/jpeg' });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('card-images')
        .getPublicUrl(fileName);

      const slipPayload = `[PAYMENT_SLIP]:${JSON.stringify({
        slipUrl: publicUrl,
        sentAt: new Date().toISOString(),
      })}`;

      await sendSystemActionMessage(slipPayload);
      setShowSlipModal(false);
      setSlipFile(null);
    } catch (err: any) {
      alert('อัปโหลดสลิปไม่สำเร็จ: ' + err.message);
    } finally {
      setUploadingSlip(false);
    }
  }

  // ผู้ซื้อส่งรีวิวให้ผู้ขาย
  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewDeal || !currentUserId) return;

    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        deal_id: reviewDeal.dealId,
        reviewer_id: currentUserId,
        seller_id: reviewDeal.sellerId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (error) throw error;

      await sendSystemActionMessage(`[REVIEW_GIVEN]:${JSON.stringify({
        rating: reviewRating,
        comment: reviewComment.trim(),
      })}`);

      alert('ขอบคุณสำหรับคะแนนรีวิว! ข้อมูลถูกบันทึกสู่โปรไฟล์ผู้ขายแล้ว');
      setShowReviewModal(false);
      setReviewComment('');
    } catch (err: any) {
      alert('ส่งรีวิวไม่สำเร็จ: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
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
              href="/"
              className="flex items-center text-xs font-semibold text-purple-200 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> หน้าแรก
            </Link>
          </div>
        </div>
      </header>

      {/* Main Chat Container */}
      <main className="max-w-6xl w-full mx-auto px-2 sm:px-4 py-2 sm:py-6 flex-1 flex flex-col">
        {tableMissing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-8 text-center max-w-xl mx-auto my-auto shadow-sm">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">ยังไม่ได้รัน SQL สำหรับระบบแชท</h2>
            <p className="text-sm text-gray-600 mb-4">
              กรุณานำโค้ดในไฟล์ <code className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono text-xs">chat_schema.sql</code> ไปวางและกด Run ใน <strong>Supabase SQL Editor</strong> เพื่อเปิดใช้งานระบบแชทแบบ Realtime
            </p>
            <Link
              href="/"
              className="inline-flex px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow transition"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col md:flex-row h-[calc(100dvh-140px)] md:h-[75vh]">

            {/* ซ้าย: รายการห้องแชท (Conversations List) */}
            <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-3.5 sm:p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <h1 className="font-extrabold text-gray-900 text-base">กล่องข้อความ</h1>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              </div>

              {/* รายการแชท */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {loadingList ? (
                  <div className="p-6 text-center text-xs text-purple-600 animate-pulse">
                    กำลังโหลดห้องแชท...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs space-y-2">
                    <MessageSquare className="h-8 w-8 mx-auto text-gray-300" />
                    <p>ยังไม่มีข้อความสนทนา</p>
                    <p className="text-[11px] text-gray-400">กดปุ่ม &quot;ทักแชทผู้ขาย&quot; ในหน้ารายละเอียดการ์ดเพื่อเริ่มคุย</p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const isSelected = conv.id === activeConversationId;
                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => setActiveConversationId(conv.id)}
                        className={`w-full p-4 text-left flex items-start gap-3 transition cursor-pointer ${isSelected ? 'bg-purple-50/70 border-l-4 border-purple-600' : 'hover:bg-gray-50'
                          }`}
                      >
                        {conv.otherUser?.avatar_url ? (
                          <img
                            src={conv.otherUser.avatar_url}
                            alt="avatar"
                            className="w-11 h-11 rounded-full object-cover shrink-0 border border-purple-100"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-sm text-gray-900 truncate">
                              {conv.otherUser?.display_name || 'ผู้ใช้ SianCard'}
                            </span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {new Date(conv.lastMessageTime || conv.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {conv.listing?.cards?.name && (
                            <span className="inline-block text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded truncate max-w-full mb-1">
                              การ์ด: {conv.listing.cards.name}
                            </span>
                          )}
                          <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ขวา: หน้าต่างส่งข้อความ (Active Chat View) */}
            <div className={`flex-1 flex flex-col ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
              {activeConv ? (
                <>
                  {/* Chat Room Header */}
                  <div className="p-4 border-b border-gray-100 bg-gray-50/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveConversationId(null)}
                        className="md:hidden p-1 text-gray-500 hover:text-gray-900"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <Link
                        href={`/sellers/${activeConv.otherUser?.id || ''}`}
                        className="flex items-center gap-2 group"
                      >
                        {activeConv.otherUser?.avatar_url ? (
                          <img
                            src={activeConv.otherUser.avatar_url}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-sm text-gray-900 group-hover:text-purple-600 transition flex items-center gap-1">
                            {activeConv.otherUser?.display_name || 'ผู้ใช้ SianCard'}
                          </div>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                            ออนไลน์บนระบบ Realtime
                          </span>
                        </div>
                      </Link>
                    </div>

                    {/* การ์ดที่กำลังคุยกัน (Pinned Listing Card Header) */}
                    {activeConv.listing && (
                      <Link
                        href={`/listings/create/${activeConv.listing.id}`}
                        className="flex items-center gap-1.5 sm:gap-2 bg-purple-50/80 border border-purple-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl hover:bg-purple-100 transition max-w-[130px] sm:max-w-none"
                      >
                        {activeConv.listing.cards?.image_url && (
                          <img
                            src={activeConv.listing.cards.image_url}
                            alt="card"
                            className="w-5 h-7 sm:w-6 sm:h-8 object-cover rounded shadow-xs shrink-0"
                          />
                        )}
                        <div className="text-left text-[11px] sm:text-xs">
                          <div className="font-bold text-gray-800 truncate max-w-[70px] sm:max-w-[150px]">
                            {activeConv.listing.cards?.name}
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-black text-purple-600">
                            ฿{Number(activeConv.listing.price_thb).toLocaleString()}
                          </div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-purple-500 shrink-0 hidden sm:block" />
                      </Link>
                    )}
                  </div>

                  {/* Messages Bubble Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#faf9fc]">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-xs space-y-2">
                        <Sparkles className="h-8 w-8 text-purple-400" />
                        <p className="font-medium text-gray-600">เริ่มการสนทนาได้เลย!</p>
                        <p className="text-[11px]">พิมพ์สอบถามสภาพการ์ด นัดรับ หรือกดปุ่ม "ยื่นข้อเสนอราคา" ด้านล่าง</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;

                        // ตรวจสอบข้อความพิเศษแบบ Interactive (Offer / Slip / Deal / Review)
                        if (msg.content.startsWith('[OFFER_CARD]:')) {
                          try {
                            const offerData = JSON.parse(msg.content.replace('[OFFER_CARD]:', ''));
                            const isSeller = activeConv.seller_id === currentUserId;

                            return (
                              <div key={msg.id} className="w-full flex justify-center my-2">
                                <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white border border-purple-500/40 rounded-2xl p-4 max-w-sm w-full shadow-lg text-center space-y-2">
                                  <div className="inline-flex items-center gap-1 bg-purple-500/30 text-purple-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30">
                                    <Tag className="w-3 h-3" /> ข้อเสนอต่อรองราคา
                                  </div>
                                  <div className="text-xs text-gray-300">
                                    ผู้ซื้อเสนอราคาสำหรับ <strong className="text-white">{offerData.cardName}</strong>
                                  </div>
                                  <div className="text-2xl font-black text-amber-400">
                                    ฿{Number(offerData.price).toLocaleString()}
                                  </div>

                                  {isSeller ? (
                                    <div className="pt-2">
                                      <button
                                        type="button"
                                        onClick={() => handleAcceptOffer(offerData)}
                                        className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                                      >
                                        ✓ ยอมรับข้อเสนอนี้ & จบการขาย
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-gray-400 italic">
                                      รอผู้ขายพิจารณาข้อเสนอของคุณ...
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          } catch {
                            // fallback
                          }
                        }

                        if (msg.content.startsWith('[DEAL_CONFIRMED]:')) {
                          try {
                            const dealData = JSON.parse(msg.content.replace('[DEAL_CONFIRMED]:', ''));
                            const isBuyer = dealData.buyerId === currentUserId;

                            return (
                              <div key={msg.id} className="w-full flex justify-center my-2">
                                <div className="bg-emerald-950 text-white border border-emerald-500/50 rounded-2xl p-4 max-w-sm w-full shadow-lg text-center space-y-2">
                                  <div className="inline-flex items-center gap-1 bg-emerald-500/30 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ตกลงซื้อขายสำเร็จ (Deal Closed)
                                  </div>
                                  <div className="text-xs text-emerald-100">
                                    ยอดชำระสุทธิ: <strong className="text-emerald-300 text-lg">฿{Number(dealData.price).toLocaleString()}</strong>
                                  </div>

                                  {isBuyer && (
                                    <div className="pt-2 flex flex-col gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setShowSlipModal(true)}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                                      >
                                        <UploadCloud className="w-4 h-4" />
                                        <span>แนบสลิปการโอนเงิน</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReviewDeal(dealData);
                                          setShowReviewModal(true);
                                        }}
                                        className="w-full py-1.5 bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                                      >
                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                        <span>ให้คะแนนรีวิวผู้ขาย</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          } catch {
                            // fallback
                          }
                        }

                        if (msg.content.startsWith('[PAYMENT_SLIP]:')) {
                          try {
                            const slipData = JSON.parse(msg.content.replace('[PAYMENT_SLIP]:', ''));
                            return (
                              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} my-2`}>
                                <div className="bg-white border-2 border-green-500/60 rounded-2xl p-2.5 max-w-[240px] shadow-md space-y-1.5">
                                  <span className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> สลิปการโอนเงิน
                                  </span>
                                  <a href={slipData.slipUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl group">
                                    <img src={slipData.slipUrl} alt="slip" className="w-full max-h-48 object-cover group-hover:scale-105 transition" />
                                  </a>
                                  <span className="text-[10px] text-gray-400 block text-right">คลิกเพื่อดูรูปขยาย</span>
                                </div>
                              </div>
                            );
                          } catch {
                            // fallback
                          }
                        }

                        if (msg.content.startsWith('[REVIEW_GIVEN]:')) {
                          try {
                            const revData = JSON.parse(msg.content.replace('[REVIEW_GIVEN]:', ''));
                            return (
                              <div key={msg.id} className="w-full flex justify-center my-2">
                                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 max-w-sm w-full text-center space-y-1">
                                  <div className="flex justify-center gap-0.5 text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-4 h-4 ${i < revData.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                                    ))}
                                  </div>
                                  <p className="text-xs font-bold text-gray-800">ผู้ซื้อได้ให้คะแนนรีวิว {revData.rating}/5 ดาว</p>
                                  {revData.comment && <p className="text-[11px] text-gray-600 italic">&ldquo;{revData.comment}&rdquo;</p>}
                                </div>
                              </div>
                            );
                          } catch {
                            // fallback
                          }
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                          >
                            {!isMe && (
                              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                                {msg.sender_profile?.avatar_url ? (
                                  <img
                                    src={msg.sender_profile.avatar_url}
                                    alt="sender"
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="h-3.5 w-3.5" />
                                )}
                              </div>
                            )}

                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${isMe
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs'
                                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-xs'
                                }`}
                            >
                              <p className="whitespace-pre-line break-words leading-relaxed">{msg.content}</p>
                              <div
                                className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-purple-200' : 'text-gray-400'
                                  }`}
                              >
                                <span>
                                  {new Date(msg.created_at).toLocaleTimeString('th-TH', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isMe && <CheckCheck className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* แถบ Action Quick Buttons เหนือช่องพิมพ์แชท */}
                  <div className="px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap">
                    {/* ปุ่มยื่นข้อเสนอสำหรับผู้ซื้อ */}
                    {activeConv.buyer_id === currentUserId && (
                      <button
                        type="button"
                        onClick={() => {
                          setOfferPrice(activeConv.listing?.price_thb?.toString() || '');
                          setShowOfferModal(true);
                        }}
                        className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>ยื่นข้อเสนอ / ต่อราคา</span>
                      </button>
                    )}

                    {/* ปุ่มแนบสลิป */}
                    <button
                      type="button"
                      onClick={() => setShowSlipModal(true)}
                      className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>แนบสลิปโอนเงิน</span>
                    </button>
                  </div>

                  {/* Message Input Box */}
                  <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-gray-100 flex items-center gap-2 sticky bottom-0 z-10">
                    <input
                      type="text"
                      placeholder="พิมพ์ข้อความ..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:border-purple-500 focus:outline-none text-xs sm:text-sm transition"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="p-2.5 sm:p-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-sm space-y-2 p-6">
                  <MessageSquare className="h-12 w-12 text-purple-300" />
                  <p className="font-bold text-gray-700">เลือกห้องสนทนาเพื่อเริ่มคุย</p>
                  <p className="text-xs text-gray-400">หรือค้นหาการ์ดที่สนใจแล้วกดปุ่มทักแชทผู้ขาย</p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Modal ยื่นข้อเสนอราคา (Offer Modal) */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-600" />
                <span>ยื่นข้อเสนอต่อรองราคา</span>
              </h3>
              <button onClick={() => setShowOfferModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleSendOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ราคาที่ต้องการเสนอ (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 font-bold">฿</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="เช่น 1000"
                    className="w-full pl-8 pr-3 py-2 border rounded-xl font-black text-lg text-purple-700 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">ราคาตั้งต้น: ฿{Number(activeConv?.listing?.price_thb || 0).toLocaleString()}</span>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowOfferModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow">ส่งข้อเสนอ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal แนบสลิปโอนเงิน (Slip Upload Modal) */}
      {showSlipModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-green-600" />
                <span>แนบหลักฐานสลิปการโอนเงิน</span>
              </h3>
              <button onClick={() => setShowSlipModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleUploadSlip} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">เลือกรูปสลิปจากเครื่อง</label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => e.target.files && setSlipFile(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowSlipModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600">ยกเลิก</button>
                <button type="submit" disabled={uploadingSlip} className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50">
                  {uploadingSlip ? 'กำลังส่งสลิป...' : 'ส่งสลิปให้ผู้ขาย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ให้คะแนนรีวิวผู้ขาย (Review Modal) */}
      {showReviewModal && reviewDeal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>ให้คะแนนรีวิวผู้ขาย</span>
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="text-center space-y-2">
                <span className="text-xs text-gray-500">แตะเพื่อเลือกคะแนนความพึงพอใจ:</span>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 cursor-pointer transform hover:scale-110 transition"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ความคิดเห็นเพิ่มเติม (ไม่บังคับ)</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="เช่น แพ็คการ์ดแน่นหนามาก ส่งไว การ์ดสภาพสวยตรงปก..."
                  className="w-full p-3 border rounded-xl text-xs text-gray-800 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowReviewModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600">ยกเลิก</button>
                <button type="submit" disabled={submittingReview} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50">
                  {submittingReview ? 'กำลังส่งรีวิว...' : 'บันทึกรีวิว'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
