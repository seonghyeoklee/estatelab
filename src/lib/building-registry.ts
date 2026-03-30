/**
 * 건축물대장 API — 표제부 조회 (동별 정보)
 * https://www.data.go.kr/data/15134735/openapi.do
 */

import { env } from '@/lib/env';

const API_BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService';

export interface BuildingUnit {
  dongNm: string;          // 동명칭 (101동, 102동...)
  mainPurpsCdNm: string;   // 주용도 (공동주택, 근린생활시설...)
  grndFlrCnt: number;      // 지상층수
  ugrndFlrCnt: number;     // 지하층수
  hhldCnt: number;          // 세대수
  hoCnt: number;            // 호수
  totArea: number;          // 연면적 (㎡)
  archArea: number;         // 건축면적 (㎡)
  strctCdNm: string;       // 구조 (철근콘크리트구조 등)
  useAprDay: string | null; // 사용승인일 (YYYYMMDD)
  rideUseElvtCnt: number;  // 승용 승강기 수
  emgenUseElvtCnt: number; // 비상 승강기 수
  rserthqkAblty: string | null; // 내진능력
}

export interface BuildingOverview {
  bldNm: string;           // 건물명
  units: BuildingUnit[];   // 동별 정보
  totalHhld: number;       // 총 세대수
  totalDong: number;       // 총 동수
}

/**
 * 법정동코드 + 지번으로 건축물대장 표제부를 조회합니다.
 * regionCode: 5자리 (11680 = 강남구)
 * bjdongCd: 5자리 법정동코드 (regionCode 뒤에 오는 5자리)
 * bun: 본번, ji: 부번
 */
export async function fetchBuildingInfo(
  sigunguCd: string,
  bjdongCd: string,
  bun: string,
  ji: string
): Promise<BuildingOverview | null> {
  const key = env('PUBLIC_DATA_API_KEY');
  if (!key) return null;

  const url = new URL(`${API_BASE}/getBrTitleInfo`);
  url.searchParams.set('serviceKey', key);
  url.searchParams.set('sigunguCd', sigunguCd);
  url.searchParams.set('bjdongCd', bjdongCd);
  url.searchParams.set('bun', bun.padStart(4, '0'));
  url.searchParams.set('ji', ji.padStart(4, '0'));
  url.searchParams.set('_type', 'json');
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('pageNo', '1');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'EstateLab/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items) return null;

    const itemList = Array.isArray(items) ? items : [items];

    // 주건축물만 필터 (mainAtchGbCd === '0')
    const mainBuildings = itemList.filter(
      (item: Record<string, unknown>) =>
        item.mainAtchGbCd === '0' || item.mainAtchGbCdNm === '주건축물'
    );

    const buildings = mainBuildings.length > 0 ? mainBuildings : itemList;
    const bldNm = (buildings[0]?.bldNm as string) || '';

    const units: BuildingUnit[] = buildings
      .map((item: Record<string, unknown>) => ({
        dongNm: (item.dongNm as string) || '',
        mainPurpsCdNm: (item.mainPurpsCdNm as string) || '',
        grndFlrCnt: parseInt(String(item.grndFlrCnt || '0'), 10),
        ugrndFlrCnt: parseInt(String(item.ugrndFlrCnt || '0'), 10),
        hhldCnt: parseInt(String(item.hhldCnt || '0'), 10),
        hoCnt: parseInt(String(item.hoCnt || '0'), 10),
        totArea: parseFloat(String(item.totArea || '0')),
        archArea: parseFloat(String(item.archArea || '0')),
        strctCdNm: (item.strctCdNm as string) || '',
        useAprDay: (item.useAprDay as string) || null,
        rideUseElvtCnt: parseInt(String(item.rideUseElvtCnt || '0'), 10),
        emgenUseElvtCnt: parseInt(String(item.emgenUseElvtCnt || '0'), 10),
        rserthqkAblty: (item.rserthqkAblty as string) || null,
      }))
      .filter((u: BuildingUnit) => u.dongNm); // 동명칭이 있는 것만

    const totalHhld = units.reduce((s, u) => s + u.hhldCnt, 0);

    return {
      bldNm,
      units: units.sort((a, b) => a.dongNm.localeCompare(b.dongNm, 'ko')),
      totalHhld,
      totalDong: units.length,
    };
  } catch {
    return null;
  }
}

/**
 * estatelab의 regionCode(5자리) + jibun으로 건축물대장을 조회합니다.
 * regionCode: "11680" → sigunguCd
 * dong: "역삼동" → DB에서 bjdongCd를 찾거나, 전체 법정동코드에서 매핑
 * jibun: "632" 또는 "632-1" → bun/ji 분리
 */
export function parseJibun(jibun: string): { bun: string; ji: string } {
  const parts = jibun.split('-');
  return {
    bun: (parts[0] || '0').padStart(4, '0'),
    ji: (parts[1] || '0').padStart(4, '0'),
  };
}
