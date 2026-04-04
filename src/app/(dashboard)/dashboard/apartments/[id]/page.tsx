import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { pricePerPyeong, toPyeong } from '@/lib/calculations';
import { formatPrice, priceColorClass } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Calendar, ArrowLeft, Map, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceChart } from './_components/price-chart';
import { TradeTable } from './_components/trade-table';
import { AreaComparison } from './_components/area-comparison';
import { WatchlistButton } from '@/components/watchlist-button';
import { ShareButton } from '@/components/share-button';
import { CompareButton } from '@/components/compare-button';
import { HistoryTracker } from './_components/history-tracker';
import { NearbyFacilities } from './_components/nearby-facilities';
import { RankCard } from './_components/rank-card';
import { DetailMap } from './_components/detail-map';
import { JeonseRatioCard } from './_components/jeonse-ratio-card';
import { PriceDiagnosis } from './_components/price-diagnosis';
import { KakaoMapProvider } from '@/components/kakao-map-provider';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const complex = await prisma.apartmentComplex.findUnique({
    where: { id },
    select: { name: true, dong: true, region: { select: { sigungu: true } } },
  });
  if (!complex) return { title: '단지 정보' };
  return {
    title: `${complex.name} - ${complex.region.sigungu} ${complex.dong}`,
    description: `${complex.name} 아파트 실거래가, 시세 추이, 주변시설 정보`,
  };
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
  const areaRecord: Record<number, { count: number; totalPrice: number; totalPPP: number }> = {};
  for (const trade of complex.trades) {
    const areaKey = Math.round(trade.area);
    const ppp = pricePerPyeong(trade.price, trade.area);
    if (areaRecord[areaKey]) {
      areaRecord[areaKey].count++;
      areaRecord[areaKey].totalPrice += trade.price;
      areaRecord[areaKey].totalPPP += ppp;
    } else {
      areaRecord[areaKey] = { count: 1, totalPrice: trade.price, totalPPP: ppp };
    }
  }

  const areaGroups = Object.entries(areaRecord)
    .map(([area, { count, totalPrice, totalPPP }]) => ({
      area: Number(area),
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
  const maxPrice = tradeCount ? Math.max(...complex.trades.map((t) => t.price)) : 0;
  const minPrice = tradeCount ? Math.min(...complex.trades.map((t) => t.price)) : 0;
  const latestTrade = complex.trades[0];
  const color = priceColorClass(avgPrice);

  // 층별 분석
  const floorGroups = [
    { label: '저층 (1~3층)', trades: complex.trades.filter((t) => t.floor >= 1 && t.floor <= 3), color: '#93c5fd' },
    { label: '중층 (4~10층)', trades: complex.trades.filter((t) => t.floor >= 4 && t.floor <= 10), color: '#2563eb' },
    { label: '고층 (11층+)', trades: complex.trades.filter((t) => t.floor >= 11), color: '#7c3aed' },
  ]
    .map((g) => ({
      ...g,
      avg: g.trades.length > 0 ? Math.round(g.trades.reduce((s, t) => s + t.price, 0) / g.trades.length) : 0,
      count: g.trades.length,
    }))
    .filter((g) => g.count > 0);

  const floorMaxAvg = Math.max(...floorGroups.map((g) => g.avg));
  const floorPremium = floorGroups.length >= 2
    ? Math.round(((floorGroups[floorGroups.length - 1].avg - floorGroups[0].avg) / floorGroups[0].avg) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <HistoryTracker complexId={id} />

      {/* Header */}
      <div>
        <Link
          href="/dashboard/apartments"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Link>
        <div className="flex items-start gap-4">
          <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', color.bg)}>
            <Building2 className={cn('h-7 w-7', color.text)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight truncate">{complex.name}</h1>
              <WatchlistButton complexId={id} />
              <CompareButton complexId={id} complexName={complex.name} />
              <ShareButton title={`${complex.name} - EstateLab`} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {complex.region.sido} {complex.region.sigungu} {complex.dong}
              </span>
              {complex.builtYear && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {complex.builtYear}년 건축
                </span>
              )}
              <Link
                href={`/dashboard/map?complexId=${id}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Map className="h-4 w-4" />
                지도에서 보기
              </Link>
              {latestTrade && (
                <Link
                  href={`/dashboard/calculator?price=${latestTrade.price}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Calculator className="h-4 w-4" />
                  대출 계산
                </Link>
              )}
            </div>
            {complex.roadAddress && (
              <p className="text-[13px] text-muted-foreground mt-1">{complex.roadAddress}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-[13px] text-muted-foreground">평균 매매가</p>
            <p className={cn('text-2xl font-bold mt-1', color.text)}>{formatPrice(avgPrice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-[13px] text-muted-foreground">최고 / 최저</p>
            <p className="text-2xl font-bold mt-1">
              {formatPrice(maxPrice)}
              <span className="text-[14px] font-normal text-muted-foreground mx-1">/</span>
              {formatPrice(minPrice)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-[13px] text-muted-foreground">거래 건수</p>
            <p className="text-2xl font-bold mt-1">{tradeCount}건</p>
            <p className="text-xs text-muted-foreground">{areaGroups.length}개 면적 타입</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-[13px] text-muted-foreground">최근 거래</p>
            {latestTrade ? (
              <div>
                <p className="text-2xl font-bold mt-1">{formatPrice(latestTrade.price)}</p>
                <p className="text-xs text-muted-foreground">
                  {latestTrade.area}㎡ ({Math.round(toPyeong(latestTrade.area))}평) · {latestTrade.floor}층 · {latestTrade.dealDate.toISOString().slice(0, 10)}
                </p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground mt-1">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 지도 */}
      <KakaoMapProvider>
        <DetailMap
          complexId={id}
          lat={complex.lat}
          lng={complex.lng}
          name={complex.name}
          address={`${complex.region.sido} ${complex.region.sigungu} ${complex.dong} ${complex.jibun}`}
        />
      </KakaoMapProvider>

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

      {/* 층별 분석 */}
      {floorGroups.length >= 2 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold">층별 가격 분석</h2>
              {floorPremium !== 0 && (
                <span className={cn(
                  'rounded-full px-3 py-1 text-[13px] font-semibold',
                  floorPremium > 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                )}>
                  {floorPremium > 0 ? <TrendingUp className="h-3.5 w-3.5 inline mr-1" /> : <TrendingDown className="h-3.5 w-3.5 inline mr-1" />}
                  고층 프리미엄 {floorPremium > 0 ? '+' : ''}{floorPremium}%
                </span>
              )}
            </div>
            <div className="space-y-4">
              {floorGroups.map((g) => {
                const widthPct = (g.avg / floorMaxAvg) * 100;
                return (
                  <div key={g.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium">{g.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-bold">{formatPrice(g.avg)}</span>
                        <Badge variant="outline" className="text-xs">{g.count}건</Badge>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-muted">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ width: `${widthPct}%`, backgroundColor: g.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 적정가 진단 + 동네 순위 (데이터 확실) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PriceDiagnosis complexId={id} />
        <RankCard complexId={id} />
      </div>

      {/* 전월세 현황 (데이터 있을 때만 표시) */}
      <JeonseRatioCard complexId={id} />

      {/* 주변시설 */}
      <NearbyFacilities complexId={id} />

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
