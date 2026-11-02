import type { NextRequest } from 'next/server';

interface PokemonAPICard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set?: {
    id: string;
    name: string;
    series: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
  tcgplayer?: {
    prices?: {
      holofoil?: { market?: number | null };
      normal?: { market?: number | null };
      reverseHolofoil?: { market?: number | null };
    };
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return Response.json({ cards: [] });
  }

  const apiKey = process.env.POKEMON_TCG_API_KEY;
  const cleanQuery = query.trim().replace(/"/g, '');

  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=name:"*${encodeURIComponent(cleanQuery)}*"&pageSize=12&select=id,name,number,rarity,set,images,tcgplayer`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res = await fetch(url, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return Response.json({ cards: [], error: 'External API error' }, { status: res.status });
    }

    const json = await res.json();
    const rawCards: PokemonAPICard[] = json.data || [];

    const formatted = rawCards.map((c) => {
      const priceUSD =
        c.tcgplayer?.prices?.holofoil?.market ||
        c.tcgplayer?.prices?.normal?.market ||
        c.tcgplayer?.prices?.reverseHolofoil?.market ||
        null;

      return {
        id: c.id,
        name: c.name,
        cardNumber: c.number,
        rarity: c.rarity || 'Uncommon',
        setName: c.set?.name || 'Pokémon TCG',
        setCode: c.set?.id?.toUpperCase() || 'PKMN',
        imageUrl: c.images?.small || c.images?.large || null,
        marketPriceUSD: priceUSD,
        marketPriceTHB: priceUSD ? Math.round(priceUSD * 35.5) : null,
      };
    });

    return Response.json({ cards: formatted });
  } catch (err) {
    console.error('[pokemon-search API]', err);
    return Response.json({ cards: [], error: 'Failed to search Pokémon API' }, { status: 500 });
  }
}

