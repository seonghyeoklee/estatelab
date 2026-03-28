'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Trade {
  dealDate: string;
  price: number;
  area: number;
  floor: number;
}

interface PriceChartProps {
  trades: Trade[];
}

export function PriceChart({ trades }: PriceChartProps) {
  if (trades.length === 0) return null;

  // 월별 평균가 계산
  const monthlyMap = new Map<string, { total: number; count: number }>();
  for (const t of trades) {
    const key = t.dealDate.slice(0, 7); // YYYY-MM
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.total += t.price;
      existing.count++;
    } else {
      monthlyMap.set(key, { total: t.price, count: 1 });
    }
  }

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, { total, count }]) => ({
      month,
      avgPrice: Math.round(total / count),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  if (monthly.length === 0) return null;

  const maxPrice = Math.max(...monthly.map((m) => m.avgPrice));
  const minPrice = Math.min(...monthly.map((m) => m.avgPrice));
  const range = maxPrice - minPrice || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">매매가 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-40">
          {monthly.map((m, idx) => {
            const height = ((m.avgPrice - minPrice) / range) * 100 + 10; // min 10%
            const isLast = idx === monthly.length - 1;

            return (
              <div
                key={m.month}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-[10px] text-muted-foreground">
                  {(m.avgPrice / 10000).toFixed(1)}억
                </span>
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    isLast ? 'bg-primary' : 'bg-primary/30'
                  )}
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] text-muted-foreground">
                  {m.month.slice(5)}월
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
