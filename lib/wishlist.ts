import { supabase } from '@/lib/supabase';

const LOCAL_STORAGE_KEY = 'siancard_wishlist_ids';

// ดึงรายการ Listing ID ที่อยู่ใน Wishlist ทั้งหมด
export async function getWishlistIds(): Promise<string[]> {
  if (typeof window === 'undefined') return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // ดึงจาก Supabase
      const { data, error } = await supabase
        .from('wishlists')
        .select('listing_id')
        .eq('user_id', user.id);

      if (!error && data) {
        const ids = data.map((item) => item.listing_id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
        return ids;
      }
    }

    // Fallback: ดึงจาก LocalStorage
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.warn('Error reading wishlist:', err);
    return [];
  }
}

// กดสลับ Wishlist (Toggle Add / Remove)
export async function toggleWishlist(listingId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    let currentIds: string[] = stored ? JSON.parse(stored) : [];

    const isCurrentlyLiked = currentIds.includes(listingId);

    if (isCurrentlyLiked) {
      currentIds = currentIds.filter((id) => id !== listingId);
    } else {
      currentIds.push(listingId);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentIds));
    window.dispatchEvent(new Event('wishlist-updated'));

    // ซิงค์กับ Database ถ้าล็อกอินอยู่
    if (user) {
      if (isCurrentlyLiked) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
      } else {
        await supabase
          .from('wishlists')
          .insert({ user_id: user.id, listing_id: listingId });
      }
    }

    return !isCurrentlyLiked;
  } catch (err) {
    console.warn('Error toggling wishlist:', err);
    return false;
  }
}

