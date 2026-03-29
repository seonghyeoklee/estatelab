/**
 * 카카오 로컬 API — 주변 시설 검색
 */

import { env } from '@/lib/env';

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  address: string;
  distance: number; // 미터
  lat: number;
  lng: number;
  phone: string;
}

const CATEGORIES = {
  subway: { code: 'SW8', label: '지하철역' },
  school: { code: 'SC4', label: '학교' },
  convenience: { code: 'CS2', label: '편의점' },
  mart: { code: 'MT1', label: '대형마트' },
  hospital: { code: 'HP8', label: '병원' },
  cafe: { code: 'CE7', label: '카페' },
  bank: { code: 'BK9', label: '은행' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export function getCategoryLabel(key: CategoryKey): string {
  return CATEGORIES[key].label;
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

/**
 * 좌표 주변의 카테고리별 장소를 검색합니다.
 */
export async function searchNearby(
  lat: number,
  lng: number,
  category: CategoryKey,
  radius: number = 1000
): Promise<NearbyPlace[]> {
  const key = env('KAKAO_REST_API_KEY');
  if (!key) return [];

  const cat = CATEGORIES[category];
  const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${cat.code}&x=${lng}&y=${lat}&radius=${radius}&sort=distance&size=10`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.documents || []).map((d: {
      id: string;
      place_name: string;
      category_name: string;
      address_name: string;
      distance: string;
      y: string;
      x: string;
      phone: string;
    }) => ({
      id: d.id,
      name: d.place_name,
      category: d.category_name,
      address: d.address_name,
      distance: parseInt(d.distance, 10) || 0,
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      phone: d.phone || '',
    }));
  } catch {
    return [];
  }
}
