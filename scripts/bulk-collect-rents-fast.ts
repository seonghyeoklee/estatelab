/**
 * 고속 전월세 수집 스크립트
 * 실행: npx tsx scripts/bulk-collect-rents-fast.ts
 * 옵션: --months 60 --regions seoul
 *
 * 최적화:
 * - 단지 메모리 캐시 (DB 조회 최소화)
 * - 10건씩 병렬 upsert (Promise.allSettled)
 * - 이미 수집된 지역+월 스킵
 * - API 대기 300ms
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { fetchApartmentRents, buildJibunAddress } from '../src/lib/public-data';
import { config } from 'dotenv';
config({ path: '.env.local' });

const SEOUL_CODES = [
  '11110', '11140', '11170', '11200', '11215', '11230', '11260', '11290',
  '11305', '11320', '11350', '11380', '11410', '11440', '11470', '11500',
  '11530', '11545', '11560', '11590', '11620', '11650', '11680', '11710', '11740',
];

const MAJOR_CODES = [
  ...SEOUL_CODES,
  '41192', '41194', '41196', // 부천
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
  const monthCount = parseInt(process.argv.find(a => a.startsWith('--months='))?.split('=')[1] || '60', 10);
  const regionArg = process.argv.find(a => a.startsWith('--regions='))?.split('=')[1] || 'seoul';
  const codes = regionArg === 'all' ? MAJOR_CODES : SEOUL_CODES;
  const months = getRecentMonths(monthCount);

  const pool = new Pool({
    connectionString: (process.env.DATABASE_URL_UNPOOLED || '').replace(/^"|"$/g, ''),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const totalJobs = codes.length * months.length;
  console.warn(`[FAST 전월세] ${codes.length}개 지역 × ${months.length}개월 = ${totalJobs}건`);

  // 1) 단지 메모리 캐시
  const existingComplexes = await prisma.apartmentComplex.findMany({
    select: { id: true, regionCode: true, name: true, dong: true, jibun: true },
  });
  const complexCache: Record<string, string> = {};
  for (const c of existingComplexes) {
    complexCache[`${c.regionCode}:${c.name}:${c.dong}:${c.jibun}`] = c.id;
  }
  console.warn(`단지 캐시: ${existingComplexes.length}개`);

  // 2) 이미 수집된 지역+월 확인
  const existingRentCounts = await prisma.$queryRaw<{ region_code: string; ym: string; cnt: number }[]>`
    SELECT ac.region_code, TO_CHAR(ar.deal_date, 'YYYYMM') AS ym, COUNT(*)::int AS cnt
    FROM apartment_rents ar
    JOIN apartment_complexes ac ON ac.id = ar.complex_id
    GROUP BY ac.region_code, TO_CHAR(ar.deal_date, 'YYYYMM')
  `;
  const collected = new Set(existingRentCounts.map(r => `${r.region_code}:${r.ym}`));
  console.warn(`이미 수집된 지역+월: ${collected.size}개`);

  let totalCollected = 0;
  let totalSkipped = 0;
  let jobsDone = 0;
  const startTime = Date.now();

  for (const lawdCd of codes) {
    for (const dealYmd of months) {
      jobsDone++;
      const prefix = `[${jobsDone}/${totalJobs}]`;

      // 이미 수집된 월 스킵
      if (collected.has(`${lawdCd}:${dealYmd}`)) {
        continue;
      }

      try {
        const rawRents = await fetchApartmentRents(lawdCd, dealYmd);

        if (rawRents.length === 0) {
          console.warn(`${prefix} ${lawdCd} ${dealYmd} — 0건`);
          continue;
        }

        let created = 0;
        let skipped = 0;

        // 10건씩 병렬 upsert
        const BATCH = 10;
        for (let i = 0; i < rawRents.length; i += BATCH) {
          const batch = rawRents.slice(i, i + BATCH);
          const results = await Promise.allSettled(
            batch.map(async (rent) => {
              const dong = rent.dong || '';
              const jibun = rent.jibun || buildJibunAddress(rent.bonbun, rent.bubun) || '';
              const cacheKey = `${lawdCd}:${rent.aptName}:${dong}:${jibun}`;
              const complexId = complexCache[cacheKey];
              if (!complexId) throw new Error('no complex');

              const dealDate = new Date(rent.dealYear, rent.dealMonth - 1, rent.dealDay);
              const rentType = rent.monthlyRent > 0 ? '월세' : '전세';

              await prisma.apartmentRent.upsert({
                where: {
                  complexId_dealDate_area_floor_deposit_monthlyRent: {
                    complexId,
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
                  complexId,
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
            })
          );
          created += results.filter(r => r.status === 'fulfilled').length;
          skipped += results.filter(r => r.status === 'rejected').length;
        }

        totalCollected += created;
        totalSkipped += skipped;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.warn(`${prefix} ${lawdCd} ${dealYmd} — ${created}건 (${skipped}스킵) [${elapsed}s]`);

        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        console.error(`${prefix} ${lawdCd} ${dealYmd} — 오류:`, e instanceof Error ? e.message : e);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.warn(`\n=== 완료 (${totalTime}초) ===`);
  console.warn(`수집: ${totalCollected}건 | 스킵: ${totalSkipped}건`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
