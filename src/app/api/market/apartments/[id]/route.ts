import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments/[id]
 * 단지 상세 + 거래 내역
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    include: {
      region: true,
      trades: {
        orderBy: { dealDate: 'desc' },
        take: 200,
      },
    },
  });

  if (!complex) {
    return NextResponse.json({ error: '단지를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 면적별 그룹핑
  const areaGroups = new Map<number, { count: number; avgPrice: number; avgPricePerPyeong: number }>();
  for (const trade of complex.trades) {
    const areaKey = Math.round(trade.area);
    const existing = areaGroups.get(areaKey);
    const pyeong = trade.area / 3.3058;
    const ppp = Math.round(trade.price / pyeong);

    if (existing) {
      existing.count++;
      existing.avgPrice = Math.round((existing.avgPrice * (existing.count - 1) + trade.price) / existing.count);
      existing.avgPricePerPyeong = Math.round((existing.avgPricePerPyeong * (existing.count - 1) + ppp) / existing.count);
    } else {
      areaGroups.set(areaKey, { count: 1, avgPrice: trade.price, avgPricePerPyeong: ppp });
    }
  }

  return NextResponse.json({
    data: {
      ...complex,
      areaGroups: Array.from(areaGroups.entries())
        .map(([area, stats]) => ({ area, ...stats }))
        .sort((a, b) => a.area - b.area),
    },
  });
}
