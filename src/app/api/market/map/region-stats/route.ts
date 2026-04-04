import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/map/region-stats
 * 구별 집계 — 줌 아웃 시 사용 (약 30건)
 */
export async function GET() {
  const stats = await prisma.$queryRaw<{
    region_code: string;
    sigungu: string;
    sido: string;
    avg_price: number;
    avg_ppp: number;
    complex_count: number;
    trade_count: number;
    center_lat: number;
    center_lng: number;
  }[]>`
    SELECT
      c.region_code,
      r.sigungu,
      r.sido,
      ROUND(AVG(t.price))::int AS avg_price,
      ROUND(AVG(t.price_per_pyeong))::int AS avg_ppp,
      COUNT(DISTINCT c.id)::int AS complex_count,
      COUNT(t.id)::int AS trade_count,
      ROUND(AVG(c.lat)::numeric, 6)::float AS center_lat,
      ROUND(AVG(c.lng)::numeric, 6)::float AS center_lng
    FROM apartment_complexes c
    JOIN regions r ON r.code = c.region_code
    JOIN apartment_trades t ON t.complex_id = c.id
    WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
      AND c.name NOT LIKE '(%' AND c.name NOT LIKE '%빌라%' AND c.name NOT LIKE '%연립%' AND c.name NOT LIKE '%다세대%' AND c.name NOT LIKE '%오피스텔%' AND c.name NOT LIKE '%상가%' AND c.name NOT LIKE '%주택%'
    GROUP BY c.region_code, r.sigungu, r.sido
    HAVING COUNT(t.id) > 0
    ORDER BY avg_price DESC
  `;

  const data = stats.map((s) => ({
    regionCode: s.region_code,
    sigungu: s.sigungu,
    sido: s.sido,
    avgPrice: Number(s.avg_price),
    avgPpp: Number(s.avg_ppp),
    complexCount: Number(s.complex_count),
    tradeCount: Number(s.trade_count),
    lat: Number(s.center_lat),
    lng: Number(s.center_lng),
  }));

  return NextResponse.json({ data });
}
