import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // 1) 평당가 TOP 10 (최근 3개월 거래 기준)
    const topPricePerPyeong = await prisma.$queryRaw<
      { complex_id: string; name: string; sigungu: string; avg_ppp: number; trade_count: number }[]
    >`
      SELECT
        t.complex_id,
        c.name,
        r.sigungu,
        ROUND(AVG(t.price_per_pyeong))::int AS avg_ppp,
        COUNT(*)::int AS trade_count
      FROM apartment_trades t
      JOIN apartment_complexes c ON c.id = t.complex_id
      JOIN regions r ON r.code = c.region_code
      WHERE t.deal_date >= ${threeMonthsAgo}
        AND t.price_per_pyeong IS NOT NULL
      GROUP BY t.complex_id, c.name, r.sigungu
      HAVING COUNT(*) >= 3
      ORDER BY avg_ppp DESC
      LIMIT 10
    `;

    // 2) 전세가율 TOP 10 (전세 보증금 / 매매 평균가)
    const jeonseRatio = await prisma.$queryRaw<
      { complex_id: string; name: string; sigungu: string; avg_trade: number; avg_deposit: number; ratio: number }[]
    >`
      WITH recent_trades AS (
        SELECT complex_id, ROUND(AVG(price))::int AS avg_trade
        FROM apartment_trades
        WHERE deal_date >= ${threeMonthsAgo}
        GROUP BY complex_id
        HAVING COUNT(*) >= 2
      ),
      recent_rents AS (
        SELECT complex_id, ROUND(AVG(deposit))::int AS avg_deposit
        FROM apartment_rents
        WHERE deal_date >= ${threeMonthsAgo}
          AND rent_type = '전세'
        GROUP BY complex_id
        HAVING COUNT(*) >= 2
      )
      SELECT
        rt.complex_id,
        c.name,
        r.sigungu,
        rt.avg_trade,
        rr.avg_deposit,
        ROUND((rr.avg_deposit::numeric / rt.avg_trade * 100), 1)::float AS ratio
      FROM recent_trades rt
      JOIN recent_rents rr ON rr.complex_id = rt.complex_id
      JOIN apartment_complexes c ON c.id = rt.complex_id
      JOIN regions r ON r.code = c.region_code
      WHERE rt.avg_trade > 0
      ORDER BY ratio DESC
      LIMIT 10
    `;

    // 3) 이번 달 vs 지난 달 거래량 변화 (구별)
    const volumeChange = await prisma.$queryRaw<
      { sigungu: string; this_month: number; last_month: number; change_pct: number }[]
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
        COALESCE(tm.cnt, 0)::int AS this_month,
        COALESCE(lm.cnt, 0)::int AS last_month,
        CASE
          WHEN COALESCE(lm.cnt, 0) = 0 THEN 0
          ELSE ROUND(((COALESCE(tm.cnt, 0) - lm.cnt)::numeric / lm.cnt * 100), 1)::float
        END AS change_pct
      FROM regions r
      LEFT JOIN this_month tm ON tm.region_code = r.code
      LEFT JOIN last_month lm ON lm.region_code = r.code
      WHERE COALESCE(tm.cnt, 0) + COALESCE(lm.cnt, 0) > 0
      ORDER BY change_pct DESC
      LIMIT 10
    `;

    // 4) 가격 급등/급락 단지 (이번 달 vs 지난 달 평균가 비교)
    const priceChange = await prisma.$queryRaw<
      { complex_id: string; name: string; sigungu: string; this_avg: number; last_avg: number; change_pct: number }[]
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
        tm.avg_price::int AS this_avg,
        lm.avg_price::int AS last_avg,
        ROUND(((tm.avg_price - lm.avg_price)::numeric / lm.avg_price * 100), 1)::float AS change_pct
      FROM this_month tm
      JOIN last_month lm ON lm.complex_id = tm.complex_id
      JOIN apartment_complexes c ON c.id = tm.complex_id
      JOIN regions r ON r.code = c.region_code
      WHERE lm.avg_price > 0
      ORDER BY ABS(((tm.avg_price - lm.avg_price)::numeric / lm.avg_price * 100)) DESC
      LIMIT 10
    `;

    return NextResponse.json({
      data: {
        topPricePerPyeong: topPricePerPyeong.map((r) => ({
          complexId: r.complex_id,
          name: r.name,
          sigungu: r.sigungu,
          avgPricePerPyeong: Number(r.avg_ppp),
          tradeCount: Number(r.trade_count),
        })),
        jeonseRatio: jeonseRatio.map((r) => ({
          complexId: r.complex_id,
          name: r.name,
          sigungu: r.sigungu,
          avgTrade: Number(r.avg_trade),
          avgDeposit: Number(r.avg_deposit),
          ratio: Number(r.ratio),
        })),
        volumeChange: volumeChange.map((r) => ({
          sigungu: r.sigungu,
          thisMonth: Number(r.this_month),
          lastMonth: Number(r.last_month),
          changePct: Number(r.change_pct),
        })),
        priceChange: priceChange.map((r) => ({
          complexId: r.complex_id,
          name: r.name,
          sigungu: r.sigungu,
          thisAvg: Number(r.this_avg),
          lastAvg: Number(r.last_avg),
          changePct: Number(r.change_pct),
        })),
      },
    });
  } catch (error) {
    console.error('인사이트 API 오류:', error);
    return NextResponse.json({ error: '인사이트 데이터 조회 실패' }, { status: 500 });
  }
}
