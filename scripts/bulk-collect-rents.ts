/**
 * 대량 전월세 실거래가 수집 스크립트
 * 실행: npx tsx scripts/bulk-collect-rents.ts
 * 옵션: --months 6 (기본 6개월)
 *       --regions seoul (서울만) | all (전국 주요)
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
  '41117', '41135', '41173', '41190', '41285', '41465', '41570',
  '26350', '26260',
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
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    max: 3,
    statement_timeout: 30000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const totalJobs = codes.length * months.length;
  console.warn(`[전월세] 수집 대상: ${codes.length}개 지역 × ${months.length}개월 = ${totalJobs}건`);
  console.warn(`지역: ${regionArg} | 기간: ${months[months.length - 1]} ~ ${months[0]}`);

  let totalCollected = 0;
  let totalSkipped = 0;
  let jobsDone = 0;

  for (const lawdCd of codes) {
    for (const dealYmd of months) {
      jobsDone++;
      const prefix = `[${jobsDone}/${totalJobs}] ${lawdCd} ${dealYmd}`;

      try {
        const rawRents = await fetchApartmentRents(lawdCd, dealYmd);

        if (rawRents.length === 0) {
          console.warn(`${prefix} — 0건 (스킵)`);
          continue;
        }

        let created = 0;
        let skipped = 0;

        for (const rent of rawRents) {
          try {
            const dong = rent.dong || '';
            const jibun = rent.jibun || buildJibunAddress(rent.bonbun, rent.bubun) || '';

            const complex = await prisma.apartmentComplex.findUnique({
              where: {
                regionCode_name_dong_jibun: {
                  regionCode: lawdCd,
                  name: rent.aptName,
                  dong,
                  jibun,
                },
              },
            });

            if (!complex) {
              skipped++;
              continue;
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
            created++;
          } catch {
            skipped++;
          }
        }

        totalCollected += created;
        totalSkipped += skipped;
        console.warn(`${prefix} — ${created}건 수집 (${skipped}건 스킵)`);

        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.error(`${prefix} — 오류:`, e instanceof Error ? e.message : e);
        // 커넥션 에러 시 잠시 대기 후 계속
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  console.warn(`\n=== 전월세 수집 완료 ===`);
  console.warn(`총 수집: ${totalCollected}건, 스킵: ${totalSkipped}건`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
