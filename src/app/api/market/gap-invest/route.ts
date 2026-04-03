import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/gap-invest?minRatio=50&maxRatio=100&sido=서울특별시&minArea=59&maxArea=84&sort=ratio&page=1&limit=20
 * 갭투자 분석 — 전세가율 기반 단지 랭킹
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const minRatio = parseInt(sp.get('minRatio') || '0', 10);
  const maxRatio = parseInt(sp.get('maxRatio') || '100', 10);
  const sido = sp.get('sido') || '';
  const minArea = sp.get('minArea') ? parseFloat(sp.get('minArea')!) : undefined;
  const maxArea = sp.get('maxArea') ? parseFloat(sp.get('maxArea')!) : undefined;
  const sort = sp.get('sort') || 'ratio'; // ratio, gap, price
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // 면적 조건
  const areaWhere = minArea || maxArea
    ? `AND t.area ${minArea ? `>= ${minArea}` : ''} ${minArea && maxArea ? 'AND t.area' : ''} ${maxArea ? `<= ${maxArea}` : ''}`
        .replace('AND t.area  AND t.area', 'AND t.area')
    : '';
  const rentAreaWhere = areaWhere.replace(/t\.area/g, 'r.area');

  const sidoWhere = sido ? `AND reg.sido = '${sido.replace(/'/g, "''")}'` : '';

  const orderBy =
    sort === 'gap' ? 'ORDER BY gap_amount ASC' :
    sort === 'price' ? 'ORDER BY avg_trade DESC' :
    'ORDER BY jeonse_ratio DESC';

  try {
    const rows = await prisma.$queryRawUnsafe<{
      complex_id: string;
      name: string;
      dong: string;
      sigungu: string;
      sido: string;
      built_year: number | null;
      lat: number | null;
      lng: number | null;
      avg_trade: number;
      avg_jeonse: number;
      gap_amount: number;
      jeonse_ratio: number;
      trade_count: number;
      jeonse_count: number;
      area: number;
    }[]>(
      `
      WITH trade_avg AS (
        SELECT
          t.complex_id,
          ROUND(t.area)::int AS area,
          ROUND(AVG(t.price))::int AS avg_trade,
          COUNT(*)::int AS trade_count
        FROM apartment_trades t
        JOIN apartment_complexes c ON c.id = t.complex_id
        JOIN regions reg ON reg.code = c.region_code
        WHERE t.deal_date >= $1
          AND c.name NOT LIKE '(%'
          ${areaWhere}
          ${sidoWhere}
        GROUP BY t.complex_id, ROUND(t.area)
        HAVING COUNT(*) >= 2
      ),
      jeonse_avg AS (
        SELECT
          r.complex_id,
          ROUND(r.area)::int AS area,
          ROUND(AVG(r.deposit))::int AS avg_jeonse,
          COUNT(*)::int AS jeonse_count
        FROM apartment_rents r
        JOIN apartment_complexes c ON c.id = r.complex_id
        JOIN regions reg ON reg.code = c.region_code
        WHERE r.deal_date >= $1
          AND r.rent_type = '전세'
          AND c.name NOT LIKE '(%'
          ${rentAreaWhere}
          ${sidoWhere}
        GROUP BY r.complex_id, ROUND(r.area)
        HAVING COUNT(*) >= 2
      )
      SELECT
        ta.complex_id,
        c.name,
        c.dong,
        reg.sigungu,
        reg.sido,
        c.built_year,
        c.lat,
        c.lng,
        ta.avg_trade,
        ja.avg_jeonse,
        (ta.avg_trade - ja.avg_jeonse)::int AS gap_amount,
        ROUND((ja.avg_jeonse::numeric / ta.avg_trade * 100), 1)::float AS jeonse_ratio,
        ta.trade_count,
        ja.jeonse_count,
        ta.area
      FROM trade_avg ta
      JOIN jeonse_avg ja ON ja.complex_id = ta.complex_id AND ja.area = ta.area
      JOIN apartment_complexes c ON c.id = ta.complex_id
      JOIN regions reg ON reg.code = c.region_code
      WHERE ta.avg_trade > 0
        AND ROUND((ja.avg_jeonse::numeric / ta.avg_trade * 100), 1) >= $2
        AND ROUND((ja.avg_jeonse::numeric / ta.avg_trade * 100), 1) <= $3
      ${orderBy}
      OFFSET $4 LIMIT $5
      `,
      threeMonthsAgo, minRatio, maxRatio, offset, limit
    );

    // 총 개수
    const countResult = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `
      WITH trade_avg AS (
        SELECT t.complex_id, ROUND(t.area)::int AS area, ROUND(AVG(t.price))::int AS avg_trade
        FROM apartment_trades t
        JOIN apartment_complexes c ON c.id = t.complex_id
        JOIN regions reg ON reg.code = c.region_code
        WHERE t.deal_date >= $1 AND c.name NOT LIKE '(%' ${areaWhere} ${sidoWhere}
        GROUP BY t.complex_id, ROUND(t.area) HAVING COUNT(*) >= 2
      ),
      jeonse_avg AS (
        SELECT r.complex_id, ROUND(r.area)::int AS area, ROUND(AVG(r.deposit))::int AS avg_jeonse
        FROM apartment_rents r
        JOIN apartment_complexes c ON c.id = r.complex_id
        JOIN regions reg ON reg.code = c.region_code
        WHERE r.deal_date >= $1 AND r.rent_type = '전세' AND c.name NOT LIKE '(%' ${rentAreaWhere} ${sidoWhere}
        GROUP BY r.complex_id, ROUND(r.area) HAVING COUNT(*) >= 2
      )
      SELECT COUNT(*)::int AS cnt
      FROM trade_avg ta
      JOIN jeonse_avg ja ON ja.complex_id = ta.complex_id AND ja.area = ta.area
      WHERE ta.avg_trade > 0
        AND ROUND((ja.avg_jeonse::numeric / ta.avg_trade * 100), 1) >= $2
        AND ROUND((ja.avg_jeonse::numeric / ta.avg_trade * 100), 1) <= $3
      `,
      threeMonthsAgo, minRatio, maxRatio
    );

    const total = countResult[0]?.cnt ?? 0;

    const data = rows.map((r) => ({
      complexId: r.complex_id,
      name: r.name,
      dong: r.dong,
      sigungu: r.sigungu,
      sido: r.sido,
      builtYear: r.built_year,
      lat: r.lat,
      lng: r.lng,
      area: Number(r.area),
      avgTrade: Number(r.avg_trade),
      avgJeonse: Number(r.avg_jeonse),
      gapAmount: Number(r.gap_amount),
      jeonseRatio: Number(r.jeonse_ratio),
      tradeCount: Number(r.trade_count),
      jeonseCount: Number(r.jeonse_count),
    }));

    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('갭투자 분석 오류:', error);
    return NextResponse.json({ error: '갭투자 분석 실패' }, { status: 500 });
  }
}
