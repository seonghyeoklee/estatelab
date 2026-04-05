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
const fixDuplicates = process.argv.includes('--fix-duplicates');

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
  // 1순위: 키워드 검색 — 단지명으로 건물 정확 좌표 (같은 지번 다른 단지 구분)
  const aptName = name.includes('아파트') ? name : `${name}아파트`;
  if (dong) {
    const result = await searchKeyword(`${sido} ${sigungu} ${dong} ${aptName}`);
    if (result) return { ...result, method: '동+단지명' };
  }

  // 2순위: 시군구 + 단지명
  {
    const result = await searchKeyword(`${sigungu} ${aptName}`);
    if (result) return { ...result, method: '시군구+단지명' };
  }

  // 3순위: 도로명주소
  if (roadAddress && roadAddress.includes(' ')) {
    const fullRoad = `${sido} ${sigungu} ${roadAddress}`;
    const result = await searchAddress(fullRoad);
    if (result) return { ...result, method: '도로명주소' };
  }

  // 4순위: 지번주소 (같은 지번에 여러 단지 가능 → 최후 수단)
  if (dong && jibun) {
    const fullJibun = `${sido} ${sigungu} ${dong} ${jibun}`;
    const result = await searchAddress(fullJibun);
    if (result) return { ...result, method: '지번주소' };
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

  let complexes;

  if (fixDuplicates) {
    // 좌표 중복 단지만 대상 — 같은 좌표를 가진 다른 단지가 있는 경우
    complexes = await prisma.$queryRaw<{
      id: string; name: string; dong: string; jibun: string;
      road_address: string | null; region_code: string;
      lat: number; lng: number; sido: string; sigungu: string;
    }[]>`
      SELECT a.id, a.name, a.dong, a.jibun, a.road_address, a.region_code,
             a.lat, a.lng, r.sido, r.sigungu
      FROM apartment_complexes a
      JOIN regions r ON r.code = a.region_code
      WHERE a.lat IS NOT NULL AND EXISTS (
        SELECT 1 FROM apartment_complexes b
        WHERE b.id != a.id AND b.lat = a.lat AND b.lng = a.lng
      )
      ORDER BY a.lat, a.lng, a.name
    `;
    complexes = complexes.map((c) => ({
      id: c.id, name: c.name, dong: c.dong, jibun: c.jibun,
      roadAddress: c.road_address, region: { sido: c.sido, sigungu: c.sigungu },
    }));
    console.warn(`대상 단지: ${complexes.length}개 (좌표 중복 수정)`);
  } else {
    const where = forceUpdate ? {} : { lat: null };
    complexes = await prisma.apartmentComplex.findMany({
      where,
      include: { region: true },
      take: 500,
    });
    console.warn(`대상 단지: ${complexes.length}개 ${forceUpdate ? '(전체 재등록)' : '(좌표 미등록만)'}`);
  }

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
