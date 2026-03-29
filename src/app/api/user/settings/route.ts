import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/next-auth';

export const dynamic = 'force-dynamic';

/** GET /api/user/settings — 사용자 설정 조회 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ data: settings || { regionCodes: [] } });
}

/** PUT /api/user/settings — 사용자 설정 저장 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { regionCodes } = await request.json();

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: { regionCodes: regionCodes || [] },
    create: { userId: session.user.id, regionCodes: regionCodes || [] },
  });

  return NextResponse.json({ data: settings });
}
