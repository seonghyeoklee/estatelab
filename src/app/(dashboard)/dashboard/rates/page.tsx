'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Landmark, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Rate {
  name: string;
  nameKr: string;
  date: string;
  rate: number;
  change: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function RateIcon({ change }: { change: number }) {
  if (change > 0) return <TrendingUp className="h-4 w-4 text-price-up" />;
  if (change < 0) return <TrendingDown className="h-4 w-4 text-price-down" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function RatesPage() {
  const { data: latestData, isLoading: latestLoading } = useSWR<{ data: Rate[] }>(
    '/api/market/rates',
    fetcher
  );
  const { data: historyData, isLoading: historyLoading } = useSWR<{ data: Rate[] }>(
    '/api/market/rates/history',
    fetcher
  );

  const latest = latestData?.data ?? [];
  const history = historyData?.data ?? [];

  // 지표별 히스토리 그룹핑
  const historyByName = new Map<string, Rate[]>();
  for (const r of history) {
    const arr = historyByName.get(r.name) || [];
    arr.push(r);
    historyByName.set(r.name, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">금리 동향</h1>
        <p className="text-muted-foreground">
          기준금리, 주담대, CD금리 등 부동산 관련 금리를 추적합니다.
        </p>
      </div>

      {/* 현재 금리 카드 */}
      {latestLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Landmark className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">금리 데이터가 없습니다</p>
            <p className="text-xs text-muted-foreground">
              /api/collect/rates 를 호출하여 ECOS 데이터를 수집하세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((rate, idx) => (
            <Card key={rate.name} className={`hover-lift animate-fade-up delay-${idx + 1}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {rate.nameKr}
                </CardTitle>
                <RateIcon change={rate.change} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{rate.rate.toFixed(2)}%</span>
                  {rate.change !== 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[10px]',
                        rate.change > 0 ? 'text-price-up' : 'text-price-down'
                      )}
                    >
                      {rate.change > 0 ? '+' : ''}{rate.change}bp
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {rate.date.slice(0, 10)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 금리 추이 차트 */}
      {!historyLoading && historyByName.size > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from(historyByName.entries()).map(([name, rates]) => {
            const sorted = rates.sort((a, b) => a.date.localeCompare(b.date));
            const maxRate = Math.max(...sorted.map((r) => r.rate));
            const minRate = Math.min(...sorted.map((r) => r.rate));
            const range = maxRate - minRate || 0.1;
            const nameKr = sorted[0]?.nameKr || name;
            const latestRate = sorted[sorted.length - 1];

            return (
              <Card key={name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{nameKr}</CardTitle>
                    {latestRate && (
                      <span className="text-lg font-bold text-primary">
                        {latestRate.rate.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-[2px] h-32">
                    {sorted.map((r, idx) => {
                      const height = ((r.rate - minRate) / range) * 80 + 20;
                      const isLast = idx === sorted.length - 1;
                      const month = r.date.slice(5, 7);

                      return (
                        <div key={r.date} className="flex flex-1 flex-col items-center gap-0.5">
                          {isLast && (
                            <span className="text-[9px] font-semibold text-primary">
                              {r.rate.toFixed(1)}
                            </span>
                          )}
                          <div
                            className={cn(
                              'w-full rounded-t transition-all min-h-[4px]',
                              isLast ? 'bg-primary' : 'bg-primary/20'
                            )}
                            style={{ height: `${height}%` }}
                          />
                          {(idx === 0 || idx === sorted.length - 1 || idx % 6 === 0) && (
                            <span className="text-[8px] text-muted-foreground">{month}월</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>{sorted[0]?.date.slice(0, 7)}</span>
                    <span>최저 {minRate.toFixed(2)}% · 최고 {maxRate.toFixed(2)}%</span>
                    <span>{sorted[sorted.length - 1]?.date.slice(0, 7)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
