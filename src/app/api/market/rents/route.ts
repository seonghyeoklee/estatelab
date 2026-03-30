import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/rents?complexId=xxx&limit=50&rentType=전세
 * 전월세 내역 조회
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const complexId = sp.get('complexId');
  const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);
  const rentType = sp.get('rentType'); // 전세 | 월세 | null(전체)

  const where: Record<string, unknown> = {};
  if (complexId) where.complexId = complexId;
  if (rentType) where.rentType = rentType;

  const rents = await prisma.apartmentRent.findMany({
    where,
    orderBy: { dealDate: 'desc' },
    take: limit,
    include: {
      complex: {
        select: { name: true, dong: true, regionCode: true },
      },
    },
  });

  return NextResponse.json({ data: rents });
}
