'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/components/google-analytics';

interface WatchlistButtonProps {
  complexId: string;
  size?: 'sm' | 'md';
}

export function WatchlistButton({ complexId, size = 'md' }: WatchlistButtonProps) {
  const { data: session } = useSession();
  const [isWatched, setIsWatched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    fetch('/api/user/watchlist')
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.data || []).map((w: { complexId: string }) => w.complexId);
        setIsWatched(ids.includes(complexId));
      })
      .catch(() => {});
  }, [session, complexId]);

  if (!session?.user) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (isWatched) {
        const res = await fetch(`/api/user/watchlist?complexId=${complexId}`, { method: 'DELETE' });
        if (res.ok) setIsWatched(false);
      } else {
        const res = await fetch('/api/user/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complexId }),
        });
        if (res.ok) {
          setIsWatched(true);
          trackEvent('watchlist_add', { complex_id: complexId });
        }
      }
    } catch {
      console.error('관심 단지 업데이트 실패');
    }
    setLoading(false);
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center justify-center rounded-full transition-all shrink-0',
        btnSize,
        isWatched
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      )}
      title={isWatched ? '관심 단지 해제' : '관심 단지 추가'}
    >
      <Heart
        className={cn(iconSize, isWatched && 'fill-current')}
      />
    </button>
  );
}
