import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { PriceChart } from './_components/price-chart';
import { TradeTable } from './_components/trade-table';
import { AreaComparison } from './_components/area-comparison';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApartmentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    include: {
      region: true,
      trades: {
        orderBy: { dealDate: 'desc' },
        take: 200,
      },
    },
  });

  if (!complex) notFound();

  // 면적별 그룹핑
  const areaMap = new Map<number, { count: number; totalPrice: number; totalPPP: number }>();
  for (const trade of complex.trades) {
    const areaKey = Math.round(trade.area);
    const pyeong = trade.area / 3.3058;
    const ppp = Math.round(trade.price / pyeong);
    const existing = areaMap.get(areaKey);
    if (existing) {
      existing.count++;
      existing.totalPrice += trade.price;
      existing.totalPPP += ppp;
    } else {
      areaMap.set(areaKey, { count: 1, totalPrice: trade.price, totalPPP: ppp });
    }
  }

  const areaGroups = Array.from(areaMap.entries())
    .map(([area, { count, totalPrice, totalPPP }]) => ({
      area,
      count,
      avgPrice: Math.round(totalPrice / count),
      avgPricePerPyeong: Math.round(totalPPP / count),
    }))
    .sort((a, b) => a.area - b.area);

  // 통계
  const tradeCount = complex.trades.length;
  const avgPrice = tradeCount
    ? Math.round(complex.trades.reduce((s, t) => s + t.price, 0) / tradeCount)
    : 0;
  const latestTrade = complex.trades[0];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/apartments"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{complex.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {complex.region.sido} {complex.region.sigungu} {complex.dong}
              </span>
              {complex.builtYear && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {complex.builtYear}년 건축
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">평균 매매가</p>
            <p className="text-2xl font-bold text-primary">
              {(avgPrice / 10000).toFixed(1)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">억</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">거래 건수</p>
            <p className="text-2xl font-bold">{tradeCount}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">최근 거래</p>
            {latestTrade ? (
              <div>
                <p className="text-2xl font-bold">
                  {(latestTrade.price / 10000).toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">억</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {latestTrade.area}㎡ · {latestTrade.floor}층 ·{' '}
                  {latestTrade.dealDate.toISOString().slice(0, 10)}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PriceChart trades={complex.trades.map((t) => ({
          dealDate: t.dealDate.toISOString(),
          price: t.price,
          area: t.area,
          floor: t.floor,
        }))} />
        <AreaComparison areaGroups={areaGroups} />
      </div>

      {/* Trade table */}
      <TradeTable trades={complex.trades.map((t) => ({
        id: t.id,
        dealDate: t.dealDate.toISOString(),
        area: t.area,
        floor: t.floor,
        price: t.price,
        pricePerPyeong: t.pricePerPyeong,
        dealType: t.dealType,
      }))} />
    </div>
  );
}
