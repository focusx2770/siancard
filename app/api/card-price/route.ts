import type { NextRequest } from 'next/server';

// อัตราแลกเปลี่ยน USD → THB (สามารถเปลี่ยนได้ตามต้องการ)
const USD_TO_THB = 35.5;

interface PokemonTCGCard {
  id: string;
  name: string;
  number: string;
  tcgplayer?: {
    updatedAt?: string;
    prices?: {
      normal?: { market?: number | null };
      holofoil?: { market?: number | null };
      reverseHolofoil?: { market?: number | null };
      '1stEditionHolofoil'?: { market?: number | null };
    };
  };
}

interface PokemonTCGResponse {
  data: PokemonTCGCard[];
  totalCount: number;
}

// ดึงราคาจาก Pokémon TCG API
async function fetchPokemonPrice(cardName: string, cardNumber?: string) {
  const apiKey = process.env.POKEMON_TCG_API_KEY;

  // สร้าง query: ค้นด้วยชื่อ + เลขการ์ดถ้ามี
  let query = `name:"${cardName}"`;
  if (cardNumber) {
    query += ` number:${cardNumber.split('/')[0]}`; // เอาแค่ตัวเลข (ก่อน /)
  }

  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=5&select=id,name,number,tcgplayer`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }

  const res = await fetch(url, {
    headers,
    next: { revalidate: 3600 }, // cache 1 ชั่วโมง
  });

  if (!res.ok) {
    throw new Error(`Pokémon TCG API error: ${res.status}`);
  }

  const json: PokemonTCGResponse = await res.json();
  return json.data;
}

// เลือกราคา market ที่ดีที่สุดจาก card
function extractBestMarketPrice(card: PokemonTCGCard): number | null {
  const prices = card.tcgplayer?.prices;
  if (!prices) return null;

  // ลำดับความสำคัญ: holofoil > normal > reverseHolofoil > 1stEditionHolofoil
  const candidates = [
    prices.holofoil?.market,
    prices.normal?.market,
    prices.reverseHolofoil?.market,
    prices['1stEditionHolofoil']?.market,
  ];

  for (const p of candidates) {
    if (p != null && p > 0) return p;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cardName = searchParams.get('name');
  const cardNumber = searchParams.get('number') || undefined;
  const game = searchParams.get('game') || 'pokemon';

  // รองรับเฉพาะ Pokémon ตอนนี้
  if (!cardName) {
    return Response.json({ error: 'Missing card name' }, { status: 400 });
  }

  if (game !== 'pokemon' && game !== 'Pokemon' && !game.toLowerCase().includes('pok')) {
    // เกมอื่นยังไม่มี external price API
    return Response.json({
      marketPriceUSD: null,
      marketPriceTHB: null,
      source: null,
      note: 'External price not available for this game',
    });
  }

  try {
    const cards = await fetchPokemonPrice(cardName, cardNumber);

    if (!cards || cards.length === 0) {
      return Response.json({
        marketPriceUSD: null,
        marketPriceTHB: null,
        source: 'pokemontcg',
        note: 'Card not found in Pokémon TCG database',
      });
    }

    // หาการ์ดที่ตรงที่สุด (ถ้ามี cardNumber ให้ match ก่อน)
    let bestCard = cards[0];
    if (cardNumber) {
      const numericPart = cardNumber.split('/')[0];
      const exactMatch = cards.find((c) => c.number === numericPart);
      if (exactMatch) bestCard = exactMatch;
    }

    const priceUSD = extractBestMarketPrice(bestCard);

    if (!priceUSD) {
      return Response.json({
        marketPriceUSD: null,
        marketPriceTHB: null,
        source: 'pokemontcg',
        cardFound: bestCard.name,
        note: 'Price data not available on TCGPlayer',
      });
    }

    const priceTHB = Math.round(priceUSD * USD_TO_THB);

    return Response.json({
      marketPriceUSD: priceUSD,
      marketPriceTHB: priceTHB,
      usdToThb: USD_TO_THB,
      source: 'pokemontcg',
      cardFound: bestCard.name,
      cardId: bestCard.id,
      updatedAt: bestCard.tcgplayer?.updatedAt,
    });
  } catch (err) {
    console.error('[card-price API]', err);
    return Response.json(
      {
        marketPriceUSD: null,
        marketPriceTHB: null,
        source: null,
        error: 'Failed to fetch external price',
      },
      { status: 500 }
    );
  }
}

