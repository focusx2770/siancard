export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
export type ListingStatus = 'active' | 'reserved' | 'sold' | 'closed';

export interface Card {
  id: string;
  name: string;
  rarity: string | null;
  language: string;
  image_url: string | null;
  card_number: string | null;
  card_sets?: { name: string; code: string } | null;
  games?: { name: string; slug: string } | null;
}

export interface Profile {
  id?: string;
  display_name: string;
  avatar_url: string | null;
  line_id?: string | null;
  contact_email?: string | null;
  created_at?: string;
  role?: string;
  is_banned?: boolean;
  show_contact?: boolean;
}

export interface Listing {
  id: string;
  listing_code: string;
  seller_id: string;
  card_id: string;
  condition: CardCondition;
  price_thb: number;
  quantity: number;
  description: string | null;
  status: ListingStatus;
  created_at: string;
  cards: Card;
  profiles: Profile | null;
  listing_images?: { image_url: string }[];
}

export interface Deal {
  id: string;
  listing_id: string;
  card_id: string;
  seller_id: string;
  buyer_id: string;
  condition: CardCondition;
  price_thb: number;
  completed_at: string;
  cards?: Card;
  buyer_profile?: Profile;
  seller_profile?: Profile;
}

export interface Review {
  id: string;
  deal_id: string;
  reviewer_id: string;
  seller_id: string;
  rating: number; // 1 - 5
  comment: string | null;
  created_at: string;
  reviewer_profile?: Profile;
  deals?: Deal;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  buyer_profile?: Profile;
  seller_profile?: Profile;
  listings?: Listing;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_profile?: Profile;
}

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_listing_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
  evidence_images?: string[];
  scam_amount?: number | null;
  bank_name?: string | null;
  bank_account?: string | null;
  account_name?: string | null;
  admin_notes?: string | null;
  reporter_profile?: Profile;
  reported_profile?: Profile;
  listings?: Listing;
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  user_id: string;
  full_name: string;
  id_card_photo: string;
  selfie_photo: string;
  phone_number?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  account_name?: string | null;
  facebook_url?: string | null;
  terms_accepted: boolean;
  terms_accepted_at: string;
  status: VerificationStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}
