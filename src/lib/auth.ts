/**
 * API 인증 유틸 — Timing-Safe 비교
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';

/** CRON_SECRET 인증 검증 (타이밍 공격 방지) */
export function validateCronAuth(authHeader: string | null): boolean {
  const secret = env('CRON_SECRET');
  if (!secret || !authHeader) return false;

  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** 401 응답 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
