'use client';

import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface RegionSummary {
  regionCode: string;
  sido: string;
  sigungu: string;
  tradeCount: number;
  avgPrice: number;
  avgPricePerPyeong: number;
  latestTrade: {
    name: string;
    price: number;
    area: number;
    dealDate: string;
  } | null;
}


// 가격대별 그라데이션
function priceGradient(avgPrice: number): string {
  if (avgPrice >= 200000) return 'from-violet-500/10 to-violet-500/5';
  if (avgPrice >= 100000) return 'from-blue-500/10 to-blue-500/5';
  if (avgPrice >= 50000) return 'from-emerald-500/10 to-emerald-500/5';
  return 'from-slate-500/10 to-slate-500/5';
}

function priceAccent(avgPrice: number): { text: string; bar: string } {
  if (avgPrice >= 200000) return { text: 'text-violet-600', bar: 'bg-violet-500/60' };
  if (avgPrice >= 100000) return { text: 'text-blue-600', bar: 'bg-blue-500/60' };
  if (avgPrice >= 50000) return { text: 'text-emerald-600', bar: 'bg-emerald-500/60' };
  return { text: 'text-slate-600', bar: 'bg-slate-500/60' };
}

export function RegionSummaryCards() {
  const { data, isLoading } = useSWR<{ data: RegionSummary[] }>(
    '/api/market/summary/regions',
    { refreshInterval: 300_000 }
  );

  if (isLoading || !data?.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-3 h-8 w-32 rounded bg-muted" />
              <div className="mt-2 h-3 w-40 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            아직 수집된 거래 데이터가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  // TOP 6만 표시
  const regions = data.data.slice(0, 6);
  const maxPpp = regions.length > 0 ? Math.max(...regions.map((r) => r.avgPricePerPyeong)) : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {regions.map((region) => {
        const barPct = (region.avgPricePerPyeong / maxPpp) * 100;
        const accent = priceAccent(region.avgPrice);

        return (
          <Card
            key={region.regionCode}
            className={cn('relative overflow-hidden hover:shadow-md transition-shadow group')}
          >
            {/* 배경 그라데이션 */}
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', priceGradient(region.avgPrice))} />

            <CardContent className="relative p-4 space-y-3">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">{region.sigungu}</h3>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 bg-white/60">
                    {region.sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {region.tradeCount.toLocaleString()}건
                </span>
              </div>

              {/* 가격 정보 */}
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-xl font-bold', accent.text)}>
                    {formatPrice(region.avgPrice)}
                  </span>
                  <span className="text-xs text-muted-foreground">평균</span>
                </div>
                {/* 평당가 바 */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">평당가</span>
                    <span className="font-semibold">{region.avgPricePerPyeong.toLocaleString()}만/평</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60">
                    <div
                      className={cn('h-1.5 rounded-full transition-all', accent.bar)}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 최근 거래 */}
              {region.latestTrade && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">최근 거래</p>
                    <p className="text-xs font-medium truncate">
                      {region.latestTrade.name} {region.latestTrade.area}㎡
                    </p>
                  </div>
                  <span className={cn('text-[12px] font-bold shrink-0', accent.text)}>
                    {formatPrice(region.latestTrade.price)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
