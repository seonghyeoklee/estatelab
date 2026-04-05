import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { APARTMENT_SQL_FILTER } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/map/complexes?swLat=37.4&swLng=126.8&neLat=37.6&neLng=127.1&zoom=5
 * 지도에 표시할 단지 목록 — 영역 기반 조회 (raw SQL로 서버 집계)
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const swLat = parseFloat(sp.get('swLat') || '');
    const swLng = parseFloat(sp.get('swLng') || '');
    const neLat = parseFloat(sp.get('neLat') || '');
    const neLng = parseFloat(sp.get('neLng') || '');
    const zoom = parseInt(sp.get('zoom') || '8', 10);

    const hasBounds = [swLat, swLng, neLat, neLng].every((v) => Number.isFinite(v));
    if (!hasBounds) {
      return NextResponse.json({ data: [] });
    }

    const limit = zoom <= 3 ? 500 : zoom <= 5 ? 1500 : 500;

    const complexes = await prisma.$queryRawUnsafe<{
      id: string;
      name: string;
      dong: string;
      region_code: string;
      lat: number;
      lng: number;
      trade_count: number;
      avg_price: number;
      avg_ppp: number;
      latest_deal_date: Date | null;
    }[]>(`
      SELECT
        c.id, c.name, c.dong, c.region_code,
        c.lat, c.lng,
        COUNT(t.id)::int AS trade_count,
        ROUND(AVG(t.price))::int AS avg_price,
        ROUND(AVG(t.price_per_pyeong))::int AS avg_ppp,
        MAX(t.deal_date) AS latest_deal_date
      FROM apartment_complexes c
      JOIN apartment_trades t ON t.complex_id = c.id
      WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
        ${APARTMENT_SQL_FILTER}
        AND c.lat BETWEEN $1 AND $2 AND c.lng BETWEEN $3 AND $4
        AND t.deal_date >= NOW() - INTERVAL '6 months'
      GROUP BY c.id, c.name, c.dong, c.region_code, c.lat, c.lng
      HAVING COUNT(t.id) > 0
      ORDER BY COUNT(t.id) DESC
      LIMIT $5
    `, swLat, neLat, swLng, neLng, limit);

    // 면적별 통계 — 조회된 단지들에 대해서만
    const complexIds = complexes.map((c) => c.id);

    const areaMap: Map<string, { area: number; avgPrice: number; avgPpp: number; count: number }[]> = new Map();

    if (complexIds.length > 0) {
      const areaStats = await prisma.$queryRawUnsafe<{
        complex_id: string;
        area: number;
        avg_price: number;
        avg_ppp: number;
        cnt: number;
      }[]>(`
        SELECT
          complex_id,
          ROUND(area)::int AS area,
          ROUND(AVG(price))::int AS avg_price,
          ROUND(AVG(price_per_pyeong))::int AS avg_ppp,
          COUNT(*)::int AS cnt
        FROM apartment_trades
        WHERE complex_id = ANY($1)
        GROUP BY complex_id, ROUND(area)
      `, complexIds);

      for (const s of areaStats) {
        const list = areaMap.get(s.complex_id) || [];
        list.push({ area: Number(s.area), avgPrice: Number(s.avg_price), avgPpp: Number(s.avg_ppp), count: Number(s.cnt) });
        areaMap.set(s.complex_id, list);
      }
    }

    const data = complexes.map((c) => ({
      id: c.id,
      name: c.name,
      dong: c.dong,
      regionCode: c.region_code,
      lat: Number(c.lat),
      lng: Number(c.lng),
      _count: { trades: Number(c.trade_count) },
      avgPrice: Number(c.avg_price),
      avgPricePerPyeong: Number(c.avg_ppp),
      latestDealDate: c.latest_deal_date,
      areas: areaMap.get(c.id) || [],
    }));

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('complexes API 오류:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
