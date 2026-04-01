'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useKakaoLoaded } from '@/components/kakao-map-provider';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  distance: number;
  lat: number;
  lng: number;
}

interface NearbyData {
  summary: { key: string; label: string; count: number; nearest: NearbyPlace | null }[];
  places: Record<string, NearbyPlace[]>;
  radius: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CAT_COLORS: Record<string, { color: string; label: string }> = {
  subway: { color: '#2563eb', label: '지하철' },
  school: { color: '#d97706', label: '학교' },
  convenience: { color: '#059669', label: '편의점' },
  mart: { color: '#7c3aed', label: '마트' },
  hospital: { color: '#dc2626', label: '병원' },
  cafe: { color: '#92400e', label: '카페' },
  bank: { color: '#0369a1', label: '은행' },
};

function addCenterMarker(map: kakao.maps.Map, lat: number, lng: number, name: string) {
  const markerEl = document.createElement('div');
  markerEl.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    background: #059669; color: white; padding: 4px 10px; border-radius: 10px;
    font-size: 11px; font-weight: 700; white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25); border: 2px solid #047857;
    position: relative;
  `;
  markerEl.innerHTML = `<span style="font-size:10px;opacity:0.85">📍</span><span>${name}</span>`;

  const tail = document.createElement('div');
  tail.style.cssText = `position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #047857;`;
  markerEl.appendChild(tail);

  new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(lat, lng),
    content: markerEl,
    yAnchor: 1.5,
    zIndex: 10,
  }).setMap(map);

  new kakao.maps.Circle({
    center: new kakao.maps.LatLng(lat, lng),
    radius: 1000,
    strokeWeight: 1.5,
    strokeColor: '#059669',
    strokeOpacity: 0.3,
    strokeStyle: 'dashed',
    fillColor: '#059669',
    fillOpacity: 0.03,
  }).setMap(map);
}

interface Props {
  complexId: string;
  lat: number | null;
  lng: number | null;
  name: string;
  address: string;
}

export function DetailMap({ complexId, lat, lng, name, address }: Props) {
  const kakaoLoaded = useKakaoLoaded();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const resolvedCoordsRef = useRef<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );

  const hasCoords = lat !== null && lng !== null;
  const { data: nearbyData } = useSWR<{ data: NearbyData }>(
    hasCoords ? `/api/market/apartments/${complexId}/nearby?radius=1000` : null,
    fetcher
  );

  // 지도 초기화 — 좌표 있으면 바로, 없으면 주소 검색
  useEffect(() => {
    if (!kakaoLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initMap = (centerLat: number, centerLng: number) => {
      const map = new kakao.maps.Map(mapRef.current!, {
        center: new kakao.maps.LatLng(centerLat, centerLng),
        level: 4,
      });
      mapInstanceRef.current = map;
      resolvedCoordsRef.current = { lat: centerLat, lng: centerLng };
      addCenterMarker(map, centerLat, centerLng, name);
    };

    if (lat && lng) {
      initMap(lat, lng);
    } else {
      // 주소 검색으로 좌표 획득
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, (result, status) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          initMap(parseFloat(result[0].y), parseFloat(result[0].x));
        } else {
          // 키워드 검색 폴백
          const ps = new kakao.maps.services.Places();
          ps.keywordSearch(`${name} 아파트`, (places, psStatus) => {
            if (psStatus === kakao.maps.services.Status.OK && places.length > 0) {
              initMap(parseFloat(places[0].y), parseFloat(places[0].x));
            } else {
              // 서울 기본 좌표
              initMap(37.5665, 126.978);
            }
          });
        }
      });
    }
  }, [kakaoLoaded, lat, lng, name, address]);

  // 주변시설 마커
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !nearbyData?.data?.places) return;

    for (const [key, items] of Object.entries(nearbyData.data.places)) {
      const cat = CAT_COLORS[key];
      if (!cat || !items) continue;

      for (const place of (items as NearbyPlace[]).slice(0, 3)) {
        const el = document.createElement('div');
        el.style.cssText = `
          display: flex; align-items: center; gap: 3px;
          background: white; padding: 2px 6px; border-radius: 8px;
          font-size: 10px; white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          border: 1.5px solid ${cat.color}; pointer-events: none;
        `;
        const distLabel = place.distance >= 1000
          ? `${(place.distance / 1000).toFixed(1)}km`
          : `${place.distance}m`;
        el.innerHTML = `
          <span style="color:#374151;font-weight:600;max-width:60px;overflow:hidden;text-overflow:ellipsis">${place.name}</span>
          <span style="color:${cat.color};font-weight:700;font-size:9px">${distLabel}</span>
        `;

        new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(place.lat, place.lng),
          content: el,
          clickable: false,
          yAnchor: 1.3,
          zIndex: 5,
        }).setMap(map);
      }
    }
  }, [nearbyData]);

  return (
    <Card>
      <CardContent className="p-0 overflow-hidden rounded-xl">
        <div className="flex items-center gap-2 px-5 py-3 border-b">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold">위치 및 주변시설</h2>
          {nearbyData?.data?.summary && (
            <div className="flex items-center gap-2 ml-auto">
              {nearbyData.data.summary
                .filter((s) => s.count > 0)
                .slice(0, 4)
                .map((s) => (
                  <span key={s.key} className="text-[10px] text-muted-foreground">
                    {s.label} {s.count}
                  </span>
                ))}
            </div>
          )}
        </div>
        <div ref={mapRef} className="h-[350px] w-full" />
      </CardContent>
    </Card>
  );
}
