import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  parseSearchParams,
  buildWhereClause,
  buildOrderBy,
  getRecentTradeDate,
} from '@/lib/apartment-search';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments
 * 통합 검색: 단지명 + 동 + 도로명 + 시군구
 * 필터: regionCode, sido, dong, minPrice, maxPrice, minArea, maxArea, minYear
 * 정렬: name, price, trades, year, ppp (평당가)
 */
export async function GET(request: NextRequest) {
  const params = parseSearchParams(request.nextUrl.searchParams);
  const where = buildWhereClause(params);
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = params.sort || 'name';

  // 평당가순/가격순/이름순(한글 우선)은 raw query 필요
  const needsRawSort = sort === 'ppp' || sort === 'price' || sort === 'name';

  if (needsRawSort) {
    return handleRawSortQuery(where, sort, page, limit, skip);
  }

  const orderBy = buildOrderBy(sort);
  const recentDate = getRecentTradeDate(30);

  const [complexes, total] = await Promise.all([
    prisma.apartmentComplex.findMany({
      where,
      include: {
        region: { select: { sido: true, sigungu: true } },
        _count: { select: { trades: true } },
        trades: {
          orderBy: { dealDate: 'desc' },
          take: 1,
          select: { price: true, area: true, floor: true, dealDate: true, pricePerPyeong: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.apartmentComplex.count({ where }),
  ]);

  // 최근 30일 거래 건수 일괄 조회
  const complexIds = complexes.map((c) => c.id);
  const recentCounts = await getRecentTradeCounts(complexIds, recentDate);

  // 동별 집계 (필터 결과 기반)
  const dongCounts = await getDongCounts(where);

  const data = complexes.map((c) => ({
    id: c.id,
    name: c.name,
    dong: c.dong,
    regionCode: c.regionCode,
    region: c.region,
    builtYear: c.builtYear,
    lat: c.lat,
    lng: c.lng,
    tradeCount: c._count.trades,
    recentTradeCount: recentCounts.get(c.id) ?? 0,
    latestTrade: c.trades[0] || null,
  }));

  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    dongCounts,
  });
}

/**
 * 평당가/가격 기준 정렬 — raw SQL 사용
 */
async function handleRawSortQuery(
  where: Record<string, unknown>,
  sort: string,
  page: number,
  limit: number,
  skip: number
) {
  const total = await prisma.apartmentComplex.count({ where });
  const recentDate = getRecentTradeDate(30);

  type RawComplex = {
    id: string; name: string; dong: string; region_code: string;
    built_year: number | null; lat: number | null; lng: number | null;
    sido: string; sigungu: string; trade_count: number;
    latest_price: number | null; latest_area: number | null;
    latest_floor: number | null; latest_date: string | null;
    latest_ppp: number | null; avg_price: number; avg_ppp: number;
    recent_count: number;
  };

  const baseQuery = `
    WITH ranked AS (
      SELECT
        c.id, c.name, c.dong, c.region_code, c.built_year, c.lat, c.lng,
        r.sido, r.sigungu,
        COUNT(t.id)::int AS trade_count,
        ROUND(AVG(t.price))::int AS avg_price,
        ROUND(AVG(t.price_per_pyeong))::int AS avg_ppp,
        COUNT(t.id) FILTER (WHERE t.deal_date >= $1)::int AS recent_count
      FROM apartment_complexes c
      JOIN regions r ON r.code = c.region_code
      JOIN apartment_trades t ON t.complex_id = c.id
      WHERE c.name NOT LIKE '(%'
      GROUP BY c.id, r.sido, r.sigungu
    )
    SELECT
      ranked.*,
      lt.price::int AS latest_price,
      lt.area AS latest_area,
      lt.floor::int AS latest_floor,
      lt.deal_date::text AS latest_date,
      lt.price_per_pyeong AS latest_ppp
    FROM ranked
    LEFT JOIN LATERAL (
      SELECT price, area, floor, deal_date, price_per_pyeong
      FROM apartment_trades
      WHERE complex_id = ranked.id
      ORDER BY deal_date DESC
      LIMIT 1
    ) lt ON true
  `;

  const orderClause =
    sort === 'ppp' ? 'ORDER BY avg_ppp DESC NULLS LAST' :
    sort === 'name' ? "ORDER BY CASE WHEN ranked.name ~ '^[가-힣]' THEN 0 ELSE 1 END, ranked.name" :
    'ORDER BY avg_price DESC NULLS LAST';

  const complexes = await prisma.$queryRawUnsafe<RawComplex[]>(
    `${baseQuery} ${orderClause} OFFSET $2 LIMIT $3`,
    recentDate, skip, limit
  );

  const sorted = complexes;

  const dongCounts = await getDongCounts(where);

  const data = sorted.map((c) => ({
    id: c.id,
    name: c.name,
    dong: c.dong,
    regionCode: c.region_code,
    region: { sido: c.sido, sigungu: c.sigungu },
    builtYear: c.built_year,
    lat: c.lat,
    lng: c.lng,
    tradeCount: c.trade_count,
    recentTradeCount: c.recent_count,
    latestTrade: c.latest_price ? {
      price: c.latest_price,
      area: c.latest_area!,
      floor: c.latest_floor!,
      dealDate: c.latest_date!,
      pricePerPyeong: c.latest_ppp,
    } : null,
  }));

  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    dongCounts,
  });
}

/**
 * 최근 N일 거래 건수 조회
 */
async function getRecentTradeCounts(
  complexIds: string[],
  since: Date
): Promise<Map<string, number>> {
  if (complexIds.length === 0) return new Map();

  const counts = await prisma.apartmentTrade.groupBy({
    by: ['complexId'],
    where: {
      complexId: { in: complexIds },
      dealDate: { gte: since },
    },
    _count: true,
  });

  return new Map(counts.map((c) => [c.complexId, c._count]));
}

/**
 * 동별 단지 수 집계 (필터 칩용)
 */
async function getDongCounts(
  where: Record<string, unknown>
): Promise<{ dong: string; count: number }[]> {
  const groups = await prisma.apartmentComplex.groupBy({
    by: ['dong'],
    where,
    _count: true,
    orderBy: { _count: { dong: 'desc' } },
    take: 20,
  });

  return groups
    .filter((g) => g.dong)
    .map((g) => ({ dong: g.dong, count: g._count }));
}
