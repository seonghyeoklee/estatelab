import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/rates/history
 * 전체 금리 히스토리 데이터를 조회합니다.
 */
export async function GET() {
  const rates = await prisma.interestRate.findMany({
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ data: rates });
}
