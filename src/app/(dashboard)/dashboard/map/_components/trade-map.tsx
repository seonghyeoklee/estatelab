'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useKakaoLoaded, useKakaoError } from '@/components/kakao-map-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ChevronRight, List, X, ZoomIn, ZoomOut, Locate } from 'lucide-react';
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

function formatPrice(price: number): string {
  if (price >= 100000) return (price / 10000).toFixed(0) + '억';
  if (price >= 10000) return (price / 10000).toFixed(1) + '억';
  return price.toLocaleString() + '만';
}

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
  세종특별자치시: { lat: 36.48, lng: 127.0, level: 9 },
};

// 가격대별 마커 색상
function getPriceColor(avgPrice: number): { bg: string; text: string; border: string } {
  if (avgPrice >= 200000) return { bg: '#dc2626', text: '#fff', border: '#b91c1c' }; // 20억+
  if (avgPrice >= 100000) return { bg: '#ea580c', text: '#fff', border: '#c2410c' }; // 10억+
  if (avgPrice >= 50000) return { bg: '#059669', text: '#fff', border: '#047857' };  // 5억+
  return { bg: '#2563eb', text: '#fff', border: '#1d4ed8' };                         // ~5억
}

export function TradeMap() {
  const kakaoLoaded = useKakaoLoaded();
  const kakaoError = useKakaoError();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
  const initialFitDoneRef = useRef(false);
  const listenersAttachedRef = useRef(false);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [showList, setShowList] = useState(false);
  const [selectedSido, setSelectedSido] = useState('서울특별시');
  const [zoomLevel, setZoomLevel] = useState(8);

  const { data: regionData } = useSWR<{ data: Region[] }>('/api/market/regions', fetcher);
  const { data: complexData } = useSWR<{ data: Complex[] }>('/api/market/map/complexes', fetcher);

  const complexes = complexData?.data ?? [];
  const withCoords = complexes.filter((c) => c.lat && c.lng);

  const sidoList = regionData?.data ? [...new Set(regionData.data.map((r) => r.sido))] : [];

  // 지도 초기화
  useEffect(() => {
    if (!kakaoLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center = SIDO_CENTERS[selectedSido] || SIDO_CENTERS['서울특별시'];
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: center.level,
    });
    mapInstanceRef.current = map;

    // 줌 변경 이벤트
    kakao.maps.event.addListener(map, 'zoom_changed', () => {
      setZoomLevel(map.getLevel());
    });

    // 클러스터러 초기화
    clustererRef.current = new kakao.maps.MarkerClusterer({
      map,
      gridSize: 60,
      averageCenter: true,
      minLevel: 6,
      minClusterSize: 3,
      disableClickZoom: false,
      styles: [
        {
          width: '52px',
          height: '52px',
          background: 'rgba(5, 150, 105, 0.85)',
          borderRadius: '50%',
          color: '#fff',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '13px',
          lineHeight: '52px',
        },
        {
          width: '60px',
          height: '60px',
          background: 'rgba(234, 88, 12, 0.85)',
          borderRadius: '50%',
          color: '#fff',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '14px',
          lineHeight: '60px',
        },
        {
          width: '70px',
          height: '70px',
          background: 'rgba(220, 38, 38, 0.85)',
          borderRadius: '50%',
          color: '#fff',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '15px',
          lineHeight: '70px',
        },
      ],
      calculator: [10, 30],
    });
  }, [kakaoLoaded, selectedSido]);

  // 시도 변경 시 지도 이동
  const moveTo = useCallback((sido: string) => {
    setSelectedSido(sido);
    setSelectedComplex(null);
    setShowList(false);
    const center = SIDO_CENTERS[sido];
    if (center && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(new kakao.maps.LatLng(center.lat, center.lng));
      mapInstanceRef.current.setLevel(center.level, { animate: true });
    }
  }, []);

  // 마커 표시
  useEffect(() => {
    if (!mapInstanceRef.current || !clustererRef.current || withCoords.length === 0) return;
    const map = mapInstanceRef.current;

    // 기존 오버레이 + 클러스터 제거
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    clustererRef.current.clear();

    const markers: kakao.maps.Marker[] = [];

    for (const complex of withCoords) {
      const position = new kakao.maps.LatLng(complex.lat!, complex.lng!);
      const color = getPriceColor(complex.avgPrice);
      const priceLabel = formatPrice(complex.avgPrice);

      // 커스텀 오버레이 (상세 가격 마커 — 줌 레벨 5 이하)
      const content = document.createElement('div');
      content.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        background: ${color.bg};
        color: ${color.text};
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        border: 2px solid ${color.border};
        transition: transform 0.15s, box-shadow 0.15s;
      `;
      content.innerHTML = `
        <span style="font-size:10px;opacity:0.9;max-width:80px;overflow:hidden;text-overflow:ellipsis">${complex.name}</span>
        <span style="font-weight:800">${priceLabel}</span>
      `;
      content.addEventListener('mouseenter', () => {
        content.style.transform = 'scale(1.08) translateY(-2px)';
        content.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
      });
      content.addEventListener('mouseleave', () => {
        content.style.transform = 'scale(1)';
        content.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      });
      content.addEventListener('click', () => {
        setSelectedComplex(complex);
        setShowList(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(position);
        }
      });

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1.5,
        zIndex: 3,
      });
      overlaysRef.current.push(overlay);

      // 클러스터용 마커 (항상 존재, 줌 아웃 시 클러스터링)
      const marker = new kakao.maps.Marker({
        position,
        clickable: true,
      });
      markers.push(marker);

      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedComplex(complex);
        setShowList(false);
      });
    }

    // 클러스터에 마커 추가
    clustererRef.current.addMarkers(markers);

    // 줌 레벨에 따라 오버레이 표시/숨기기
    function updateOverlayVisibility() {
      const level = map.getLevel();
      const bounds = map.getBounds();
      overlaysRef.current.forEach((overlay, idx) => {
        const complex = withCoords[idx];
        if (!complex?.lat || !complex?.lng) return;
        const pos = new kakao.maps.LatLng(complex.lat, complex.lng);
        // 줌 레벨 5 이하 + 화면 내 단지만 표시
        if (level <= 5 && bounds.contain(pos)) {
          overlay.setMap(map);
        } else {
          overlay.setMap(null);
        }
      });
    }

    updateOverlayVisibility();

    // 이벤트 리스너는 최초 1회만 등록
    if (!listenersAttachedRef.current) {
      kakao.maps.event.addListener(map, 'zoom_changed', updateOverlayVisibility);
      kakao.maps.event.addListener(map, 'bounds_changed', updateOverlayVisibility);
      listenersAttachedRef.current = true;
    }

    // 데이터 있는 영역으로 자동 fit (최초 1회만)
    if (!initialFitDoneRef.current && withCoords.length > 1) {
      const bounds = new kakao.maps.LatLngBounds();
      withCoords.forEach((c) => bounds.extend(new kakao.maps.LatLng(c.lat!, c.lng!)));
      map.setBounds(bounds, 50, 50, 50, 50);
      initialFitDoneRef.current = true;
    }
  }, [withCoords]);

  // 줌 컨트롤
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() - 1, { animate: true });
    }
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() + 1, { animate: true });
    }
  };
  const handleFitBounds = () => {
    if (mapInstanceRef.current && withCoords.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      withCoords.forEach((c) => bounds.extend(new kakao.maps.LatLng(c.lat!, c.lng!)));
      mapInstanceRef.current.setBounds(bounds, 50, 50, 50, 50);
    }
  };

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
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-140px)]">
        {sidoList.map((sido) => (
          <button
            key={sido}
            onClick={() => moveTo(sido)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition-all',
              selectedSido === sido
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/95 text-foreground/70 hover:bg-white backdrop-blur-sm border border-border/50'
            )}
          >
            {sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}
          </button>
        ))}
      </div>

      {/* 우측 컨트롤 */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        {/* 단지 리스트 */}
        <button
          onClick={() => {
            setShowList(!showList);
            setSelectedComplex(null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 px-3 py-1.5 text-[11px] font-medium shadow-sm hover:bg-white transition-all"
        >
          <List className="h-3.5 w-3.5" />
          {complexes.length}개 단지
        </button>

        {/* 줌 컨트롤 */}
        <div className="flex flex-col rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
          <button onClick={handleZoomIn} className="p-2 hover:bg-accent transition-colors border-b border-border/30">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={handleZoomOut} className="p-2 hover:bg-accent transition-colors border-b border-border/30">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button onClick={handleFitBounds} className="p-2 hover:bg-accent transition-colors" title="전체 보기">
            <Locate className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 지도 */}
      <div ref={mapRef} className="h-full w-full rounded-xl" />

      {/* 선택된 단지 패널 */}
      {selectedComplex && (
        <div className="absolute left-3 bottom-14 z-10 w-80 animate-fade-up">
          <Card className="shadow-lg border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{selectedComplex.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedComplex.dong}</p>
                </div>
                <button
                  onClick={() => setSelectedComplex(null)}
                  className="rounded-md p-1 hover:bg-accent transition-colors shrink-0 ml-2"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">평균 매매가</p>
                  <p className="text-base font-bold text-primary">
                    {formatPrice(selectedComplex.avgPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">평당가</p>
                  <p className="text-base font-bold">
                    {selectedComplex.avgPricePerPyeong.toLocaleString()}만
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">거래</p>
                  <p className="text-base font-bold">{selectedComplex._count.trades}건</p>
                </div>
              </div>
              <Link
                href={`/dashboard/apartments/${selectedComplex.id}`}
                className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                상세 보기 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 단지 리스트 사이드패널 */}
      {showList && (
        <div className="absolute right-3 top-24 z-10 w-80 max-h-[calc(100%-120px)] animate-fade-up">
          <Card className="shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3 bg-white sticky top-0">
                <h3 className="text-sm font-semibold">
                  수집된 단지
                </h3>
                <button
                  onClick={() => setShowList(false)}
                  className="rounded-md p-1 hover:bg-accent transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* 가격 범례 */}
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50/80 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#dc2626' }} />20억+</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#ea580c' }} />10억+</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#059669' }} />5억+</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#2563eb' }} />~5억</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {complexes
                  .sort((a, b) => b.avgPrice - a.avgPrice)
                  .map((c) => {
                    const color = getPriceColor(c.avgPrice);
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedComplex(c);
                          setShowList(false);
                          if (mapInstanceRef.current && c.lat && c.lng) {
                            mapInstanceRef.current.panTo(new kakao.maps.LatLng(c.lat, c.lng));
                            mapInstanceRef.current.setLevel(4, { animate: true });
                          }
                        }}
                        className="flex items-center gap-3 border-b last:border-0 px-4 py-2.5 hover:bg-accent/50 transition-colors w-full text-left"
                      >
                        <div
                          className="w-1.5 h-8 rounded-full shrink-0"
                          style={{ background: color.bg }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.dong} · {c._count.trades}건</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold" style={{ color: color.bg }}>
                            {formatPrice(c.avgPrice)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.avgPricePerPyeong.toLocaleString()}만/평
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 하단 상태바 */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <div className="rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 px-3 py-1.5 shadow-sm text-[11px] flex items-center gap-3">
          <span>
            <span className="font-semibold text-primary">{withCoords.length}</span> 단지
          </span>
          <span className="text-border">|</span>
          <span>줌 {zoomLevel}</span>
          {zoomLevel > 5 && (
            <>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">줌인하면 상세 마커 표시</span>
            </>
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
