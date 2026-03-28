import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/regions?sido=서울특별시
 * 법정동코드 목록을 조회합니다.
 */
export async function GET(request: NextRequest) {
  const sido = request.nextUrl.searchParams.get('sido');

  const regions = await prisma.region.findMany({
    where: sido ? { sido } : undefined,
    orderBy: [{ sido: 'asc' }, { sigungu: 'asc' }],
  });

  return NextResponse.json({ data: regions });
}
