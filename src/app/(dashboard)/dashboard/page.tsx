import { Suspense } from 'react';
import { StatsCards } from './_components/stats-cards';
import { RegionSummaryCards } from './_components/region-summary-card';
import { RecentTradesCard } from './_components/recent-trades-card';
import { RateSummaryCard } from './_components/rate-summary-card';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
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

      {/* Region summaries */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">지역별 거래 현황</h2>
        <RegionSummaryCards />
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentTradesCard />
        <RateSummaryCard />
      </div>
    </div>
  );
}
