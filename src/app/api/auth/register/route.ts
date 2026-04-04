import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 간단한 IP 기반 rate limit (메모리, 서버리스에서는 인스턴스당)
const registerAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 10분에 5회
const RATE_WINDOW = 10 * 60 * 1000;

/**
 * POST /api/auth/register
 * 이메일/비밀번호 회원가입
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const now = Date.now();
    const attempt = registerAttempts.get(ip);
    if (attempt && attempt.resetAt > now && attempt.count >= RATE_LIMIT) {
      return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    if (!attempt || attempt.resetAt <= now) {
      registerAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    } else {
      attempt.count++;
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호는 필수입니다.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 이메일 중복 체크
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다.' },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
