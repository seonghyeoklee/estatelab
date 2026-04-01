/**
 * 아파트 검색 쿼리 빌더
 * Prisma where 조건을 생성하는 순수 함수 — 테스트 용이
 */

export interface ApartmentSearchParams {
  q?: string;
  regionCode?: string;
  sido?: string;
  dong?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  minYear?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export function parseSearchParams(sp: URLSearchParams): ApartmentSearchParams {
  return {
    q: sp.get('q') || undefined,
    regionCode: sp.get('regionCode') || undefined,
    sido: sp.get('sido') || undefined,
    dong: sp.get('dong') || undefined,
    minPrice: sp.get('minPrice') ? parseInt(sp.get('minPrice')!, 10) : undefined,
    maxPrice: sp.get('maxPrice') ? parseInt(sp.get('maxPrice')!, 10) : undefined,
    minArea: sp.get('minArea') ? parseFloat(sp.get('minArea')!) : undefined,
    maxArea: sp.get('maxArea') ? parseFloat(sp.get('maxArea')!) : undefined,
    minYear: sp.get('minYear') ? parseInt(sp.get('minYear')!, 10) : undefined,
    sort: sp.get('sort') || 'trades',
    page: Math.max(1, parseInt(sp.get('page') || '1', 10)),
    limit: Math.min(Math.max(1, parseInt(sp.get('limit') || '20', 10)), 100),
  };
}

/**
 * 검색어를 이름/동/도로명 OR 조건으로 변환
 */
export function buildSearchCondition(q: string): Record<string, unknown> {
  const trimmed = q.trim();
  if (!trimmed) return {};

  // 공백으로 분리 — "강남 래미안" → 지역 + 이름 복합 검색
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    // 복합 검색: 모든 파트가 이름/동/도로명 중 하나에 포함
    return {
      AND: parts.map((part) => ({
        OR: [
          { name: { contains: part, mode: 'insensitive' } },
          { dong: { contains: part, mode: 'insensitive' } },
          { roadAddress: { contains: part, mode: 'insensitive' } },
          { region: { sigungu: { contains: part, mode: 'insensitive' } } },
        ],
      })),
    };
  }

  // 단일 키워드: OR 검색
  return {
    OR: [
      { name: { contains: trimmed, mode: 'insensitive' } },
      { dong: { contains: trimmed, mode: 'insensitive' } },
      { roadAddress: { contains: trimmed, mode: 'insensitive' } },
      { region: { sigungu: { contains: trimmed, mode: 'insensitive' } } },
    ],
  };
}

/**
 * Prisma where 조건을 생성
 */
export function buildWhereClause(params: ApartmentSearchParams): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  // 지역 필터
  if (params.regionCode) {
    where.regionCode = params.regionCode;
  } else if (params.sido) {
    where.region = { sido: params.sido };
  }

  // 동 필터
  if (params.dong) {
    where.dong = params.dong;
  }

  // 검색어 — 통합 검색
  if (params.q) {
    const searchCondition = buildSearchCondition(params.q);
    Object.assign(where, searchCondition);
  }

  // 건축년도
  if (params.minYear) {
    where.builtYear = { gte: params.minYear };
  }

  // 지번 형태 이름 제외
  where.NOT = { name: { startsWith: '(' } };

  // 거래 있는 단지만
  where.trades = { some: {} };

  // 가격/면적 필터 (거래 기반)
  if (params.minPrice || params.maxPrice || params.minArea || params.maxArea) {
    const tradeFilter: Record<string, unknown> = {};
    if (params.minPrice || params.maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (params.minPrice) priceFilter.gte = params.minPrice;
      if (params.maxPrice) priceFilter.lte = params.maxPrice;
      tradeFilter.price = priceFilter;
    }
    if (params.minArea || params.maxArea) {
      const areaFilter: Record<string, number> = {};
      if (params.minArea) areaFilter.gte = params.minArea;
      if (params.maxArea) areaFilter.lte = params.maxArea;
      tradeFilter.area = areaFilter;
    }
    where.trades = { some: tradeFilter };
  }

  return where;
}

/**
 * 정렬 조건 생성
 */
export function buildOrderBy(sort: string): Record<string, unknown> {
  switch (sort) {
    case 'year':
      return { builtYear: 'desc' };
    case 'trades':
      return { trades: { _count: 'desc' } };
    default:
      // 이름순은 Prisma에서 기본 정렬 후 JS에서 한글 우선 재정렬
      return { name: 'asc' };
  }
}

/**
 * 한글 시작 이름을 우선 정렬
 * - 한글(가~힣) → 영문/숫자 순
 */
export function sortKoreanFirst<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aIsKorean = /^[가-힣]/.test(a.name);
    const bIsKorean = /^[가-힣]/.test(b.name);
    if (aIsKorean && !bIsKorean) return -1;
    if (!aIsKorean && bIsKorean) return 1;
    return a.name.localeCompare(b.name, 'ko');
  });
}

/**
 * 최근 N일 내 거래 건수를 계산하는 기준 날짜
 */
export function getRecentTradeDate(days: number = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}
