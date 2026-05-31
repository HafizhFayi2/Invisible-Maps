/**
 * pwa/components/QRScanner.tsx
 * Camera + QR decode component.
 * Outputs absolute positioned video element to act as a camera background.
 */
import React, { useEffect } from 'react';
import { useQRScan } from '../hooks/useQRScan';

interface QRScannerProps {
  onDetected: (qrisString: string) => void;
  onError?: (err: string) => void;
  autoStart?: boolean;
}

export function QRScanner({ onDetected, onError, autoStart = true }: QRScannerProps) {
  const { status, error, videoRef, canvasRef, start, stop } = useQRScan(onDetected);

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  useEffect(() => {
    if (autoStart && status === 'idle') {
      start();
    }
    return () => {
      stop();
    };
  }, [autoStart, status, start, stop]);

  return (
    <>
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className="hidden" />

      {/* Video feed acting as a full background */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
    </>
  );
}
