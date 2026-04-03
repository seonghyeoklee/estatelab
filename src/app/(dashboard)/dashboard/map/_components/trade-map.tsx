'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useKakaoLoaded, useKakaoError } from '@/components/kakao-map-provider';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Building2, List, X, ZoomIn, ZoomOut, Locate, Map as MapIcon, Layers, Satellite, Search, ArrowUpDown, MapPinned, Eye, GitCompareArrows } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import type { MapComplex, Region } from '@/types/trade';
import { ComplexDetailPanel } from './complex-detail-panel';
import { MapSearchBar } from './map-search-bar';


// 주변시설 카테고리 설정
const NEARBY_CATEGORIES: Record<string, { label: string; color: string; border: string }> = {
  subway: { label: '지하철', color: '#2563eb', border: '#1d4ed8' },
  school: { label: '학교', color: '#d97706', border: '#b45309' },
  convenience: { label: '편의점', color: '#059669', border: '#047857' },
  mart: { label: '마트', color: '#7c3aed', border: '#6d28d9' },
  hospital: { label: '병원', color: '#dc2626', border: '#b91c1c' },
  cafe: { label: '카페', color: '#92400e', border: '#78350f' },
  bank: { label: '은행', color: '#0369a1', border: '#075985' },
};

// 주변시설 마커 생성
function createNearbyMarker(opts: {
  name: string;
  distance: number;
  color: string;
  border: string;
}): HTMLDivElement {
  const { name, distance, color, border } = opts;
  const distLabel = distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`;
  const el = document.createElement('div');
  el.style.cssText = `
    display: flex;
    align-items: center;
    gap: 4px;
    background: white;
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 11px;
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    border: 1.5px solid ${border};
    pointer-events: none;
  `;
  el.innerHTML = `
    <span style="color:#374151;font-weight:600;max-width:70px;overflow:hidden;text-overflow:ellipsis">${name}</span>
    <span style="color:${color};font-weight:700;font-size:10px">${distLabel}</span>
  `;
  return el;
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

// 단일 컬러 마커 — 시그니처 emerald
const MARKER_COLOR = { bg: '#059669', text: '#fff', border: '#047857' };
const MARKER_COLOR_CLUSTER = { bg: '#065f46', text: '#fff', border: '#064e3b' };


// 지역 그룹 (동/구 단위 집계)
interface AreaCluster {
  label: string;
  complexes: MapComplex[];
  avgPrice: number;
  lat: number;
  lng: number;
  count: number;
}

function groupByKey(complexes: MapComplex[], keyFn: (c: MapComplex) => string, labelFn: (c: MapComplex) => string): AreaCluster[] {
  const map = new Map<string, MapComplex[]>();
  for (const c of complexes) {
    if (!c.lat || !c.lng) continue;
    const key = keyFn(c);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.values()).map((items) => {
    const totalPrice = items.reduce((s, c) => s + c.avgPrice, 0);
    const avgLat = items.reduce((s, c) => s + c.lat!, 0) / items.length;
    const avgLng = items.reduce((s, c) => s + c.lng!, 0) / items.length;
    return {
      label: labelFn(items[0]),
      complexes: items,
      avgPrice: Math.round(totalPrice / items.length),
      lat: avgLat,
      lng: avgLng,
      count: items.length,
    };
  });
}

// 동별 그룹
function groupByDong(complexes: MapComplex[]): AreaCluster[] {
  return groupByKey(
    complexes,
    (c) => `${c.regionCode}:${c.dong}`,
    (c) => c.dong
  );
}

// 구(시군구)별 그룹 — 줌 아웃 시 사용
function groupByGu(complexes: MapComplex[], regions: Region[]): AreaCluster[] {
  const regionMap = new Map(regions.map((r) => [r.code, r]));
  return groupByKey(
    complexes,
    (c) => c.regionCode,
    (c) => {
      const r = regionMap.get(c.regionCode);
      return r ? r.sigungu.replace(/시$|군$/, '') : c.regionCode;
    }
  );
}

// 가격 라벨 엘리먼트 생성 — 단일 컬러, 가격 텍스트 강조
function createPriceLabel(opts: {
  title: string;
  price: string;
  subtitle?: string;
  color: { bg: string; text: string; border: string };
  size: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}): HTMLDivElement {
  const { title, price, subtitle, color, size, onClick } = opts;

  const pad = size === 'lg' ? '5px 12px' : size === 'md' ? '4px 10px' : '3px 8px';
  const titleSize = size === 'lg' ? '12px' : size === 'md' ? '11px' : '10px';
  const priceSize = size === 'lg' ? '14px' : size === 'md' ? '13px' : '11px';
  const radius = '10px';
  const maxTitleWidth = size === 'lg' ? '120px' : '90px';

  const el = document.createElement('div');
  el.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    background: ${color.bg};
    color: ${color.text};
    padding: ${pad};
    border-radius: ${radius};
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 1px 6px rgba(0,0,0,0.18);
    border: 1.5px solid ${color.border};
    transition: transform 0.15s, box-shadow 0.15s;
    position: relative;
  `;

  const titleSpan = document.createElement('span');
  titleSpan.style.cssText = `font-size:${titleSize};font-weight:600;opacity:0.95;max-width:${maxTitleWidth};overflow:hidden;text-overflow:ellipsis;line-height:1.2`;
  titleSpan.textContent = title;
  el.appendChild(titleSpan);

  const priceSpan = document.createElement('span');
  priceSpan.style.cssText = `font-size:${priceSize};font-weight:800;line-height:1.3;letter-spacing:-0.02em`;
  priceSpan.textContent = price;
  el.appendChild(priceSpan);

  if (subtitle) {
    const subSpan = document.createElement('span');
    subSpan.style.cssText = 'font-size:8px;opacity:0.65;line-height:1';
    subSpan.textContent = subtitle;
    el.appendChild(subSpan);
  }

  // NEW 뱃지 슬롯 (외부에서 추가)
  el.dataset.badgeSlot = 'true';

  // 하단 꼬리
  const tail = document.createElement('div');
  tail.style.cssText = `position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid ${color.border};`;
  el.appendChild(tail);
  const tailInner = document.createElement('div');
  tailInner.style.cssText = `position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid ${color.bg};`;
  el.appendChild(tailInner);

  el.onmouseenter = () => {
    el.style.transform = 'scale(1.08) translateY(-2px)';
    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
    el.style.zIndex = '10';
  };
  el.onmouseleave = () => {
    if (!el.classList.contains('marker-selected')) {
      el.style.transform = 'scale(1)';
      el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.18)';
      el.style.zIndex = '';
    }
  };

  if (onClick) {
    el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); onClick(); });
  }

  return el;
}

export function TradeMap({ focusComplexId }: { focusComplexId?: string | null }) {
  const kakaoLoaded = useKakaoLoaded();
  const kakaoError = useKakaoError();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  // 단지별 오버레이 (줌 ≤ 5)
  const complexOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  // 동별 집계 오버레이 (줌 6~7)
  const dongOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  // 구별 집계 오버레이 (줌 ≥ 8)
  const guOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const initialFitDoneRef = useRef(false);
  const listenersAttachedRef = useRef(false);

  // 패널 오프셋 보정 panTo — 좌측 패널(420px) / 모바일 하단 시트 감안
  const panToWithOffset = useCallback((lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const position = new kakao.maps.LatLng(lat, lng);
    const proj = map.getProjection();
    const point = proj.pointFromCoords(position);
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      point.y += window.innerHeight * 0.2;
    } else {
      point.x -= 210;
    }
    const adjusted = proj.coordsFromPoint(point);
    map.panTo(adjusted);
  }, []);
  // 주변시설 오버레이 + 반경 원
  const nearbyOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const radiusCircleRef = useRef<kakao.maps.Circle | null>(null);
  // 학군 시각화
  const schoolOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const schoolCirclesRef = useRef<kakao.maps.Circle[]>([]);
  const schoolLinesRef = useRef<kakao.maps.Polyline[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<string>('overview');
  // 로드뷰
  const roadviewRef = useRef<HTMLDivElement>(null);
  const roadviewInstanceRef = useRef<kakao.maps.Roadview | null>(null);
  const [showRoadview, setShowRoadview] = useState(false);
  const [roadviewAvailable, setRoadviewAvailable] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<MapComplex | null>(null);
  const [showNearby, setShowNearby] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedSido, setSelectedSido] = useState('서울특별시');
  const [zoomLevel, setZoomLevel] = useState(8);
  const [showDistrict, setShowDistrict] = useState(false);
  const [mapType, setMapType] = useState<'road' | 'skyview'>('road');
  const [listSearch, setListSearch] = useState('');
  const [listSort, setListSort] = useState<'price' | 'trades'>('price');
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const selectedOverlayRef = useRef<HTMLDivElement | null>(null);
  const highlightCircleRef = useRef<kakao.maps.Circle | null>(null);

  // 선택 단지 하이라이트 원
  useEffect(() => {
    if (highlightCircleRef.current) {
      highlightCircleRef.current.setMap(null);
      highlightCircleRef.current = null;
    }

    const map = mapInstanceRef.current;
    if (!map || !selectedComplex?.lat || !selectedComplex?.lng) return;

    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(selectedComplex.lat, selectedComplex.lng),
      radius: 60,
      strokeWeight: 2,
      strokeColor: '#059669',
      strokeOpacity: 0.6,
      strokeStyle: 'solid',
      fillColor: '#059669',
      fillOpacity: 0.08,
    });
    circle.setMap(map);
    highlightCircleRef.current = circle;
  }, [selectedComplex]);

  // 패널 열림/닫힘 시 지도 리사이즈
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.relayout(), 100);
    }
  }, [selectedComplex, showRoadview]);

  // 로드뷰: 선택 단지 변경 시 panoId 확인
  const prevComplexIdRef = useRef<string | null>(null);
  if (selectedComplex?.id !== prevComplexIdRef.current) {
    prevComplexIdRef.current = selectedComplex?.id ?? null;
    // 단지 변경 시 로드뷰 리셋 (렌더 중 setState 허용 — 조건부)
    if (showRoadview) setShowRoadview(false);
    if (roadviewAvailable) setRoadviewAvailable(false);
  }
  useEffect(() => {
    if (!selectedComplex?.lat || !selectedComplex?.lng || !kakaoLoaded) return;
    const client = new kakao.maps.RoadviewClient();
    const pos = new kakao.maps.LatLng(selectedComplex.lat, selectedComplex.lng);
    client.getNearestPanoId(pos, 150, (panoId) => {
      setRoadviewAvailable(panoId !== null && panoId > 0);
    });
  }, [selectedComplex, kakaoLoaded]);

  // 로드뷰: 열기/닫기
  useEffect(() => {
    if (!showRoadview || !roadviewRef.current || !selectedComplex?.lat || !selectedComplex?.lng) {
      roadviewInstanceRef.current = null;
      return;
    }

    const pos = new kakao.maps.LatLng(selectedComplex.lat, selectedComplex.lng);
    const rv = new kakao.maps.Roadview(roadviewRef.current);
    roadviewInstanceRef.current = rv;

    const client = new kakao.maps.RoadviewClient();
    client.getNearestPanoId(pos, 150, (panoId) => {
      if (panoId) {
        rv.setPanoId(panoId, pos);
      } else {
        setShowRoadview(false);
        setRoadviewAvailable(false);
      }
    });
  }, [showRoadview, selectedComplex]);

  const { data: regionData } = useSWR<{ data: Region[] }>('/api/market/regions');
  const { data: complexData } = useSWR<{ data: MapComplex[] }>('/api/market/map/complexes');

  // 선택된 단지 주변시설 데이터
  interface NearbyPlace { id: string; name: string; category: string; distance: number; lat: number; lng: number; }
  interface NearbySummary { key: string; label: string; count: number; nearest: NearbyPlace | null; }
  const { data: nearbyData } = useSWR<{ data: { summary: NearbySummary[]; places: Record<string, NearbyPlace[]> } }>(
    selectedComplex ? `/api/market/apartments/${selectedComplex.id}/nearby?radius=1000` : null,
  );

  const complexes = useMemo(() => complexData?.data ?? [], [complexData?.data]);
  const withCoords = useMemo(() => complexes.filter((c) => c.lat && c.lng), [complexes]);

  const sidoList = regionData?.data ? [...new Set(regionData.data.map((r) => r.sido))] : [];

  const regions = useMemo(() => regionData?.data ?? [], [regionData?.data]);

  // 동별/구별 그룹 메모이제이션
  const dongGroups = useMemo(() => groupByDong(withCoords), [withCoords]);
  const guGroups = useMemo(() => groupByGu(withCoords, regions), [withCoords, regions]);

  // focusComplexId로 진입 시 해당 단지 선택 + 포커싱
  const [focusApplied, setFocusApplied] = useState(false);
  const handleFocusComplex = useCallback((target: MapComplex) => {
    setSelectedComplex(target);
    setShowList(false);
    const map = mapInstanceRef.current;
    if (map && target.lat && target.lng) {
      map.setLevel(4, { animate: false });
      setTimeout(() => panToWithOffset(target.lat!, target.lng!), 200);
    }
  }, [panToWithOffset]);

  // focusComplexId effect — 데이터 로드 후 1회 실행
  useEffect(() => {
    if (!focusComplexId || focusApplied || withCoords.length === 0) return;
    const target = withCoords.find((c) => c.id === focusComplexId);
    if (target?.lat && target?.lng) {
      const timer = setTimeout(() => {
        setFocusApplied(true);
        handleFocusComplex(target);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [focusComplexId, focusApplied, withCoords, handleFocusComplex]);

  // 주변시설 오버레이 표시/제거
  useEffect(() => {
    // 기존 오버레이 정리
    nearbyOverlaysRef.current.forEach((o) => o.setMap(null));
    nearbyOverlaysRef.current = [];
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
      radiusCircleRef.current = null;
    }

    const map = mapInstanceRef.current;
    if (!map || !selectedComplex?.lat || !selectedComplex?.lng || !nearbyData?.data || (!showNearby && activeDetailTab !== 'nearby')) return;

    const places = nearbyData.data.places;
    const complexPos = new kakao.maps.LatLng(selectedComplex.lat, selectedComplex.lng);

    // 반경 원 (1km) — 튀지 않는 slate 계열
    const circle = new kakao.maps.Circle({
      center: complexPos,
      radius: 1000,
      strokeWeight: 1.5,
      strokeColor: '#94a3b8',
      strokeOpacity: 0.5,
      strokeStyle: 'dashed',
      fillColor: '#94a3b8',
      fillOpacity: 0.04,
    });
    circle.setMap(map);
    radiusCircleRef.current = circle;

    // 카테고리별 주요 시설만 표시 (가까운 순 최대 3개씩)
    for (const [key, items] of Object.entries(places)) {
      const cat = NEARBY_CATEGORIES[key];
      if (!cat || !items) continue;

      const top = (items as NearbyPlace[]).slice(0, 3);
      for (const place of top) {
        const position = new kakao.maps.LatLng(place.lat, place.lng);
        const content = createNearbyMarker({
          name: place.name,
          distance: place.distance,
          color: cat.color,
          border: cat.border,
        });

        const overlay = new kakao.maps.CustomOverlay({
          position,
          content,
          clickable: false,
          yAnchor: 1.3,
          zIndex: 5,
        });
        overlay.setMap(map);
        nearbyOverlaysRef.current.push(overlay);
      }
    }
  }, [selectedComplex, nearbyData, showNearby, activeDetailTab]);

  // 학군 지도 데이터
  interface SchoolPlace { id: string; name: string; distance: number; lat: number; lng: number; schoolType: 'elementary' | 'middle' | 'high'; }
  const { data: schoolMapData } = useSWR<{ data: { schools: { elementary: SchoolPlace[]; middle: SchoolPlace[]; high: SchoolPlace[] }; grade: string } }>(
    selectedComplex ? `/api/market/apartments/${selectedComplex.id}/schools?radius=1500` : null,
  );

  // 학군 시각화 — 동심원 + 연결선 + 학교 마커
  useEffect(() => {
    // 정리
    schoolOverlaysRef.current.forEach((o) => o.setMap(null));
    schoolOverlaysRef.current = [];
    schoolCirclesRef.current.forEach((c) => c.setMap(null));
    schoolCirclesRef.current = [];
    schoolLinesRef.current.forEach((l) => l.setMap(null));
    schoolLinesRef.current = [];

    const map = mapInstanceRef.current;
    if (!map || !selectedComplex?.lat || !selectedComplex?.lng || !schoolMapData?.data) return;

    const complexPos = new kakao.maps.LatLng(selectedComplex.lat, selectedComplex.lng);

    // 통일 컬러: primary emerald 계열
    const SCHOOL_COLOR = '#059669';

    // 1) 동심원 — 300m / 500m / 800m (같은 색, 굵기+투명도로 구분)
    const rings = [
      { radius: 300, weight: 3, opacity: 0.7, fill: 0.06, label: '300m · 도보 4분' },
      { radius: 500, weight: 2.5, opacity: 0.5, fill: 0.04, label: '500m · 도보 7분' },
      { radius: 800, weight: 2, opacity: 0.35, fill: 0.02, label: '800m · 도보 10분' },
    ];

    for (const ring of rings) {
      const circle = new kakao.maps.Circle({
        center: complexPos,
        radius: ring.radius,
        strokeWeight: ring.weight,
        strokeColor: SCHOOL_COLOR,
        strokeOpacity: ring.opacity,
        strokeStyle: 'solid',
        fillColor: SCHOOL_COLOR,
        fillOpacity: ring.fill,
      });
      circle.setMap(map);
      schoolCirclesRef.current.push(circle);

      // 거리 라벨 — 배경 없이 텍스트만
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        color: ${SCHOOL_COLOR};
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        border: 1.5px solid ${SCHOOL_COLOR};
        opacity: ${ring.opacity + 0.2};
      `;
      labelEl.textContent = ring.label;
      const labelPos = new kakao.maps.LatLng(
        selectedComplex.lat + (ring.radius / 111320),
        selectedComplex.lng
      );
      const labelOverlay = new kakao.maps.CustomOverlay({
        position: labelPos,
        content: labelEl,
        clickable: false,
        yAnchor: 0.5,
        zIndex: 4,
      });
      labelOverlay.setMap(map);
      schoolOverlaysRef.current.push(labelOverlay);
    }

    // 2) 학교 마커 + 연결선 (모두 같은 컬러, 거리에 따라 굵기/투명도 차이)
    const allSchools = [
      ...schoolMapData.data.schools.elementary,
      ...schoolMapData.data.schools.middle,
      ...schoolMapData.data.schools.high,
    ];

    for (const school of allSchools) {
      const pos = new kakao.maps.LatLng(school.lat, school.lng);
      const walkMin = Math.ceil(school.distance / 80);
      const isNear = school.distance <= 500;

      // 연결선 — 실선, 거리에 따라 굵기 차이
      const line = new kakao.maps.Polyline({
        path: [complexPos, pos],
        strokeWeight: isNear ? 3 : 2,
        strokeColor: SCHOOL_COLOR,
        strokeOpacity: isNear ? 0.7 : 0.3,
        strokeStyle: 'solid',
      });
      line.setMap(map);
      schoolLinesRef.current.push(line);

      // 학교 마커 — 흰 배경 + emerald 테두리
      const el = document.createElement('div');
      el.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        background: white;
        color: #374151;
        padding: 4px 10px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 1px 6px rgba(0,0,0,0.15);
        border: 2px solid ${isNear ? SCHOOL_COLOR : '#94a3b8'};
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      `;
      const shortName = school.name.replace(/^서울/, '').replace(/초등학교$/, '초').replace(/중학교$/, '중').replace(/고등학교$/, '고');
      el.innerHTML = `
        <span style="color:${SCHOOL_COLOR};font-weight:700">${shortName}</span>
        <span style="color:${isNear ? SCHOOL_COLOR : '#94a3b8'};font-size:10px;font-weight:600">도보 ${walkMin}분</span>
      `;

      el.onmouseenter = () => {
        el.style.transform = 'scale(1.05) translateY(-1px)';
        el.style.boxShadow = '0 3px 12px rgba(0,0,0,0.2)';
      };
      el.onmouseleave = () => {
        if (!el.classList.contains('marker-selected')) {
          el.style.transform = 'scale(1)';
          el.style.boxShadow = '0 1px 6px rgba(0,0,0,0.15)';
        }
      };
      el.onmousedown = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.school-marker-active').forEach((prev) => {
          prev.classList.remove('school-marker-active', 'marker-selected');
          (prev as HTMLElement).style.outline = '';
          (prev as HTMLElement).style.transform = 'scale(1)';
        });
        el.classList.add('school-marker-active', 'marker-bounce');
        el.style.outline = `3px solid ${SCHOOL_COLOR}`;
        el.style.outlineOffset = '2px';
        setTimeout(() => {
          el.classList.remove('marker-bounce');
          el.classList.add('marker-selected');
        }, 600);
      };
      el.classList.add('school-marker');

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        clickable: true,
        yAnchor: 1.3,
        zIndex: 5,
      });
      overlay.setMap(map);
      schoolOverlaysRef.current.push(overlay);
    }

  }, [selectedComplex, schoolMapData]);

  // 지도 초기화
  useEffect(() => {
    if (!kakaoLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center = SIDO_CENTERS[selectedSido] || SIDO_CENTERS['서울특별시'];
    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: center.level,
    });
    mapInstanceRef.current = map;

    kakao.maps.event.addListener(map, 'zoom_changed', () => {
      setZoomLevel(map.getLevel());
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

  // 오버레이 생성 (데이터 변경 시)
  useEffect(() => {
    if (!mapInstanceRef.current || withCoords.length === 0) return;
    const map = mapInstanceRef.current;

    // 기존 오버레이 정리
    complexOverlaysRef.current.forEach((o) => o.setMap(null));
    complexOverlaysRef.current = [];
    dongOverlaysRef.current.forEach((o) => o.setMap(null));
    dongOverlaysRef.current = [];
    guOverlaysRef.current.forEach((o) => o.setMap(null));
    guOverlaysRef.current = [];

    // 1) 단지별 가격 라벨 오버레이 (줌 ≤ 5)
    for (const complex of withCoords) {
      const position = new kakao.maps.LatLng(complex.lat!, complex.lng!);
      const color = MARKER_COLOR;

      // 면적 필터 적용 시 해당 면적 가격, 없으면 전체 평균
      const areaData = areaFilter && complex.areas
        ? complex.areas.find((a) => a.area === areaFilter)
        : null;
      if (areaFilter && !areaData) continue; // 해당 면적 거래 없으면 마커 숨김
      const displayPrice = areaData ? areaData.avgPrice : complex.avgPrice;
      const displayPpp = areaData ? areaData.avgPpp : complex.avgPricePerPyeong;
      const priceLabel = formatPrice(displayPrice);

      const handleSelect = () => {
        // 비교 모드
        if (compareMode) {
          setCompareIds((prev) => {
            if (prev.includes(complex.id)) return prev.filter((id) => id !== complex.id);
            if (prev.length >= 2) return [prev[1], complex.id];
            return [...prev, complex.id];
          });
          return;
        }
        // 이전 선택 해제
        if (selectedOverlayRef.current) {
          selectedOverlayRef.current.classList.remove('marker-selected');
          selectedOverlayRef.current.style.outline = 'none';
          selectedOverlayRef.current.style.border = '';
          selectedOverlayRef.current.style.zIndex = '';
        }
        setSelectedComplex(complex);
        setShowList(false);
        setActiveDetailTab('overview');
        // 바운스 + 선택 표시 + z-index 최상위
        content.classList.remove('marker-bounce');
        void content.offsetWidth;
        content.classList.add('marker-bounce');
        content.style.zIndex = '9999';
        setTimeout(() => {
          content.classList.remove('marker-bounce');
          content.classList.add('marker-selected');
        }, 600);
        content.style.outline = '3px solid white';
        content.style.border = `2px solid ${color.border}`;
        selectedOverlayRef.current = content;
        setTimeout(() => panToWithOffset(complex.lat!, complex.lng!), 50);
      };

      const pppLabel = displayPpp > 0
        ? `${displayPpp.toLocaleString()}만/평`
        : undefined;

      const content = createPriceLabel({
        title: complex.name,
        price: priceLabel,
        subtitle: pppLabel,
        color,
        size: 'md',
        onClick: handleSelect,
      });
      content.dataset.complexId = complex.id;

      // NEW 뱃지 — 최근 30일 내 거래
      if (complex.latestDealDate) {
        const daysDiff = (Date.now() - new Date(complex.latestDealDate).getTime()) / 86400000;
        if (daysDiff <= 30) {
          const badge = document.createElement('span');
          badge.style.cssText = `
            position:absolute;top:-6px;right:-6px;
            background:#ef4444;color:white;font-size:7px;font-weight:800;
            padding:1px 4px;border-radius:6px;line-height:1.3;
            box-shadow:0 1px 3px rgba(0,0,0,0.2);
          `;
          badge.textContent = 'NEW';
          content.appendChild(badge);
        }
      }

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        clickable: true,
        yAnchor: 1.6,
        zIndex: 3,
      });
      complexOverlaysRef.current.push(overlay);
    }

    // 2) 동별 집계 가격 라벨 오버레이 (줌 6~7)
    for (const group of dongGroups) {
      const position = new kakao.maps.LatLng(group.lat, group.lng);
      const color = MARKER_COLOR_CLUSTER;
      const priceLabel = formatPrice(group.avgPrice);

      const handleClick = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setLevel(5, { animate: true });
          setTimeout(() => mapInstanceRef.current?.panTo(position), 300);
        }
      };

      const content = createPriceLabel({
        title: group.label,
        price: priceLabel,
        subtitle: `${group.count}개 단지`,
        color,
        size: 'md',
        onClick: handleClick,
      });

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        clickable: true,
        yAnchor: 1.6,
        zIndex: 2,
      });
      dongOverlaysRef.current.push(overlay);
    }

    // 3) 구별 집계 오버레이 (줌 ≥ 8) — 큰 라벨로 구 평균가 + 총 단지 수
    for (const group of guGroups) {
      const position = new kakao.maps.LatLng(group.lat, group.lng);
      const color = MARKER_COLOR_CLUSTER;
      const priceLabel = formatPrice(group.avgPrice);

      const handleClick = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setLevel(6, { animate: true });
          setTimeout(() => mapInstanceRef.current?.panTo(position), 300);
        }
      };

      const content = createPriceLabel({
        title: group.label,
        price: priceLabel,
        subtitle: `${group.count}개 단지`,
        color,
        size: 'lg',
        onClick: handleClick,
      });

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        clickable: true,
        yAnchor: 1.3,
        zIndex: 1,
      });
      guOverlaysRef.current.push(overlay);
    }

    // 줌 레벨에 따라 3단계 오버레이 전환
    function updateOverlayVisibility() {
      const level = map.getLevel();
      const bounds = map.getBounds();
      const visible = new Set<string>();

      // 줌 ≤ 5: 단지별 라벨
      complexOverlaysRef.current.forEach((overlay, idx) => {
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

      // 줌 6~7: 동별 집계 라벨
      dongOverlaysRef.current.forEach((overlay, idx) => {
        const group = dongGroups[idx];
        if (!group) return;
        const pos = new kakao.maps.LatLng(group.lat, group.lng);
        const inBounds = bounds.contain(pos);
        if (level >= 6 && level <= 7 && inBounds) {
          overlay.setMap(map);
        } else {
          overlay.setMap(null);
        }
      });

      // 줌 ≥ 8: 구별 집계 라벨
      guOverlaysRef.current.forEach((overlay, idx) => {
        const group = guGroups[idx];
        if (!group) return;
        const pos = new kakao.maps.LatLng(group.lat, group.lng);
        const inBounds = bounds.contain(pos);
        if (level >= 8 && inBounds) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCoords, dongGroups, guGroups, areaFilter, compareMode]);

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
      {/* 지도 내 검색 */}
      <MapSearchBar
        complexes={complexes}
        onSelect={(c) => {
          if (c.lat && c.lng && mapInstanceRef.current) {
            mapInstanceRef.current.setLevel(4, { animate: true });
            mapInstanceRef.current.panTo(new kakao.maps.LatLng(c.lat, c.lng));
          }
          setSelectedComplex(c);
          setShowList(false);
        }}
      />

      {/* 시도 선택 탭 */}
      <div className="absolute top-14 left-3 z-[20] flex gap-1.5 max-w-[calc(100%-100px)] md:max-w-[calc(100%-140px)] overflow-x-auto scrollbar-none md:flex-wrap pointer-events-none">
        {sidoList.map((sido) => (
          <button
            key={sido}
            onClick={() => moveTo(sido)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition-all pointer-events-auto',
              selectedSido === sido
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/95 text-foreground/70 hover:bg-white backdrop-blur-sm border border-border/50'
            )}
          >
            {sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}
          </button>
        ))}
      </div>

      {/* 면적 필터 + 비교 모드 */}
      <div className="absolute top-[88px] left-3 z-[20] flex items-center gap-1.5 pointer-events-none">
        {/* 면적 필터 */}
        <div className="flex gap-1 pointer-events-auto">
          {[
            { label: '전체', value: null },
            { label: '~59㎡', value: 59 },
            { label: '84㎡', value: 84 },
            { label: '114㎡', value: 114 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => setAreaFilter(opt.value)}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-medium shadow-sm transition-all',
                areaFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/95 text-foreground/70 hover:bg-white backdrop-blur-sm border border-border/50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 비교 모드 */}
        <button
          onClick={() => {
            setCompareMode(!compareMode);
            if (compareMode) setCompareIds([]);
          }}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[10px] font-medium shadow-sm transition-all pointer-events-auto',
            compareMode
              ? 'bg-primary text-primary-foreground'
              : 'bg-white/95 text-foreground/70 hover:bg-white backdrop-blur-sm border border-border/50'
          )}
        >
          <GitCompareArrows className="h-3 w-3 inline mr-1" />
          비교{compareIds.length > 0 ? ` (${compareIds.length})` : ''}
        </button>

        {/* 비교 이동 */}
        {compareIds.length === 2 && (
          <Link
            href={`/dashboard/compare?a=${compareIds[0]}&b=${compareIds[1]}`}
            className="rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[10px] font-medium shadow-sm pointer-events-auto"
          >
            비교하기 →
          </Link>
        )}
      </div>

      {/* 우측 컨트롤 */}
      <div className="absolute top-3 right-3 z-[20] flex flex-col gap-1.5 pointer-events-none [&>*]:pointer-events-auto">
        {/* 단지 리스트 */}
        <button
          onClick={() => {
            setShowList(!showList);
            setSelectedComplex(null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 px-3 py-1.5 text-[11px] font-medium shadow-sm hover:bg-white transition-all"
        >
          <List className="h-3.5 w-3.5" />
          목록 보기
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
          <button
            onClick={() => setShowNearby(!showNearby)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors border-t border-border/30',
              showNearby && selectedComplex ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
            )}
          >
            <MapPinned className="h-3.5 w-3.5" />
            주변시설
            {showNearby && selectedComplex && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
          {selectedComplex && roadviewAvailable && (
            <button
              onClick={() => setShowRoadview(!showRoadview)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors border-t border-border/30',
                showRoadview ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              로드뷰
              {showRoadview && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          )}
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

      {/* 좌측 하단: 뷰 모드 + 단지 수 */}
      <div className="absolute bottom-3 left-3 z-[20] pointer-events-none">
        <div className="flex items-center gap-2 rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 shadow-sm px-3 py-1.5 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[10px] font-medium text-foreground">
            {zoomLevel <= 5 ? '단지별' : zoomLevel <= 7 ? '동별' : '구별'}
          </span>
          {visibleIds.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              · {visibleIds.length}개
            </span>
          )}
        </div>
      </div>

      {/* 지도 + 로드뷰 */}
      <div className="h-full w-full flex flex-col">
        <div
          ref={mapRef}
          className={cn(
            'w-full transition-all',
            showRoadview ? 'h-[60%]' : 'h-full'
          )}
        />
        {showRoadview && (
          <div className="relative h-[40%] border-t-2 border-primary">
            <div
              ref={roadviewRef}
              className="w-full h-full"
            />
            <button
              onClick={() => setShowRoadview(false)}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
            <div className="absolute top-2 left-2 z-10 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] text-white font-medium">
              <Eye className="h-3 w-3 inline mr-1" />
              로드뷰 · {selectedComplex?.name}
            </div>
          </div>
        )}
      </div>

      {/* 상세 패널 — 지도 위 오버레이 카드 */}
      {selectedComplex && (
        <>
          {/* 데스크톱 — 좌측 오버레이 */}
          <div className="hidden md:block absolute left-3 top-14 bottom-12 z-[25] w-[420px] animate-fade-up">
            <div className="h-full bg-white rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
              <ComplexDetailPanel
                complexId={selectedComplex.id}
                onClose={() => setSelectedComplex(null)}
                onTabChange={setActiveDetailTab}
              />
            </div>
          </div>
          {/* 모바일 — 하단 시트 */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-[25] max-h-[60vh] overflow-y-auto overscroll-contain bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] animate-fade-up">
            <div className="sticky top-0 flex items-center justify-center py-2 bg-white rounded-t-2xl">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <ComplexDetailPanel
              key={selectedComplex.id}
              complexId={selectedComplex.id}
              onClose={() => setSelectedComplex(null)}
              onTabChange={setActiveDetailTab}
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
                  <span className="ml-auto text-[9px] text-muted-foreground">
                    {visibleIds.length}개 표시
                  </span>
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
                    const isSelected = selectedComplex?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedComplex(c);
                          setShowList(false);
                          if (mapInstanceRef.current && c.lat && c.lng) {
                            mapInstanceRef.current.setLevel(4, { animate: true });
                            setTimeout(() => panToWithOffset(c.lat!, c.lng!), 200);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-3 border-b last:border-0 px-4 py-2.5 transition-colors w-full text-left',
                          isSelected ? 'bg-primary/5' : 'hover:bg-accent/50'
                        )}
                      >
                        <div
                          className="w-1.5 h-8 rounded-full shrink-0 bg-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.dong} · {c._count.trades}건</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">
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
      <div className="absolute bottom-8 left-3 z-[20] flex items-center gap-2 pointer-events-none [&>*]:pointer-events-auto">
        <div className="rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 px-3 py-1.5 shadow-sm text-[11px] flex items-center gap-3">
          <span>
            <span className="font-semibold text-primary">{withCoords.length}</span> 단지
          </span>
          <span className="text-border">|</span>
          <span>줌 {zoomLevel}</span>
          <span className="text-border">|</span>
          {zoomLevel >= 8 && (
            <span className="text-muted-foreground">구 단위 · 클릭하면 동별 보기</span>
          )}
          {zoomLevel >= 6 && zoomLevel <= 7 && (
            <span className="text-muted-foreground">동 단위 · 클릭하면 단지별 보기</span>
          )}
          {zoomLevel <= 5 && (
            <span className="text-muted-foreground">단지별 · 클릭하면 상세 보기</span>
          )}
        </div>
      </div>

      {/* 로딩 */}
      {!kakaoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}
