import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage, buildDailyReport } from '@/lib/telegram';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // CRON_SECRET 인증
  const authHeader = req.headers.get('authorization');
  const cronSecret = env('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 이번 달 거래 현황
    const [tradeCount, rentCount, avgPriceResult, baseRate] = await Promise.all([
      prisma.apartmentTrade.count({ where: { dealDate: { gte: thisMonth } } }),
      prisma.apartmentRent.count({ where: { dealDate: { gte: thisMonth } } }),
      prisma.apartmentTrade.aggregate({
        where: { dealDate: { gte: thisMonth } },
        _avg: { price: true },
      }),
      prisma.interestRate.findFirst({
        where: { name: 'BASE_RATE' },
        orderBy: { date: 'desc' },
      }),
    ]);

    // 가격 변동 TOP (이번 달 vs 지난 달)
    const priceChanges = await prisma.$queryRaw<
      { complex_id: string; name: string; sigungu: string; change_pct: number }[]
    >`
      WITH this_month AS (
        SELECT complex_id, ROUND(AVG(price))::int AS avg_price
        FROM apartment_trades
        WHERE deal_date >= ${thisMonth}
        GROUP BY complex_id
        HAVING COUNT(*) >= 2
      ),
      last_month AS (
        SELECT complex_id, ROUND(AVG(price))::int AS avg_price
        FROM apartment_trades
        WHERE deal_date >= ${lastMonth} AND deal_date < ${thisMonth}
        GROUP BY complex_id
        HAVING COUNT(*) >= 2
      )
      SELECT
        tm.complex_id,
        c.name,
        r.sigungu,
        ROUND(((tm.avg_price - lm.avg_price)::numeric / lm.avg_price * 100), 1)::float AS change_pct
      FROM this_month tm
      JOIN last_month lm ON lm.complex_id = tm.complex_id
      JOIN apartment_complexes c ON c.id = tm.complex_id
      JOIN regions r ON r.code = c.region_code
      WHERE lm.avg_price > 0
      ORDER BY change_pct DESC
    `;

    const priceUp = priceChanges
      .filter((r) => r.change_pct > 0)
      .slice(0, 5)
      .map((r) => ({ name: r.name, sigungu: r.sigungu, changePct: Number(r.change_pct) }));

    const priceDown = priceChanges
      .filter((r) => r.change_pct < 0)
      .sort((a, b) => a.change_pct - b.change_pct)
      .slice(0, 5)
      .map((r) => ({ name: r.name, sigungu: r.sigungu, changePct: Number(r.change_pct) }));

    // 거래량 TOP (구별)
    const volumeTop = await prisma.$queryRaw<
      { sigungu: string; cnt: number; change_pct: number }[]
    >`
      WITH this_month AS (
        SELECT c.region_code, COUNT(*)::int AS cnt
        FROM apartment_trades t
        JOIN apartment_complexes c ON c.id = t.complex_id
        WHERE t.deal_date >= ${thisMonth}
        GROUP BY c.region_code
      ),
      last_month AS (
        SELECT c.region_code, COUNT(*)::int AS cnt
        FROM apartment_trades t
        JOIN apartment_complexes c ON c.id = t.complex_id
        WHERE t.deal_date >= ${lastMonth} AND t.deal_date < ${thisMonth}
        GROUP BY c.region_code
      )
      SELECT
        r.sigungu,
        COALESCE(tm.cnt, 0)::int AS cnt,
        CASE
          WHEN COALESCE(lm.cnt, 0) = 0 THEN 0
          ELSE ROUND(((COALESCE(tm.cnt, 0) - lm.cnt)::numeric / lm.cnt * 100), 1)::float
        END AS change_pct
      FROM regions r
      LEFT JOIN this_month tm ON tm.region_code = r.code
      LEFT JOIN last_month lm ON lm.region_code = r.code
      WHERE COALESCE(tm.cnt, 0) > 0
      ORDER BY cnt DESC
      LIMIT 5
    `;

    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const message = buildDailyReport({
      date: dateStr,
      totalTrades: tradeCount,
      totalRents: rentCount,
      avgPrice: avgPriceResult._avg.price ? Math.round(avgPriceResult._avg.price) : null,
      priceUp,
      priceDown,
      volumeTop: volumeTop.map((r) => ({
        sigungu: r.sigungu,
        count: Number(r.cnt),
        changePct: Number(r.change_pct),
      })),
      baseRate: baseRate ? { rate: baseRate.rate, change: baseRate.change } : null,
    });

    const sent = await sendTelegramMessage(message);

    // 알림 로그 저장
    await prisma.alert.create({
      data: {
        type: 'DAILY_REPORT',
        title: `일일 리포트 ${dateStr}`,
        message: sent ? '전송 성공' : '전송 실패',
        metadata: { tradeCount, rentCount, priceUpCount: priceUp.length, priceDownCount: priceDown.length },
        sentAt: sent ? now : null,
      },
    });

    return NextResponse.json({
      data: {
        sent,
        date: dateStr,
        tradeCount,
        rentCount,
        priceUp: priceUp.length,
        priceDown: priceDown.length,
      },
    });
  } catch (error) {
    console.error('일일 리포트 오류:', error);
    return NextResponse.json({ error: '일일 리포트 생성 실패' }, { status: 500 });
  }
}
