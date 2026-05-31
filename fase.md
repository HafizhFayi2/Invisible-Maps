# Roadmap Fase Implementasi - Invisible Map

Dokumen ini merangkum fase yang sudah selesai dan analisis fase lanjutan berdasarkan status code saat ini.

## Ringkasan Status

- Total fase yang direkomendasikan: **9 fase**
- Fase selesai: **9/9**
- Fase tersisa: **0/9**

---

## Fase Selesai

### [x] Fase 1 - Main Core (Domain Core + Pipeline Dasar)
Yang dilakukan:
- Menambahkan core type model untuk QRIS pipeline (`ProcessScanInput`, `ProcessScanResult`, `CoreMerchantRecord`, status merchant).
- Membuat parser QRIS EMVCo + ekstraksi NMID.
- Membuat invisible filter dasar (dedup NMID, fuzzy match, status resolusi).
- Membuat payment deeplink router.
- Menyambungkan UI `Sync` ke alur proses scan dasar (tanpa ubah layout).

Hasil:
- Fondasi business logic sudah ada dan bisa memproses scan dari UI.

### [x] Fase 2 - Integrasi Service + Failover + Persistence Dasar
Yang dilakukan:
- Menambahkan konfigurasi multi API key dan backup list.
- Menambahkan mekanisme failover provider (primary -> backup -> fallback).
- Menambahkan persistence dasar merchant (`localStorage`) + sync opsional ke Supabase.
- Menyambungkan verification queue ke data core yang dihasilkan scan.
- Mengaktifkan AI discovery dengan fallback saat provider tidak tersedia.

Hasil:
- Sistem lebih tahan saat API utama habis/error dan data tidak hanya mock statis.

### [x] Fase 3 - Backend API Layer (Secure Provider Access)
Yang dilakukan:
- Menambahkan server Express terpisah (`server/index.ts`).
- Menambahkan endpoint:
  - `GET /api/maps/nearby`
  - `POST /api/ai/discovery`
  - `GET /health`
- Menambahkan provider server-side Gemini dan Google Maps dengan failover.
- Menambahkan `vite.config.ts` proxy agar frontend akses `/api` lokal.
- Menambahkan script run terpisah: `dev:web` dan `dev:api`.

Hasil:
- Key provider tidak perlu lagi diekspos langsung di browser untuk flow utama.

### [x] Fase 4 - End-to-End Scan API + Public Data API
Yang dilakukan:
- Menambahkan core pipeline server-side (`server/core/*`) untuk scan processing.
- Menambahkan endpoint:
  - `POST /api/scan/process`
  - `GET /api/merchants`
  - `GET /api/verification/queue`
- Mengalihkan frontend:
  - `SyncVerifyScreen` -> `processScanViaApi`
  - `MapScreen` -> `fetchPublicMerchants`
  - `VerificationQueueScreen` -> `fetchVerificationQueue`
- Menyesuaikan sample QRIS agar valid untuk parser TLV ketat.

Hasil:
- Alur scan -> proses -> merchant list -> verification queue sudah berjalan lewat backend API.

### [x] Fase 5 - Security & Reliability Hardening
Yang dilakukan:
- Menambahkan rate limiting per-IP untuk seluruh endpoint `/api/*`.
- Menambahkan admin auth guard (`x-admin-token`) untuk endpoint sensitif `verification/*`.
- Menambahkan validasi request berbasis schema `zod` untuk body/query endpoint utama.
- Menambahkan audit logging JSONL untuk event kritikal:
  - `scan_validation_failed`
  - `scan_processed`
  - `scan_processing_failed`
  - `verification_queue_read`
- Menambahkan env konfigurasi keamanan (`ADMIN_API_TOKEN`, `ENFORCE_ADMIN_AUTH`, `RATE_LIMIT_*`, `AUDIT_LOG_FILE`).

Hasil:
- API lebih aman dari abuse dasar, payload invalid terfilter konsisten, dan endpoint kritikal memiliki jejak audit.

---

## Analisis Fase Lanjutan

### [x] Fase 6 - Persistence Production (Supabase Full)
Yang dilakukan:
- Menambahkan migration SQL fase 6:
  - `core_merchants` (dengan `lat/lng` + kolom `location` geography PostGIS generated)
  - `scan_events` (dengan unique `idempotency_key`)
  - function `get_merchants_in_radius(...)` untuk query radius di DB.
- Menambahkan Supabase server client + mode persistence toggle.
- Mengubah store layer ke async repository dengan strategi:
  - `Supabase-first` saat env tersedia
  - fallback `in-memory` saat DB belum aktif/error.
- Menambahkan idempotency pada `processScan`:
  - retry dengan key sama akan return hasil event sebelumnya (tidak memproses ulang).
- Mengubah query merchant jadi DB-aware:
  - pakai RPC `get_merchants_in_radius` jika tersedia
  - fallback haversine lokal jika DB belum siap.

Hasil:
- Pipeline scan dan data merchant siap untuk persistence production dengan dukungan PostGIS + idempotency.

### [x] Fase 7 - Verification Workflow & Ops
Yang dilakukan:
- Menambahkan migration fase 7:
  - `verification_tasks` untuk keputusan verifikasi (pending/flagged/approved/rejected).
  - `source_user_id` pada `scan_events` untuk menghitung verifikasi multi-user.
- Menambahkan role-based access:
  - role `user`, `verifier`, `admin`
  - endpoint verification hanya untuk `verifier/admin`.
- Menambahkan endpoint workflow verifikasi:
  - `GET /api/verification/queue`
  - `GET /api/verification/dashboard`
  - `POST /api/verification/tasks/:merchantId/approve`
  - `POST /api/verification/tasks/:merchantId/reject`
- Menambahkan confidence progression berbasis user unik scan:
  - 1 user -> 40
  - 2 user unik -> 70
  - 3+ user unik -> 95
- Menambahkan dashboard operasional sederhana pada layar verification queue (pending/flagged/approved/rejected/total/verified).

Hasil:
- Workflow verifikasi sudah operasional end-to-end dengan kontrol role dan metrik monitoring dasar.

### [x] Fase 8 - Delivery Readiness (Testing, CI/CD, Observability)
Yang dilakukan:
- Menambahkan unit test:
  - parser QRIS (`src/parser/emvco.test.ts`)
  - matching utils (`server/core/matching.test.ts`)
- Menambahkan integration test API untuk flow kritikal:
  - scan -> verification queue -> approve -> dashboard -> metrics
  - file: `server/app.integration.test.ts`
- Menambahkan test runner (`vitest`) + dependency `supertest`.
- Menambahkan CI workflow GitHub Actions:
  - `npm ci` -> `npm run lint` -> `npm run test` -> `npm run build`
  - file: `.github/workflows/ci.yml`
- Menambahkan observability dasar:
  - middleware request metrics + `x-request-id`
  - endpoint metrics: `GET /api/ops/metrics` (role verifier/admin)
- Menambahkan dokumentasi operasional:
  - `docs/DEPLOYMENT.md`
  - `docs/RUNBOOK.md`

Hasil:
- Kualitas rilis kini punya quality gate otomatis, flow kritikal teruji, serta dasar observability dan runbook incident.

---

### [x] Fase 9 - Structure Alignment (Folder Sesuai README)
Yang dilakukan:
- Membuat `src/crawler/` lengkap:
  - `playwright.config.ts` — stealth browser config
  - `googleImages.ts` — Google Images QRIS hunt
  - `mapsReviews.ts` — Google Maps photo scraper
  - `socialflaut/instagram.ts` — IG public post scraper
  - `socialflaut/tiktok.ts` — TikTok public post scraper
- Membuat `src/parser/nmid.ts` — NMID extraction & validation.
- Membuat `src/parser/qrDetector.ts` — jsQR + ZXing wrapper.
- Membuat `src/engine/gemini.ts` — Gemini API integration (kategorisasi, NLP, tiebreaker).
- Membuat `src/engine/categorizer.ts` — keyword-first + AI fallback classifier.
- Membuat `src/engine/geoResolver.ts` — multi-level coordinate resolution (4 levels).
- Membuat `src/services/supabase.ts` — Supabase client + PostGIS query helpers.
- Membuat `src/services/geocoding.ts` — reverse/forward geocoding converter.
- Membuat `src/queue/scrapeQueue.ts` — rate-limited queue + exponential backoff.
- Membuat `src/queue/rateLimiter.ts` — token-bucket + backoff handler.
- Membuat `src/types/qris.ts` — QRIS metadata interfaces.
- Membuat `src/types/merchant.ts` — merchant entity types.
- Membuat `src/types/pipeline.ts` — pipeline status enums.
- Membuat `pwa/` lengkap:
  - `hooks/useGPS.ts`, `hooks/useQRScan.ts`
  - `components/QRScanner.tsx`, `MerchantPin.tsx`, `PaymentRedirect.tsx`
  - `app/scan/page.tsx`, `app/map/page.tsx`, `app/contribute/page.tsx`
- Membuat `docker/Dockerfile` (multi-stage, Cloud Run ready) + `docker/docker-compose.yml`.
- Membuat `scripts/seed.ts` — initial DB seeding.
- Membuat `scripts/benchmark.ts` — pipeline performance test.
- Membuat `supabase/migrations/001_merchants.sql` — merchant table + PostGIS + RPC.
- Membuat `supabase/migrations/002_scan_events.sql` — scan event log + confidence helper.
- Menambahkan script `package.json`: `start`, `pwa:dev`, `pipeline:seed`, `pipeline:benchmark`, `db:migrate`, `worker:validate`.
- Menambahkan `concurrently` ke devDependencies.

Hasil:
- Seluruh struktur folder dan file sesuai dengan spesifikasi README.md Project Structure.

---

## Prioritas Eksekusi Disarankan

1. Hardening lanjutan non-fase (opsional):
- Tambah tracing terdistribusi (OpenTelemetry) ke provider call + DB.
- Tambah alerting otomatis dari metrik error-rate/latency.

---

## Catatan Operasional Saat Ini

- Jalankan frontend: `npm run dev:web`
- Jalankan backend API: `npm run dev:api`
- Lint: `npm run lint`
- Build: `npm run build`
