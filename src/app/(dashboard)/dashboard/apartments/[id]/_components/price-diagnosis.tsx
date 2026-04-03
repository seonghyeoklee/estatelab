'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface CompareItem {
  id: string;
  name: string;
  dong: string;
  builtYear: number | null;
  avgPrice: number;
  avgPpp: number;
  diff: number;
  tradeCount: number;
}

interface CompareData {
  mainArea: number;
  myAvgPrice: number;
  myAvgPpp: number;
  complexName: string;
  comparisons: CompareItem[];
}

export function PriceDiagnosis({ complexId }: { complexId: string }) {
  const { data } = useSWR<{ data: CompareData }>(
    `/api/market/apartments/${complexId}/compare`
  );

  if (!data?.data || data.data.comparisons.length === 0) return null;

  const { mainArea, myAvgPrice, myAvgPpp, comparisons } = data.data;

  // 지역 평균 계산
  const allPrices = [myAvgPrice, ...comparisons.map((c) => c.avgPrice)];
  const regionAvg = Math.round(allPrices.reduce((s, p) => s + p, 0) / allPrices.length);
  const diffFromAvg = regionAvg > 0 ? Math.round(((myAvgPrice - regionAvg) / regionAvg) * 100) : 0;

  const allPpp = [myAvgPpp, ...comparisons.map((c) => c.avgPpp)];
  const regionAvgPpp = Math.round(allPpp.reduce((s, p) => s + p, 0) / allPpp.length);

  // 진단 문구
  const diagnosis =
    diffFromAvg > 15 ? { label: '고가', desc: '동일 지역 평균보다 높은 가격대', color: 'text-red-600 bg-red-500/10' } :
    diffFromAvg > 5 ? { label: '평균 이상', desc: '동일 지역 평균 대비 소폭 높음', color: 'text-amber-600 bg-amber-500/10' } :
    diffFromAvg > -5 ? { label: '적정', desc: '동일 지역 평균과 유사한 가격', color: 'text-emerald-600 bg-emerald-500/10' } :
    diffFromAvg > -15 ? { label: '평균 이하', desc: '동일 지역 평균보다 낮은 가격대', color: 'text-blue-600 bg-blue-500/10' } :
    { label: '저가', desc: '동일 지역 평균보다 크게 낮음', color: 'text-violet-600 bg-violet-500/10' };

  const maxPrice = Math.max(myAvgPrice, ...comparisons.map((c) => c.avgPrice));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            적정가 진단
          </CardTitle>
          <Badge variant="secondary" className={cn('text-xs font-bold', diagnosis.color)}>
            {diagnosis.label} ({diffFromAvg > 0 ? '+' : ''}{diffFromAvg}%)
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{diagnosis.desc} · {mainArea}㎡ 기준</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 요약 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-primary/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">이 단지</p>
            <p className="text-sm font-bold text-primary">{formatPrice(myAvgPrice)}</p>
            <p className="text-xs text-muted-foreground">{myAvgPpp.toLocaleString()}만/평</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">지역 평균</p>
            <p className="text-sm font-bold">{formatPrice(regionAvg)}</p>
            <p className="text-xs text-muted-foreground">{regionAvgPpp.toLocaleString()}만/평</p>
          </div>
          <div className={cn('rounded-xl p-3 text-center', diffFromAvg >= 0 ? 'bg-red-500/5' : 'bg-blue-500/5')}>
            <p className="text-xs text-muted-foreground">차이</p>
            <p className={cn('text-sm font-bold', diffFromAvg >= 0 ? 'text-red-600' : 'text-blue-600')}>
              {diffFromAvg >= 0 ? '+' : ''}{diffFromAvg}%
            </p>
            <p className="text-xs text-muted-foreground">{formatPrice(Math.abs(myAvgPrice - regionAvg))}</p>
          </div>
        </div>

        {/* 비교 차트 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">주변 단지 비교</p>

          {/* 이 단지 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold w-24 truncate text-primary">이 단지</span>
            <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-5 rounded-full bg-primary flex items-center justify-end pr-2"
                style={{ width: `${(myAvgPrice / maxPrice) * 100}%` }}
              >
                <span className="text-[10px] font-bold text-white">{formatPrice(myAvgPrice)}</span>
              </div>
            </div>
          </div>

          {/* 비교 단지들 */}
          {comparisons.slice(0, 5).map((c) => (
            <Link key={c.id} href={`/dashboard/apartments/${c.id}`}>
              <div className="flex items-center gap-2 group">
                <span className="text-xs w-24 truncate text-muted-foreground group-hover:text-foreground transition-colors">
                  {c.name}
                </span>
                <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-5 rounded-full bg-muted-foreground/20 flex items-center justify-end pr-2"
                    style={{ width: `${(c.avgPrice / maxPrice) * 100}%` }}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground">{formatPrice(c.avgPrice)}</span>
                  </div>
                </div>
                <span className={cn(
                  'text-xs font-medium w-12 text-right shrink-0',
                  c.diff > 0 ? 'text-red-500' : c.diff < 0 ? 'text-blue-500' : 'text-muted-foreground'
                )}>
                  {c.diff > 0 ? '+' : ''}{c.diff}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
