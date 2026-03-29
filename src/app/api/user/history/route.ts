import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/next-auth';

export const dynamic = 'force-dynamic';

/** GET /api/user/history — 최근 본 단지 (최대 20개) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.userHistory.findMany({
    where: { userId: session.user.id },
    include: {
      complex: {
        include: {
          region: { select: { sido: true, sigungu: true } },
          trades: {
            orderBy: { dealDate: 'desc' },
            take: 1,
            select: { price: true, area: true },
          },
        },
      },
    },
    orderBy: { viewedAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ data: items });
}

/** POST /api/user/history — 최근 본 단지 기록 (upsert) */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { complexId } = await request.json();
  if (!complexId) {
    return NextResponse.json({ error: 'complexId 필수' }, { status: 400 });
  }

  const item = await prisma.userHistory.upsert({
    where: {
      userId_complexId: { userId: session.user.id, complexId },
    },
    update: { viewedAt: new Date() },
    create: { userId: session.user.id, complexId },
  });

  return NextResponse.json({ data: item });
}
