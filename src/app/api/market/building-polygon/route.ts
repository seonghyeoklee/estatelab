import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/building-polygon?lat=37.5&lng=127.0&radius=100
 * VWORLD WFS API로 좌표 주변 건물 폴리곤을 가져옵니다.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = parseFloat(sp.get('lat') || '0');
  const lng = parseFloat(sp.get('lng') || '0');
  const radius = parseInt(sp.get('radius') || '80', 10);

  if (!lat || !lng) {
    return NextResponse.json({ error: '좌표가 필요합니다' }, { status: 400 });
  }

  const apiKey = env('VWORLD_API_KEY');
  if (!apiKey) {
    return NextResponse.json({ data: [] });
  }

  try {
    // BBOX 계산 (약 radius 미터)
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos(lat * Math.PI / 180));
    const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;

    const url = new URL('https://api.vworld.kr/req/wfs');
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('version', '2.0.0');
    url.searchParams.set('request', 'GetFeature');
    url.searchParams.set('typeName', 'lt_c_bldglevel');
    url.searchParams.set('bbox', bbox);
    url.searchParams.set('srsName', 'EPSG:4326');
    url.searchParams.set('output', 'application/json');
    url.searchParams.set('maxFeatures', '50');
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'EstateLab/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }

    const geojson = await res.json();

    // 폴리곤 좌표 추출
    const polygons = (geojson.features || []).map((f: {
      geometry: { type: string; coordinates: number[][][] | number[][][][] };
      properties?: { bld_nm?: string; grnd_flr?: number };
    }) => {
      const coords = f.geometry.type === 'MultiPolygon'
        ? (f.geometry.coordinates as number[][][][])[0][0]
        : (f.geometry.coordinates as number[][][])[0];

      return {
        coordinates: coords.map(([lng, lat]: number[]) => ({ lat, lng })),
        name: f.properties?.bld_nm || null,
        floors: f.properties?.grnd_flr || null,
      };
    });

    return NextResponse.json({ data: polygons });
  } catch (error) {
    console.error('VWORLD API 오류:', error);
    return NextResponse.json({ data: [] });
  }
}
