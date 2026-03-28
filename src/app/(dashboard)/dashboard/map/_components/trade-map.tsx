'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useKakaoLoaded } from '@/components/kakao-map-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

interface Complex {
  id: string;
  name: string;
  dong: string;
  regionCode: string;
  lat: number | null;
  lng: number | null;
  _count: { trades: number };
  avgPrice: number;
  avgPricePerPyeong: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function TradeMap() {
  const kakaoLoaded = useKakaoLoaded();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);

  const { data } = useSWR<{ data: Complex[] }>(
    '/api/market/map/complexes',
    fetcher
  );

  // 지도 초기화
  useEffect(() => {
    if (!kakaoLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.5665, 126.978), // 서울 시청
      level: 8,
    });

    mapInstanceRef.current = map;
  }, [kakaoLoaded]);

  // 마커 표시
  useEffect(() => {
    if (!mapInstanceRef.current || !data?.data) return;

    const map = mapInstanceRef.current;
    const complexes = data.data.filter((c) => c.lat && c.lng);

    for (const complex of complexes) {
      const position = new kakao.maps.LatLng(complex.lat!, complex.lng!);
      const priceLabel = (complex.avgPrice / 10000).toFixed(1) + '억';

      // 커스텀 오버레이 (가격 라벨)
      const content = document.createElement('div');
      content.className = 'map-marker';
      content.style.cssText = `
        background: hsl(152 69% 40%);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      content.textContent = priceLabel;
      content.addEventListener('click', () => setSelectedComplex(complex));

      new kakao.maps.CustomOverlay({
        map,
        position,
        content,
        yAnchor: 1.3,
      });
    }
  }, [data]);

  if (!process.env.NEXT_PUBLIC_KAKAO_APP_KEY) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8 px-12">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">카카오맵 API 키가 필요합니다</p>
            <p className="text-xs text-muted-foreground text-center">
              NEXT_PUBLIC_KAKAO_APP_KEY 환경변수를 설정하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* 지도 */}
      <div ref={mapRef} className="h-full w-full rounded-xl" />

      {/* 선택된 단지 사이드패널 */}
      {selectedComplex && (
        <div className="absolute right-4 top-4 z-10 w-72">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{selectedComplex.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedComplex.dong}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedComplex(null)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">평균 매매가</span>
                  <span className="font-semibold text-primary">
                    {(selectedComplex.avgPrice / 10000).toFixed(1)}억
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">평당가</span>
                  <span className="font-semibold">
                    {selectedComplex.avgPricePerPyeong.toLocaleString()}만
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">거래 건수</span>
                  <Badge variant="secondary">{selectedComplex._count.trades}건</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 로딩 상태 */}
      {!kakaoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/60">
          <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
        </div>
      )}
    </div>
  );
}
