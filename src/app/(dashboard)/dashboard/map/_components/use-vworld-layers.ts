'use client';

import { useEffect, useRef, useCallback } from 'react';

/** VWORLD 오버레이 레이어 정의 */
interface LayerConfig {
  typeName: string;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  strokeWeight: number;
  strokeStyle?: string;
  /** GeoJSON feature properties 에서 표시할 이름 필드 */
  nameField: string;
  label: string;
}

const LAYER_CONFIGS: Record<string, LayerConfig> = {
  redevelopment: {
    typeName: 'lt_c_lhzone',
    strokeColor: '#f97316',
    fillColor: '#f97316',
    fillOpacity: 0.15,
    strokeWeight: 2,
    nameField: 'lh_blk_nm',
    label: '재개발/재건축',
  },
  schoolZone: {
    typeName: 'lt_c_desch',
    strokeColor: '#eab308',
    fillColor: '#eab308',
    fillOpacity: 0.1,
    strokeWeight: 2,
    nameField: 'instl_nm',
    label: '학군 통학구역',
  },
  greenbelt: {
    typeName: 'lt_c_ud801',
    strokeColor: '#22c55e',
    fillColor: '#22c55e',
    fillOpacity: 0.1,
    strokeWeight: 2,
    strokeStyle: 'shortdash',
    nameField: 'uname',
    label: '그린벨트',
  },
  landUse: {
    typeName: 'lt_c_uq111',
    strokeColor: '#8b5cf6',
    fillColor: '#8b5cf6',
    fillOpacity: 0.1,
    strokeWeight: 1.5,
    nameField: 'uname',
    label: '용도지역',
  },
  commercial: {
    typeName: 'lt_c_dgmainbiz',
    strokeColor: '#ec4899',
    fillColor: '#ec4899',
    fillOpacity: 0.12,
    strokeWeight: 2,
    nameField: 'main_gb_nm',
    label: '주요 상권',
  },
};

interface UseVworldLayersParams {
  map: kakao.maps.Map | null;
  showRedevelopment: boolean;
  showSchoolZone: boolean;
  showGreenbelt: boolean;
  showLandUse: boolean;
  showCommercial: boolean;
  zoomLevel: number;
}

/** 현재 지도 bounds 를 bbox 문자열(lng1,lat1,lng2,lat2)로 변환 */
function getBbox(map: kakao.maps.Map): string {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return `${sw.getLng()},${sw.getLat()},${ne.getLng()},${ne.getLat()}`;
}

/**
 * GeoJSON Feature 에서 kakao.maps.LatLng 경로 배열을 추출
 * Polygon / MultiPolygon 모두 처리
 */
function extractPaths(feature: {
  geometry: { type: string; coordinates: number[][][][] | number[][][] };
}): kakao.maps.LatLng[][] {
  const paths: kakao.maps.LatLng[][] = [];
  try {
    if (feature.geometry.type === 'MultiPolygon') {
      const coords = feature.geometry.coordinates as number[][][][];
      for (const polygon of coords) {
        for (const ring of polygon) {
          paths.push(ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
        }
      }
    } else {
      // Polygon
      const coords = feature.geometry.coordinates as number[][][];
      for (const ring of coords) {
        paths.push(ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
      }
    }
  } catch {
    /* skip malformed geometry */
  }
  return paths;
}

/** 폴리곤의 중심점 계산 */
function getPolygonCenter(path: kakao.maps.LatLng[]): kakao.maps.LatLng {
  let latSum = 0;
  let lngSum = 0;
  for (const p of path) {
    latSum += p.getLat();
    lngSum += p.getLng();
  }
  return new kakao.maps.LatLng(latSum / path.length, lngSum / path.length);
}

interface LayerState {
  polygons: kakao.maps.Polygon[];
  overlays: kakao.maps.CustomOverlay[];
  /** 마지막 fetch 의 bbox — 크게 변하지 않으면 재요청 안 함 */
  lastBbox: string;
}

export function useVworldLayers({
  map,
  showRedevelopment,
  showSchoolZone,
  showGreenbelt,
  showLandUse,
  showCommercial,
  zoomLevel,
}: UseVworldLayersParams) {
  const layersRef = useRef<Record<string, LayerState>>({
    redevelopment: { polygons: [], overlays: [], lastBbox: '' },
    schoolZone: { polygons: [], overlays: [], lastBbox: '' },
    greenbelt: { polygons: [], overlays: [], lastBbox: '' },
    landUse: { polygons: [], overlays: [], lastBbox: '' },
    commercial: { polygons: [], overlays: [], lastBbox: '' },
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 데이터 캐시: bbox → features */
  const cacheRef = useRef<Map<string, unknown[]>>(new Map());

  /** 특정 레이어를 지도에서 제거 */
  const clearLayer = useCallback((key: string) => {
    const layer = layersRef.current[key];
    if (!layer) return;
    layer.polygons.forEach((p) => p.setMap(null));
    layer.overlays.forEach((o) => o.setMap(null));
    layer.polygons = [];
    layer.overlays = [];
  }, []);

  /** 특정 레이어를 fetch + render */
  const fetchAndRender = useCallback(
    async (key: string) => {
      if (!map) return;
      const config = LAYER_CONFIGS[key];
      if (!config) return;

      const bbox = getBbox(map);

      // bbox 가 마지막과 같으면 건너뜀
      if (layersRef.current[key].lastBbox === bbox && layersRef.current[key].polygons.length > 0) {
        return;
      }

      clearLayer(key);

      const cacheKey = `${config.typeName}:${bbox}`;
      let features: unknown[];

      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        features = cached;
      } else {
        try {
          const url = `/api/market/map/vworld-proxy?typeName=${config.typeName}&bbox=${bbox}&maxFeatures=100`;
          const res = await fetch(url);
          if (!res.ok) {
            console.warn(`[VWORLD ${config.label}] HTTP ${res.status}`);
            return;
          }
          const json = await res.json();
          features = json.features ?? [];
          // 빈 응답은 캐시하지 않음 — 일시적 실패일 수 있음
          if (features.length > 0) {
            cacheRef.current.set(cacheKey, features);
          }
        } catch (err) {
          console.error(`[VWORLD ${config.label}] 요청 실패:`, err);
          return;
        }
      }

      if (!features.length) return;

      // 성공 시에만 lastBbox 저장
      layersRef.current[key].lastBbox = bbox;

      // 현재 지도가 여전히 존재하는지 확인
      if (!map) return;

      const newPolygons: kakao.maps.Polygon[] = [];
      const newOverlays: kakao.maps.CustomOverlay[] = [];

      for (const feature of features as Array<{
        geometry: { type: string; coordinates: number[][][][] | number[][][] };
        properties: Record<string, string>;
      }>) {
        const paths = extractPaths(feature);
        if (!paths.length) continue;

        // 이름 찾기 (여러 필드 후보 시도)
        const name =
          feature.properties?.[config.nameField] ||
          feature.properties?.name ||
          feature.properties?.NAME ||
          config.label;

        for (const path of paths) {
          const polygon = new kakao.maps.Polygon({
            path,
            strokeWeight: config.strokeWeight,
            strokeColor: config.strokeColor,
            strokeOpacity: 0.8,
            fillColor: config.fillColor,
            fillOpacity: config.fillOpacity,
            ...(config.strokeStyle ? { strokeStyle: config.strokeStyle } : {}),
          });
          polygon.setMap(map);
          newPolygons.push(polygon);

          // 클릭 시 정보 표시
          const infoOverlay = new kakao.maps.CustomOverlay({
            position: getPolygonCenter(path),
            content: '',
            yAnchor: 1.2,
            zIndex: 30,
          });

          kakao.maps.event.addListener(polygon, 'click', () => {
            // 기존 이 레이어의 모든 info 오버레이 닫기
            newOverlays.forEach((o) => o.setMap(null));

            const el = document.createElement('div');
            el.style.cssText = `
              background: white;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 600;
              color: #1f2937;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              border: 1.5px solid ${config.strokeColor};
              white-space: nowrap;
              cursor: pointer;
            `;
            el.textContent = name;
            el.addEventListener('click', () => infoOverlay.setMap(null));

            infoOverlay.setContent(el);
            infoOverlay.setMap(map);
          });

          newOverlays.push(infoOverlay);
        }
      }

      layersRef.current[key].polygons = newPolygons;
      layersRef.current[key].overlays = newOverlays;
    },
    [map, clearLayer],
  );

  /** 활성 레이어 상태 맵 */
  const enabledMap: Record<string, boolean> = {
    redevelopment: showRedevelopment,
    schoolZone: showSchoolZone,
    greenbelt: showGreenbelt,
    landUse: showLandUse,
    commercial: showCommercial,
  };

  // 토글 변경 시 레이어 on/off
  useEffect(() => {
    for (const key of Object.keys(enabledMap)) {
      if (!enabledMap[key]) {
        clearLayer(key);
        layersRef.current[key].lastBbox = '';
      }
    }

    // 줌 레벨 7 이하에서만 (줌이 클수록 축소된 상태)
    if (zoomLevel > 7) {
      Object.keys(enabledMap).forEach(clearLayer);
      return;
    }

    // 활성 레이어 fetch
    for (const key of Object.keys(enabledMap)) {
      if (enabledMap[key]) {
        fetchAndRender(key);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRedevelopment, showSchoolZone, showGreenbelt, showLandUse, showCommercial, zoomLevel, map]);

  // bounds 변경 시 debounce 재요청
  useEffect(() => {
    if (!map) return;

    const handleBoundsChanged = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (zoomLevel > 7) return;
        for (const key of Object.keys(enabledMap)) {
          if (enabledMap[key]) {
            fetchAndRender(key);
          }
        }
      }, 500);
    };

    kakao.maps.event.addListener(map, 'bounds_changed', handleBoundsChanged);

    return () => {
      kakao.maps.event.removeListener(map, 'bounds_changed', handleBoundsChanged);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, showRedevelopment, showSchoolZone, showGreenbelt, showLandUse, showCommercial, zoomLevel, fetchAndRender]);

  // 컴포넌트 언마운트 시 전체 정리
  useEffect(() => {
    return () => {
      Object.keys(layersRef.current).forEach(clearLayer);
    };
  }, [clearLayer]);
}
