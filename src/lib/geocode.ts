/**
 * 카카오 주소 검색 기반 지오코딩
 * - 수집 API에서 단지 생성 시 자동 호출
 * - 실패해도 수집은 중단하지 않음 (좌표만 null)
 */

import { env } from '@/lib/env';

const KAKAO_REST_KEY = () => env('KAKAO_REST_API_KEY');

interface GeoResult {
  lat: number;
  lng: number;
  method: string;
}

async function searchAddress(address: string): Promise<GeoResult | null> {
  const key = KAKAO_REST_KEY();
  if (!key) return null;

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.documents?.length > 0) {
      return {
        lat: parseFloat(data.documents[0].y),
        lng: parseFloat(data.documents[0].x),
        method: 'address',
      };
    }
  } catch {
    // 타임아웃, 네트워크 오류 등 — 무시
  }
  return null;
}

async function searchKeyword(query: string): Promise<GeoResult | null> {
  const key = KAKAO_REST_KEY();
  if (!key) return null;

  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.documents?.length > 0) {
      return {
        lat: parseFloat(data.documents[0].y),
        lng: parseFloat(data.documents[0].x),
        method: 'keyword',
      };
    }
  } catch {
    // 무시
  }
  return null;
}

/**
 * 단지의 좌표를 찾습니다.
 * 실패 시 null을 반환합니다 (수집 중단하지 않음).
 */
export async function geocodeComplex(params: {
  name: string;
  dong: string;
  jibun: string;
  sido: string;
  sigungu: string;
  roadAddress: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const { name, dong, sido, sigungu, roadAddress } = params;

  try {
    // 1순위: 도로명주소
    if (roadAddress && roadAddress.includes(' ')) {
      const result = await searchAddress(`${sido} ${sigungu} ${roadAddress}`);
      if (result) return result;
    }

    // 2순위: 지번주소
    if (dong && params.jibun) {
      const result = await searchAddress(`${sido} ${sigungu} ${dong} ${params.jibun}`);
      if (result) return result;
    }

    // 3순위: 키워드 검색
    const aptName = name.includes('아파트') ? name : `${name}아파트`;
    if (dong) {
      const result = await searchKeyword(`${sido} ${sigungu} ${dong} ${aptName}`);
      if (result) return result;
    }

    // 4순위: 시군구 + 단지명
    const result = await searchKeyword(`${sigungu} ${aptName}`);
    if (result) return result;
  } catch {
    // 전체 실패 — null 반환, 수집 중단하지 않음
  }

  return null;
}
