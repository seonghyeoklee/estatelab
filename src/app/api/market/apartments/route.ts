import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments?regionCode=11680&q=래미안&page=1&limit=20
 * 아파트 단지 목록 조회
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const regionCode = sp.get('regionCode');
  const q = sp.get('q');
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (regionCode) where.regionCode = regionCode;
  if (q) where.name = { contains: q, mode: 'insensitive' };
  // 거래가 있는 단지만
  where.trades = { some: {} };

  const [complexes, total] = await Promise.all([
    prisma.apartmentComplex.findMany({
      where,
      include: {
        region: { select: { sido: true, sigungu: true } },
        _count: { select: { trades: true } },
        trades: {
          orderBy: { dealDate: 'desc' },
          take: 1,
          select: { price: true, area: true, dealDate: true, floor: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.apartmentComplex.count({ where }),
  ]);

  const data = complexes.map((c) => {
    const latest = c.trades[0];
    return {
      id: c.id,
      name: c.name,
      dong: c.dong,
      regionCode: c.regionCode,
      region: c.region,
      builtYear: c.builtYear,
      tradeCount: c._count.trades,
      latestTrade: latest
        ? {
            price: latest.price,
            area: latest.area,
            floor: latest.floor,
            dealDate: latest.dealDate,
          }
        : null,
    };
  });

  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
