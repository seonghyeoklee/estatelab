'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ChevronRight, Search } from 'lucide-react';

interface ApartmentItem {
  id: string;
  name: string;
  dong: string;
  regionCode: string;
  region: { sido: string; sigungu: string };
  builtYear: number | null;
  tradeCount: number;
  latestTrade: {
    price: number;
    area: number;
    floor: number;
    dealDate: string;
  } | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ApartmentsPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const searchParam = query ? `&q=${encodeURIComponent(query)}` : '';
  const { data, isLoading } = useSWR<{
    data: ApartmentItem[];
    meta: { total: number; page: number; totalPages: number };
  }>(`/api/market/apartments?page=${page}&limit=20${searchParam}`, fetcher);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">아파트</h1>
        <p className="text-muted-foreground">실거래가가 수집된 아파트 단지 목록입니다.</p>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="단지명으로 검색..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* 리스트 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {query ? `"${query}" 검색 결과가 없습니다.` : '수집된 단지 데이터가 없습니다.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((apt, idx) => (
              <Link key={apt.id} href={`/dashboard/apartments/${apt.id}`}>
                <Card className={`hover-lift animate-fade-up cursor-pointer delay-${Math.min(idx + 1, 8)}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{apt.name}</span>
                        {apt.builtYear && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {apt.builtYear}년
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {apt.region.sigungu} {apt.dong} · 거래 {apt.tradeCount}건
                      </p>
                    </div>
                    {apt.latestTrade && (
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-primary">
                          {(apt.latestTrade.price / 10000).toFixed(1)}억
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {apt.latestTrade.area}㎡ · {apt.latestTrade.floor}층
                        </p>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* 페이지네이션 */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                이전
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page >= data.meta.totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
