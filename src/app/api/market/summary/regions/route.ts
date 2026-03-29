import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pricePerPyeong } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/summary/regions
 * 거래 데이터가 있는 지역별 요약 (평균가, 거래수, 최근 거래)
 */
export async function GET() {
  // 거래가 있는 지역만 조회 (상위 12개)
  const complexes = await prisma.apartmentComplex.findMany({
    where: { trades: { some: {} } },
    include: {
      region: true,
      trades: {
        orderBy: { dealDate: 'desc' },
        take: 1,
        select: { price: true, area: true, dealDate: true },
      },
    },
  });

  // 지역별 그룹핑
  const regionMap = new Map<
    string,
    {
      regionCode: string;
      sido: string;
      sigungu: string;
      trades: { price: number; area: number; pricePerPyeong: number }[];
      latestTrade: { name: string; price: number; area: number; dealDate: string } | null;
    }
  >();

  for (const complex of complexes) {
    const key = complex.regionCode;
    if (!regionMap.has(key)) {
      regionMap.set(key, {
        regionCode: key,
        sido: complex.region.sido,
        sigungu: complex.region.sigungu,
        trades: [],
        latestTrade: null,
      });
    }

    const entry = regionMap.get(key)!;

    for (const trade of complex.trades) {
      const ppp = pricePerPyeong(trade.price, trade.area);
      entry.trades.push({ price: trade.price, area: trade.area, pricePerPyeong: ppp });

      if (
        !entry.latestTrade ||
        new Date(trade.dealDate) > new Date(entry.latestTrade.dealDate)
      ) {
        entry.latestTrade = {
          name: complex.name,
          price: trade.price,
          area: trade.area,
          dealDate: new Date(trade.dealDate).toISOString(),
        };
      }
    }
  }

  const summaries = Array.from(regionMap.values())
    .map((r) => ({
      regionCode: r.regionCode,
      sido: r.sido,
      sigungu: r.sigungu,
      tradeCount: r.trades.length,
      avgPrice: Math.round(r.trades.reduce((s, t) => s + t.price, 0) / r.trades.length),
      avgPricePerPyeong: Math.round(
        r.trades.reduce((s, t) => s + t.pricePerPyeong, 0) / r.trades.length
      ),
      latestTrade: r.latestTrade,
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, 12);

  return NextResponse.json({ data: summaries });
}
