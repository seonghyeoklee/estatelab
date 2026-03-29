import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchApartmentTrades, buildRoadAddress, buildJibunAddress } from '@/lib/public-data';
import { geocodeComplex } from '@/lib/geocode';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/collect/trades-batch?dealYmd=202602&offset=0&limit=25
 * 전체 지역을 순회하며 실거래가를 배치 수집합니다.
 * Vercel Cron에서 호출 — offset/limit으로 분할 실행
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = (process.env.CRON_SECRET || '').replace(/^"|"$/g, '');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;

  // dealYmd가 없으면 전월 자동 계산
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYmd = `${prevMonth.getFullYear()}${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const dealYmd = sp.get('dealYmd') || defaultYmd;

  const offset = parseInt(sp.get('offset') || '0', 10);
  const limit = parseInt(sp.get('limit') || '25', 10);

  const startTime = Date.now();

  try {
    // 수집 대상 지역 가져오기
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
        const rawTrades = await fetchApartmentTrades(region.code, dealYmd);
        if (rawTrades.length === 0) continue;

        for (const trade of rawTrades) {
          try {
            const dong = trade.dong || '';
            const jibun = trade.jibun || buildJibunAddress(trade.bonbun, trade.bubun) || '';
            const roadAddress = buildRoadAddress(trade.roadName, trade.roadBonbun, trade.roadBubun);

            let complex = await prisma.apartmentComplex.findUnique({
              where: {
                regionCode_name_dong_jibun: {
                  regionCode: region.code,
                  name: trade.aptName,
                  dong,
                  jibun,
                },
              },
            });

            if (complex) {
              complex = await prisma.apartmentComplex.update({
                where: { id: complex.id },
                data: {
                  builtYear: trade.buildYear || undefined,
                  roadAddress: roadAddress || undefined,
                },
              });
            } else {
              let lat: number | null = null;
              let lng: number | null = null;
              try {
                const coords = await geocodeComplex({
                  name: trade.aptName,
                  dong,
                  jibun,
                  sido: region.sido,
                  sigungu: region.sigungu,
                  roadAddress,
                });
                if (coords) { lat = coords.lat; lng = coords.lng; }
              } catch { /* 무시 */ }

              complex = await prisma.apartmentComplex.create({
                data: {
                  regionCode: region.code,
                  name: trade.aptName,
                  dong,
                  jibun,
                  builtYear: trade.buildYear || null,
                  roadAddress,
                  lat,
                  lng,
                },
              });
            }

            const dealDate = new Date(trade.dealYear, trade.dealMonth - 1, trade.dealDay);
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
              update: { dealType: trade.dealType, pricePerPyeong },
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
            totalCollected++;
          } catch {
            totalSkipped++;
          }
        }

        // API rate limit
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`[trades-batch] ${region.code} ${dealYmd}:`, e instanceof Error ? e.message : e);
      }
    }

    const duration = Date.now() - startTime;

    await prisma.cronExecutionLog.create({
      data: {
        endpoint: `/api/collect/trades-batch?dealYmd=${dealYmd}&offset=${offset}`,
        status: totalSkipped > 0 ? 'partial' : 'success',
        duration,
        recordCount: totalCollected,
        errorCount: totalSkipped,
      },
    });

    return NextResponse.json({
      data: {
        dealYmd,
        regions: regions.length,
        collected: totalCollected,
        skipped: totalSkipped,
        offset,
        nextOffset: offset + limit,
        duration: `${duration}ms`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
