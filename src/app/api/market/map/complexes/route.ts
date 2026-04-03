import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pricePerPyeong } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/map/complexes
 * 지도에 표시할 단지 목록 (좌표 + 평균가)
 */
export async function GET() {
  const complexes = await prisma.apartmentComplex.findMany({
    where: {
      lat: { not: null },
      lng: { not: null },
      trades: { some: {} },
      NOT: { name: { startsWith: '(' } },
    },
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
    take: 500,
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
