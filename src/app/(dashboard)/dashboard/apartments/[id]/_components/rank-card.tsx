'use client';

import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RankData {
  myRank: number;
  totalInRegion: number;
  percentile: number;
  myAvgPpp: number;
  turnoverRate: number | null;
  recentTrades: number;
  totalUnits: number | null;
  top3: { id: string; name: string; avgPpp: number }[];
  nearMe: { id: string; name: string; avgPpp: number }[];
}


export function RankCard({ complexId }: { complexId: string }) {
  const { data } = useSWR<{ data: RankData | null }>(
    `/api/market/apartments/${complexId}/rank`,
  );

  if (!data?.data) return null;

  const { myRank, totalInRegion, percentile, myAvgPpp, turnoverRate, recentTrades, totalUnits, top3 } = data.data;

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-[16px] font-bold mb-4">동네 시세 순위</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center rounded-xl bg-primary/5 p-3">
            <p className="text-[13px] text-muted-foreground">순위</p>
            <p className="text-2xl font-bold mt-1">
              <span className="text-primary">{myRank}</span>
              <span className="text-[14px] font-normal text-muted-foreground">/{totalInRegion}</span>
            </p>
            <p className="text-xs text-muted-foreground">상위 {percentile}%</p>
          </div>
          <div className="text-center rounded-xl bg-muted/50 p-3">
            <p className="text-[13px] text-muted-foreground">평당가</p>
            <p className="text-2xl font-bold mt-1">{myAvgPpp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">만원/평</p>
          </div>
          <div className="text-center rounded-xl bg-muted/50 p-3">
            <p className="text-[13px] text-muted-foreground">회전율</p>
            {turnoverRate !== null ? (
              <>
                <p className={cn(
                  'text-2xl font-bold mt-1',
                  turnoverRate >= 10 ? 'text-red-500' : turnoverRate >= 5 ? 'text-amber-500' : 'text-blue-500'
                )}>
                  {turnoverRate}%
                </p>
                <p className="text-xs text-muted-foreground">{recentTrades}건/{totalUnits}세대</p>
              </>
            ) : (
              <p className="text-xl font-bold text-muted-foreground mt-1">—</p>
            )}
          </div>
        </div>

        {/* 상위 3개 단지 */}
        {top3.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-muted-foreground mb-2">지역 TOP 3</p>
            <div className="space-y-1.5">
              {top3.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold',
                      idx === 0 ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'
                    )}>
                      {idx + 1}
                    </span>
                    <span className="text-[13px] font-medium truncate">{item.name}</span>
                  </div>
                  <span className="text-[13px] font-bold tabular-nums">{item.avgPpp.toLocaleString()}만/평</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
