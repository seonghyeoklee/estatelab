import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/rates
 * 최신 금리 데이터를 조회합니다.
 */
export async function GET() {
  // 각 금리 유형별 최신 1건씩
  const rates = await prisma.interestRate.findMany({
    orderBy: { date: 'desc' },
    distinct: ['name'],
    take: 10,
  });

  return NextResponse.json({ data: rates });
}
