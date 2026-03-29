/**
 * 한국은행 ECOS API 클라이언트
 * https://ecos.bok.or.kr/api/
 */

const ECOS_BASE = 'https://ecos.bok.or.kr/api/StatisticSearch';

interface EcosRow {
  STAT_CODE: string;
  ITEM_NAME1: string;
  TIME: string;
  DATA_VALUE: string;
  UNIT_NAME: string;
}

interface RateData {
  name: string;
  nameKr: string;
  date: Date;
  rate: number;
}

// 수집할 금리 지표 정의
const RATE_INDICATORS = [
  {
    name: 'BASE_RATE',
    nameKr: '기준금리',
    statCode: '722Y001',
    itemCode: '0101000',
    cycle: 'M',
  },
  {
    name: 'CD_91D',
    nameKr: 'CD금리(91일)',
    statCode: '817Y002',
    itemCode: '010502000',
    cycle: 'D', // 일간 데이터만 제공
  },
  {
    name: 'TREASURY_3Y',
    nameKr: '국고채(3년)',
    statCode: '817Y002',
    itemCode: '010200000',
    cycle: 'D', // 일간 데이터만 제공
  },
  {
    name: 'MORTGAGE',
    nameKr: '주담대',
    statCode: '121Y006',
    itemCode: 'BECBLA0302',
    cycle: 'M',
  },
];

async function fetchEcosStat(
  statCode: string,
  itemCode: string,
  cycle: string,
  startDate: string,
  endDate: string
): Promise<EcosRow[]> {
  const apiKey = (process.env.ECOS_API_KEY || '').replace(/^"|"$/g, '');
  if (!apiKey) throw new Error('ECOS_API_KEY 환경변수가 설정되지 않았습니다.');

  const url = `${ECOS_BASE}/${apiKey}/json/kr/1/100/${statCode}/${cycle}/${startDate}/${endDate}/${itemCode}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ECOS API 요청 실패: ${res.status}`);

  const data = await res.json();

  if (data.StatisticSearch?.row) {
    return data.StatisticSearch.row;
  }

  // 에러 응답 처리
  if (data.RESULT?.CODE) {
    throw new Error(`ECOS: ${data.RESULT.CODE} ${data.RESULT.MESSAGE}`);
  }

  return [];
}

function parseTime(time: string): Date {
  // "202501" → 2025-01-01, "20250115" → 2025-01-15
  if (time.length === 6) {
    return new Date(parseInt(time.slice(0, 4), 10), parseInt(time.slice(4, 6), 10) - 1, 1);
  }
  return new Date(
    parseInt(time.slice(0, 4), 10),
    parseInt(time.slice(4, 6), 10) - 1,
    parseInt(time.slice(6, 8), 10) || 1
  );
}

/** 일간 데이터에서 각 월의 마지막 값만 추출 */
function filterMonthlyLast(rows: EcosRow[]): EcosRow[] {
  const monthMap = new Map<string, EcosRow>();
  for (const row of rows) {
    const ym = row.TIME.slice(0, 6); // YYYYMM
    monthMap.set(ym, row); // 마지막 값이 덮어씀
  }
  return Array.from(monthMap.values());
}

/**
 * 최근 N개월간의 금리 데이터를 수집합니다.
 */
export async function fetchRates(months: number = 24): Promise<RateData[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);

  const monthStart = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}`;
  const monthEnd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayStart = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}01`;
  const dayEnd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const results: RateData[] = [];

  for (const indicator of RATE_INDICATORS) {
    try {
      const startStr = indicator.cycle === 'D' ? dayStart : monthStart;
      const endStr = indicator.cycle === 'D' ? dayEnd : monthEnd;

      const rows = await fetchEcosStat(
        indicator.statCode,
        indicator.itemCode,
        indicator.cycle,
        startStr,
        endStr
      );

      // 일간 데이터는 월말 값만 추출 (너무 많으므로)
      const filtered = indicator.cycle === 'D'
        ? filterMonthlyLast(rows)
        : rows;

      for (const row of filtered) {
        const value = parseFloat(row.DATA_VALUE);
        if (isNaN(value)) continue;

        results.push({
          name: indicator.name,
          nameKr: indicator.nameKr,
          date: parseTime(row.TIME),
          rate: value,
        });
      }
    } catch (e) {
      console.error(`ECOS ${indicator.name} 수집 실패:`, e instanceof Error ? e.message : e);
      // 개별 지표 실패 시 다른 지표는 계속 수집
    }
  }

  return results;
}
