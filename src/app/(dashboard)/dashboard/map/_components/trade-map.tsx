'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useKakaoLoaded, useKakaoError } from '@/components/kakao-map-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronRight, List, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Region {
  code: string;
  sido: string;
  sigungu: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// 시도별 중심 좌표
const SIDO_CENTERS: Record<string, { lat: number; lng: number; level: number }> = {
  서울특별시: { lat: 37.5665, lng: 126.978, level: 8 },
  경기도: { lat: 37.275, lng: 127.009, level: 10 },
  부산광역시: { lat: 35.1796, lng: 129.0756, level: 8 },
  인천광역시: { lat: 37.4563, lng: 126.7052, level: 9 },
  대구광역시: { lat: 35.8714, lng: 128.6014, level: 8 },
  대전광역시: { lat: 36.3504, lng: 127.3845, level: 8 },
  광주광역시: { lat: 35.1595, lng: 126.8526, level: 8 },
  울산광역시: { lat: 35.5384, lng: 129.3114, level: 8 },
};

export function TradeMap() {
  const kakaoLoaded = useKakaoLoaded();
  const kakaoError = useKakaoError();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [showList, setShowList] = useState(false);
  const [selectedSido, setSelectedSido] = useState('서울특별시');

  const { data: regionData } = useSWR<{ data: Region[] }>('/api/market/regions', fetcher);
  const { data: complexData } = useSWR<{ data: Complex[] }>('/api/market/map/complexes', fetcher);

  const complexes = complexData?.data ?? [];
  const withCoords = complexes.filter((c) => c.lat && c.lng);
  const withoutCoords = complexes.filter((c) => !c.lat || !c.lng);

  // 시도 목록 추출
  const sidoList = regionData?.data
    ? [...new Set(regionData.data.map((r) => r.sido))]
    : [];

  // 지도 초기화
  useEffect(() => {
    if (!kakaoLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center = SIDO_CENTERS[selectedSido] || SIDO_CENTERS['서울특별시'];
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: center.level,
    });
    mapInstanceRef.current = map;
  }, [kakaoLoaded, selectedSido]);

  // 시도 변경 시 지도 이동
  const moveTo = useCallback((sido: string) => {
    setSelectedSido(sido);
    const center = SIDO_CENTERS[sido];
    if (center && mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
      mapInstanceRef.current.setLevel(center.level);
    }
  }, []);

  // 마커 표시
  useEffect(() => {
    if (!mapInstanceRef.current || withCoords.length === 0) return;
    const map = mapInstanceRef.current;

    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    for (const complex of withCoords) {
      const position = new kakao.maps.LatLng(complex.lat!, complex.lng!);
      const priceLabel =
        complex.avgPrice >= 10000
          ? (complex.avgPrice / 10000).toFixed(1) + '억'
          : complex.avgPrice.toLocaleString() + '만';

      const content = document.createElement('div');
      content.style.cssText = `
        background: hsl(152 69% 40%);
        color: white;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: transform 0.15s;
      `;
      content.textContent = priceLabel;
      content.addEventListener('mouseenter', () => {
        content.style.transform = 'scale(1.1)';
      });
      content.addEventListener('mouseleave', () => {
        content.style.transform = 'scale(1)';
      });
      content.addEventListener('click', () => {
        setSelectedComplex(complex);
        setShowList(false);
      });

      const overlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content,
        yAnchor: 1.4,
      });
      overlaysRef.current.push(overlay);
    }
  }, [withCoords]);

  if (!process.env.NEXT_PUBLIC_KAKAO_APP_KEY || kakaoError) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8 px-12">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {kakaoError ? '카카오맵 로드에 실패했습니다' : '카카오맵 API 키가 필요합니다'}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {kakaoError
                ? '카카오 개발자 콘솔 → 플랫폼 → Web에 도메인을 등록했는지 확인하세요.'
                : 'NEXT_PUBLIC_KAKAO_APP_KEY 환경변수를 설정하세요.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* 시도 선택 탭 */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        {sidoList.map((sido) => (
          <button
            key={sido}
            onClick={() => moveTo(sido)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all',
              selectedSido === sido
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/90 text-foreground/70 hover:bg-white backdrop-blur-sm border border-border/50'
            )}
          >
            {sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}
          </button>
        ))}
      </div>

      {/* 단지 리스트 토글 */}
      <button
        onClick={() => { setShowList(!showList); setSelectedComplex(null); }}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-border/50 px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-white transition-all"
      >
        <List className="h-3.5 w-3.5" />
        단지 목록 ({complexes.length})
      </button>

      {/* 지도 */}
      <div ref={mapRef} className="h-full w-full rounded-xl" />

      {/* 선택된 단지 패널 */}
      {selectedComplex && (
        <div className="absolute right-3 top-12 z-10 w-72 animate-fade-up">
          <Card className="shadow-lg border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{selectedComplex.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedComplex.dong}</p>
                </div>
                <button
                  onClick={() => setSelectedComplex(null)}
                  className="rounded-md p-1 hover:bg-accent transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
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
              <Link
                href={`/dashboard/apartments/${selectedComplex.id}`}
                className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-primary/10 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                상세 보기 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 단지 리스트 사이드패널 */}
      {showList && (
        <div className="absolute right-3 top-12 z-10 w-80 max-h-[calc(100%-80px)] animate-fade-up">
          <Card className="shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-semibold">
                  수집된 단지 ({complexes.length}개)
                </h3>
                <button
                  onClick={() => setShowList(false)}
                  className="rounded-md p-1 hover:bg-accent transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {withoutCoords.length > 0 && (
                <div className="bg-amber-50 border-b px-4 py-2">
                  <p className="text-[11px] text-amber-700">
                    {withoutCoords.length}개 단지의 좌표가 미등록입니다.
                    지오코딩 스크립트를 실행하세요.
                  </p>
                </div>
              )}

              <div className="max-h-96 overflow-y-auto">
                {complexes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/apartments/${c.id}`}
                    className="flex items-center gap-3 border-b last:border-0 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.dong}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">
                        {(c.avgPrice / 10000).toFixed(1)}억
                      </p>
                      <p className="text-[10px] text-muted-foreground">{c._count.trades}건</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 좌표 현황 표시 */}
      <div className="absolute bottom-3 left-3 z-10">
        <div className="rounded-lg bg-white/90 backdrop-blur-sm border border-border/50 px-3 py-2 shadow-sm text-xs">
          <span className="text-primary font-semibold">{withCoords.length}</span>
          <span className="text-muted-foreground"> 단지 표시 중</span>
          {withoutCoords.length > 0 && (
            <span className="text-muted-foreground ml-2">
              · <span className="text-amber-600">{withoutCoords.length}</span> 좌표 미등록
            </span>
          )}
        </div>
      </div>

      {/* 로딩 */}
      {!kakaoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-muted/60">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}
