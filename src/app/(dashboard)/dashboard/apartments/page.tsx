'use client';

import { useState, Suspense } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ChevronRight, Search, MapPin, Calendar, Flame, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, priceColorClass } from '@/lib/format';
import { ApartmentFilters, type FilterValues } from './_components/apartment-filters';
import { EmptyState } from '@/components/empty-state';

interface ApartmentItem {
  id: string;
  name: string;
  dong: string;
  regionCode: string;
  region: { sido: string; sigungu: string };
  builtYear: number | null;
  lat: number | null;
  lng: number | null;
  tradeCount: number;
  recentTradeCount: number;
  latestTrade: {
    price: number;
    area: number;
    floor: number;
    dealDate: string;
    pricePerPyeong: number | null;
  } | null;
}

interface DongCount {
  dong: string;
  count: number;
}



function ApartmentsContent() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [dongFilter, setDongFilter] = useState(searchParams.get('dong') || '');
  const [filters, setFilters] = useState<FilterValues>({
    regionCode: searchParams.get('regionCode') || '',
    sido: searchParams.get('sido') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    minYear: searchParams.get('minYear') || '',
    sort: searchParams.get('sort') || 'trades',
  });

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (query) params.set('q', query);
  if (dongFilter) params.set('dong', dongFilter);
  if (filters.regionCode) params.set('regionCode', filters.regionCode);
  else if (filters.sido) params.set('sido', filters.sido);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.minArea) params.set('minArea', filters.minArea);
  if (filters.maxArea) params.set('maxArea', filters.maxArea);
  if (filters.minYear) params.set('minYear', filters.minYear);
  if (filters.sort) params.set('sort', filters.sort);

  // URL 동기화
  const paramStr = params.toString();

  const { data, isLoading } = useSWR<{
    data: ApartmentItem[];
    meta: { total: number; page: number; totalPages: number };
    dongCounts: DongCount[];
  }>(`/api/market/apartments?${paramStr}`);

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">아파트</h1>
        <p className="text-muted-foreground">단지명, 동, 지역을 검색하세요.</p>
      </div>

      {/* 검색 */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="단지명, 동, 지역 검색... (예: 강남 래미안)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); setDongFilter(''); }}
          aria-label="아파트 검색"
          className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* 필터 */}
      <ApartmentFilters filters={filters} onChange={handleFilterChange} />

      {/* 동 필터 칩 */}
      {data?.dongCounts && data.dongCounts.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="동 필터">
          <button
            onClick={() => { setDongFilter(''); setPage(1); }}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              !dongFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
            )}
          >
            전체
          </button>
          {data.dongCounts.map((d) => (
            <button
              key={d.dong}
              onClick={() => { setDongFilter(d.dong); setPage(1); }}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                dongFilter === d.dong ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
              )}
            >
              {d.dong}
              <span className="ml-1 opacity-60">{d.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* 결과 카운트 + 지도 토글 */}
      {data?.meta && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-bold text-foreground">{data.meta.total.toLocaleString()}</span>개 단지
          </p>
          <p className="text-xs text-muted-foreground">
            {page} / {data.meta.totalPages} 페이지
          </p>
        </div>
      )}

      {/* 리스트 */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <EmptyState
          icon={query || dongFilter ? SearchX : Building2}
          title={query || dongFilter || Object.values(filters).some(Boolean)
            ? '조건에 맞는 단지가 없습니다'
            : '수집된 단지 데이터가 없습니다'}
          description={query ? `"${query}" 검색 결과가 없습니다. 다른 키워드로 시도해보세요.` : undefined}
        >
          {(query || dongFilter || Object.values(filters).some(Boolean)) && (
            <button
              onClick={() => {
                setQuery('');
                setDongFilter('');
                setFilters({ regionCode: '', sido: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '', minYear: '', sort: 'trades' });
                setPage(1);
              }}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              필터 초기화
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.data.map((apt) => {
              const color = apt.latestTrade ? priceColorClass(apt.latestTrade.price) : { bg: 'bg-muted/50', text: 'text-muted-foreground' };
              const isHot = apt.recentTradeCount >= 3;
              return (
                <Link key={apt.id} href={`/dashboard/apartments/${apt.id}`}>
                  <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
                      {/* 상단: 이름 + 위치 */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="text-[16px] font-bold leading-tight line-clamp-1">{apt.name}</h3>
                            {isHot && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-xs font-bold text-orange-600 shrink-0">
                                <Flame className="h-2.5 w-2.5" />
                                활발
                              </span>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {apt.region.sigungu} {apt.dong}
                          </span>
                          {apt.builtYear && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {apt.builtYear}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 하단: 가격 + 거래 */}
                      <div className="flex items-end justify-between">
                        {apt.latestTrade ? (
                          <div>
                            <p className={cn('text-xl font-bold', color.text)}>
                              {formatPrice(apt.latestTrade.price)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {apt.latestTrade.area}㎡ · {apt.latestTrade.floor}층
                              {apt.latestTrade.pricePerPyeong
                                ? ` · ${apt.latestTrade.pricePerPyeong.toLocaleString()}만/평`
                                : ''}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">거래 정보 없음</p>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {apt.tradeCount}건{apt.recentTradeCount > 0 ? ` · 최근 ${apt.recentTradeCount}` : ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* 페이지네이션 */}
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4"
              >
                이전
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(data.meta.totalPages, 5) }, (_, i) => {
                  const pageNum = page <= 3 ? i + 1
                    : page >= data.meta.totalPages - 2 ? data.meta.totalPages - 4 + i
                    : page - 2 + i;
                  if (pageNum < 1 || pageNum > data.meta.totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                        page === pageNum ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page >= data.meta.totalPages}
                className="px-4"
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

export default function ApartmentsPage() {
  return (
    <Suspense>
      <ApartmentsContent />
    </Suspense>
  );
}
