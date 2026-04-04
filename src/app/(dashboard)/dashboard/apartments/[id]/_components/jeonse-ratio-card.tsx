'use client';

import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface RentSummary {
  area: number;
  jeonseCount: number;
  wolseCount: number;
  avgDeposit: number;
  avgMonthlyRent: number;
  avgTradePrice: number;
  jeonseRatio: number | null;
}


export function JeonseRatioCard({ complexId }: { complexId: string }) {
  const { data } = useSWR<{ data: RentSummary[] }>(
    `/api/market/apartments/${complexId}/rents`,
  );

  // 전월세 데이터 없으면 숨김 (미완성 느낌 방지)
  if (!data?.data || data.data.length === 0) return null;

  const summaries = data.data;
  const totalJeonse = summaries.reduce((s, r) => s + r.jeonseCount, 0);
  const totalWolse = summaries.reduce((s, r) => s + r.wolseCount, 0);

  // 전체 평균 전세가율
  const withRatio = summaries.filter((r) => r.jeonseRatio !== null);
  const avgRatio = withRatio.length > 0
    ? Math.round(withRatio.reduce((s, r) => s + r.jeonseRatio!, 0) / withRatio.length)
    : null;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Percent className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold">전월세 현황</h2>
              <p className="text-xs text-muted-foreground">
                전세 {totalJeonse}건 · 월세 {totalWolse}건
              </p>
            </div>
          </div>
          {avgRatio !== null && (
            <Badge
              variant="secondary"
              className={cn(
                'text-[13px] font-bold px-3 py-1',
                avgRatio >= 70 ? 'text-red-600 bg-red-500/10' : avgRatio >= 50 ? 'text-amber-600 bg-amber-500/10' : 'text-emerald-600 bg-emerald-500/10'
              )}
            >
              전세가율 {avgRatio}%
            </Badge>
          )}
        </div>

        {/* 면적별 전세 현황 */}
        <div className="space-y-3">
          {summaries.map((r) => (
            <div key={r.area} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">{r.area}㎡</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>전세 {r.jeonseCount}건</span>
                  <span>월세 {r.wolseCount}건</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 매매가 */}
                {r.avgTradePrice > 0 && (
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">매매</p>
                    <p className="text-[13px] font-bold">{formatPrice(r.avgTradePrice)}</p>
                  </div>
                )}
                {/* 전세가 */}
                {r.avgDeposit > 0 && (
                  <div className="rounded-lg bg-amber-500/5 p-2">
                    <p className="text-xs text-muted-foreground">전세</p>
                    <p className="text-[13px] font-bold text-amber-700">{formatPrice(r.avgDeposit)}</p>
                  </div>
                )}
                {/* 전세가율 */}
                {r.jeonseRatio !== null && (
                  <div className={cn(
                    'rounded-lg p-2',
                    r.jeonseRatio >= 70 ? 'bg-red-500/5' : 'bg-emerald-500/5'
                  )}>
                    <p className="text-xs text-muted-foreground">전세가율</p>
                    <p className={cn(
                      'text-[13px] font-bold',
                      r.jeonseRatio >= 70 ? 'text-red-600' : 'text-emerald-600'
                    )}>
                      {r.jeonseRatio}%
                    </p>
                  </div>
                )}
              </div>

              {/* 월세 정보 */}
              {r.wolseCount > 0 && r.avgMonthlyRent > 0 && (
                <p className="text-xs text-muted-foreground">
                  월세 평균 보증금 {formatPrice(r.avgDeposit)} / 월 {r.avgMonthlyRent}만
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
