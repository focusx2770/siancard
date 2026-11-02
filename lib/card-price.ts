// lib/card-price.ts — helper สำหรับดึงราคาการ์ดจาก external API

export interface ExternalCardPrice {
  marketPriceUSD: number | null;
  marketPriceTHB: number | null;
  source: 'pokemontcg' | null;
  cardFound?: string;
  updatedAt?: string;
  note?: string;
}

/**
 * ดึงราคาตลาดจาก external API (Pokémon TCG API)
 * - สำหรับเกม Pokemon เท่านั้น (One Piece, Yu-Gi-Oh! ยังไม่มี free API)
 * - ส่งกลับ null ถ้าไม่ใช่ Pokemon หรือดึงไม่ได้
 */
export async function fetchExternalPrice(
  cardName: string,
  cardNumber?: string | null,
  game?: string | null
): Promise<ExternalCardPrice> {
  const empty: ExternalCardPrice = {
    marketPriceUSD: null,
    marketPriceTHB: null,
    source: null,
  };

  // เช็คว่าเป็นเกม Pokemon ก่อน (case insensitive)
  const gameLower = (game || '').toLowerCase();
  const isPokemon =
    gameLower.includes('pokemon') ||
    gameLower.includes('pokémon') ||
    gameLower.includes('pok');

  if (!isPokemon) return empty;

  try {
    const params = new URLSearchParams({ name: cardName, game: 'pokemon' });
    if (cardNumber) params.set('number', cardNumber);

    const res = await fetch(`/api/card-price?${params.toString()}`);
    if (!res.ok) return empty;

    const data: ExternalCardPrice = await res.json();
    return data;
  } catch {
    return empty;
  }
}

