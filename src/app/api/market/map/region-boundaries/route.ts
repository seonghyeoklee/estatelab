import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/map/region-boundaries
 * 구별 경계 폴리곤 + 가격 데이터 — 히트맵용
 */
export async function GET() {
  const vworldKey = env('VWORLD_API_KEY') || process.env.NEXT_PUBLIC_VWORLD_API_KEY;
  if (!vworldKey) {
    return NextResponse.json({ data: [] });
  }

  try {
    // 1) 구별 가격 집계
    const stats = await prisma.$queryRaw<{
      region_code: string; avg_price: number;
    }[]>`
      SELECT c.region_code, ROUND(AVG(t.price))::int AS avg_price
      FROM apartment_complexes c
      JOIN apartment_trades t ON t.complex_id = c.id
      WHERE c.name NOT LIKE '(%' AND c.name NOT LIKE '%빌라%' AND c.name NOT LIKE '%연립%' AND c.name NOT LIKE '%다세대%' AND c.name NOT LIKE '%오피스텔%' AND c.name NOT LIKE '%상가%' AND c.name NOT LIKE '%주택%'
      GROUP BY c.region_code
      HAVING COUNT(t.id) > 0
    `;
    const priceMap = new Map(stats.map((s) => [s.region_code, Number(s.avg_price)]));

    // 2) VWORLD 시군구 경계 (서울+부천 영역)
    const res = await fetch(
      `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=lt_c_adsigg&bbox=126.7,37.3,127.3,37.75&srsName=EPSG:4326&outputformat=application/json&maxFeatures=60&key=${vworldKey}`,
      { headers: { Referer: 'https://estatelab.vercel.app' } }
    );

    if (!res.ok) return NextResponse.json({ data: [] });
    const geojson = await res.json();

    const data = (geojson.features || [])
      .filter((f: { properties: { sig_cd: string } }) => priceMap.has(f.properties.sig_cd))
      .map((f: { properties: { sig_cd: string; sig_kor_nm: string }; geometry: { type: string; coordinates: unknown } }) => {
        const code = f.properties.sig_cd;
        const avgPrice = priceMap.get(code) || 0;

        // 폴리곤 좌표 (외곽 링만)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawCoords = f.geometry.coordinates as any;
        const rings = f.geometry.type === 'MultiPolygon'
          ? rawCoords.map((p: number[][][]) => p[0].map((c: number[]) => ({ lat: c[1], lng: c[0] })))
          : [rawCoords[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }))];

        return {
          regionCode: code,
          name: f.properties.sig_kor_nm,
          avgPrice,
          rings,
        };
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('region-boundaries 오류:', error);
    return NextResponse.json({ data: [] });
  }
}
