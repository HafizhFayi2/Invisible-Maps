/**
 * pwa/components/MerchantPin.tsx
 * Map pin component with merchant status badge.
 * Used in Leaflet/MapLibre custom markers.
 */
import React from 'react';
import type { MerchantVisibilityStatus } from '../../src/types/merchant';

interface MerchantPinProps {
  name: string;
  category: string | null;
  status: MerchantVisibilityStatus;
  confidence: number;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<
  MerchantVisibilityStatus,
  { color: string; emoji: string; label: string }
> = {
  INVISIBLE: { color: '#00E676', emoji: '🟢', label: 'Invisible' },
  VERIFIED_INVISIBLE: { color: '#00BCD4', emoji: '✅', label: 'Verified' },
  UNVERIFIED: { color: '#FFD740', emoji: '🟡', label: 'Unverified' },
  PENDING: { color: '#9E9E9E', emoji: '⏳', label: 'Pending' },
  ALREADY_MAPPED: { color: '#F44336', emoji: '🔴', label: 'Mapped' },
  DUPLICATE: { color: '#9C27B0', emoji: '⚠️', label: 'Duplicate' },
  MERCHANT_RELOCATED: { color: '#FF9800', emoji: '📍', label: 'Relocated' },
};

export function MerchantPin({ name, category, status, confidence, onClick }: MerchantPinProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  return (
    <button
      onClick={onClick}
      title={`${name} — ${cfg.label} (${confidence}%)`}
      style={{
        background: 'rgba(18, 18, 18, 0.92)',
        border: `2px solid ${cfg.color}`,
        borderRadius: 8,
        padding: '6px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: '#fff',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
        backdropFilter: 'blur(4px)',
        maxWidth: 160,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <span>{cfg.emoji}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </span>
      {category && (
        <span style={{ color: cfg.color, fontSize: 10 }}>• {category}</span>
      )}
    </button>
  );
}
