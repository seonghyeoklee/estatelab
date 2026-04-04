/**
 * API Route 공통 에러 핸들러
 */

import { NextResponse } from 'next/server';

/**
 * API route에서 안전하게 실행 — 에러 시 500 응답 + 구조화 로깅
 */
export async function handleApiRoute<T>(
  label: string,
  handler: () => Promise<T>,
): Promise<NextResponse> {
  try {
    const data = await handler();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({
      level: 'error',
      type: 'api_route_error',
      label,
      error: message,
      // stack은 프로덕션에서 제외
      ...(process.env.NODE_ENV !== 'production' && error instanceof Error
        ? { stack: error.stack }
        : {}),
    }));

    return NextResponse.json(
      { error: '요청 처리 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
