'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useSWR from 'swr';
import { useKakaoLoaded, useKakaoError } from '@/components/kakao-map-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, List, X, ZoomIn, ZoomOut, Locate, Map as MapIcon, Layers, Satellite, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import type { MapComplex, Region } from '@/types/trade';
import { ComplexDetailPanel } from './complex-detail-panel';

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
  세종특별자치시: { lat: 36.48, lng: 127.0, level: 9 },
};

// 가격대별 마커 색상
function getPriceColor(avgPrice: number): { bg: string; text: string; border: string; label: string } {
  if (avgPrice >= 200000) return { bg: '#7c3aed', text: '#fff', border: '#6d28d9', label: '20억+' };   // 보라 (프리미엄)
  if (avgPrice >= 100000) return { bg: '#0369a1', text: '#fff', border: '#075985', label: '10억+' };   // 딥블루
  if (avgPrice >= 50000) return { bg: '#059669', text: '#fff', border: '#047857', label: '5억+' };     // 에메랄드
  return { bg: '#64748b', text: '#fff', border: '#475569', label: '~5억' };                            // 슬레이트
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
  const [selectedComplex, setSelectedComplex] = useState<MapComplex | null>(null);
  const [showList, setShowList] = useState(false);
  const [selectedSido, setSelectedSido] = useState('서울특별시');
  const [zoomLevel, setZoomLevel] = useState(8);
  const [showDistrict, setShowDistrict] = useState(false);
  const [mapType, setMapType] = useState<'road' | 'skyview'>('road');
  const [listSearch, setListSearch] = useState('');
  const [listSort, setListSort] = useState<'price' | 'trades'>('price');
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const selectedOverlayRef = useRef<HTMLDivElement | null>(null);

  // 패널 열림/닫힘 시 지도 리사이즈
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.relayout(), 100);
    }
  }, [selectedComplex]);

  const { data: regionData } = useSWR<{ data: Region[] }>('/api/market/regions', fetcher);
  const { data: complexData } = useSWR<{ data: MapComplex[] }>('/api/market/map/complexes', fetcher);

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
          background: 'rgba(3, 105, 161, 0.85)',
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
          background: 'rgba(124, 58, 237, 0.85)',
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
      content.dataset.complexId = complex.id;
      content.onmouseenter = () => {
        content.style.transform = 'scale(1.08) translateY(-2px)';
        content.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
      };
      content.onmouseleave = () => {
        content.style.transform = 'scale(1)';
        content.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      };
      // onclick + onpointerup 둘 다 등록 (모바일 + 데스크톱)
      const handleSelect = () => {
        if (selectedOverlayRef.current) {
          selectedOverlayRef.current.style.outline = 'none';
        }
        content.style.outline = '3px solid #fff';
        selectedOverlayRef.current = content;
        setSelectedComplex(complex);
        setShowList(false);
      };
      content.onclick = handleSelect;
      content.ontouchend = (e) => {
        e.preventDefault();
        handleSelect();
      };

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        clickable: true,
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

    // 줌 레벨에 따라 오버레이 표시/숨기기 + 화면 내 단지 추적
    function updateOverlayVisibility() {
      const level = map.getLevel();
      const bounds = map.getBounds();
      const visible = new Set<string>();
      overlaysRef.current.forEach((overlay, idx) => {
        const complex = withCoords[idx];
        if (!complex?.lat || !complex?.lng) return;
        const pos = new kakao.maps.LatLng(complex.lat, complex.lng);
        const inBounds = bounds.contain(pos);
        if (inBounds) visible.add(complex.id);
        if (level <= 5 && inBounds) {
          overlay.setMap(map);
        } else {
          overlay.setMap(null);
        }
      });
      const ids = Array.from(visible).sort();
      setVisibleIds((prev) => {
        if (prev.length === ids.length && prev.every((v, i) => v === ids[i])) return prev;
        return ids;
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

  // 지적편집도 토글
  const toggleDistrict = () => {
    if (!mapInstanceRef.current) return;
    if (showDistrict) {
      mapInstanceRef.current.removeOverlayMapTypeId(kakao.maps.MapTypeId.USE_DISTRICT);
    } else {
      mapInstanceRef.current.addOverlayMapTypeId(kakao.maps.MapTypeId.USE_DISTRICT);
    }
    setShowDistrict(!showDistrict);
  };

  // 지도 타입 전환 (일반 ↔ 스카이뷰)
  const toggleMapType = () => {
    if (!mapInstanceRef.current) return;
    if (mapType === 'road') {
      mapInstanceRef.current.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
      setMapType('skyview');
    } else {
      mapInstanceRef.current.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
      setMapType('road');
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
      <div className="absolute top-3 left-3 z-10 flex gap-1.5 max-w-[calc(100%-100px)] md:max-w-[calc(100%-140px)] overflow-x-auto scrollbar-none md:flex-wrap">
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

        {/* 지도 타입 + 지적편집도 */}
        <div className="flex flex-col rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
          <button
            onClick={toggleMapType}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors border-b border-border/30',
              mapType === 'skyview' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
            )}
          >
            {mapType === 'road' ? <Satellite className="h-3.5 w-3.5" /> : <MapIcon className="h-3.5 w-3.5" />}
            {mapType === 'road' ? '위성지도' : '일반지도'}
          </button>
          <button
            onClick={toggleDistrict}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors',
              showDistrict ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            지적편집도
            {showDistrict && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex flex-col rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
          <button onClick={handleZoomIn} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-accent transition-colors border-b border-border/30">
            <ZoomIn className="h-3.5 w-3.5" />
            확대
          </button>
          <button onClick={handleZoomOut} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-accent transition-colors border-b border-border/30">
            <ZoomOut className="h-3.5 w-3.5" />
            축소
          </button>
          <button onClick={handleFitBounds} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-accent transition-colors">
            <Locate className="h-3.5 w-3.5" />
            전체 보기
          </button>
        </div>
      </div>

      {/* 지도 */}
      <div
        ref={mapRef}
        className={cn(
          'h-full w-full rounded-xl transition-all',
          selectedComplex && 'md:ml-[380px]'
        )}
        style={selectedComplex ? { width: undefined } : undefined}
      />

      {/* 상세 패널 — 데스크톱: 좌측, 모바일: 하단 시트 */}
      {selectedComplex && (
        <>
          {/* 데스크톱 */}
          <div className="hidden md:block">
            <ComplexDetailPanel
              complexId={selectedComplex.id}
              onClose={() => setSelectedComplex(null)}
            />
          </div>
          {/* 모바일 — 하단 시트 */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-20 max-h-[60vh] overflow-y-auto bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] animate-fade-up">
            <div className="sticky top-0 flex items-center justify-center py-2 bg-white rounded-t-2xl">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <ComplexDetailPanel
              complexId={selectedComplex.id}
              onClose={() => setSelectedComplex(null)}
            />
          </div>
        </>
      )}

      {/* 단지 리스트 사이드패널 */}
      {showList && (
        <div className="absolute right-3 top-24 z-10 w-80 max-h-[calc(100%-120px)] animate-fade-up">
          <Card className="shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {/* 헤더 */}
              <div className="flex items-center justify-between border-b px-4 py-2.5 bg-white">
                <h3 className="text-sm font-semibold">단지 목록</h3>
                <button
                  onClick={() => setShowList(false)}
                  className="rounded-md p-1 hover:bg-accent transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* 검색 + 정렬 */}
              <div className="px-3 py-2 border-b space-y-2 bg-slate-50/80">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="단지명 검색..."
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    className="w-full rounded-md border bg-white py-1.5 pl-8 pr-3 text-[12px] outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setListSort('price')}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                      listSort === 'price' ? 'bg-primary text-primary-foreground' : 'bg-white border hover:bg-accent'
                    )}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5" />
                    가격순
                  </button>
                  <button
                    onClick={() => setListSort('trades')}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                      listSort === 'trades' ? 'bg-primary text-primary-foreground' : 'bg-white border hover:bg-accent'
                    )}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5" />
                    거래수순
                  </button>
                  {/* 범례 */}
                  <div className="flex items-center gap-1.5 ml-auto text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#7c3aed' }} />20억+</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#0369a1' }} />10억+</span>
                    <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#059669' }} />5억+</span>
                  </div>
                </div>
              </div>

              {/* 리스트 */}
              <div className="max-h-[350px] overflow-y-auto">
                {(() => {
                  const filtered = complexes
                    .filter((c) => {
                      if (listSearch && !c.name.includes(listSearch) && !c.dong.includes(listSearch)) return false;
                      if (visibleIds.length > 0 && !visibleIds.includes(c.id)) return false;
                      return true;
                    })
                    .sort((a, b) =>
                      listSort === 'price' ? b.avgPrice - a.avgPrice : b._count.trades - a._count.trades
                    );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        {listSearch ? `"${listSearch}" 검색 결과 없음` : '현재 지도 영역에 단지가 없습니다'}
                      </div>
                    );
                  }

                  return filtered.map((c) => {
                    const color = getPriceColor(c.avgPrice);
                    const isSelected = selectedComplex?.id === c.id;
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
                        className={cn(
                          'flex items-center gap-3 border-b last:border-0 px-4 py-2.5 transition-colors w-full text-left',
                          isSelected ? 'bg-primary/5' : 'hover:bg-accent/50'
                        )}
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
                  });
                })()}
              </div>

              {/* 하단 카운트 */}
              <div className="border-t px-4 py-2 bg-slate-50/80 text-[10px] text-muted-foreground">
                현재 지도 영역: {visibleIds.length}개 단지
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
