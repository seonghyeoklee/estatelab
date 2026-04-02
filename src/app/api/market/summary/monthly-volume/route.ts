import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 최근 12개월 월별 거래량
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const volumes = await prisma.$queryRaw<{ month: string; count: number }[]>`
    SELECT
      TO_CHAR(deal_date, 'YYYY-MM') AS month,
      COUNT(*)::int AS count
    FROM apartment_trades
    WHERE deal_date >= ${twelveMonthsAgo}
    GROUP BY TO_CHAR(deal_date, 'YYYY-MM')
    ORDER BY month
  `;

  return NextResponse.json({ data: volumes });
}
