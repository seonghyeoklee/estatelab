import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchApartmentTrades } from '@/lib/public-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/collect/trades?lawdCd=11680&dealYmd=202602
 * 특정 지역+년월의 아파트 매매 실거래가를 수집합니다.
 *
 * 쿼리 파라미터:
 *   lawdCd  - 법정동코드 5자리 (필수)
 *   dealYmd - 계약년월 YYYYMM (필수)
 *
 * Authorization: Bearer {CRON_SECRET} 필수
 */
export async function POST(request: NextRequest) {
  // 인증 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const lawdCd = searchParams.get('lawdCd');
  const dealYmd = searchParams.get('dealYmd');

  if (!lawdCd || !dealYmd) {
    return NextResponse.json(
      { error: 'lawdCd와 dealYmd 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    // 1. 공공데이터 API 호출
    const rawTrades = await fetchApartmentTrades(lawdCd, dealYmd);

    if (rawTrades.length === 0) {
      return NextResponse.json({ data: { lawdCd, dealYmd, collected: 0, message: '거래 데이터 없음' } });
    }

    // 2. 단지별 그룹핑 + upsert
    let created = 0;
    let skipped = 0;

    for (const trade of rawTrades) {
      try {
        // 단지 upsert
        const dong = trade.dong || '';
        const jibun = trade.jibun || '';

        const complex = await prisma.apartmentComplex.upsert({
          where: {
            regionCode_name_dong_jibun: {
              regionCode: lawdCd,
              name: trade.aptName,
              dong,
              jibun,
            },
          },
          update: {
            builtYear: trade.buildYear || undefined,
            roadAddress: trade.roadAddress || undefined,
          },
          create: {
            regionCode: lawdCd,
            name: trade.aptName,
            dong,
            jibun,
            builtYear: trade.buildYear || null,
            roadAddress: trade.roadAddress || null,
          },
        });

        // 거래 데이터 upsert
        const dealDate = new Date(
          trade.dealYear,
          trade.dealMonth - 1,
          trade.dealDay
        );

        // 평당가 계산 (전용면적 ㎡ → 평)
        const pyeong = trade.area / 3.3058;
        const pricePerPyeong = Math.round(trade.price / pyeong);

        await prisma.apartmentTrade.upsert({
          where: {
            complexId_dealDate_area_floor_price: {
              complexId: complex.id,
              dealDate,
              area: trade.area,
              floor: trade.floor,
              price: trade.price,
            },
          },
          update: {
            dealType: trade.dealType,
            canceledAt: trade.canceledAt,
            registeredAt: trade.registeredAt,
            pricePerPyeong,
          },
          create: {
            complexId: complex.id,
            dealYear: trade.dealYear,
            dealMonth: trade.dealMonth,
            dealDay: trade.dealDay,
            dealDate,
            area: trade.area,
            floor: trade.floor,
            price: trade.price,
            pricePerPyeong,
            dealType: trade.dealType,
            canceledAt: trade.canceledAt,
            registeredAt: trade.registeredAt,
          },
        });

        created++;
      } catch {
        skipped++;
      }
    }

    const duration = Date.now() - startTime;

    // 3. 수집 로그 저장
    await prisma.cronExecutionLog.create({
      data: {
        endpoint: `/api/collect/trades?lawdCd=${lawdCd}&dealYmd=${dealYmd}`,
        status: skipped > 0 ? 'partial' : 'success',
        duration,
        recordCount: created,
        errorCount: skipped,
      },
    });

    return NextResponse.json({
      data: {
        lawdCd,
        dealYmd,
        total: rawTrades.length,
        collected: created,
        skipped,
        duration: `${duration}ms`,
      },
    });
  } catch (e) {
    const duration = Date.now() - startTime;
    const message = e instanceof Error ? e.message : 'Unknown error';

    await prisma.cronExecutionLog.create({
      data: {
        endpoint: `/api/collect/trades?lawdCd=${lawdCd}&dealYmd=${dealYmd}`,
        status: 'error',
        duration,
        detail: { error: message },
      },
    }).catch(() => {});

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
