'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RecentTradesCard() {
  const { data, isLoading } = useSWR<{ data: Trade[] }>(
    '/api/market/trades?limit=10',
    fetcher,
    { refreshInterval: 300_000 }
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">최근 실거래 내역</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="ml-auto h-4 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !data?.data?.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            수집된 거래 데이터가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {data.data.map((trade) => {
              const priceInOk = (trade.price / 10000).toFixed(1);
              const date = trade.dealDate.slice(0, 10);

              return (
                <div
                  key={trade.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
                >
                  <span className="font-medium truncate max-w-[140px]">
                    {trade.complex.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {trade.area}㎡ · {trade.floor}층
                  </Badge>
                  <span className="ml-auto font-semibold text-primary shrink-0">
                    {priceInOk}억
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {date}
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
