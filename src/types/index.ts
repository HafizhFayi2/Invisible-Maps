export interface SelectedLocation {
  lat: number;
  lng: number;
}

export type MerchantCategory = 'Street Food' | 'Warung/Groceries' | 'Retail' | 'Services';

export interface Merchant {
  id: string;
  name: string;
  address: string;
  category: MerchantCategory;
  tags: string[];
  rating: number;
  reviewsCount: number;
  distance: string;
  image: string;
  isVerified: boolean;
  status: 'Open Now' | 'Closed';
  qrisAccepted: boolean;
  nmid?: string;
  pjpSource?: string;
  operatingHours?: Record<string, string>;
  location: {
    lat: number;
    lng: number;
  };
  recentMention?: {
    text: string;
    source: string;
    date: string;
  };
}

export interface VerificationTask {
  id: string;
  merchantName: string;
  area: string;
  nmid: string;
  reason: string;
  status: 'pending' | 'flagged';
  category: MerchantCategory;
}
