/**
 * 카카오 지오코딩 API로 단지 좌표를 채우는 스크립트
 * 실행: npx tsx scripts/geocode-complexes.ts
 * 재실행: npx tsx scripts/geocode-complexes.ts --force (기존 좌표 덮어쓰기)
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { config } from 'dotenv';
config({ path: '.env.local' });

const KAKAO_REST_KEY = (process.env.KAKAO_REST_API_KEY || '').replace(/^"|"$/g, '');
const forceUpdate = process.argv.includes('--force');

async function searchPlace(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.documents?.length > 0) {
    return {
      lat: parseFloat(data.documents[0].y),
      lng: parseFloat(data.documents[0].x),
    };
  }
  return null;
}

async function geocode(
  name: string,
  dong: string,
  sido: string,
  sigungu: string,
  jibun: string,
  roadAddress: string | null
): Promise<{ lat: number; lng: number } | null> {
  // 1순위: 도로명주소가 있으면 가장 정확
  if (roadAddress) {
    const result = await searchPlace(`${sigungu} ${roadAddress}`);
    if (result) return result;
  }

  // 2순위: "시군구 단지명+아파트" (아파트 카테고리 매칭률 높음)
  const aptName = name.includes('아파트') ? name : `${name}아파트`;
  const result2 = await searchPlace(`${sigungu} ${aptName}`);
  if (result2) return result2;

  // 3순위: "시군구 동 단지명"
  if (dong) {
    const result3 = await searchPlace(`${sigungu} ${dong} ${name}`);
    if (result3) return result3;
  }

  // 4순위: "시도 시군구 지번" (지번 주소 직접 검색)
  if (jibun) {
    const result4 = await searchPlace(`${sido} ${sigungu} ${dong} ${jibun}`);
    if (result4) return result4;
  }

  return null;
}

async function main() {
  if (!KAKAO_REST_KEY) {
    console.error('KAKAO_REST_API_KEY가 설정되지 않았습니다.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: (process.env.DATABASE_URL_UNPOOLED || '').replace(/^"|"$/g, ''),
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const where = forceUpdate ? {} : { lat: null };
  const complexes = await prisma.apartmentComplex.findMany({
    where,
    include: { region: true },
    take: 500,
  });

  console.warn(`대상 단지: ${complexes.length}개 ${forceUpdate ? '(전체 재등록)' : '(좌표 미등록만)'}`);

  let updated = 0;
  let failed = 0;

  for (const complex of complexes) {
    try {
      const coords = await geocode(
        complex.name,
        complex.dong,
        complex.region.sido,
        complex.region.sigungu,
        complex.jibun,
        complex.roadAddress
      );

      if (coords) {
        await prisma.apartmentComplex.update({
          where: { id: complex.id },
          data: { lat: coords.lat, lng: coords.lng },
        });
        updated++;
        console.warn(`✅ ${complex.name} (${complex.dong}) → ${coords.lat}, ${coords.lng}`);
      } else {
        failed++;
        console.warn(`❌ ${complex.name} (${complex.dong})`);
      }

      // rate limit 방지
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      failed++;
      console.error(`❌ ${complex.name}:`, e instanceof Error ? e.message : e);
    }
  }

  console.warn(`\n완료: ${updated}개 좌표 등록, ${failed}개 실패`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
