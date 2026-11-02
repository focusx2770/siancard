-- ========================================================
-- SianCard - ข้อมูลการ์ดตั้งต้น (Seed Data)
-- รวมการ์ดยอดนิยม Pokémon, One Piece, Yu-Gi-Oh!
-- รองรับการรันซ้ำได้ปลอดภัย (Idempotent: ON CONFLICT DO NOTHING)
-- ========================================================

-- 1. เพิ่มข้อมูลเกม (Games)
insert into public.games (id, slug, name)
values
  (1, 'pokemon', 'Pokémon'),
  (2, 'onepiece', 'One Piece'),
  (3, 'yugioh', 'Yu-Gi-Oh!')
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

-- รีเซ็ต sequence ของ games
select setval('games_id_seq', (select max(id) from games));

-- 2. เพิ่มข้อมูลชุดการ์ด (Card Sets)
insert into public.card_sets (id, game_id, code, name, release_date)
values
  -- Pokémon Sets
  (1, 1, 'MEW', 'Pokémon Card 151', '2023-09-22'),
  (2, 1, 'SVI', 'Scarlet & Violet Base', '2023-03-31'),
  (3, 1, 'CRZ', 'Crown Zenith', '2023-01-20'),
  -- One Piece Sets
  (4, 2, 'OP-01', 'Romance Dawn', '2022-07-22'),
  (5, 2, 'OP-02', 'Paramount War', '2022-11-04'),
  (6, 2, 'OP-05', 'Awakening of the New Era', '2023-08-26'),
  -- Yu-Gi-Oh! Sets
  (7, 3, 'RA01', '25th Anniversary Rarity Collection', '2023-11-03')
on conflict (id) do update set 
  name = excluded.name, 
  code = excluded.code, 
  game_id = excluded.game_id;

-- รีเซ็ต sequence ของ card_sets
select setval('card_sets_id_seq', (select max(id) from card_sets));

-- 3. เพิ่มข้อมูลการ์ดยอดนิยม (Cards)
insert into public.cards (id, game_id, set_id, card_number, name, rarity, language, is_foil, image_url)
values
  -- Pokémon: 151 & Crown Zenith
  (
    'a1000000-0000-0000-0000-000000000001',
    1, 1, '199/165',
    'Charizard ex (ลิซาร์ดอน)',
    'Special Illustration Rare (SAR)',
    'EN', true,
    'https://images.pokemontcg.io/sv3pt5/199_hires.png'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    1, 1, '173/165',
    'Pikachu (พิคาชู)',
    'Illustration Rare (AR)',
    'EN', true,
    'https://images.pokemontcg.io/sv3pt5/173_hires.png'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    1, 1, '205/165',
    'Mew ex (มิว)',
    'Hyper Rare (UR Gold)',
    'EN', true,
    'https://images.pokemontcg.io/sv3pt5/205_hires.png'
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    1, 1, '202/165',
    'Blastoise ex (คาเม็กซ์)',
    'Special Illustration Rare (SAR)',
    'EN', true,
    'https://images.pokemontcg.io/sv3pt5/202_hires.png'
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    1, 1, '198/165',
    'Venusaur ex (ฟุชิกิบานะ)',
    'Special Illustration Rare (SAR)',
    'EN', true,
    'https://images.pokemontcg.io/sv3pt5/198_hires.png'
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    1, 3, 'GG70/GG70',
    'Giratina VSTAR (กิราติน่า)',
    'Secret Rare (Gold)',
    'EN', true,
    'https://images.pokemontcg.io/swsh12pt5gg/GG70_hires.png'
  ),

  -- One Piece: OP-01, OP-02, OP-05
  (
    'b2000000-0000-0000-0000-000000000001',
    2, 6, 'OP05-119',
    'Monkey D. Luffy (ลูฟี่ เกียร์ 5)',
    'Manga Rare (SEC-P)',
    'EN', true,
    'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119_p1.png'
  ),
  (
    'b2000000-0000-0000-0000-000000000002',
    2, 4, 'OP01-120',
    'Shanks (แชงคูส)',
    'Manga Rare (SEC-P)',
    'EN', true,
    'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120_p1.png'
  ),
  (
    'b2000000-0000-0000-0000-000000000003',
    2, 5, 'OP02-013',
    'Portgas.D.Ace (พอร์ตกัส ดี เอส)',
    'Manga Rare (SR-P)',
    'EN', true,
    'https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013_p1.png'
  ),
  (
    'b2000000-0000-0000-0000-000000000004',
    2, 4, 'OP01-016',
    'Nami (นามิ)',
    'Parallel Rare (R-P)',
    'EN', true,
    'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-016_p1.png'
  ),
  (
    'b2000000-0000-0000-0000-000000000005',
    2, 4, 'OP01-025',
    'Roronoa Zoro (โซโล)',
    'Super Rare (SR)',
    'EN', true,
    'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-025.png'
  ),
  (
    'b2000000-0000-0000-0000-000000000006',
    2, 4, 'OP01-047',
    'Trafalgar Law (ลอว์)',
    'Super Rare (SR)',
    'EN', true,
    'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-047.png'
  ),

  -- Yu-Gi-Oh!
  (
    'c3000000-0000-0000-0000-000000000001',
    3, 7, 'RA01-EN001',
    'Blue-Eyes White Dragon (บลูอายส์ ไวท์ ดราก้อน)',
    'Quarter Century Secret Rare',
    'EN', true,
    'https://images.ygoprodeck.com/images/cards/89631139.jpg'
  ),
  (
    'c3000000-0000-0000-0000-000000000002',
    3, 7, 'RA01-EN002',
    'Dark Magician (แบล็ค เมจิกเชี่ยน)',
    'Quarter Century Secret Rare',
    'EN', true,
    'https://images.ygoprodeck.com/images/cards/46986414.jpg'
  ),
  (
    'c3000000-0000-0000-0000-000000000003',
    3, 7, 'RA01-EN008',
    'Ash Blossom & Joyous Spring',
    'Quarter Century Secret Rare',
    'EN', true,
    'https://images.ygoprodeck.com/images/cards/14558127.jpg'
  )
on conflict (id) do update set
  name = excluded.name,
  rarity = excluded.rarity,
  image_url = excluded.image_url,
  card_number = excluded.card_number;

