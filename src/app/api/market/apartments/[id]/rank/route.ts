import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pricePerPyeong } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments/[id]/rank
 * 같은 지역 내 시세 순위 + 회전율
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
      totalUnits: true,
      trades: {
        select: { price: true, area: true, dealDate: true },
        orderBy: { dealDate: 'desc' },
        take: 50,
      },
    },
  });

  if (!complex || complex.trades.length === 0) {
    return NextResponse.json({ data: null });
  }

  const myAvgPpp = Math.round(
    complex.trades.reduce((s, t) => s + pricePerPyeong(t.price, t.area), 0) / complex.trades.length
  );

  // 같은 지역 내 모든 단지의 평당가
  const siblings = await prisma.apartmentComplex.findMany({
    where: {
      regionCode: complex.regionCode,
      trades: { some: {} },
    },
    select: {
      id: true,
      name: true,
      totalUnits: true,
      trades: {
        select: { price: true, area: true },
        orderBy: { dealDate: 'desc' },
        take: 20,
      },
    },
  });

  const ranked = siblings
    .map((s) => {
      const avgPpp = Math.round(
        s.trades.reduce((sum, t) => sum + pricePerPyeong(t.price, t.area), 0) / s.trades.length
      );
      return { id: s.id, name: s.name, avgPpp, tradeCount: s.trades.length, totalUnits: s.totalUnits };
    })
    .sort((a, b) => b.avgPpp - a.avgPpp);

  const myRank = ranked.findIndex((r) => r.id === id) + 1;
  const totalInRegion = ranked.length;
  const percentile = Math.round((1 - (myRank - 1) / totalInRegion) * 100);

  // 회전율: 최근 1년 거래 건수 / 세대수
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentTrades = complex.trades.filter((t) => new Date(t.dealDate) >= oneYearAgo).length;
  const turnoverRate = complex.totalUnits && complex.totalUnits > 0
    ? Math.round((recentTrades / complex.totalUnits) * 100)
    : null;

  // 상위/하위 3개
  const top3 = ranked.slice(0, 3);
  const nearMe = ranked.slice(Math.max(0, myRank - 2), myRank + 1);

  return NextResponse.json({
    data: {
      myRank,
      totalInRegion,
      percentile,
      myAvgPpp,
      turnoverRate,
      recentTrades,
      totalUnits: complex.totalUnits,
      top3,
      nearMe,
    },
  });
}
