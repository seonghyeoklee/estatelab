import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = { title: '시장 개요' };
import { StatsCards } from '../_components/stats-cards';
import { RegionSummaryCards } from '../_components/region-summary-card';
import { RecentTradesCard } from '../_components/recent-trades-card';
import { RateSummaryCard } from '../_components/rate-summary-card';
import { InsightsCards } from '../_components/insights-cards';
import { MonthlyVolumeChart } from '../_components/monthly-volume-chart';

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">시장 개요</h1>
        <p className="text-muted-foreground">부동산 시장 현황을 한눈에 확인하세요.</p>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        }
      >
        <StatsCards />
      </Suspense>

      {/* 월별 거래량 + 금리 현황 (2열) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyVolumeChart />
        </div>
        <RateSummaryCard />
      </div>

      {/* 인사이트 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">시장 인사이트</h2>
        <InsightsCards />
      </div>

      {/* 지역별 + 최근 거래 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">지역별 거래 현황</h2>
          <RegionSummaryCards />
        </div>
        <RecentTradesCard />
      </div>
    </div>
  );
}
