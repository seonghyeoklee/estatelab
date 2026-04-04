'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Clock, Heart, User } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { WatchlistButton } from '@/components/watchlist-button';


interface WatchlistItem {
  id: string;
  complexId: string;
  complex: {
    id: string;
    name: string;
    dong: string;
    builtYear: number | null;
    region: { sido: string; sigungu: string };
    _count: { trades: number };
    trades: { price: number; area: number; dealDate: string }[];
  };
}

interface HistoryItem {
  id: string;
  complexId: string;
  viewedAt: string;
  complex: {
    id: string;
    name: string;
    dong: string;
    region: { sido: string; sigungu: string };
    trades: { price: number; area: number }[];
  };
}

export default function MyPage() {
  const { data: session, status } = useSession();
  const { data: watchlistData } = useSWR<{ data: WatchlistItem[] }>(
    session ? '/api/user/watchlist' : null,
  );
  const { data: historyData } = useSWR<{ data: HistoryItem[] }>(
    session ? '/api/user/history' : null,
  );

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  const watchlist = watchlistData?.data || [];
  const history = historyData?.data || [];

  return (
    <div className="space-y-6">
      {/* 프로필 */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {session.user?.name || '사용자'}
          </h1>
          <p className="text-sm text-muted-foreground">{session.user?.email}</p>
        </div>
      </div>

      {/* 관심 단지 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Heart className="h-4 w-4 text-red-500" />
          <CardTitle className="text-base">관심 단지 ({watchlist.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {watchlist.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              아직 관심 단지가 없습니다. 단지 상세 페이지에서 ♥를 눌러 추가해보세요.
            </p>
          ) : (
            <div className="space-y-2">
              {watchlist.map((item) => {
                const latest = item.complex.trades[0];
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <Link
                      href={`/dashboard/apartments/${item.complexId}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.complex.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.complex.region.sigungu} {item.complex.dong}
                          {item.complex.builtYear && ` · ${item.complex.builtYear}년`}
                        </p>
                      </div>
                      {latest && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-primary">
                            {formatPrice(latest.price)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.complex._count.trades}건
                          </p>
                        </div>
                      )}
                    </Link>
                    <WatchlistButton complexId={item.complexId} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 본 단지 */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">최근 본 단지</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              아직 조회한 단지가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const latest = item.complex.trades[0];
                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/apartments/${item.complexId}`}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.complex.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.complex.region.sigungu} {item.complex.dong}
                      </p>
                    </div>
                    {latest && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {formatPrice(latest.price)}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {item.viewedAt.slice(5, 10)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
