import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/next-auth';

export const dynamic = 'force-dynamic';

/** GET /api/user/watchlist — 관심 단지 목록 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.userWatchlist.findMany({
    where: { userId: session.user.id },
    include: {
      complex: {
        include: {
          region: { select: { sido: true, sigungu: true } },
          _count: { select: { trades: true } },
          trades: {
            orderBy: { dealDate: 'desc' },
            take: 1,
            select: { price: true, area: true, dealDate: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: items });
}

/** POST /api/user/watchlist — 관심 단지 추가 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { complexId } = await request.json();
  if (!complexId) {
    return NextResponse.json({ error: 'complexId 필수' }, { status: 400 });
  }

  try {
    const item = await prisma.userWatchlist.create({
      data: { userId: session.user.id, complexId },
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch {
    // unique 제약 위반 (이미 등록됨)
    return NextResponse.json({ error: '이미 관심 단지에 등록되어 있습니다.' }, { status: 409 });
  }
}

/** DELETE /api/user/watchlist?complexId=xxx — 관심 단지 삭제 */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const complexId = request.nextUrl.searchParams.get('complexId');
  if (!complexId) {
    return NextResponse.json({ error: 'complexId 필수' }, { status: 400 });
  }

  await prisma.userWatchlist.deleteMany({
    where: { userId: session.user.id, complexId },
  });

  return NextResponse.json({ data: { deleted: true } });
}
