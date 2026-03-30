import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pricePerPyeong } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments/[id]/compare
 * 동일 지역 내 비슷한 면적 단지와 가격 비교
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    select: {
      name: true,
      regionCode: true,
      dong: true,
      trades: {
        select: { price: true, area: true },
        orderBy: { dealDate: 'desc' },
        take: 20,
      },
    },
  });

  if (!complex || complex.trades.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 이 단지의 대표 면적 (가장 많은 면적)
  const areaCounts = new Map<number, number>();
  for (const t of complex.trades) {
    const area = Math.round(t.area);
    areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
  }
  const mainArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const areaRange = { min: mainArea - 5, max: mainArea + 5 };

  // 이 단지 평균 평당가
  const myAvgPrice = Math.round(complex.trades.reduce((s, t) => s + t.price, 0) / complex.trades.length);
  const myAvgPpp = Math.round(complex.trades.reduce((s, t) => s + pricePerPyeong(t.price, t.area), 0) / complex.trades.length);

  // 같은 지역 내 비슷한 면적의 다른 단지
  const nearby = await prisma.apartmentComplex.findMany({
    where: {
      regionCode: complex.regionCode,
      id: { not: id },
      trades: {
        some: {
          area: { gte: areaRange.min, lte: areaRange.max },
        },
      },
    },
    select: {
      id: true,
      name: true,
      dong: true,
      builtYear: true,
      trades: {
        where: { area: { gte: areaRange.min, lte: areaRange.max } },
        select: { price: true, area: true },
        orderBy: { dealDate: 'desc' },
        take: 10,
      },
    },
    take: 10,
  });

  const comparisons = nearby
    .map((n) => {
      const avgPrice = Math.round(n.trades.reduce((s, t) => s + t.price, 0) / n.trades.length);
      const avgPpp = Math.round(n.trades.reduce((s, t) => s + pricePerPyeong(t.price, t.area), 0) / n.trades.length);
      const diff = Math.round(((avgPrice - myAvgPrice) / myAvgPrice) * 100);
      return {
        id: n.id,
        name: n.name,
        dong: n.dong,
        builtYear: n.builtYear,
        avgPrice,
        avgPpp,
        diff,
        tradeCount: n.trades.length,
      };
    })
    .sort((a, b) => b.avgPrice - a.avgPrice);

  return NextResponse.json({
    data: {
      mainArea,
      myAvgPrice,
      myAvgPpp,
      complexName: complex.name,
      comparisons,
    },
  });
}
