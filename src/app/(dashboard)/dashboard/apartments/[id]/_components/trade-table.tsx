'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Trade {
  id: string;
  dealDate: string;
  area: number;
  floor: number;
  price: number;
  pricePerPyeong: number | null;
  dealType: string | null;
}

interface TradeTableProps {
  trades: Trade[];
}

export function TradeTable({ trades }: TradeTableProps) {
  const [areaFilter, setAreaFilter] = useState<number | null>(null);

  // 면적 목록
  const areas = useMemo(() => {
    const areaSet = new Set(trades.map((t) => Math.round(t.area)));
    return [...areaSet].sort((a, b) => a - b);
  }, [trades]);

  const filtered = useMemo(() => {
    if (!areaFilter) return trades;
    return trades.filter((t) => Math.round(t.area) === areaFilter);
  }, [trades, areaFilter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">거래 내역</CardTitle>
          <span className="text-xs text-muted-foreground">
            {filtered.length}건{areaFilter ? ` (${areaFilter}㎡)` : ''}
          </span>
        </div>
        {/* 면적 필터 */}
        {areas.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <button
              onClick={() => setAreaFilter(null)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                !areaFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
              )}
            >
              전체
            </button>
            {areas.map((area) => (
              <button
                key={area}
                onClick={() => setAreaFilter(area)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  areaFilter === area ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                )}
              >
                {area}㎡
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* 데스크톱: 테이블 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">거래일</th>
                <th className="pb-2 font-medium">면적</th>
                <th className="pb-2 font-medium">층</th>
                <th className="pb-2 font-medium text-right">거래가</th>
                <th className="pb-2 font-medium text-right">평당가</th>
                <th className="pb-2 font-medium">유형</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trade) => (
                <tr key={trade.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="py-2 text-muted-foreground tabular-nums">{trade.dealDate.slice(0, 10)}</td>
                  <td className="py-2">{trade.area}㎡</td>
                  <td className="py-2">{trade.floor}층</td>
                  <td className="py-2 text-right font-semibold text-primary tabular-nums">{(trade.price / 10000).toFixed(1)}억</td>
                  <td className="py-2 text-right text-muted-foreground tabular-nums">{trade.pricePerPyeong ? `${trade.pricePerPyeong.toLocaleString()}만` : '—'}</td>
                  <td className="py-2">{trade.dealType && <Badge variant="outline" className="text-xs">{trade.dealType}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일: 카드 리스트 */}
        <div className="md:hidden space-y-2">
          {filtered.map((trade) => (
            <div key={trade.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-[13px] font-semibold text-primary tabular-nums">
                  {(trade.price / 10000).toFixed(1)}억
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {trade.area}㎡ · {trade.floor}층
                  {trade.pricePerPyeong ? ` · ${trade.pricePerPyeong.toLocaleString()}만/평` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground tabular-nums">{trade.dealDate.slice(0, 10)}</p>
                {trade.dealType && <Badge variant="outline" className="text-xs mt-0.5">{trade.dealType}</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
