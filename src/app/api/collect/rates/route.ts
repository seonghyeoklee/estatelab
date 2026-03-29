import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchRates } from '@/lib/ecos';
import { validateCronAuth, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/collect/rates?months=24
 * ECOS 금리 데이터를 수집합니다.
 */
export async function POST(request: NextRequest) {
  if (!validateCronAuth(request.headers.get('authorization'))) {
    return unauthorizedResponse();
  }

  const months = parseInt(request.nextUrl.searchParams.get('months') || '24', 10);
  const startTime = Date.now();

  try {
    const rates = await fetchRates(months);

    let created = 0;
    let skipped = 0;

    for (const rate of rates) {
      try {
        // 이전 데이터 조회 (변동폭 계산)
        const prev = await prisma.interestRate.findFirst({
          where: { name: rate.name, date: { lt: rate.date } },
          orderBy: { date: 'desc' },
        });
        const change = prev ? Math.round((rate.rate - prev.rate) * 100) : 0; // bp

        await prisma.interestRate.upsert({
          where: {
            name_date: { name: rate.name, date: rate.date },
          },
          update: { rate: rate.rate, nameKr: rate.nameKr, change },
          create: {
            name: rate.name,
            nameKr: rate.nameKr,
            date: rate.date,
            rate: rate.rate,
            change,
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }

    const duration = Date.now() - startTime;

    await prisma.cronExecutionLog.create({
      data: {
        endpoint: '/api/collect/rates',
        status: skipped > 0 ? 'partial' : 'success',
        duration,
        recordCount: created,
        errorCount: skipped,
      },
    });

    return NextResponse.json({
      data: { total: rates.length, collected: created, skipped, duration: `${duration}ms` },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
