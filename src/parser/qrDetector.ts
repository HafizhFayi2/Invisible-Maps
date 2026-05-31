/**
 * parser/qrDetector.ts
 * QR detector wrapper for browser + server usage.
 * - Browser: jsQR from ImageData
 * - Server: Jimp decode to RGBA + jsQR
 */

import jsQR from 'jsqr';
import { Jimp } from 'jimp';

export type QRDecodeResult = string | null;

async function decodeBytesWithNode(bytes: Uint8Array): Promise<QRDecodeResult> {
  try {
    const image = await Jimp.read(Buffer.from(bytes));
    const { data, width, height } = image.bitmap;

    if (!width || !height || data.length < 4) {
      return null;
    }

    const code = jsQR(new Uint8ClampedArray(data), width, height, {
      inversionAttempts: 'attemptBoth',
    });

    return code?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Decode QR code from image URL.
 */
export async function detectQRFromUrl(imageUrl: string): Promise<QRDecodeResult> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    return await decodeFromBufferAsync(new Uint8Array(buffer));
  } catch {
    return null;
  }
}

/**
 * Async decoder for both server and browser.
 */
export async function decodeFromBufferAsync(bytes: Uint8Array): Promise<QRDecodeResult> {
  if (typeof window === 'undefined') {
    return decodeBytesWithNode(bytes);
  }

  return decodeFromBuffer(bytes);
}

/**
 * Sync decode compatibility helper.
 * In browser this remains limited because raw bytes usually need image decoding first.
 */
export function decodeFromBuffer(_bytes: Uint8Array): QRDecodeResult {
  return null;
}

/**
 * Browser helper: decode QR from an HTMLImageElement via canvas.
 */
export async function detectQRFromImageElement(img: HTMLImageElement): Promise<QRDecodeResult> {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve(null);
      return;
    }

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    resolve(code?.data ?? null);
  });
}
