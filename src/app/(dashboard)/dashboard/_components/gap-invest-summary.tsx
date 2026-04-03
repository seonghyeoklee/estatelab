'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface GapItem {
  complexId: string;
  name: string;
  sigungu: string;
  area: number;
  avgTrade: number;
  avgJeonse: number;
  gapAmount: number;
  jeonseRatio: number;
}

export function GapInvestSummary() {
  const { data } = useSWR<{ data: GapItem[] }>(
    '/api/market/gap-invest?minRatio=60&sort=gap&limit=5'
  );

  if (!data?.data?.length) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4 text-primary" />
          갭투자 기회
        </CardTitle>
        <Link
          href="/dashboard/gap-invest"
          className="inline-flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
        >
          더보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {data.data.map((item) => (
          <Link
            key={`${item.complexId}-${item.area}`}
            href={`/dashboard/apartments/${item.complexId}`}
          >
            <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.sigungu} · {item.area}㎡
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold text-primary">{formatPrice(item.gapAmount)}</p>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px]',
                    item.jeonseRatio >= 70 ? 'text-red-600 bg-red-500/10' : 'text-amber-600 bg-amber-500/10'
                  )}
                >
                  {item.jeonseRatio}%
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
