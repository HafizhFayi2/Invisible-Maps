/**
 * lib/qrisParser.ts
 *
 * EMV Co QR Code Specification for Payment Systems
 * (Indonesian QRIS standard — BI spec)
 *
 * QRIS string is a TLV (Tag-Length-Value) encoded string where each field is:
 *   ID (2 digits) + Length (2 digits) + Value
 */

export interface QRISData {
  /** Merchant Account Information — ID 26..51 */
  nmid: string;           // National Merchant ID (ID 26-00 or via BI routing)
  merchantName: string;   // ID 59
  merchantCity: string;   // ID 60
  postalCode: string;     // ID 61
  /** Country Code, always ID */
  countryCode: string;    // ID 58
  /** Transaction Currency (360 = IDR) */
  currency: string;       // ID 53
  /** Tip / Amount if present */
  transactionAmount: string; // ID 54
  /** Category code */
  mcc: string;            // ID 52
  /** Raw full string for audit */
  raw: string;
  /** Whether this looks like a valid QRIS */
  isValid: boolean;
  /** Human-readable error if invalid */
  error?: string;
}

/**
 * Parse a TLV-encoded QRIS string.
 *
 * @param raw - The raw QR code string (from camera/upload)
 * @returns Parsed QRIS data
 */
export function parseQRIS(raw: string): QRISData {
  const result: QRISData = {
    nmid: '',
    merchantName: '',
    merchantCity: '',
    postalCode: '',
    countryCode: 'ID',
    currency: '360',
    transactionAmount: '',
    mcc: '',
    raw,
    isValid: false,
  };

  if (!raw || typeof raw !== 'string') {
    result.error = 'Empty QR code';
    return result;
  }

  // Basic QRIS validation — must start with "000201"
  if (!raw.startsWith('000201')) {
    result.error = 'Not a valid QRIS/EMV QR code (must start with 000201)';
    return result;
  }

  // ─── TLV Parser ──────────────────────────────────────────────────────────
  function parseTLV(str: string): Record<string, string> {
    const map: Record<string, string> = {};
    let i = 0;
    while (i < str.length) {
      const id = str.slice(i, i + 2);
      const lenStr = str.slice(i + 2, i + 4);
      const len = parseInt(lenStr, 10);
      if (isNaN(len)) break;
      const value = str.slice(i + 4, i + 4 + len);
      map[id] = value;
      i += 4 + len;
    }
    return map;
  }

  const tlv = parseTLV(raw);

  // ID 52 — Merchant Category Code
  result.mcc = tlv['52'] || '';

  // ID 53 — Transaction Currency (360 = IDR)
  result.currency = tlv['53'] || '360';

  // ID 54 — Transaction Amount (optional)
  result.transactionAmount = tlv['54'] || '';

  // ID 58 — Country Code
  result.countryCode = tlv['58'] || 'ID';

  // ID 59 — Merchant Name
  result.merchantName = tlv['59'] || '';

  // ID 60 — Merchant City
  result.merchantCity = tlv['60'] || '';

  // ID 61 — Postal Code
  result.postalCode = tlv['61'] || '';

  // ── Extract NMID from Merchant Account Info (ID 26–51) ───────────────────
  // QRIS routing: NMID is nested inside ID 26 sub-field 01 or 02
  for (let id = 26; id <= 51; id++) {
    const key = id.toString().padStart(2, '0');
    if (tlv[key]) {
      const sub = parseTLV(tlv[key]);
      // Sub-field 01 = GUID/AID, Sub-field 02 = NMID (BI routing)
      const nmidCandidate = sub['01'] || sub['02'] || sub['00'] || '';
      // NMID format: ID + NMID number (e.g., "ID202XXXXXXXXXXXXXXXX")
      if (nmidCandidate && (nmidCandidate.toUpperCase().startsWith('ID') || /^\d{15,}/.test(nmidCandidate))) {
        result.nmid = nmidCandidate;
        break;
      }
      // Some QRIS use sub-field 02 as the actual NMID number directly
      if (sub['02'] && sub['02'].length >= 10) {
        result.nmid = sub['02'];
        break;
      }
    }
  }

  // Fallback: try to find a 25-char ID starting with "ID" in any field
  if (!result.nmid) {
    for (const val of Object.values(tlv)) {
      const idMatch = val.match(/\bID\d{25}\b/i);
      if (idMatch) {
        result.nmid = idMatch[0];
        break;
      }
    }
  }

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!result.merchantName) {
    result.error = 'Merchant name not found in QRIS data';
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * Attempt to decode a QRIS QR code from a base64 image data URL.
 * Uses jsQR library (loaded dynamically).
 *
 * @param imageData - ImageData from canvas context
 * @returns QRIS string or null
 */
export async function decodeQRFromImageData(imageData: ImageData): Promise<string | null> {
  try {
    // Dynamic import to avoid bundling jsQR if not installed yet
    const jsQR = (await import('jsqr')).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    return code?.data ?? null;
  } catch (err) {
    console.error('[QRIS] jsQR decode error:', err);
    return null;
  }
}

/**
 * Decode a QR from a File (image upload).
 * Draws to canvas and runs jsQR.
 */
export async function decodeQRFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(await decodeQRFromImageData(imageData));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
