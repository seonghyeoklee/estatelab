'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight,
  Crown, Percent, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface PricePerPyeongItem {
  complexId: string;
  name: string;
  sigungu: string;
  avgPricePerPyeong: number;
  tradeCount: number;
}

interface JeonseRatioItem {
  complexId: string;
  name: string;
  sigungu: string;
  avgTrade: number;
  avgDeposit: number;
  ratio: number;
}

interface VolumeChangeItem {
  sigungu: string;
  thisMonth: number;
  lastMonth: number;
  changePct: number;
}

interface PriceChangeItem {
  complexId: string;
  name: string;
  sigungu: string;
  thisAvg: number;
  lastAvg: number;
  changePct: number;
}

interface InsightsData {
  topPricePerPyeong: PricePerPyeongItem[];
  jeonseRatio: JeonseRatioItem[];
  volumeChange: VolumeChangeItem[];
  priceChange: PriceChangeItem[];
}


export function InsightsCards() {
  const { data, isLoading } = useSWR<{ data: InsightsData }>(
    '/api/market/summary/insights',
    { refreshInterval: 600_000 }
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[280px] animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    );
  }

  const insights = data?.data;
  if (!insights) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 평당가 TOP */}
      {insights.topPricePerPyeong.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-violet-500/10 p-2">
                <Crown className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-sm">평당가 TOP</CardTitle>
                <p className="text-[11px] text-muted-foreground">최근 3개월 거래 기준</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.topPricePerPyeong.slice(0, 7).map((item, idx) => {
              const maxPpp = insights.topPricePerPyeong[0].avgPricePerPyeong;
              const barPct = (item.avgPricePerPyeong / maxPpp) * 100;
              return (
                <Link key={item.complexId} href={`/dashboard/apartments/${item.complexId}`}>
                  <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors">
                    <span className={cn(
                      'text-[11px] font-bold w-5 text-center',
                      idx < 3 ? 'text-violet-600' : 'text-muted-foreground'
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium truncate">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{item.sigungu}</span>
                      </div>
                      <div className="mt-0.5 h-1 rounded-full bg-muted/60">
                        <div
                          className="h-1 rounded-full bg-violet-500/40"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-violet-600 shrink-0 tabular-nums">
                      {item.avgPricePerPyeong.toLocaleString()}만/평
                    </span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 전세가율 TOP */}
      {insights.jeonseRatio.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Percent className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm">전세가율 TOP</CardTitle>
                <p className="text-[11px] text-muted-foreground">전세 보증금 / 매매가 (높을수록 갭 작음)</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.jeonseRatio.slice(0, 7).map((item, idx) => (
              <Link key={item.complexId} href={`/dashboard/apartments/${item.complexId}`}>
                <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors">
                  <span className={cn(
                    'text-[11px] font-bold w-5 text-center',
                    idx < 3 ? 'text-amber-600' : 'text-muted-foreground'
                  )}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{item.sigungu}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      매매 {formatPrice(item.avgTrade)} · 전세 {formatPrice(item.avgDeposit)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[11px] font-bold shrink-0',
                      item.ratio >= 70 ? 'text-red-600 bg-red-500/10' : 'text-amber-600 bg-amber-500/10'
                    )}
                  >
                    {item.ratio}%
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 거래량 변화 (구별) */}
      {insights.volumeChange.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm">거래량 변화</CardTitle>
                <p className="text-[11px] text-muted-foreground">이번 달 vs 지난 달 (구별)</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.volumeChange.slice(0, 7).map((item) => (
              <div key={item.sigungu} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                <span className="text-[13px] font-medium w-20 truncate">{item.sigungu}</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{item.lastMonth}건</span>
                  <span className="text-[11px] text-muted-foreground">→</span>
                  <span className="text-[11px] font-semibold tabular-nums">{item.thisMonth}건</span>
                </div>
                <span className={cn(
                  'inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums',
                  item.changePct > 0 ? 'text-red-500' : item.changePct < 0 ? 'text-blue-500' : 'text-muted-foreground'
                )}>
                  {item.changePct > 0 ? <ArrowUpRight className="h-3 w-3" /> : item.changePct < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                  {item.changePct > 0 ? '+' : ''}{item.changePct}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 가격 급등/급락 */}
      {insights.priceChange.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm">가격 변동 TOP</CardTitle>
                <p className="text-[11px] text-muted-foreground">이번 달 vs 지난 달 평균가</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {insights.priceChange.slice(0, 7).map((item) => {
              const isUp = item.changePct > 0;
              return (
                <Link key={item.complexId} href={`/dashboard/apartments/${item.complexId}`}>
                  <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors">
                    {isUp
                      ? <TrendingUp className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      : <TrendingDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium truncate">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{item.sigungu}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatPrice(item.lastAvg)} → {formatPrice(item.thisAvg)}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[12px] font-bold shrink-0 tabular-nums',
                      isUp ? 'text-red-500' : 'text-blue-500'
                    )}>
                      {isUp ? '+' : ''}{item.changePct}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
