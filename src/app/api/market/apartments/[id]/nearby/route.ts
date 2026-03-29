import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchNearby, CATEGORY_KEYS, getCategoryLabel } from '@/lib/kakao-local';
import type { CategoryKey, NearbyPlace } from '@/lib/kakao-local';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments/[id]/nearby?radius=1000
 * 단지 주변 편의시설 검색
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const radius = parseInt(request.nextUrl.searchParams.get('radius') || '1000', 10);

  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    select: { lat: true, lng: true, name: true },
  });

  if (!complex?.lat || !complex?.lng) {
    return NextResponse.json({ error: '좌표 정보가 없습니다.' }, { status: 404 });
  }

  // 전체 카테고리 병렬 검색
  const results = await Promise.all(
    CATEGORY_KEYS.map(async (key) => {
      const places = await searchNearby(complex.lat!, complex.lng!, key, radius);
      return { key, label: getCategoryLabel(key), places };
    })
  );

  // 카테고리별 요약
  const summary = results.map((r) => ({
    key: r.key,
    label: r.label,
    count: r.places.length,
    nearest: r.places[0] || null,
  }));

  const allPlaces: Record<CategoryKey, NearbyPlace[]> = {} as Record<CategoryKey, NearbyPlace[]>;
  for (const r of results) {
    allPlaces[r.key as CategoryKey] = r.places;
  }

  return NextResponse.json({
    data: { summary, places: allPlaces, radius },
  });
}
