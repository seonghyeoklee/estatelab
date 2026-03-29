'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toPyeong } from '@/lib/calculations';

interface AreaGroup {
  area: number;
  count: number;
  avgPrice: number;
  avgPricePerPyeong: number;
}

interface AreaComparisonProps {
  areaGroups: AreaGroup[];
}

export function AreaComparison({ areaGroups }: AreaComparisonProps) {
  if (areaGroups.length === 0) return null;

  const maxPrice = Math.max(...areaGroups.map((g) => g.avgPrice));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">면적별 비교</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {areaGroups.map((group) => {
            const widthPct = (group.avgPrice / maxPrice) * 100;
            const pyeong = Math.round(toPyeong(group.area));

            return (
              <div key={group.area} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {group.area}㎡
                    <span className="ml-1 text-muted-foreground">({pyeong}평)</span>
                  </span>
                  <span className="font-semibold">
                    {(group.avgPrice / 10000).toFixed(1)}억
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({group.count}건)
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary/60 transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
