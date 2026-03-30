import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchBuildingInfo, parseJibun } from '@/lib/building-registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/market/apartments/[id]/buildings
 * 건축물대장 표제부 — bjdongCd만 DB 캐싱, 데이터는 매번 API 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    select: { name: true, regionCode: true, jibun: true, bjdongCd: true },
  });

  if (!complex?.jibun) {
    return NextResponse.json({ error: '지번 정보가 없습니다.' }, { status: 404 });
  }

  const sigunguCd = complex.regionCode;
  const { bun, ji } = parseJibun(complex.jibun);

  // 1) bjdongCd가 이미 있으면 → API 1회 호출
  if (complex.bjdongCd) {
    const result = await fetchBuildingInfo(sigunguCd, complex.bjdongCd, bun, ji);
    return NextResponse.json({
      data: { complexName: complex.name, ...result, source: 'building_registry' },
    });
  }

  // 2) bjdongCd 없으면 → 브루트포스로 찾기 (최초 1회)
  const candidates = [
    '00000', '10000', '10100', '10200', '10300', '10400', '10500',
    '10600', '10700', '10800', '10900', '11000', '11100', '11200',
    '11300', '11400', '11500', '11600', '11700', '11800', '11900', '12000',
  ];

  for (const cd of candidates) {
    const result = await fetchBuildingInfo(sigunguCd, cd, bun, ji);
    if (result && result.units.length > 0) {
      // bjdongCd만 저장
      await prisma.apartmentComplex.update({
        where: { id },
        data: { bjdongCd: cd },
      });
      return NextResponse.json({
        data: { complexName: complex.name, ...result, source: 'building_registry' },
      });
    }
  }

  // 못 찾음 — bjdongCd를 빈값으로 저장해서 재시도 방지
  await prisma.apartmentComplex.update({
    where: { id },
    data: { bjdongCd: 'NONE' },
  });

  return NextResponse.json({
    data: { complexName: complex.name, bldNm: null, units: [], totalHhld: 0, totalDong: 0, source: 'building_registry' },
  });
}
