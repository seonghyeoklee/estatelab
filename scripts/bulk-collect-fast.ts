/**
 * 고속 실거래가 수집 스크립트
 * 실행: npx tsx scripts/bulk-collect-fast.ts
 * 옵션: --months 12 (기본 12개월)
 *       --regions seoul | all
 *
 * 최적화:
 * - 단지 조회를 메모리 캐시로 처리
 * - 지오코딩은 새 단지만 (기존 단지 스킵)
 * - API 대기 300ms로 단축
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { fetchApartmentTrades, buildRoadAddress, buildJibunAddress } from '../src/lib/public-data';
import { geocodeComplex } from '../src/lib/geocode';
import { config } from 'dotenv';
config({ path: '.env.local' });

const SEOUL_CODES = [
  '11110', '11140', '11170', '11200', '11215', '11230', '11260', '11290',
  '11305', '11320', '11350', '11380', '11410', '11440', '11470', '11500',
  '11530', '11545', '11560', '11590', '11620', '11650', '11680', '11710', '11740',
];

const MAJOR_CODES = [
  ...SEOUL_CODES,
  '41117', '41135', '41173', '41190', '41285', '41465', '41570',
  '26350', '26260', '28185', '28260',
];

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

async function main() {
  const monthCount = parseInt(process.argv.find(a => a.startsWith('--months='))?.split('=')[1] || '12', 10);
  const regionArg = process.argv.find(a => a.startsWith('--regions='))?.split('=')[1] || 'seoul';
  const codes = regionArg === 'all' ? MAJOR_CODES : SEOUL_CODES;
  const months = getRecentMonths(monthCount);

  const pool = new Pool({
    connectionString: (process.env.DATABASE_URL_UNPOOLED || '').replace(/^"|"$/g, ''),
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const totalJobs = codes.length * months.length;
  console.warn(`[FAST] 수집: ${codes.length}개 지역 × ${months.length}개월 = ${totalJobs}건`);

  // 1) 지역 정보 미리 로드
  const regions = await prisma.region.findMany();
  const regionMap = Object.fromEntries(regions.map(r => [r.code, r]));
  console.warn(`지역 ${regions.length}개 로드`);

  // 2) 기존 단지 메모리 캐시
  const existingComplexes = await prisma.apartmentComplex.findMany({
    select: { id: true, regionCode: true, name: true, dong: true, jibun: true },
  });
  const complexCache: Record<string, string> = {};
  for (const c of existingComplexes) {
    complexCache[`${c.regionCode}:${c.name}:${c.dong}:${c.jibun}`] = c.id;
  }
  console.warn(`기존 단지 ${existingComplexes.length}개 캐시`);

  let totalCollected = 0;
  let totalSkipped = 0;
  let newComplexes = 0;
  let jobsDone = 0;
  const startTime = Date.now();

  for (const lawdCd of codes) {
    for (const dealYmd of months) {
      jobsDone++;
      const prefix = `[${jobsDone}/${totalJobs}]`;

      try {
        const rawTrades = await fetchApartmentTrades(lawdCd, dealYmd);

        if (rawTrades.length === 0) {
          console.warn(`${prefix} ${lawdCd} ${dealYmd} — 0건`);
          continue;
        }

        let created = 0;
        let skipped = 0;

        // 1단계: 새 단지 먼저 생성 (순차, 새 단지만)
        for (const trade of rawTrades) {
          const dong = trade.dong || '';
          const jibun = trade.jibun || buildJibunAddress(trade.bonbun, trade.bubun) || '';
          const cacheKey = `${lawdCd}:${trade.aptName}:${dong}:${jibun}`;
          if (complexCache[cacheKey]) continue;

          try {
            const existing = await prisma.apartmentComplex.findUnique({
              where: { regionCode_name_dong_jibun: { regionCode: lawdCd, name: trade.aptName, dong, jibun } },
              select: { id: true },
            });
            if (existing) {
              complexCache[cacheKey] = existing.id;
            } else {
              const roadAddress = buildRoadAddress(trade.roadName, trade.roadBonbun, trade.roadBubun);
              let lat: number | null = null;
              let lng: number | null = null;
              const region = regionMap[lawdCd];
              if (region) {
                try {
                  const coords = await geocodeComplex({
                    name: trade.aptName, dong, jibun,
                    sido: region.sido, sigungu: region.sigungu, roadAddress,
                  });
                  if (coords) { lat = coords.lat; lng = coords.lng; }
                } catch { /* skip */ }
              }
              const nc = await prisma.apartmentComplex.create({
                data: { regionCode: lawdCd, name: trade.aptName, dong, jibun, builtYear: trade.buildYear || null, roadAddress, lat, lng },
              });
              complexCache[cacheKey] = nc.id;
              newComplexes++;
            }
          } catch { /* skip duplicate */ }
        }

        // 2단계: 거래 upsert를 10개씩 병렬 처리
        const BATCH = 10;
        for (let i = 0; i < rawTrades.length; i += BATCH) {
          const batch = rawTrades.slice(i, i + BATCH);
          const results = await Promise.allSettled(
            batch.map(async (trade) => {
              const dong = trade.dong || '';
              const jibun = trade.jibun || buildJibunAddress(trade.bonbun, trade.bubun) || '';
              const cacheKey = `${lawdCd}:${trade.aptName}:${dong}:${jibun}`;
              const complexId = complexCache[cacheKey];
              if (!complexId) throw new Error('no complex');

              const dealDate = new Date(trade.dealYear, trade.dealMonth - 1, trade.dealDay);
              const ppp = Math.round(trade.price / (trade.area / 3.3058));

              await prisma.apartmentTrade.upsert({
                where: {
                  complexId_dealDate_area_floor_price: { complexId, dealDate, area: trade.area, floor: trade.floor, price: trade.price },
                },
                update: { dealType: trade.dealType, canceledAt: trade.canceledAt, registeredAt: trade.registeredAt, pricePerPyeong: ppp },
                create: {
                  complexId, dealYear: trade.dealYear, dealMonth: trade.dealMonth, dealDay: trade.dealDay,
                  dealDate, area: trade.area, floor: trade.floor, price: trade.price, pricePerPyeong: ppp,
                  dealType: trade.dealType, canceledAt: trade.canceledAt, registeredAt: trade.registeredAt,
                },
              });
            })
          );
          created += results.filter(r => r.status === 'fulfilled').length;
          skipped += results.filter(r => r.status === 'rejected').length;
        }

        totalCollected += created;
        totalSkipped += skipped;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.warn(`${prefix} ${lawdCd} ${dealYmd} — ${created}건 (${skipped}스킵) [${elapsed}s]`);

        // API rate limit 방지 — 300ms로 단축
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        console.error(`${prefix} ${lawdCd} ${dealYmd} — 오류:`, e instanceof Error ? e.message : e);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.warn(`\n=== 완료 (${totalTime}초) ===`);
  console.warn(`수집: ${totalCollected}건 | 스킵: ${totalSkipped}건 | 신규 단지: ${newComplexes}개`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
