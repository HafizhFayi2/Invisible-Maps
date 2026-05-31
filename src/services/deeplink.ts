/**
 * Payment deeplinks for Indonesian banking apps.
 *
 * PENTING: Jangan gunakan intent:// URI format.
 * Chrome Android dengan intent:// + package= akan selalu redirect ke Play Store
 * jika activity path tidak cocok persis, walaupun app sudah terinstall.
 *
 * Gunakan custom URL scheme langsung (dana://, gojek://, dll).
 * Android OS yang akan resolve ke app yang sesuai.
 * Jika app tidak terinstall: browser tampil "can't open page" (tidak ke Play Store).
 *
 * WAJIB: Dipanggil langsung di dalam event handler (onClick), BUKAN di dalam setTimeout.
 * Kehilangan user gesture akan menyebabkan Chrome memblokir navigasi ke custom scheme.
 */

/**
 * Buka banking app langsung via custom URL scheme.
 * Harus dipanggil langsung dalam onClick handler — jangan wrap dengan setTimeout.
 */
export function openBankingApp(appKey: string, qrisString: string): void {
  const url = buildDeeplink(appKey, qrisString);
  if (!url) return;

  // Langsung navigasi — user gesture context harus masih aktif
  window.location.href = url;
}

function buildDeeplink(appKey: string, qris: string): string | null {
  const enc = encodeURIComponent(qris);

  switch (appKey) {
    // ── E-Wallet ───────────────────────────────────────────────────────────────
    case 'dana':
      // DANA mendukung QRIS deep link
      return `dana://qris?data=${enc}`;

    case 'gopay':
      // GoPay/Gojek — buka halaman scan
      return `gojek://gopay/qr?data=${enc}`;

    case 'ovo':
      // OVO — buka scanner
      return `ovo://pay?qr=${enc}`;

    case 'shopeepay':
      // ShopeePay dalam Shopee
      return `shopeepay://qr?content=${enc}`;

    // ── Bank Apps ──────────────────────────────────────────────────────────────
    case 'bca':
      // BCA Mobile — buka m-BCA
      return `bca://qr?content=${enc}`;

    case 'mybca':
      // myBCA
      return `mybca://payment/qris?qrString=${enc}`;

    case 'bri':
      // BRImo
      return `brimo://qris?content=${enc}`;

    case 'bni':
      // BNI Mobile Banking
      return `bni://qris?data=${enc}`;

    case 'mandiri':
      // Livin' by Mandiri
      return `livin://qris?data=${enc}`;

    case 'seabank':
      // SeaBank — coba custom scheme
      return `seabank://qris?content=${enc}`;

    default:
      return null;
  }
}

/**
 * Deteksi apakah ini Android (untuk UI hints)
 */
export function isAndroidDevice(): boolean {
  return /android/i.test(navigator.userAgent);
}

/**
 * Deteksi iOS
 */
export function isIOSDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Tetap export getPaymentDeeplink untuk backward compat
export function getPaymentDeeplink(qrisString: string, preferredApp?: string): string {
  if (preferredApp) {
    return buildDeeplink(preferredApp, qrisString) ?? `https://qris.online/redirect?qr=${encodeURIComponent(qrisString)}`;
  }
  return `https://qris.online/redirect?qr=${encodeURIComponent(qrisString)}`;
}
