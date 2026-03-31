'use client';

import { useEffect, useRef } from 'react';
import { useKakaoLoaded } from '@/components/kakao-map-provider';
import { formatPrice } from '@/lib/format';

interface MapItem {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  latestTrade: { price: number } | null;
}

interface Props {
  items: MapItem[];
  className?: string;
}

function getPriceColor(price: number): string {
  if (price >= 200000) return '#7c3aed';
  if (price >= 100000) return '#0369a1';
  if (price >= 50000) return '#059669';
  return '#64748b';
}

export function ApartmentsMiniMap({ items, className }: Props) {
  const kakaoLoaded = useKakaoLoaded();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);

  // 지도 초기화
  useEffect(() => {
    if (!kakaoLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.5665, 126.978),
      level: 8,
    });
    mapInstanceRef.current = map;
  }, [kakaoLoaded]);

  // 마커 업데이트
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 기존 오버레이 정리
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const withCoords = items.filter((item) => item.lat && item.lng);
    if (withCoords.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();

    for (const item of withCoords) {
      const position = new kakao.maps.LatLng(item.lat!, item.lng!);
      bounds.extend(position);

      const price = item.latestTrade?.price ?? 0;
      const color = getPriceColor(price);
      const label = price > 0 ? formatPrice(price) : '';

      const el = document.createElement('div');
      el.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        background: ${color};
        color: white;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 9px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        pointer-events: none;
      `;

      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'font-size:8px;opacity:0.85;max-width:60px;overflow:hidden;text-overflow:ellipsis';
      nameSpan.textContent = item.name;
      el.appendChild(nameSpan);

      if (label) {
        const priceSpan = document.createElement('span');
        priceSpan.textContent = label;
        el.appendChild(priceSpan);
      }

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: el,
        clickable: false,
        yAnchor: 1.3,
        zIndex: 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }

    map.setBounds(bounds, 30, 30, 30, 30);
  }, [items]);

  if (!process.env.NEXT_PUBLIC_KAKAO_APP_KEY) return null;

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
    </div>
  );
}
