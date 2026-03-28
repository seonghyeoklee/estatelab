'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Rate {
  name: string;
  nameKr: string;
  rate: number;
  change: number;
  date: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RateSummaryCard() {
  const { data, isLoading } = useSWR<{ data: Rate[] }>(
    '/api/market/rates',
    fetcher,
    { refreshInterval: 600_000 }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">금리 현황</CardTitle>
        <Landmark className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            ECOS 연동 후 표시됩니다.
          </p>
        ) : (
          <div className="space-y-3">
            {data.data.map((rate) => (
              <div key={rate.name} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{rate.nameKr}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{rate.rate.toFixed(2)}%</span>
                  {rate.change !== 0 && (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        rate.change > 0 ? 'text-price-up' : 'text-price-down'
                      )}
                    >
                      {rate.change > 0 ? '+' : ''}
                      {rate.change.toFixed(0)}bp
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
