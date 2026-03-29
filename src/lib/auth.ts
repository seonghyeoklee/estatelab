/**
 * API 인증 유틸
 */

import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/** CRON_SECRET 인증 검증 */
export function validateCronAuth(authHeader: string | null): boolean {
  const secret = env('CRON_SECRET');
  return !!secret && authHeader === `Bearer ${secret}`;
}

/** 401 응답 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
