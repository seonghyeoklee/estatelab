'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Rate {
  name: string;
  nameKr: string;
  rate: number;
  change: number;
  date: string;
}


function rateColor(rate: number): string {
  if (rate >= 4) return 'text-red-500';
  if (rate >= 3) return 'text-amber-500';
  return 'text-emerald-500';
}

export function RateSummaryCard() {
  const { data, isLoading } = useSWR<{ data: Rate[] }>(
    '/api/market/rates',
    { refreshInterval: 600_000 }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          금리 현황
        </CardTitle>
        {data?.data?.[0] && (
          <span className="text-xs text-muted-foreground">
            {data.data[0].date.slice(0, 10)} 기준
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-1">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-6 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            ECOS 연동 후 표시됩니다.
          </p>
        ) : (
          <div className="space-y-3">
            {data.data.map((rate) => {
              const barWidth = Math.min((rate.rate / 6) * 100, 100);
              const color = rateColor(rate.rate);

              return (
                <div key={rate.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{rate.nameKr}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm font-bold tabular-nums', color)}>
                        {rate.rate.toFixed(2)}%
                      </span>
                      {rate.change !== 0 ? (
                        <span className={cn(
                          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
                          rate.change > 0
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-blue-500/10 text-blue-500'
                        )}>
                          {rate.change > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          {rate.change > 0 ? '+' : ''}{rate.change.toFixed(0)}bp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                          <Minus className="h-2.5 w-2.5" />
                          동결
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 금리 바 */}
                  <div className="h-1.5 rounded-full bg-muted/60">
                    <div
                      className={cn('h-1.5 rounded-full transition-all', color.replace('text-', 'bg-').replace('500', '500/50'))}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
