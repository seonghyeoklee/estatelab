/**
 * 카카오 지오코딩 API로 단지 좌표를 채우는 스크립트
 * 실행: npx tsx scripts/geocode-complexes.ts
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { config } from 'dotenv';
config({ path: '.env.local' });

const KAKAO_REST_KEY = (process.env.KAKAO_REST_API_KEY || '').replace(/^"|"$/g, '');

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });

  if (!res.ok) {
    // JavaScript 키가 아닌 REST API 키가 필요할 수 있음. 주소 검색으로 폴백
    const addressUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`;
    const addressRes = await fetch(addressUrl, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
    });
    if (!addressRes.ok) return null;
    const addressData = await addressRes.json();
    if (addressData.documents?.length > 0) {
      return {
        lat: parseFloat(addressData.documents[0].y),
        lng: parseFloat(addressData.documents[0].x),
      };
    }
    return null;
  }

  const data = await res.json();
  if (data.documents?.length > 0) {
    return {
      lat: parseFloat(data.documents[0].y),
      lng: parseFloat(data.documents[0].x),
    };
  }
  return null;
}

async function main() {
  if (!KAKAO_REST_KEY) {
    console.error('KAKAO_REST_API_KEY가 설정되지 않았습니다. (카카오 개발자 콘솔 → 앱 키 → REST API 키)');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: (process.env.DATABASE_URL_UNPOOLED || '').replace(/^"|"$/g, '') });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // 좌표가 없는 단지만 조회
  const complexes = await prisma.apartmentComplex.findMany({
    where: { lat: null },
    include: { region: true },
    take: 500,
  });

  console.warn(`좌표 미등록 단지: ${complexes.length}개`);

  let updated = 0;
  let failed = 0;

  for (const complex of complexes) {
    // 검색 쿼리: "서울 강남구 수서동 강남 더샵 포레스트"
    const query = `${complex.region.sigungu} ${complex.dong} ${complex.name}`;

    try {
      const coords = await geocode(query);

      if (coords) {
        await prisma.apartmentComplex.update({
          where: { id: complex.id },
          data: { lat: coords.lat, lng: coords.lng },
        });
        updated++;
        console.warn(`✅ ${complex.name} (${complex.dong}) → ${coords.lat}, ${coords.lng}`);
      } else {
        // 단지명만으로 재시도
        const fallback = await geocode(`${complex.region.sido} ${complex.region.sigungu} ${complex.name}`);
        if (fallback) {
          await prisma.apartmentComplex.update({
            where: { id: complex.id },
            data: { lat: fallback.lat, lng: fallback.lng },
          });
          updated++;
          console.warn(`✅ ${complex.name} (fallback) → ${fallback.lat}, ${fallback.lng}`);
        } else {
          failed++;
          console.warn(`❌ ${complex.name} (${complex.dong}) — 좌표 찾지 못함`);
        }
      }

      // 카카오 API rate limit 방지 (초당 10건 제한)
      await new Promise((r) => setTimeout(r, 150));
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
