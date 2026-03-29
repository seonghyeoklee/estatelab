import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments?regionCode=11680&q=래미안&minPrice=50000&maxPrice=100000&minArea=59&maxArea=84&minYear=2010&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const regionCode = sp.get('regionCode');
  const sido = sp.get('sido');
  const q = sp.get('q');
  const minPrice = sp.get('minPrice') ? parseInt(sp.get('minPrice')!, 10) : undefined;
  const maxPrice = sp.get('maxPrice') ? parseInt(sp.get('maxPrice')!, 10) : undefined;
  const minArea = sp.get('minArea') ? parseFloat(sp.get('minArea')!) : undefined;
  const maxArea = sp.get('maxArea') ? parseFloat(sp.get('maxArea')!) : undefined;
  const minYear = sp.get('minYear') ? parseInt(sp.get('minYear')!, 10) : undefined;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(Math.max(1, parseInt(sp.get('limit') || '20', 10)), 100);
  const skip = (page - 1) * limit;
  const sort = sp.get('sort') || 'name'; // name, price, trades, year

  // where 조건 구성
  const complexWhere: Record<string, unknown> = {};
  if (regionCode) complexWhere.regionCode = regionCode;
  if (sido) complexWhere.region = { sido };
  if (q) complexWhere.name = { contains: q, mode: 'insensitive' };
  if (minYear) complexWhere.builtYear = { ...(complexWhere.builtYear as object || {}), gte: minYear };
  complexWhere.trades = { some: {} };

  // 가격/면적 필터는 거래 데이터 기반
  if (minPrice || maxPrice || minArea || maxArea) {
    const tradeFilter: Record<string, unknown> = {};
    if (minPrice) tradeFilter.price = { ...(tradeFilter.price as object || {}), gte: minPrice };
    if (maxPrice) tradeFilter.price = { ...(tradeFilter.price as object || {}), lte: maxPrice };
    if (minArea) tradeFilter.area = { ...(tradeFilter.area as object || {}), gte: minArea };
    if (maxArea) tradeFilter.area = { ...(tradeFilter.area as object || {}), lte: maxArea };
    complexWhere.trades = { some: tradeFilter };
  }

  // 정렬
  const orderBy: Record<string, unknown> =
    sort === 'year' ? { builtYear: 'desc' } :
    sort === 'trades' ? { trades: { _count: 'desc' } } :
    { name: 'asc' };

  const [complexes, total] = await Promise.all([
    prisma.apartmentComplex.findMany({
      where: complexWhere,
      include: {
        region: { select: { sido: true, sigungu: true } },
        _count: { select: { trades: true } },
        trades: {
          orderBy: { dealDate: 'desc' },
          take: 1,
          select: { price: true, area: true, floor: true, dealDate: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.apartmentComplex.count({ where: complexWhere }),
  ]);

  const data = complexes.map((c) => ({
    id: c.id,
    name: c.name,
    dong: c.dong,
    regionCode: c.regionCode,
    region: c.region,
    builtYear: c.builtYear,
    tradeCount: c._count.trades,
    latestTrade: c.trades[0] || null,
  }));

  return NextResponse.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
