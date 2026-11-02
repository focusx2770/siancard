import { NextRequest } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      gameId = 1,
      name,
      cardNumber,
      rarity,
      language = 'EN',
      imageUrl,
      setName,
      setCode,
    } = body;

    if (!name || !name.trim()) {
      return Response.json({ error: 'Card name is required' }, { status: 400 });
    }

    // 1. จัดการ Card Set (ถ้ามีระบุมา)
    let setId: number | null = null;
    if (setCode && setCode.trim()) {
      const codeClean = setCode.trim().toUpperCase();
      const { data: existingSet } = await supabase
        .from('card_sets')
        .select('id')
        .eq('game_id', gameId)
        .eq('code', codeClean)
        .maybeSingle();

      if (existingSet) {
        setId = existingSet.id;
      } else {
        const { data: newSet } = await supabase
          .from('card_sets')
          .insert({
            game_id: gameId,
            code: codeClean,
            name: setName?.trim() || codeClean,
          })
          .select('id')
          .maybeSingle();

        if (newSet) setId = newSet.id;
      }
    }

    // 2. ตรวจสอบว่ามีการ์ดใบนี้อยู่ในฐานข้อมูลแล้วหรือไม่
    let checkQuery = supabase
      .from('cards')
      .select('*, games(*), card_sets(*)')
      .eq('game_id', gameId)
      .ilike('name', name.trim());

    if (cardNumber) {
      checkQuery = checkQuery.eq('card_number', cardNumber.trim());
    }

    const { data: existingCards } = await checkQuery.limit(1);
    if (existingCards && existingCards.length > 0) {
      return Response.json({ card: existingCards[0], alreadyExisted: true });
    }

    // 3. สร้างการ์ดใบใหม่ลงใน Table `cards`
    const { data: createdCard, error: insertError } = await supabase
      .from('cards')
      .insert({
        game_id: gameId,
        set_id: setId,
        name: name.trim(),
        card_number: cardNumber?.trim() || null,
        rarity: rarity?.trim() || null,
        language: language || 'EN',
        image_url: imageUrl?.trim() || null,
      })
      .select('*, games(*), card_sets(*)')
      .single();

    if (insertError) {
      console.error('[insert card error]', insertError);
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    return Response.json({ card: createdCard, created: true });
  } catch (err: unknown) {
    console.error('[cards API POST error]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

