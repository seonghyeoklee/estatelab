import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchSchools } from '@/lib/kakao-local';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments/[id]/schools?radius=1500
 * 단지 주변 학군 정보 (초/중/고 분류)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const radius = parseInt(request.nextUrl.searchParams.get('radius') || '1500', 10);

  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    select: { lat: true, lng: true, name: true },
  });

  if (!complex?.lat || !complex?.lng) {
    return NextResponse.json({ error: '좌표 정보가 없습니다.' }, { status: 404 });
  }

  const schools = await searchSchools(complex.lat, complex.lng, radius);

  // 학군 요약
  const summary = {
    elementary: {
      count: schools.elementary.length,
      nearest: schools.elementary[0] || null,
      within500m: schools.elementary.filter((s) => s.distance <= 500).length,
    },
    middle: {
      count: schools.middle.length,
      nearest: schools.middle[0] || null,
      within500m: schools.middle.filter((s) => s.distance <= 500).length,
    },
    high: {
      count: schools.high.length,
      nearest: schools.high[0] || null,
      within500m: schools.high.filter((s) => s.distance <= 500).length,
    },
  };

  // 학군 등급 (초등학교 500m 이내 기준)
  const nearestElementary = schools.elementary[0]?.distance ?? Infinity;
  let grade: string;
  if (nearestElementary <= 300) grade = 'S';
  else if (nearestElementary <= 500) grade = 'A';
  else if (nearestElementary <= 800) grade = 'B';
  else if (nearestElementary <= 1200) grade = 'C';
  else grade = 'D';

  return NextResponse.json({
    data: {
      schools,
      summary,
      grade,
      radius,
    },
  });
}
