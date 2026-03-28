/**
 * 카카오 주소 검색 API로 단지 좌표를 정확하게 채우는 스크립트
 * 실행: npx tsx scripts/geocode-complexes.ts
 * 재실행: npx tsx scripts/geocode-complexes.ts --force
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { config } from 'dotenv';
config({ path: '.env.local' });

const KAKAO_REST_KEY = (process.env.KAKAO_REST_API_KEY || '').replace(/^"|"$/g, '');
const forceUpdate = process.argv.includes('--force');

/** 주소 검색 — 가장 정확 (도로명 또는 지번 주소) */
async function searchAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`;
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

/** 키워드 검색 — 폴백용 */
async function searchKeyword(query: string): Promise<{ lat: number; lng: number } | null> {
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
  jibun: string,
  sido: string,
  sigungu: string,
  roadAddress: string | null
): Promise<{ lat: number; lng: number; method: string } | null> {
  // 1순위: 도로명주소 (가장 정확 — "서울 강남구 압구정로42길 78")
  if (roadAddress && roadAddress.includes(' ')) {
    const fullRoad = `${sido} ${sigungu} ${roadAddress}`;
    const result = await searchAddress(fullRoad);
    if (result) return { ...result, method: '도로명주소' };
  }

  // 2순위: 지번주소 ("서울 강남구 신사동 632")
  if (dong && jibun) {
    const fullJibun = `${sido} ${sigungu} ${dong} ${jibun}`;
    const result = await searchAddress(fullJibun);
    if (result) return { ...result, method: '지번주소' };
  }

  // 3순위: 동 + 단지명 주소검색 ("서울 강남구 대치동 은마아파트")
  if (dong) {
    const aptQuery = name.includes('아파트') ? name : `${name}아파트`;
    const result = await searchKeyword(`${sido} ${sigungu} ${dong} ${aptQuery}`);
    if (result) return { ...result, method: '동+단지명' };
  }

  // 4순위: 시군구 + 단지명
  const result = await searchKeyword(`${sigungu} ${name}아파트`);
  if (result) return { ...result, method: '시군구+단지명' };

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
  const methods: Record<string, number> = {};

  for (const complex of complexes) {
    try {
      const coords = await geocode(
        complex.name,
        complex.dong,
        complex.jibun,
        complex.region.sido,
        complex.region.sigungu,
        complex.roadAddress
      );

      if (coords) {
        await prisma.apartmentComplex.update({
          where: { id: complex.id },
          data: { lat: coords.lat, lng: coords.lng },
        });
        updated++;
        methods[coords.method] = (methods[coords.method] || 0) + 1;
        console.warn(`✅ ${complex.name} (${complex.dong}) → ${coords.lat}, ${coords.lng} [${coords.method}]`);
      } else {
        failed++;
        console.warn(`❌ ${complex.name} (${complex.dong} ${complex.jibun}) road=${complex.roadAddress}`);
      }

      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      failed++;
      console.error(`❌ ${complex.name}:`, e instanceof Error ? e.message : e);
    }
  }

  console.warn(`\n완료: ${updated}개 좌표 등록, ${failed}개 실패`);
  console.warn('방법별:', methods);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
