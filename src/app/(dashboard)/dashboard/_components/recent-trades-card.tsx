'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, priceColorClass } from '@/lib/format';

interface Trade {
  id: string;
  dealDate: string;
  area: number;
  floor: number;
  price: number;
  pricePerPyeong: number | null;
  complex: {
    name: string;
    dong: string;
    regionCode: string;
  };
}


export function RecentTradesCard() {
  const { data, isLoading } = useSWR<{ data: Trade[] }>(
    '/api/market/trades?limit=10',
    { refreshInterval: 300_000 }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          최근 실거래 내역
        </CardTitle>
        {data?.data?.length ? (
          <Badge variant="outline" className="text-[10px]">{data.data.length}건</Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-28 rounded bg-muted" />
                  <div className="h-3 w-40 rounded bg-muted" />
                </div>
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            수집된 거래 데이터가 없습니다.
          </p>
        ) : (
          <div className="space-y-1">
            {data.data.map((trade) => {
              const colors = priceColorClass(trade.price);
              const colorStr = `${colors.text} ${colors.bg}`;
              const date = trade.dealDate.slice(0, 10);

              return (
                <div
                  key={trade.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors"
                >
                  {/* 순번 + 가격 뱃지 */}
                  <div className={cn('flex items-center justify-center h-9 w-9 rounded-lg text-[11px] font-bold shrink-0', colorStr)}>
                    {formatPrice(trade.price).replace('억', '').replace('만', '')}
                    <span className="text-[8px] ml-0.5">억</span>
                  </div>

                  {/* 단지 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate">{trade.complex.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {trade.area}㎡ · {trade.floor}층 · {trade.complex.dong}
                    </p>
                  </div>

                  {/* 날짜 */}
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
