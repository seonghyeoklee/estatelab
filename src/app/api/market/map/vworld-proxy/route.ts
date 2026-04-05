import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/map/vworld-proxy?typeName=lt_c_spbd&bbox=...&maxFeatures=50
 * VWORLD WFS API 프록시 — CORS 우회용
 */
export async function GET(request: NextRequest) {
  const vworldKey = env('VWORLD_API_KEY') || process.env.NEXT_PUBLIC_VWORLD_API_KEY;
  if (!vworldKey) {
    return NextResponse.json({ features: [] }, { status: 500 });
  }

  const sp = request.nextUrl.searchParams;
  const typeName = sp.get('typeName');
  const bbox = sp.get('bbox');
  const maxFeatures = sp.get('maxFeatures') || '50';

  if (!typeName || !bbox) {
    return NextResponse.json({ features: [] }, { status: 400 });
  }

  try {
    const url = `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=${typeName}&bbox=${bbox}&srsName=EPSG:4326&outputformat=application/json&maxFeatures=${maxFeatures}&key=${vworldKey}`;
    const res = await fetch(url, {
      headers: { Referer: 'https://estatelab.vercel.app' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ features: [] }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('vworld-proxy 오류:', error);
    return NextResponse.json({ features: [] }, { status: 500 });
  }
}
