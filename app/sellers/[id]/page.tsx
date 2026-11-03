'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile, Listing, Review, Deal } from '@/types/database';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Star, 
  MessageCircle, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  Send,
  User as UserIcon,
  ShoppingBag,
  Edit3
} from 'lucide-react';

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
      กำลังโหลดข้อมูลผู้ขาย...
    </div>
  );
}

export default function SellerProfilePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SellerProfileContent />
    </Suspense>
  );
}

function SellerProfileContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sellerId = params.id;

  const [seller, setSeller] = useState<Profile | null>(null);
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedDealsCount, setCompletedDealsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  // สำหรับผู้ใช้ปัจจุบันที่กำลังเปิดดู
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [unreviewedDeals, setUnreviewedDeals] = useState<Deal[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        checkUnreviewedDeals(user.id);
      }
    });

    fetchSellerData();
  }, [sellerId]);

  async function fetchSellerData() {
    setLoading(true);

    // 1. ดึงข้อมูลโปรไฟล์ผู้ขาย
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sellerId)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching seller profile:', profileError);
      setSeller(null);
      setLoading(false);
      return;
    }
    setSeller(profileData);

    // 2. ดึงการ์ดที่กำลังวางขายอยู่ (Active)
    const { data: listingsData } = await supabase
      .from('listings')
      .select(`
        *,
        cards (*, games(*), card_sets(*)),
        listing_images (*)
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    setActiveListings(listingsData || []);

    // 3. ดึงรีวิวทั้งหมดของผู้ขายรายนี้
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer_profile:profiles!reviews_reviewer_id_fkey (display_name, avatar_url),
        deals (
          id,
          condition,
          price_thb,
          cards (name, card_number, image_url)
        )
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    setReviews(reviewsData || []);

    // 4. นับจำนวนดีลที่สำเร็จ
    const { count: dealsCount } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    setCompletedDealsCount(dealsCount || 0);

    setLoading(false);
  }

  // ตรวจสอบว่าผู้ใช้ปัจจุบันมีดีลกับผู้ขายคนนี้ที่ยังไม่ได้รีวิวหรือไม่
  async function checkUnreviewedDeals(currentUserId: string) {
    if (currentUserId === sellerId) return;

    // หาดีลที่ currentUserId เป็นผู้ซื้อ และ sellerId เป็นผู้ขาย
    const { data: userDeals } = await supabase
      .from('deals')
      .select(`
        *,
        cards (name, card_number)
      `)
      .eq('buyer_id', currentUserId)
      .eq('seller_id', sellerId);

    if (!userDeals || userDeals.length === 0) return;

    // เช็คว่าดีลไหนที่เคยรีวิวไปแล้วบ้าง
    const dealIds = userDeals.map((d) => d.id);
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('deal_id')
      .in('deal_id', dealIds);

    const reviewedDealIds = new Set(existingReviews?.map((r) => r.deal_id) || []);
    const pendingDeals = userDeals.filter((d) => !reviewedDealIds.has(d.id));

    setUnreviewedDeals(pendingDeals);
  }

  // ส่งรีวิว
  async function handleSubmitReview(dealId: string) {
    if (!currentUser) return;
    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      const { error } = await supabase.from('reviews').insert({
        deal_id: dealId,
        reviewer_id: currentUser.id,
        seller_id: sellerId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (error) throw error;

      setReviewSuccess('ขอบคุณสำหรับรีวิว! ความคิดเห็นของคุณช่วยสร้างความน่าเชื่อถือให้ชุมชน');
      setReviewComment('');
      setUnreviewedDeals((prev) => prev.filter((d) => d.id !== dealId));
      fetchSellerData();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'ส่งรีวิวไม่สำเร็จ');
    } finally {
      setSubmittingReview(false);
    }
  }

  // คำนวณคะแนนเฉลี่ย
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const isVerifiedSeller = completedDealsCount >= 1 || (reviews.length > 0 && Number(averageRating) >= 4.0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-purple-600 font-medium animate-pulse">
        กำลังโหลดข้อมูลผู้ขาย...
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500 space-y-4 px-4">
        <p className="text-lg font-semibold text-gray-800">ไม่พบโปรไฟล์ผู้ขายรายนี้</p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl transition shadow-md"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header */}
      <header className="bg-[#0f0c1b] border-b border-purple-900/40 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
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

          <button
            onClick={() => router.back()}
            className="flex items-center text-xs font-semibold text-purple-200 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> ย้อนกลับ
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* Seller Info Card Banner */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            {/* ซ้าย: Avatar + ชื่อ + Badge */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shrink-0 border-4 border-white">
                {seller.avatar_url ? (
                  <img
                    src={seller.avatar_url}
                    alt={seller.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  seller.display_name.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                    {seller.display_name}
                  </h1>
                  {isVerifiedSeller && (
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                      ผู้ขายที่ได้รับการรับรอง (Verified)
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    สมาชิกตั้งแต่ {new Date(seller.created_at || '').toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
                  </span>
                  <span>•</span>
                  <span>สำเร็จ {completedDealsCount} ดีล</span>
                </div>

                {/* Rating Display */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          averageRating && Number(averageRating) >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-extrabold text-sm text-gray-900">
                    {averageRating ? `${averageRating} / 5.0` : 'ยังไม่มีรีวิว'}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({reviews.length} รีวิวจากผู้ซื้อจริง)
                  </span>
                </div>
              </div>
            </div>

            {/* ขวา: ช่องทางติดต่อผู้ขาย หรือปุ่มแก้ไขโปรไฟล์ */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100">
              {currentUser?.id === sellerId ? (
                <Link
                  href="/profile"
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>แก้ไขข้อมูลโปรไฟล์ของฉัน</span>
                </Link>
              ) : seller.line_id ? (
                <a
                  href={`https://line.me/ti/p/~${seller.line_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>ทัก LINE: {seller.line_id}</span>
                </a>
              ) : null}
              {seller.contact_email && (
                <span className="text-xs text-gray-400">
                  อีเมล: <strong className="text-gray-700">{seller.contact_email}</strong>
                </span>
              )}
            </div>

          </div>
        </section>

        {/* กล่องให้รีวิวสำหรับผู้ซื้อจริง (ถ้ามีดีลที่ยังไม่ได้รีวิว) */}
        {unreviewedDeals.length > 0 && (
          <section className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white rounded-3xl border border-purple-200 p-6 mb-8 shadow-xs">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-base mb-1">
              <ShoppingBag className="h-5 w-5 text-purple-600" />
              <span>คุณเคยซื้อการ์ดจากผู้ขายรายนี้! ให้คะแนนและรีวิวเพื่อช่วยชุมชน</span>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              ดีลการ์ด: <strong>{unreviewedDeals[0].cards?.name}</strong> (#{unreviewedDeals[0].cards?.card_number})
            </p>

            {reviewSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{reviewSuccess}</span>
              </div>
            )}
            {reviewError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl mb-3">
                {reviewError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ให้คะแนนความพึงพอใจ:</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          reviewRating >= star
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-700 ml-2">{reviewRating} ดาว</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">เขียนความคิดเห็น (ตัวเลือก):</label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="เช่น แพ็คการ์ดใส่ซองหนาแน่นมาก สภาพการ์ดตรงปก ส่งของไว..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSubmitReview(unreviewedDeals[0].id)}
                disabled={submittingReview}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submittingReview ? 'กำลังบันทึก...' : 'ส่งรีวิวการซื้อ'}</span>
              </button>
            </div>
          </section>
        )}

        {/* แท็บสลับ: การ์ดที่วางขาย / รีวิว */}
        <div className="flex border-b border-gray-200 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'listings'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>การ์ดที่กำลังวางขาย</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'listings' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {activeListings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'reviews'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>รีวิวจากผู้ซื้อ</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'reviews' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {reviews.length}
            </span>
          </button>
        </div>

        {/* เนื้อหาตามแท็บ */}
        {activeTab === 'listings' ? (
          activeListings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs">
              ขณะนี้ผู้ขายรายนี้ยังไม่มีการ์ดที่เปิดวางขาย
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeListings.map((item) => {
                const mainImage = item.listing_images?.[0]?.image_url || item.cards?.image_url;
                return (
                  <Link
                    key={item.id}
                    href={`/listings/create/${item.listing_code}`}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-purple-300 transition duration-200 group flex flex-col"
                  >
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

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs text-purple-600 font-semibold flex justify-between">
                          <span>{item.cards?.games?.name || 'TCG'}</span>
                          <span className="text-gray-400 font-normal">{item.cards?.card_sets?.code}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base mt-1 line-clamp-1 group-hover:text-purple-700 transition">
                          {item.cards?.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-purple-600 font-black text-lg">
                          ฿{item.price_thb.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500">
                          คงเหลือ {item.quantity} ใบ
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          /* แท็บรีวิว */
          reviews.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500 shadow-xs">
              ยังไม่มีรีวิวสำหรับผู้ขายรายนี้ รีวิวแรกจะเกิดขึ้นเมื่อมีผู้ซื้อปิดดีลสำเร็จ
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {rev.reviewer_profile?.display_name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          {rev.reviewer_profile?.display_name || 'ผู้ซื้อในระบบ'}
                          <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.2 rounded font-semibold">
                            ผู้ซื้อจริง
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {new Date(rev.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            rev.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.deals?.cards && (
                    <div className="text-xs bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-gray-600 flex items-center gap-2">
                      <Tag className="h-3 w-3 text-purple-600 shrink-0" />
                      <span>
                        ซื้อ: <strong>{rev.deals.cards.name}</strong> ({rev.deals.condition}) ราคา ฿{rev.deals.price_thb.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {rev.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed pl-1">
                      {rev.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}

      </main>
    </div>
  );
}
