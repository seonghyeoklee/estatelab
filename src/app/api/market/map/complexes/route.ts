import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        select: { price: true, area: true },
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
          c.trades.reduce((s, t) => s + t.price / (t.area / 3.3058), 0) / c.trades.length
        )
      : 0;

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
    };
  });

  return NextResponse.json({ data });
}
