import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments/[id]/rents
 * 면적별 전월세 현황 + 전세가율
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // 최근 3개월 전월세
  const rents = await prisma.apartmentRent.findMany({
    where: { complexId: id, dealDate: { gte: threeMonthsAgo } },
    select: { area: true, rentType: true, deposit: true, monthlyRent: true },
  });

  // 최근 3개월 매매
  const trades = await prisma.apartmentTrade.findMany({
    where: { complexId: id, dealDate: { gte: threeMonthsAgo } },
    select: { area: true, price: true },
  });

  if (rents.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 면적별 그룹핑 (5㎡ 단위로 반올림)
  const areaKeys = [...new Set(rents.map((r) => Math.round(r.area)))].sort((a, b) => a - b);

  const data = areaKeys.map((area) => {
    const areaRents = rents.filter((r) => Math.round(r.area) === area);
    const jeonse = areaRents.filter((r) => r.rentType === '전세');
    const wolse = areaRents.filter((r) => r.rentType === '월세');
    const areaTrades = trades.filter((t) => Math.round(t.area) === area);

    const avgDeposit = jeonse.length > 0
      ? Math.round(jeonse.reduce((s, r) => s + r.deposit, 0) / jeonse.length)
      : 0;
    const avgMonthlyRent = wolse.length > 0
      ? Math.round(wolse.reduce((s, r) => s + r.monthlyRent, 0) / wolse.length)
      : 0;
    const avgTradePrice = areaTrades.length > 0
      ? Math.round(areaTrades.reduce((s, t) => s + t.price, 0) / areaTrades.length)
      : 0;

    const jeonseRatio = avgDeposit > 0 && avgTradePrice > 0
      ? Math.round((avgDeposit / avgTradePrice) * 100)
      : null;

    return {
      area,
      jeonseCount: jeonse.length,
      wolseCount: wolse.length,
      avgDeposit,
      avgMonthlyRent,
      avgTradePrice,
      jeonseRatio,
    };
  });

  return NextResponse.json({ data });
}
