'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { X, Building2, MapPin, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Trade {
  id: string;
  dealDate: string;
  area: number;
  floor: number;
  price: number;
  pricePerPyeong: number | null;
  dealType: string | null;
}

interface AreaGroup {
  area: number;
  count: number;
  avgPrice: number;
  avgPricePerPyeong: number;
}

interface ComplexDetail {
  id: string;
  name: string;
  dong: string;
  jibun: string;
  roadAddress: string | null;
  builtYear: number | null;
  region: { sido: string; sigungu: string };
  trades: Trade[];
  areaGroups: AreaGroup[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatPrice(price: number): string {
  if (price >= 10000) return (price / 10000).toFixed(1) + '억';
  return price.toLocaleString() + '만';
}

interface Props {
  complexId: string;
  onClose: () => void;
}

export function ComplexDetailPanel({ complexId, onClose }: Props) {
  const { data, isLoading } = useSWR<{ data: ComplexDetail }>(
    `/api/market/apartments/${complexId}`,
    fetcher
  );

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const detail = data?.data;
  const trades = detail?.trades ?? [];
  const areaGroups = detail?.areaGroups ?? [];

  // 통계
  const tradeCount = trades.length;
  const avgPrice = tradeCount
    ? Math.round(trades.reduce((s, t) => s + t.price, 0) / tradeCount)
    : 0;
  const maxPrice = tradeCount ? Math.max(...trades.map((t) => t.price)) : 0;
  const minPrice = tradeCount ? Math.min(...trades.map((t) => t.price)) : 0;

  // 월별 차트 데이터
  const monthlyMap = new Map<string, { total: number; count: number }>();
  for (const t of trades) {
    const key = t.dealDate.slice(0, 7);
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.total += t.price;
      existing.count++;
    } else {
      monthlyMap.set(key, { total: t.price, count: 1 });
    }
  }
  const monthly = Array.from(monthlyMap.entries())
    .map(([month, { total, count }]) => ({ month, avgPrice: Math.round(total / count) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const chartMax = monthly.length ? Math.max(...monthly.map((m) => m.avgPrice)) : 1;
  const chartMin = monthly.length ? Math.min(...monthly.map((m) => m.avgPrice)) : 0;
  const chartRange = chartMax - chartMin || 1;

  return (
    <div className="md:absolute md:left-0 md:top-0 md:bottom-0 z-20 md:w-[380px] w-full bg-white md:border-r border-border/50 md:shadow-xl flex flex-col overflow-hidden">
      {/* 헤더 */}
      {isLoading ? (
        <div className="p-4 space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
      ) : detail ? (
        <>
          <div className="shrink-0 border-b px-4 py-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold truncate">{detail.name}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {detail.region.sigungu} {detail.dong}
                  </span>
                  {detail.builtYear && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {detail.builtYear}년
                    </span>
                  )}
                  {detail.roadAddress && (
                    <span className="text-[11px]">{detail.roadAddress}</span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 hover:bg-accent transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 핵심 통계 */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <div className="rounded-lg bg-primary/5 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">평균</p>
                <p className="text-sm font-bold text-primary">{formatPrice(avgPrice)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">최고</p>
                <p className="text-sm font-bold">{formatPrice(maxPrice)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">최저</p>
                <p className="text-sm font-bold">{formatPrice(minPrice)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">거래</p>
                <p className="text-sm font-bold">{tradeCount}건</p>
              </div>
            </div>
          </div>

          {/* 스크롤 콘텐츠 */}
          <div className="flex-1 overflow-y-auto">
            {/* 가격 추이 차트 */}
            {monthly.length > 0 && (
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground">매매가 추이</h3>
                </div>
                <div className="flex items-end gap-[3px] h-24">
                  {monthly.map((m, idx) => {
                    const height = ((m.avgPrice - chartMin) / chartRange) * 80 + 20;
                    const isLast = idx === monthly.length - 1;
                    return (
                      <div key={m.month} className="flex flex-1 flex-col items-center gap-0.5">
                        <span className="text-[8px] text-muted-foreground">
                          {formatPrice(m.avgPrice)}
                        </span>
                        <div
                          className={cn(
                            'w-full rounded-t transition-all',
                            isLast ? 'bg-primary' : 'bg-primary/25'
                          )}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[8px] text-muted-foreground">
                          {m.month.slice(5)}월
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 면적별 비교 */}
            {areaGroups.length > 0 && (
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground">면적별 평균</h3>
                </div>
                <div className="space-y-2">
                  {areaGroups.map((group) => {
                    const maxAreaPrice = Math.max(...areaGroups.map((g) => g.avgPrice));
                    const widthPct = (group.avgPrice / maxAreaPrice) * 100;
                    const pyeong = Math.round(group.area / 3.3058);
                    return (
                      <div key={group.area} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span>
                            {group.area}㎡ <span className="text-muted-foreground">({pyeong}평)</span>
                          </span>
                          <span className="font-semibold">
                            {formatPrice(group.avgPrice)}
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">
                              ({group.count}건)
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary/50"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 거래 내역 */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground">
                  거래 내역 ({tradeCount}건)
                </h3>
              </div>
              <div className="space-y-0.5">
                {trades.slice(0, 30).map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-[72px] shrink-0">
                        {trade.dealDate.slice(0, 10)}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {trade.area}㎡ {trade.floor}층
                      </Badge>
                    </div>
                    <span className="font-semibold text-primary shrink-0">
                      {formatPrice(trade.price)}
                    </span>
                  </div>
                ))}
                {tradeCount > 30 && (
                  <p className="text-center text-[10px] text-muted-foreground py-2">
                    +{tradeCount - 30}건 더 있음
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}
