# 🗺️ Invisible Map
### *Mapping the Unseen Economy of Indonesia*

> **Every QRIS payment is a data point. Every data point is a merchant that deserves to exist on the map.**

Invisible Map adalah platform berbasis AI yang memetakan UMKM "tak kasat mata" di Indonesia — pedagang kaki lima, warung dalam gang, dan jasa rumahan — yang memiliki QRIS namun belum terindeks di Google Maps. Sistem ini mengubah jejak finansial digital menjadi identitas lokasi yang inklusif, **tanpa satu pun input manual dari merchant.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Bun](https://img.shields.io/badge/Runtime-Bun-black?logo=bun)](https://bun.sh)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%201.5%20Pro-blue?logo=google)](https://deepmind.google/technologies/gemini/)
[![Database: Supabase](https://img.shields.io/badge/DB-Supabase%20%2B%20PostGIS-green?logo=supabase)](https://supabase.com)
[![Cloud: GCP](https://img.shields.io/badge/Cloud-Google%20Cloud%20Run-orange?logo=googlecloud)](https://cloud.google.com/run)

---

## 📌 Table of Contents

- [The Problem](#-the-problem)
- [How It Works](#-how-it-works)
- [Data Pipelines](#-data-pipelines)
- [Invisible Filter](#-invisible-filter--identity-resolution)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Core Logic](#-core-logic)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 🚨 The Problem

Indonesia memiliki **lebih dari 65 juta UMKM**, dan adopsi QRIS tumbuh eksponensial sejak 2020. Namun mayoritas dari mereka tetap **invisible secara digital** karena:

- Tidak memiliki alamat fisik permanen
- Kurang literasi digital untuk mendaftar di Google Maps
- Tidak ada waktu atau insentif untuk self-register di platform manapun

**Akibatnya:** Pembeli tidak bisa menemukan mereka. Ekosistem lokal tidak terdata. Potensi ekonomi hilang.

Invisible Map hadir untuk menutup gap ini — **bukan dengan menyuruh merchant melakukan apapun**, melainkan dengan memanfaatkan jejak digital yang sudah ada: QRIS mereka.

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     INVISIBLE MAP SYSTEM                     │
├───────────────────────────────┬─────────────────────────────┤
│          PIPELINE 1           │          PIPELINE 3         │
│          PWA Scanner          │      (Coming Soon: B2B)     │
│                               │                             │
│         User scan QR          │    Partner data ingestion   │
│         sebelum bayar         │    GoFood, BukuKas, etc.    │
└───────────────┬───────────────┴──────────────┬──────────────┘
                │                              │
                ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       PROCESSING LAYER                      │
│                     EMVCo Decode → NMID                     │
│                     GPS / Geotag Resolve                    │
│                   Gemini AI Categorization                  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                       INVISIBLE FILTER                      │
│                       NMID dedup check                      │
│                  Fuzzy name + radius match                  │
│                      Gemini tiebreaker                      │
│                      Confidence scoring                     │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                            OUTPUT                           │
│                     🟢 INVISIBLE  → Plot                    │
│                     🟡 UNVERIFIED → Plot+badge              │
│                     🔴 MAPPED     → Hidden                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 Data Pipelines

### Pipeline 1 — PWA QR Scanner (Primary, Real-time)

User membuka PWA Invisible Map **sebagai scanner QRIS** sebelum membayar. Sistem decode QRIS, capture GPS, lalu redirect ke app bank via deep link.

```
User scan QR lewat PWA
  → Decode QRIS string (client-side, instant)
  → Capture GPS koordinat
  → Save to DB: status PENDING
  → Redirect ke app bank (GoPay / DANA / BCA)

Deep link support:
  dana://qr?content=[QRIS]
  gojek://gopay/qr?data=[QRIS]
  mybca://payment/qris?qrString=[QRIS]
```

**Zero friction untuk merchant. Zero extra step untuk user.** Scan sekali, bayar seperti biasa, data tersimpan otomatis.


### Pipeline 3 — B2B Partner Ingestion *(Roadmap)*

Target partner yang memiliki data merchant UMKM + insentif untuk berbagi:

- Platform kasir UMKM: Moka, Majoo, BukuKas
- Food aggregator: GoFood, ShopeeFood
- Koperasi & HIPMI lokal

Value exchange: Invisible Map memberi **visibility layer**, partner memberi **data**. Tidak ada scraping — murni B2B data API.

---

## 🔍 Invisible Filter — Identity Resolution

Inti sistem: memastikan merchant yang di-plot memang belum ada di Google Maps.

### Layer 1 — NMID Deduplication

NMID (National Merchant ID dari BI) adalah **anchor identifier terkuat**. Unik per merchant, tidak berubah selama merchant tidak ganti PJP.

```typescript
// Cek NMID di internal registry
const existing = await db.merchants.findByNMID(nmid);

if (existing) {
  const distance = haversine(existing.coords, newCoords);
  if (distance < 50) return 'DUPLICATE';          // Sama persis
  if (distance > 200) return 'MERCHANT_RELOCATED'; // Pindah lokasi
}
// NMID baru → lanjut ke Layer 2
```

### Layer 2 — Fuzzy Name + Radius Check

```typescript
const nearbyPlaces = await mapsClient.nearbySearch({
  location: { lat, lng },
  radius: 50, // meter — ketat untuk warung kecil
  keyword: merchantName
});

if (nearbyPlaces.length === 0) return 'INVISIBLE'; // ✅

for (const place of nearbyPlaces) {
  const score = fuzzyMatch(merchantName, place.name); // Levenshtein + token sort
  if (score > 0.75) return 'ALREADY_MAPPED';          // Match ditemukan
}

return 'INVISIBLE'; // Ada tempat nearby tapi nama beda
```

### Layer 3 — Gemini Tiebreaker

Untuk kasus edge: nama mirip tapi tidak identik (chain franchise vs warung independen, dll).

```typescript
const prompt = `
Apakah dua merchant ini kemungkinan besar sama?
Merchant A (QRIS): ${merchantA.name}, ${merchantA.city}
Merchant B (Maps): ${merchantB.name}, ${merchantB.address}, ${merchantB.category}
Jawab hanya: SAME / DIFFERENT / UNCERTAIN
`;

const result = await gemini.generate(prompt);
// SAME → ALREADY_MAPPED
// DIFFERENT → INVISIBLE ✅
// UNCERTAIN → UNVERIFIED (di-plot dengan flag)
```

### Layer 4 — Confidence Scoring

```
Scan ke-1 (sumber tunggal)        → confidence: 40% → PENDING
Scan ke-2 (user berbeda, lokasi sama) → confidence: 70% → UNVERIFIED
Scan ke-3+ (multi-user verified)  → confidence: 95% → VERIFIED_INVISIBLE ✅
```

---

## 🛠️ Tech Stack

| Layer | Technology | Alasan |
|---|---|---|
| **Runtime** | Bun | TypeScript-native, 3x lebih cepat dari Node untuk I/O-heavy tasks |
| **PWA Scanner** | React + Next.js | Camera API, GPS, deep link, offline-capable |
| **QRIS Parser** | Custom EMVCo Decoder | Parse Tag 59/60/61/62, extract NMID |
| **AI Engine** | Gemini 1.5 Pro API | Kategorisasi bisnis, NLP caption, identity resolution |
| **Maps Intelligence** | Google Maps Places API | Nearby search, photo retrieval, geocoding |
| **Database** | Supabase (PostgreSQL + PostGIS) | Geospatial queries, radius search, real-time |
| **Cloud** | Google Cloud Run | Containerized app, auto-scaling, serverless |

---

## 📂 Project Structure

```
invisible-map/
├── src/
│   ├── parser/
│   │   ├── emvco.ts                  # EMVCo tag decoder (Tag 59/60/61/62)
│   │   └── nmid.ts                   # NMID extraction & validation
│   │
│   ├── engine/
│   │   ├── gemini.ts                 # Gemini API integration
│   │   ├── categorizer.ts            # Business category classification
│   │   ├── geoResolver.ts            # Multi-level coordinate resolution
│   │   └── invisibleFilter.ts        # 4-layer identity resolution
│   │
│   ├── services/
│   │   ├── supabase.ts               # DB client + PostGIS queries
│   │   ├── mapsApi.ts                # Google Maps Places API wrapper
│   │   ├── geocoding.ts              # Koordinat → presisi converter
│   │   └── deeplink.ts               # Payment app deep link router
│   │
│   └── types/
│       ├── qris.ts                   # QRIS metadata interfaces
│       ├── merchant.ts               # Merchant entity types
│       └── pipeline.ts               # Pipeline status enums
│
├── pwa/                              # Frontend Map Interface
│   ├── app/
│   │   ├── scan/                     # QR Scanner page
│   │   ├── map/                      # Interactive merchant map
│   │   └── contribute/               # Contribution stats & badges
│   ├── components/
│   │   ├── QRScanner.tsx             # Camera + QR decode component
│   │   ├── MerchantPin.tsx           # Map pin with status badge
│   │   └── PaymentRedirect.tsx       # Deep link handler
│   └── hooks/
│       ├── useGPS.ts                 # GPS capture hook
│       └── useQRScan.ts              # QR scan state management
│
├── docker/
│   ├── Dockerfile                    # Cloud Run container
│   └── docker-compose.yml            # Local dev setup
│
├── scripts/
│   ├── seed.ts                       # Initial data seeding
│   └── benchmark.ts                  # Pipeline performance test
│
└── supabase/
    └── migrations/
        ├── 001_merchants.sql         # Merchant table + PostGIS
        └── 002_scan_events.sql       # Scan event log
```

---

## 💻 Core Logic

### QRIS Parsing

```typescript
// src/parser/emvco.ts
import { decodeQRIS } from './utils/emvco';

async function processMerchantData(rawString: string, coords: Coords) {
  // Validasi: QRIS selalu mulai dengan EMVCo header
  if (!rawString.startsWith('000201') || !rawString.includes('ID.')) {
    throw new Error('Invalid QRIS string');
  }

  const metadata = decodeQRIS(rawString);

  return {
    merchantName: metadata.getTag('59'),   // Nama Toko
    city:         metadata.getTag('60'),   // Lokasi Kota
    postalCode:   metadata.getTag('61'),   // Kode Pos
    nmid:         metadata.getNMID('62'),  // National Merchant ID
    coords,
    source:       'pipeline_1' | 'pipeline_3',
    confidence:   40,                      // Initial confidence
    status:       'PENDING'
  };
}
```


### Deep Link Payment Router

```typescript
// src/services/deeplink.ts
const PAYMENT_APPS = {
  dana:    (qris: string) => `dana://qr?content=${encode(qris)}`,
  gopay:   (qris: string) => `gojek://gopay/qr?data=${encode(qris)}`,
  ovo:     (qris: string) => `ovo://pay?qr=${encode(qris)}`,
  bca:     (qris: string) => `mybca://payment/qris?qrString=${encode(qris)}`,
  bni:     (qris: string) => `bnimobile://qris?data=${encode(qris)}`,
  mandiri: (qris: string) => `livin://qris?content=${encode(qris)}`,
  fallback:(qris: string) => `https://qris.online/redirect?qr=${encode(qris)}`
};

export function getPaymentDeeplink(qrisString: string, preferredApp?: string): string {
  const app = preferredApp ?? detectInstalledApp();
  return PAYMENT_APPS[app]?.(qrisString) ?? PAYMENT_APPS.fallback(qrisString);
}
```

---

## 🚀 Getting Started

### Prerequisites

```bash
# Runtime
curl -fsSL https://bun.sh/install | bash  # Bun v1.0+

# Database
# Setup Supabase project di https://supabase.com
# Enable PostGIS extension di SQL Editor:
# CREATE EXTENSION IF NOT EXISTS postgis;
```

### Installation

```bash
git clone https://github.com/yourusername/invisible-map.git
cd invisible-map

bun install

# Copy environment variables
cp .env.example .env
# Fill in your API keys (see Environment Variables section)

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

### Run Pipelines

```bash
# Seed data awal dari dummy data
bun run pipeline:seed

# Pipeline 1: Start PWA scanner server
bun run pwa:dev

# Validation worker (process pending entries)
bun run worker:validate

# Full stack (semua sekaligus)
bun run start
```

---

## 🔐 Environment Variables

```env
# Google APIs
GOOGLE_MAPS_API_KEY=          # Places API + Geocoding
GEMINI_API_KEY=               # Gemini 1.5 Pro

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Google Cloud
GCP_PROJECT_ID=
GCP_REGION=asia-southeast2    # Jakarta region

# Invisible Filter Config
RADIUS_SEARCH_METERS=50
FUZZY_MATCH_THRESHOLD=0.75
CONFIDENCE_VERIFIED_THRESHOLD=95
```

---

## 🗺️ Database Schema (PostGIS)

```sql
-- Merchant table dengan geospatial support
CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nmid            VARCHAR(32) UNIQUE NOT NULL,  -- National Merchant ID
  name            TEXT NOT NULL,
  category        TEXT,                          -- Hasil Gemini categorization
  city            TEXT,
  postal_code     VARCHAR(10),
  location        GEOGRAPHY(POINT, 4326),        -- PostGIS koordinat
  status          TEXT DEFAULT 'PENDING',        -- PENDING/UNVERIFIED/INVISIBLE/VERIFIED/MAPPED
  confidence      INTEGER DEFAULT 0,             -- 0-100
  scan_count      INTEGER DEFAULT 0,
  source          TEXT,                          -- pipeline_1 / pipeline_3
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk radius query yang cepat
CREATE INDEX idx_merchants_location ON merchants USING GIST(location);
CREATE INDEX idx_merchants_nmid ON merchants(nmid);
CREATE INDEX idx_merchants_status ON merchants(status);

-- Query contoh: cari INVISIBLE merchant dalam 1km dari titik
SELECT name, category, confidence,
       ST_Distance(location, ST_Point(106.8456, -6.2088)::geography) AS distance_meters
FROM merchants
WHERE status IN ('INVISIBLE', 'VERIFIED_INVISIBLE')
  AND ST_DWithin(location, ST_Point(106.8456, -6.2088)::geography, 1000)
ORDER BY distance_meters;
```

---

## 📍 Merchant Status Flow

```
[New QRIS Detected]
        │
        ▼
   PENDING (confidence: 40%)
        │
        ├─── Duplicate NMID? → DUPLICATE (skip)
        │
        ├─── Found on Google Maps? → ALREADY_MAPPED (hidden)
        │
        └─── Not found anywhere → UNVERIFIED (confidence: 40-70%)
                    │
                    ├─── 2nd scan (different user, same area) → confidence: 70%
                    │
                    └─── 3rd+ scan → VERIFIED_INVISIBLE ✅ (confidence: 95%)
                                      → Tampil di peta publik
```

---

## 🔭 Roadmap

### v1.0 — Core (Current)
- [x] QRIS EMVCo parser
- [x] PWA QR Scanner + GPS capture
- [x] Payment deep link router
- [x] Invisible Filter (4 layers)

### v1.5 — Verification & Expansion
- [ ] Gemini Vision untuk UI enhancement
- [ ] Confidence scoring + multi-scan verification
- [ ] Gamifikasi: badges & kontributor leaderboard

### v2.0 — Scale
- [ ] Google Cloud Run deployment (auto-scaling crawler)
- [ ] Public API: `GET /merchants?lat=&lng=&radius=`
- [ ] Embeddable widget untuk aplikasi pihak ketiga
- [ ] Dashboard analytics untuk UMKM binaan

### v3.0 — Ecosystem (B2B)
- [ ] Pipeline 3: Partner data ingestion API
- [ ] Integrasi dengan platform kasir UMKM
- [ ] Open data export untuk riset & pemerintahan

---

## 🤝 Contributing

Kontribusi sangat welcome, terutama untuk:

- Memperluas dukungan deep link ke lebih banyak bank/e-wallet
- Meningkatkan akurasi fuzzy matching untuk nama toko Bahasa Indonesia
- Optimisasi QR detection di kondisi pencahayaan buruk

```bash
# Setup dev environment
bun install
bun run test        # Run test suite
bun run lint        # ESLint + TypeScript check
```

---

## 📄 Privacy & Legal

**Data yang dikumpulkan:** Nama merchant (sudah public di QRIS), kategori bisnis, koordinat titik pembayaran.

**Data yang TIDAK dikumpulkan:** Data transaksi, nominal pembayaran, identitas pembeli, data pribadi apapun.

NMID dan nama merchant adalah identifier sistem BI yang bersifat publik — setara dengan nama toko yang tertera di papan nama. Tidak ada data sensitif atau personal yang diproses.

Konten sosial media yang diproses hanya dari **akun dan postingan publik**. Tidak ada bypass autentikasi atau akses ke konten private.

---

## 👤 Author

**Hafizh Fayi**
Aspiring Software Engineer focused on AI-powered web apps and technical automation.

> *"Invisible Map bukan sekadar peta. Ini adalah infrastruktur digital yang selama ini tidak ada untuk jutaan UMKM Indonesia."*

---

<p align="center">
  Built with ❤️ for Indonesia's invisible economy
  <br>
  <sub>Powered by Gemini AI · Google Maps · Supabase · Bun</sub>
</p># 🗺️ Invisible Map
### *Mapping the Unseen Economy of Indonesia*
