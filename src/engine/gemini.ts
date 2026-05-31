/**
 * engine/gemini.ts
 *
 * Pipeline:
 *  1. Nominatim reverse geocode → accurate address string
 *  2. Call Gemini 2.5 Flash with coords + address
 *  3. Gemini uses its built-in knowledge (trained on Google Maps / web data)
 *     to identify the real POI and return structured JSON
 *  4. Images → Google Static Maps (actual satellite of that coordinate)
 *
 * API key rotation: tries primary → backup keys on 429.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Model list in priority order (only gemini-2.5-flash is available)
const MODELS_TO_TRY = [
  'gemini-2.5-flash',
];

export type GeminiTiebreakerResult = 'SAME' | 'DIFFERENT' | 'UNCERTAIN';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message: string; code: number };
}

// ─────────────────────────────────────────────────
// Core API caller with key rotation + model fallback
// ─────────────────────────────────────────────────
async function callGemini(
  prompt: string,
  apiKeys: string | string[],
  maxOutputTokens = 256,
): Promise<string> {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  const validKeys = keys.map(k => k.trim()).filter(Boolean);

  if (validKeys.length === 0) {
    throw new Error('[Gemini] No API keys provided');
  }

  // Try each key × each model
  for (const apiKey of validKeys) {
    let keyRateLimited = false;
    for (const model of MODELS_TO_TRY) {
      if (keyRateLimited) break;
      const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
      console.log(`[Gemini] Calling ${model} with key ${apiKey.slice(0, 10)}...`);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens,
              // 'application/json' → model returns raw JSON, no markdown fences
              responseMimeType: 'application/json',
            },
          }),
        });

        const data: GeminiResponse = await res.json();

        if (!res.ok) {
          const errMsg = data?.error?.message || res.statusText;
          console.warn(`[Gemini] ${model} HTTP ${res.status}: ${errMsg}`);
          if (res.status === 429) {
            keyRateLimited = true;
            break; // Key rate-limited, skip immediately to the next API key
          }
          if (res.status === 404) continue; // model not found, try next
          throw new Error(`Gemini ${res.status}: ${errMsg}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) {
          console.warn(`[Gemini] ${model} returned empty text`);
          continue;
        }

        console.log(`[Gemini] ✓ Success with ${model}`);
        return text;
      } catch (err) {
        console.warn(`[Gemini] ${model} error:`, err);
      }
    }
  }

  throw new Error('[Gemini] All API keys and model variants exhausted');
}

// ─────────────────────────────────────────────────
// Nominatim reverse geocode
// ─────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<{
  name: string;
  address: string;
  type: string;
  category: string;
}> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=19&addressdetails=1&accept-language=id&email=admin@invisiblemap.com`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);

    const d = await res.json();
    const name = d?.name || '';
    const type = d?.type || d?.class || '';
    const category = d?.category || '';
    const address = d?.display_name || '';

    console.log('[Nominatim] Result:', { name, type, category, address: address.slice(0, 80) });
    return { name, address, type, category };
  } catch (err) {
    console.warn('[Nominatim] Failed:', err);
    return { name: '', address: '', type: '', category: '' };
  }
}

// ─────────────────────────────────────────────────
// MAIN: Location Intelligence via Gemini
// ─────────────────────────────────────────────────
export interface LocationResult {
  name: string;
  description: string;
  rating: string;
  poi_type: string;
  // Image URLs (real data, not Unsplash)
  staticMapUrl: string;    // Google Static Maps satellite view
  streetViewUrl: string;   // Google Street View
}

export async function analyzeLocationWithGemini(
  lat: number,
  lng: number,
  apiKeys: string | string[],
  googleMapsKey?: string,
): Promise<LocationResult | null> {
  console.log(`[LocationAI] Analyzing: ${lat}, ${lng}`);

  // ── Step 1: Geocode ──────────────────────────────
  const geo = await reverseGeocode(lat, lng);

  // Build location context — prefer named POI over generic street
  const isStreet = geo.name.match(/^(Jalan|Jl\.|Gang|Gg\.|RW|RT|Blok)/i);
  const locationContext = geo.name && !isStreet
    ? `Nama tempat (dari OSM): "${geo.name}" | Tipe: ${geo.type}/${geo.category}\nAlamat: ${geo.address}`
    : `Koordinat GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}\nAlamat OSM: ${geo.address || '(tidak tersedia)'}\nArea: ${geo.name || 'Indonesia'}`;

  // ── Step 2: Gemini Prompt ────────────────────────
  // Short prompt = faster response, less token usage, cleaner JSON output
  const poiName = geo.name && !isStreet ? geo.name : '';
  const shortAddr = geo.address ? geo.address.split(',').slice(0, 3).join(',') : `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const prompt = `Identifikasi lokasi ini di Indonesia secara singkat.
Lokasi: ${poiName ? `"${poiName}"` : shortAddr}
Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}

Jawab HANYA satu baris JSON tanpa spasi atau newline di dalam nilai string:
{"name":"NAMA","description":"DESKRIPSI","rating":"4.2","poi_type":"Kuliner"}`;

  console.log('[LocationAI] Sending to Gemini...');

  try {
    const raw = await callGemini(prompt, apiKeys, 1024);
    console.log('[LocationAI] Gemini raw response:', raw.slice(0, 200));

    // ── Multi-pass JSON extractor ──────────────────────────────────────────
    function extractJson(text: string): Record<string, unknown> | null {
      if (!text) return null;

      const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

      // Pass 1: Direct parse
      let r = tryParse(text.trim()); if (r) return r;

      // Pass 2: Strip markdown fences
      const clean = text.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim();
      r = tryParse(clean); if (r) return r;

      // Pass 3: First { to last }
      const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
      if (s !== -1 && e > s) { r = tryParse(clean.slice(s, e + 1)); if (r) return r; }

      // Pass 4: Truncated JSON — no closing } at all
      if (s !== -1 && e <= s) {
        let partial = clean.slice(s);
        // Remove any incomplete field at end (e.g. `"name":"val` with no closing quote)
        // Strategy: close any open string, then close the object
        // Remove trailing comma or partial key-value
        partial = partial
          .replace(/,\s*"[^"]*$/, '')      // remove partial key
          .replace(/"[^"]*$/, '"')          // close open string value
          .replace(/:\s*$/, ': ""')         // close empty value
          .replace(/,\s*$/, '')             // remove trailing comma
          .trimEnd();
        if (!partial.endsWith('}')) partial += '}';
        r = tryParse(partial); if (r) return r;
      }

      return null;
    }

    const parsed = extractJson(raw);

    // If Gemini JSON fails entirely, use geocode data as graceful fallback
    if (!parsed) {
      console.warn('[LocationAI] JSON parse failed, using geocode fallback. Raw:', raw.slice(0, 120));
    }

    // ── Step 3: Build image URLs ──────────────────
    const mapsKey = googleMapsKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    const fallbackName = geo.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const fallbackDesc = geo.address
      ? geo.address.split(',').slice(0, 3).join(',').trim()
      : `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    const resolvedName  = parsed ? String(parsed.name  || fallbackName)  : fallbackName;
    const resolvedDesc  = parsed ? String(parsed.description || fallbackDesc) : fallbackDesc;
    const resolvedRating = parsed ? String(parsed.rating || 'N/A') : 'N/A';
    const resolvedType  = parsed ? String(parsed.poi_type || geo.type || 'Tempat') : (geo.type || 'Area');

    const staticMapUrl = mapsKey
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x320&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${mapsKey}`
      : `https://placehold.co/640x320/0d0d1a/4285F4?text=${encodeURIComponent(resolvedName)}`;

    const streetViewUrl = mapsKey
      ? `https://maps.googleapis.com/maps/api/streetview?size=640x320&location=${lat},${lng}&fov=90&key=${mapsKey}`
      : '';

    return {
      name: resolvedName,
      description: resolvedDesc,
      rating: resolvedRating,
      poi_type: resolvedType,
      staticMapUrl,
      streetViewUrl,
    };

  } catch (err) {
    // Instead of re-throwing (which shows ugly error), return geocode-based result
    console.error('[LocationAI] Gemini call failed, using geocode-only fallback:', err);
    const fallback = await reverseGeocode(lat, lng).catch(() => ({ name: '', address: '', type: '', category: '' }));
    return {
      name: fallback.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      description: fallback.address ? fallback.address.split(',').slice(0, 3).join(',').trim() : 'Lokasi di Indonesia',
      rating: 'N/A',
      poi_type: fallback.type || 'Area',
      staticMapUrl: `https://placehold.co/640x320/0d0d1a/4285F4?text=${encodeURIComponent(fallback.name || 'Lokasi')}`,
      streetViewUrl: '',
    };
  }
}

/**
 * Predict GPS coordinates for a merchant based on name, city, and postal code using Gemini.
 */
export async function resolveMerchantCoordinatesWithGemini(
  merchantName: string,
  city: string,
  postalCode: string,
  apiKeys: string | string[],
): Promise<{ lat: number; lng: number; confidence: number } | null> {
  const prompt = `Kamu adalah pakar lokasi dan geocoding di Indonesia. Tentukan koordinat GPS (latitude dan longitude) spesifik untuk merchant berikut jika kamu mengetahuinya dari Google Maps atau data web:
  Nama Merchant: ${merchantName}
  Kota: ${city}
  Kode Pos: ${postalCode}

  Jika kamu mengetahui koordinat presisinya, berikan koordinat tersebut. Jika tidak tahu tempat spesifiknya tetapi tahu areanya (misal jalan atau kecamatan di kota tersebut), berikan koordinat area tersebut.
  Berikan koordinat dalam format JSON satu baris saja (tanpa markdown atau komentar):
  {"lat": -6.xxxxxx, "lng": 107.xxxxxx, "confidence": 80, "found": true}`;

  try {
    const raw = await callGemini(prompt, apiKeys, 1024);
    
    function extractJson(text: string): Record<string, any> | null {
      if (!text) return null;
      try { return JSON.parse(text.trim()); } catch { /* next */ }
      const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim();
      try { return JSON.parse(stripped); } catch { /* next */ }
      const s = stripped.indexOf('{'), e = stripped.lastIndexOf('}');
      if (s !== -1 && e > s) { try { return JSON.parse(stripped.slice(s, e + 1)); } catch { /* next */ } }
      const rs = text.indexOf('{'), re = text.lastIndexOf('}');
      if (rs !== -1 && re > rs) { try { return JSON.parse(text.slice(rs, re + 1)); } catch { /* next */ } }
      return null;
    }

    const parsed = extractJson(raw);
    if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        confidence: parsed.confidence ?? 50,
      };
    }
    return null;
  } catch (err) {
    console.warn('[resolveMerchantCoordinatesWithGemini] error:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────
// Other utility functions (unchanged)
// ─────────────────────────────────────────────────
export async function classifyMerchantCategory(
  merchantName: string,
  city: string,
  apiKeys: string | string[],
): Promise<string> {
  const prompt = `Klasifikasikan merchant UMKM berikut ke salah satu kategori:
Makanan & Minuman | Warung Sembako | Retail | Jasa | Lainnya
Merchant: ${merchantName}, Kota: ${city}
Jawab HANYA nama kategorinya.`;

  try {
    const result = await callGemini(prompt, apiKeys);
    const valid = ['Makanan & Minuman', 'Warung Sembako', 'Retail', 'Jasa', 'Lainnya'];
    return valid.includes(result) ? result : 'Lainnya';
  } catch {
    return 'Lainnya';
  }
}

export async function extractLocationFromCaption(
  caption: string,
  hashtags: string[],
  apiKeys: string | string[],
): Promise<string> {
  const prompt = `Ekstrak lokasi dari caption ini. Jawab nama lokasinya saja, atau "UNKNOWN".
Caption: ${caption}
Hashtags: ${hashtags.join(' ')}`;

  try {
    const result = await callGemini(prompt, apiKeys);
    return result === 'UNKNOWN' ? '' : result;
  } catch {
    return '';
  }
}

export async function merchantTiebreaker(
  merchantA: { name: string; city: string },
  merchantB: { name: string; address: string; category: string },
  apiKeys: string | string[],
): Promise<GeminiTiebreakerResult> {
  const prompt = `Apakah dua merchant ini SAMA? Jawab: SAME / DIFFERENT / UNCERTAIN
A: ${merchantA.name}, ${merchantA.city}
B: ${merchantB.name}, ${merchantB.address}, ${merchantB.category}`;

  try {
    const result = await callGemini(prompt, apiKeys);
    if (['SAME', 'DIFFERENT', 'UNCERTAIN'].includes(result)) return result as GeminiTiebreakerResult;
    return 'UNCERTAIN';
  } catch {
    return 'UNCERTAIN';
  }
}
