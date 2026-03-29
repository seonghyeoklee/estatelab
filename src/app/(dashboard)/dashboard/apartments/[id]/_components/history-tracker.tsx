'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

/** 단지 상세 페이지 방문 시 히스토리 자동 기록 */
export function HistoryTracker({ complexId }: { complexId: string }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    fetch('/api/user/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complexId }),
    }).catch(() => {});
  }, [session, complexId]);

  return null;
}
