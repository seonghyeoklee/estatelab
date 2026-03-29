/**
 * 대량 실거래가 수집 스크립트
 * 실행: npx tsx scripts/bulk-collect.ts
 * 옵션: --months 6 (기본 6개월)
 *       --regions seoul (서울만) | all (전국 주요)
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
  // 경기 주요
  '41117', '41135', '41173', '41190', '41285', '41465', '41570',
  // 부산 주요
  '26350', '26260',
  // 인천 주요
  '28185', '28260',
];

function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }
  return months;
}

async function main() {
  const monthCount = parseInt(process.argv.find(a => a.startsWith('--months='))?.split('=')[1] || '6', 10);
  const regionArg = process.argv.find(a => a.startsWith('--regions='))?.split('=')[1] || 'seoul';
  const codes = regionArg === 'all' ? MAJOR_CODES : SEOUL_CODES;
  const months = getRecentMonths(monthCount);

  const pool = new Pool({
    connectionString: (process.env.DATABASE_URL_UNPOOLED || '').replace(/^"|"$/g, ''),
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const totalJobs = codes.length * months.length;
  console.warn(`수집 대상: ${codes.length}개 지역 × ${months.length}개월 = ${totalJobs}건`);
  console.warn(`지역: ${regionArg} | 기간: ${months[months.length - 1]} ~ ${months[0]}`);

  let totalCollected = 0;
  let totalSkipped = 0;
  let jobsDone = 0;

  for (const lawdCd of codes) {
    for (const dealYmd of months) {
      jobsDone++;
      const prefix = `[${jobsDone}/${totalJobs}] ${lawdCd} ${dealYmd}`;

      try {
        const rawTrades = await fetchApartmentTrades(lawdCd, dealYmd);

        if (rawTrades.length === 0) {
          console.warn(`${prefix} — 0건 (스킵)`);
          continue;
        }

        let created = 0;
        let skipped = 0;

        // 지역 정보 (지오코딩용)
        const region = await prisma.region.findUnique({ where: { code: lawdCd } });

        for (const trade of rawTrades) {
          try {
            const dong = trade.dong || '';
            const jibun = trade.jibun || buildJibunAddress(trade.bonbun, trade.bubun) || '';
            const roadAddress = buildRoadAddress(trade.roadName, trade.roadBonbun, trade.roadBubun);

            // 기존 단지 확인
            let complex = await prisma.apartmentComplex.findUnique({
              where: {
                regionCode_name_dong_jibun: {
                  regionCode: lawdCd,
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
              // 새 단지 — 지오코딩 시도
              let lat: number | null = null;
              let lng: number | null = null;

              if (region) {
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
                } catch {
                  // 지오코딩 실패 — 무시
                }
              }

              complex = await prisma.apartmentComplex.create({
                data: {
                  regionCode: lawdCd,
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

        totalCollected += created;
        totalSkipped += skipped;
        console.warn(`${prefix} — ${created}건 수집 (${skipped}건 스킵)`);

        // API rate limit 방지 (1초 대기)
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        console.error(`${prefix} — 오류:`, e instanceof Error ? e.message : e);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.warn(`\n=== 완료 ===`);
  console.warn(`총 수집: ${totalCollected}건, 스킵: ${totalSkipped}건`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
