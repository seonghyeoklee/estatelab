'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function RegionSummaryCards() {
  const { data, isLoading } = useSWR<{ data: RegionSummary[] }>(
    '/api/market/summary/regions',
    fetcher,
    { refreshInterval: 300_000 }
  );

  if (isLoading || !data?.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
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
          <p className="text-xs text-muted-foreground">
            공공데이터 API 키 등록 후 실거래가를 수집하세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.data.map((region, idx) => (
        <Card
          key={region.regionCode}
          className={cn('hover-lift animate-fade-up', `delay-${idx + 1}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {region.sigungu}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {region.sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">
              {region.avgPricePerPyeong.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-muted-foreground">만원/평</span>
            </p>
            <p className="text-xs text-muted-foreground">
              거래 {region.tradeCount.toLocaleString()}건
              · 평균 {(region.avgPrice / 10000).toFixed(1)}억
            </p>
            {region.latestTrade && (
              <p className="text-xs text-muted-foreground">
                최근: {region.latestTrade.name} {region.latestTrade.area}㎡{' '}
                {(region.latestTrade.price / 10000).toFixed(1)}억
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
