/**
 * engine/categorizer.ts
 * Business category classification engine.
 * Combines rule-based keyword matching (fast, zero-cost) with
 * Gemini AI fallback for ambiguous cases.
 */

import { classifyMerchantCategory } from './gemini';

export type MerchantCategory =
  | 'Makanan & Minuman'
  | 'Warung Sembako'
  | 'Retail'
  | 'Jasa'
  | 'Lainnya';

// Keyword rules — case-insensitive prefix match
const CATEGORY_RULES: Array<{ category: MerchantCategory; keywords: string[] }> = [
  {
    category: 'Makanan & Minuman',
    keywords: [
      'warung makan', 'rm ', 'rumah makan', 'kedai', 'kantin', 'depot',
      'bakso', 'mie', 'nasi', 'soto', 'cafe', 'kopi', 'boba', 'burger',
      'pizza', 'ayam', 'seafood', 'restoran', 'resto', 'pecel', 'lalapan',
    ],
  },
  {
    category: 'Warung Sembako',
    keywords: [
      'warung', 'toko sembako', 'sembako', 'minimarket', 'kios', 'lapak',
      'alfamart', 'indomaret', 'toserba', 'swalayan',
    ],
  },
  {
    category: 'Retail',
    keywords: [
      'toko', 'butik', 'fashion', 'baju', 'pakaian', 'elektronik', 'hp',
      'gadget', 'aksesoris', 'mainan', 'buku', 'alat tulis', 'material',
    ],
  },
  {
    category: 'Jasa',
    keywords: [
      'salon', 'barbershop', 'laundry', 'fotocopy', 'print', 'service',
      'bengkel', 'tambal', 'reparasi', 'klinik', 'apotek', 'dokter',
    ],
  },
];

/**
 * Classify merchant by name using fast keyword matching.
 * Returns null if no rule matches (triggers AI fallback).
 */
function classifyByKeyword(merchantName: string): MerchantCategory | null {
  const lower = merchantName.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.category;
    }
  }
  return null;
}

/**
 * Main categorizer: keyword-first, AI fallback.
 * @param merchantName - Name from QRIS tag 59
 * @param city - City from QRIS tag 60 (Gemini context)
 * @param geminiApiKey - API key; if undefined, AI fallback is skipped
 */
export async function categorizeMerchant(
  merchantName: string,
  city: string,
  geminiApiKey?: string,
): Promise<MerchantCategory> {
  const keywordResult = classifyByKeyword(merchantName);
  if (keywordResult) return keywordResult;

  // AI fallback
  if (geminiApiKey) {
    const aiResult = await classifyMerchantCategory(merchantName, city, geminiApiKey);
    return aiResult as MerchantCategory;
  }

  return 'Lainnya';
}
