/**
 * queue/scrapeQueue.ts — Rate-limited scraping queue
 * pwa/hooks/useQRScan.ts — QR scan state management hook.
 * Wraps jsQR camera scanning into a clean React interface.
 */
import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';
import jsQR from 'jsqr';

export type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export interface QRScanState {
  status: ScanStatus;
  result: string | null;
  error: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function useQRScan(onDetected?: (qrisString: string) => void) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    setStatus('scanning');
    setResult(null);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const scan = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(scan);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          setResult(code.data);
          setStatus('success');
          stop();
          onDetected?.(code.data);
          return;
        }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera error');
      setStatus('error');
    }
  }, [onDetected, stop]);

  useEffect(() => () => stop(), [stop]);

  return { status, result, error, videoRef, canvasRef, start, stop };
}
