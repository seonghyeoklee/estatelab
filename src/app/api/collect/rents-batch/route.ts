import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchApartmentRents, buildJibunAddress } from '@/lib/public-data';
import { validateCronAuth, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/collect/rents-batch?dealYmd=202602&offset=0&limit=25
 * 전체 지역을 순회하며 전월세 실거래가를 배치 수집합니다.
 */
export async function POST(request: NextRequest) {
  if (!validateCronAuth(request.headers.get('authorization'))) {
    return unauthorizedResponse();
  }

  const sp = request.nextUrl.searchParams;
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYmd = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const dealYmd = sp.get('dealYmd') || defaultYmd;
  const offset = parseInt(sp.get('offset') || '0', 10);
  const limit = parseInt(sp.get('limit') || '25', 10);
  const startTime = Date.now();

  try {
    const regions = await prisma.region.findMany({
      orderBy: { code: 'asc' },
      skip: offset,
      take: limit,
    });

    if (regions.length === 0) {
      return NextResponse.json({ data: { dealYmd, message: '더 이상 수집할 지역이 없습니다.', offset, limit } });
    }

    let totalCollected = 0;
    let totalSkipped = 0;

    for (const region of regions) {
      try {
        const rawRents = await fetchApartmentRents(region.code, dealYmd);
        if (rawRents.length === 0) continue;

        for (const rent of rawRents) {
          try {
            const dong = rent.dong || '';
            const jibun = rent.jibun || buildJibunAddress(rent.bonbun, rent.bubun) || '';

            // 기존 단지 찾기 (매매 수집에서 이미 생성된 단지)
            const complex = await prisma.apartmentComplex.findUnique({
              where: {
                regionCode_name_dong_jibun: {
                  regionCode: region.code,
                  name: rent.aptName,
                  dong,
                  jibun,
                },
              },
            });

            if (!complex) {
              totalSkipped++;
              continue; // 매매 데이터가 없는 단지는 스킵
            }

            const dealDate = new Date(rent.dealYear, rent.dealMonth - 1, rent.dealDay);
            const rentType = rent.monthlyRent > 0 ? '월세' : '전세';

            await prisma.apartmentRent.upsert({
              where: {
                complexId_dealDate_area_floor_deposit_monthlyRent: {
                  complexId: complex.id,
                  dealDate,
                  area: rent.area,
                  floor: rent.floor,
                  deposit: rent.deposit,
                  monthlyRent: rent.monthlyRent,
                },
              },
              update: {
                rentType,
                prevDeposit: rent.prevDeposit,
                prevMonthlyRent: rent.prevMonthlyRent,
                contractTerm: rent.contractTerm,
                contractType: rent.contractType,
              },
              create: {
                complexId: complex.id,
                dealYear: rent.dealYear,
                dealMonth: rent.dealMonth,
                dealDay: rent.dealDay,
                dealDate,
                area: rent.area,
                floor: rent.floor,
                rentType,
                deposit: rent.deposit,
                monthlyRent: rent.monthlyRent,
                prevDeposit: rent.prevDeposit,
                prevMonthlyRent: rent.prevMonthlyRent,
                contractTerm: rent.contractTerm,
                contractType: rent.contractType,
              },
            });
            totalCollected++;
          } catch {
            totalSkipped++;
          }
        }

        // API rate limit 방지
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        // 개별 지역 실패는 무시하고 계속
      }
    }

    const duration = Date.now() - startTime;

    // 실행 로그 기록
    await prisma.cronExecutionLog.create({
      data: {
        endpoint: '/api/collect/rents-batch',
        status: totalSkipped > totalCollected ? 'partial' : 'success',
        duration,
        recordCount: totalCollected,
        errorCount: totalSkipped,
        detail: { dealYmd, offset, limit, regionCount: regions.length },
        triggeredBy: 'cron',
      },
    });

    return NextResponse.json({
      data: {
        dealYmd,
        offset,
        limit,
        regionCount: regions.length,
        collected: totalCollected,
        skipped: totalSkipped,
        durationMs: duration,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '전월세 수집 중 오류' },
      { status: 500 }
    );
  }
}
