import { supabase } from '@/lib/supabase';

/**
 * ดึงจำนวนข้อความที่ยังไม่ได้อ่านของผู้ใช้ปัจจุบัน
 */
export async function getUnreadMessagesCount(userId: string): Promise<number> {
  if (!userId) return 0;

  try {
    // 1. ดึงห้องแชททั้งหมดที่ผู้ใช้คนนี้เข้าร่วม
    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (convError || !convs || convs.length === 0) return 0;

    const convIds = convs.map((c) => c.id);

    // 2. ดึงจำนวนข้อความที่ยังไม่ได้อ่าน (is_read = false) และคนส่งไม่ใช่ตัวเรา
    const { count, error: msgError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .eq('is_read', false)
      .neq('sender_id', userId);

    if (msgError) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}
