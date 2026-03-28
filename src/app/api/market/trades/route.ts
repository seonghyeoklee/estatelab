import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/trades?regionCode=11680&year=2026&month=2&page=1&limit=50
 * 실거래가 데이터를 조회합니다.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const regionCode = sp.get('regionCode');
  const complexId = sp.get('complexId');
  const year = sp.get('year') ? parseInt(sp.get('year')!, 10) : undefined;
  const month = sp.get('month') ? parseInt(sp.get('month')!, 10) : undefined;
  const page = parseInt(sp.get('page') || '1', 10);
  const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (complexId) {
    where.complexId = complexId;
  } else if (regionCode) {
    where.complex = { regionCode };
  }

  if (year) where.dealYear = year;
  if (month) where.dealMonth = month;

  const [trades, total] = await Promise.all([
    prisma.apartmentTrade.findMany({
      where,
      include: {
        complex: {
          select: { name: true, dong: true, regionCode: true },
        },
      },
      orderBy: { dealDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.apartmentTrade.count({ where }),
  ]);

  return NextResponse.json({
    data: trades,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}
