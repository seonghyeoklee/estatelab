import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pricePerPyeong } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/map/complexes?swLat=37.4&swLng=126.8&neLat=37.6&neLng=127.1
 * 지도에 표시할 단지 목록 — 영역 기반 조회 (최대 1000개)
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const swLat = sp.get('swLat') ? parseFloat(sp.get('swLat')!) : undefined;
  const swLng = sp.get('swLng') ? parseFloat(sp.get('swLng')!) : undefined;
  const neLat = sp.get('neLat') ? parseFloat(sp.get('neLat')!) : undefined;
  const neLng = sp.get('neLng') ? parseFloat(sp.get('neLng')!) : undefined;

  const where: Record<string, unknown> = {
    lat: { not: null },
    lng: { not: null },
    trades: { some: {} },
    NOT: { name: { startsWith: '(' } },
  };

  // 영역 필터 + 줌 기반 제한
  const zoom = sp.get('zoom') ? parseInt(sp.get('zoom')!) : 8;
  let limit: number;

  if (swLat && swLng && neLat && neLng) {
    where.lat = { gte: swLat, lte: neLat };
    where.lng = { gte: swLng, lte: neLng };
    // 줌 인할수록 영역이 좁아지니 limit 낮아도 됨
    limit = zoom <= 3 ? 500 : zoom <= 5 ? 1500 : 500;
  } else {
    // 첫 로드 — 구별/동별 집계용이라 거래 많은 순으로 제한
    limit = 2000;
  }

  const complexes = await prisma.apartmentComplex.findMany({
    where,
    orderBy: { trades: { _count: 'desc' } },
    select: {
      id: true,
      name: true,
      dong: true,
      regionCode: true,
      lat: true,
      lng: true,
      _count: { select: { trades: true } },
      trades: {
        select: { price: true, area: true, dealDate: true },
        orderBy: { dealDate: 'desc' },
        take: 20,
      },
    },
    take: limit,
  });

  const data = complexes.map((c) => {
    const avgPrice = c.trades.length
      ? Math.round(c.trades.reduce((s, t) => s + t.price, 0) / c.trades.length)
      : 0;
    const avgPricePerPyeong = c.trades.length
      ? Math.round(
          c.trades.reduce((s, t) => s + pricePerPyeong(t.price, t.area), 0) / c.trades.length
        )
      : 0;

    const latestDealDate = c.trades[0]?.dealDate ?? null;

    // 면적별 평균가
    const byArea: Record<number, { total: number; count: number; totalPpp: number }> = {};
    for (const t of c.trades) {
      const area = Math.round(t.area);
      if (!byArea[area]) byArea[area] = { total: 0, count: 0, totalPpp: 0 };
      byArea[area].total += t.price;
      byArea[area].count++;
      byArea[area].totalPpp += pricePerPyeong(t.price, t.area);
    }
    const areas = Object.entries(byArea).map(([area, v]) => ({
      area: Number(area),
      avgPrice: Math.round(v.total / v.count),
      avgPpp: Math.round(v.totalPpp / v.count),
      count: v.count,
    }));

    return {
      id: c.id,
      name: c.name,
      dong: c.dong,
      regionCode: c.regionCode,
      lat: c.lat,
      lng: c.lng,
      _count: c._count,
      avgPrice,
      avgPricePerPyeong,
      latestDealDate,
      areas,
    };
  });

  return NextResponse.json({ data });
}
