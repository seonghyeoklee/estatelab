'use client';

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  X, Building2, MapPin, Calendar, TrendingUp, TrendingDown,
  BarChart3, Train, GraduationCap, ShoppingCart, Hospital,
  Landmark, Coffee, Store, Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import { toPyeong } from '@/lib/calculations';
import { PriceChart } from './price-chart';

interface Trade {
  id: string;
  dealDate: string;
  area: number;
  floor: number;
  price: number;
  pricePerPyeong: number | null;
  dealType: string | null;
}

interface AreaGroup {
  area: number;
  count: number;
  avgPrice: number;
  avgPricePerPyeong: number;
}

interface ComplexDetail {
  id: string;
  name: string;
  dong: string;
  jibun: string;
  roadAddress: string | null;
  builtYear: number | null;
  totalUnits: number | null;
  region: { sido: string; sigungu: string };
  trades: Trade[];
  areaGroups: AreaGroup[];
}

interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  distance: number;
  phone: string;
}

interface NearbySummary {
  key: string;
  label: string;
  count: number;
  nearest: NearbyPlace | null;
}

interface NearbyData {
  summary: NearbySummary[];
  places: Record<string, NearbyPlace[]>;
  radius: number;
}


// 카테고리별 설정
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  subway: { icon: <Train className="h-4 w-4" />, color: '#2563eb' },
  school: { icon: <GraduationCap className="h-4 w-4" />, color: '#d97706' },
  convenience: { icon: <Store className="h-4 w-4" />, color: '#059669' },
  mart: { icon: <ShoppingCart className="h-4 w-4" />, color: '#7c3aed' },
  hospital: { icon: <Hospital className="h-4 w-4" />, color: '#dc2626' },
  cafe: { icon: <Coffee className="h-4 w-4" />, color: '#92400e' },
  bank: { icon: <Landmark className="h-4 w-4" />, color: '#0369a1' },
};

// 도보 시간 계산 (분당 80m 기준)
function walkMinutes(distance: number): string {
  const min = Math.ceil(distance / 80);
  return min <= 1 ? '1분' : `${min}분`;
}

// 거리 등급
function distanceGrade(distance: number): { label: string; color: string } {
  if (distance <= 300) return { label: '매우 가까움', color: 'text-emerald-600' };
  if (distance <= 500) return { label: '가까움', color: 'text-blue-600' };
  if (distance <= 800) return { label: '보통', color: 'text-amber-600' };
  return { label: '먼 편', color: 'text-muted-foreground' };
}

type TabKey = 'overview' | 'trades' | 'buildings' | 'schools' | 'nearby';

interface BuildingUnit {
  dongNm: string;
  mainPurpsCdNm: string;
  grndFlrCnt: number;
  ugrndFlrCnt: number;
  hhldCnt: number;
  hoCnt: number;
  totArea: number;
  rideUseElvtCnt: number;
  rserthqkAblty: string | null;
}

interface BuildingData {
  complexName: string;
  bldNm: string | null;
  units: BuildingUnit[];
  totalHhld: number;
  totalDong: number;
}

interface SchoolPlace {
  id: string;
  name: string;
  category: string;
  distance: number;
  lat: number;
  lng: number;
  phone: string;
  schoolType: 'elementary' | 'middle' | 'high';
}

interface SchoolSummaryItem {
  count: number;
  nearest: SchoolPlace | null;
  within500m: number;
}

interface SchoolData {
  schools: { elementary: SchoolPlace[]; middle: SchoolPlace[]; high: SchoolPlace[] };
  summary: { elementary: SchoolSummaryItem; middle: SchoolSummaryItem; high: SchoolSummaryItem };
  grade: string;
  radius: number;
}

// 가격 변동률 계산
function calcPriceChange(trades: Trade[]): { mom: number | null; yoy: number | null } {
  if (trades.length < 2) return { mom: null, yoy: null };

  const sorted = [...trades].sort((a, b) => b.dealDate.localeCompare(a.dealDate));
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const lastYear = (() => {
    const d = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const avgByMonth = (month: string) => {
    const items = sorted.filter((t) => t.dealDate.slice(0, 7) === month);
    if (items.length === 0) return null;
    return Math.round(items.reduce((s, t) => s + t.price, 0) / items.length);
  };

  // 이번 달 또는 직전 달 (이번 달 거래가 없으면 직전 달 사용)
  const currentAvg = avgByMonth(thisMonth) ?? avgByMonth(lastMonth);
  const prevMonthAvg = avgByMonth(lastMonth) ?? (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return avgByMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  })();
  const prevYearAvg = avgByMonth(lastYear);

  const mom = currentAvg && prevMonthAvg
    ? Math.round(((currentAvg - prevMonthAvg) / prevMonthAvg) * 1000) / 10
    : null;
  const yoy = currentAvg && prevYearAvg
    ? Math.round(((currentAvg - prevYearAvg) / prevYearAvg) * 1000) / 10
    : null;

  return { mom, yoy };
}

interface Props {
  complexId: string;
  onClose: () => void;
  onTabChange?: (tab: string) => void;
}

export function ComplexDetailPanel({ complexId, onClose, onTabChange }: Props) {
  // complexId가 바뀌면 key prop으로 컴포넌트가 리마운트됨 → 자동 초기화
  const [activeTab, setActiveTabState] = useState<TabKey>('overview');
  const setActiveTab = (tab: TabKey) => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };
  const [areaFilter, setAreaFilter] = useState<number | null>(null);

  const { data, isLoading } = useSWR<{ data: ComplexDetail }>(
    `/api/market/apartments/${complexId}`,
  );
  const { data: nearbyData } = useSWR<{ data: NearbyData }>(
    activeTab === 'nearby' ? `/api/market/apartments/${complexId}/nearby?radius=1000` : null,
  );
  const { data: buildingData } = useSWR<{ data: BuildingData }>(
    activeTab === 'buildings' ? `/api/market/apartments/${complexId}/buildings` : null,
  );
  const { data: schoolData } = useSWR<{ data: SchoolData }>(
    activeTab === 'schools' ? `/api/market/apartments/${complexId}/schools?radius=1500` : null,
  );

  interface CompareItem {
    id: string; name: string; dong: string; builtYear: number | null;
    avgPrice: number; avgPpp: number; diff: number; tradeCount: number;
  }
  interface CompareData {
    mainArea: number; myAvgPrice: number; myAvgPpp: number;
    complexName: string; comparisons: CompareItem[];
  }
  const { data: compareData } = useSWR<{ data: CompareData }>(
    complexId ? `/api/market/apartments/${complexId}/compare` : null,
  );

  interface RankData {
    myRank: number; totalInRegion: number; percentile: number; myAvgPpp: number;
    turnoverRate: number | null; recentTrades: number; totalUnits: number | null;
    top3: { id: string; name: string; avgPpp: number }[];
    nearMe: { id: string; name: string; avgPpp: number }[];
  }
  const { data: rankData } = useSWR<{ data: RankData | null }>(
    complexId ? `/api/market/apartments/${complexId}/rank` : null,
  );

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const detail = data?.data;
  const trades = useMemo(() => detail?.trades ?? [], [detail?.trades]);
  const areaGroups = useMemo(() => detail?.areaGroups ?? [], [detail?.areaGroups]);

  // 면적 필터 적용
  const filteredTrades = useMemo(() => {
    if (!areaFilter) return trades;
    return trades.filter((t) => Math.round(t.area) === areaFilter);
  }, [trades, areaFilter]);

  // 통계 (필터된 거래 기준)
  const tradeCount = filteredTrades.length;
  const avgPrice = tradeCount
    ? Math.round(filteredTrades.reduce((s, t) => s + t.price, 0) / tradeCount)
    : 0;
  const maxPrice = tradeCount ? Math.max(...filteredTrades.map((t) => t.price)) : 0;
  const minPrice = tradeCount ? Math.min(...filteredTrades.map((t) => t.price)) : 0;

  // 가격 변동률
  const priceChange = useMemo(() => calcPriceChange(filteredTrades), [filteredTrades]);

  // 월별 차트 데이터
  // 가격 변동률은 calcPriceChange에서 trades로 직접 계산

  // 주변시설 데이터
  const nearbySummary = nearbyData?.data?.summary ?? [];
  const nearbyPlaces = nearbyData?.data?.places ?? {};

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: '개요' },
    { key: 'trades', label: trades.length > 0 ? `거래 ${trades.length}` : '거래' },
    { key: 'buildings', label: '건물' },
    { key: 'schools', label: '학군' },
    { key: 'nearby', label: '주변' },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {isLoading ? (
        <div className="p-4 space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
      ) : detail ? (
        <>
          {/* 헤더 */}
          <div className="shrink-0 border-b px-5 py-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold truncate">{detail.name}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[14px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {detail.region.sigungu} {detail.dong}
                  </span>
                  {detail.builtYear && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {detail.builtYear}년
                    </span>
                  )}
                  {detail.totalUnits && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {detail.totalUnits.toLocaleString()}세대
                    </span>
                  )}
                </div>
                {detail.roadAddress && (
                  <p className="text-[13px] text-muted-foreground mt-1">{detail.roadAddress}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-accent transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 핵심 통계 */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="rounded-xl bg-primary/5 p-3 text-center">
                <p className="text-[12px] text-muted-foreground">평균</p>
                <p className="text-lg font-bold text-primary">{formatPrice(avgPrice)}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-[12px] text-muted-foreground">최고</p>
                <p className="text-lg font-bold">{formatPrice(maxPrice)}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-[12px] text-muted-foreground">최저</p>
                <p className="text-lg font-bold">{formatPrice(minPrice)}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3 text-center">
                <p className="text-[12px] text-muted-foreground">거래</p>
                <p className="text-lg font-bold">{tradeCount}건</p>
              </div>
            </div>

            {/* 가격 변동률 */}
            {(priceChange.mom !== null || priceChange.yoy !== null) && (
              <div className="flex items-center gap-3 mt-3">
                {priceChange.mom !== null && (
                  <div className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium',
                    priceChange.mom > 0 ? 'bg-red-50 text-red-600' : priceChange.mom < 0 ? 'bg-blue-50 text-blue-600' : 'bg-muted text-muted-foreground'
                  )}>
                    {priceChange.mom > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : priceChange.mom < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                    전월 {priceChange.mom > 0 ? '+' : ''}{priceChange.mom}%
                  </div>
                )}
                {priceChange.yoy !== null && (
                  <div className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium',
                    priceChange.yoy > 0 ? 'bg-red-50 text-red-600' : priceChange.yoy < 0 ? 'bg-blue-50 text-blue-600' : 'bg-muted text-muted-foreground'
                  )}>
                    {priceChange.yoy > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : priceChange.yoy < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                    전년 {priceChange.yoy > 0 ? '+' : ''}{priceChange.yoy}%
                  </div>
                )}
              </div>
            )}

            {/* 탭 */}
            <div className="flex gap-0.5 mt-4 -mb-4 bg-muted/50 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap',
                    activeTab === tab.key
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 스크롤 콘텐츠 */}
          <div className="flex-1 overflow-y-auto">
            {/* === 개요 탭 === */}
            {activeTab === 'overview' && (
              <>
                {/* 순위 + 회전율 */}
                {rankData?.data && (
                  <div className="px-5 py-4 border-b bg-muted/20">
                    <div className="grid grid-cols-3 gap-3">
                      {/* 시세 순위 */}
                      <div className="text-center">
                        <p className="text-[12px] text-muted-foreground">시세 순위</p>
                        <p className="text-xl font-bold mt-0.5">
                          <span className="text-primary">{rankData.data.myRank}</span>
                          <span className="text-[13px] font-normal text-muted-foreground">/{rankData.data.totalInRegion}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">상위 {rankData.data.percentile}%</p>
                      </div>
                      {/* 평당가 */}
                      <div className="text-center">
                        <p className="text-[12px] text-muted-foreground">평당가</p>
                        <p className="text-xl font-bold mt-0.5">
                          {rankData.data.myAvgPpp.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">만원/평</p>
                      </div>
                      {/* 회전율 */}
                      <div className="text-center">
                        <p className="text-[12px] text-muted-foreground">회전율</p>
                        {rankData.data.turnoverRate !== null ? (
                          <>
                            <p className="text-xl font-bold mt-0.5">{rankData.data.turnoverRate}%</p>
                            <p className="text-[11px] text-muted-foreground">
                              {rankData.data.recentTrades}건/{rankData.data.totalUnits}세대
                            </p>
                          </>
                        ) : (
                          <p className="text-[14px] font-medium text-muted-foreground mt-1">—</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 면적별 필터 칩 */}
                {areaGroups.length > 1 && (
                  <div className="px-5 py-3 border-b">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => setAreaFilter(null)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                          !areaFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                        )}
                      >
                        전체
                      </button>
                      {areaGroups.map((g) => (
                        <button
                          key={g.area}
                          onClick={() => setAreaFilter(g.area)}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                            areaFilter === g.area ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                          )}
                        >
                          {g.area}㎡ ({Math.round(toPyeong(g.area))}평)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 가격 추이 차트 */}
                {filteredTrades.length > 0 && (
                  <div className="px-5 py-4 border-b">
                    <PriceChart trades={filteredTrades} />
                  </div>
                )}

                {/* 면적별 비교 */}
                {areaGroups.length > 0 && (
                  <div className="px-5 py-4 border-b">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-[15px] font-bold">면적별 평균</h3>
                    </div>
                    <div className="space-y-3">
                      {areaGroups.map((group) => {
                        const maxAreaPrice = Math.max(...areaGroups.map((g) => g.avgPrice));
                        const widthPct = (group.avgPrice / maxAreaPrice) * 100;
                        const pyeong = Math.round(toPyeong(group.area));
                        const isActive = areaFilter === group.area;
                        return (
                          <button
                            key={group.area}
                            onClick={() => setAreaFilter(isActive ? null : group.area)}
                            className={cn(
                              'w-full text-left space-y-1.5 rounded-xl px-3 py-2.5 transition-colors',
                              isActive ? 'bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-accent/50'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[14px] font-medium">
                                {group.area}㎡ <span className="text-muted-foreground">({pyeong}평)</span>
                              </span>
                              <span className="text-[15px] font-bold">
                                {formatPrice(group.avgPrice)}
                                <span className="text-[12px] font-normal text-muted-foreground ml-1.5">
                                  {group.count}건
                                </span>
                              </span>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-2.5 rounded-full transition-colors',
                                  isActive ? 'bg-primary' : 'bg-primary/40'
                                )}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 층별 가격 분석 */}
                {filteredTrades.length >= 5 && (() => {
                  const floorGroups = [
                    { label: '저층 (1~3층)', filter: (t: Trade) => t.floor >= 1 && t.floor <= 3, color: '#93c5fd' },
                    { label: '중층 (4~10층)', filter: (t: Trade) => t.floor >= 4 && t.floor <= 10, color: '#2563eb' },
                    { label: '고층 (11층+)', filter: (t: Trade) => t.floor >= 11, color: '#7c3aed' },
                  ];
                  const results = floorGroups.map((g) => {
                    const items = filteredTrades.filter(g.filter);
                    const avg = items.length > 0 ? Math.round(items.reduce((s, t) => s + t.price, 0) / items.length) : 0;
                    return { ...g, avg, count: items.length };
                  }).filter((r) => r.count > 0);
                  if (results.length < 2) return null;
                  const maxAvg = Math.max(...results.map((r) => r.avg));
                  const premium = results.length >= 2 && results[0].avg > 0
                    ? Math.round(((results[results.length - 1].avg - results[0].avg) / results[0].avg) * 100)
                    : 0;

                  return (
                    <div className="px-5 py-4 border-b bg-muted/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-bold">층별 가격 분석</h3>
                        {premium !== 0 && (
                          <span className={cn(
                            'rounded-full px-3 py-1 text-[13px] font-semibold',
                            premium > 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          )}>
                            고층 프리미엄 {premium > 0 ? '+' : ''}{premium}%
                          </span>
                        )}
                      </div>
                      <div className="space-y-4">
                        {results.map((r) => {
                          const widthPct = (r.avg / maxAvg) * 100;
                          return (
                            <div key={r.label} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[14px] font-medium">{r.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[15px] font-bold">{formatPrice(r.avg)}</span>
                                  <span className="text-[12px] text-muted-foreground">{r.count}건</span>
                                </div>
                              </div>
                              <div className="h-3 rounded-full bg-muted">
                                <div
                                  className="h-3 rounded-full transition-all"
                                  style={{ width: `${widthPct}%`, backgroundColor: r.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 최근 거래 미리보기 */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-[14px] font-semibold">최근 거래</h3>
                    </div>
                    {trades.length > 5 && (
                      <button
                        onClick={() => setActiveTab('trades')}
                        className="text-[13px] text-primary font-medium hover:underline"
                      >
                        전체 보기 →
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {filteredTrades.slice(0, 5).map((trade) => (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-muted-foreground text-[13px] w-[82px] shrink-0 tabular-nums">
                            {trade.dealDate.slice(0, 10)}
                          </span>
                          <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                            {trade.area}㎡ · {trade.floor}층
                          </Badge>
                        </div>
                        <span className="font-bold text-primary shrink-0">
                          {formatPrice(trade.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 주변 단지 비교 */}
                {compareData?.data?.comparisons && compareData.data.comparisons.length > 0 && (
                  <div className="px-5 py-4 border-t bg-muted/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-bold">주변 단지 비교</h3>
                      <Badge variant="outline" className="text-[11px]">
                        {compareData.data.mainArea}㎡ 기준
                      </Badge>
                    </div>

                    {/* 내 단지 (기준) */}
                    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-bold">{compareData.data.complexName}</p>
                          <p className="text-[12px] text-muted-foreground">기준 단지 · {compareData.data.myAvgPpp.toLocaleString()}만/평</p>
                        </div>
                        <p className="text-xl font-bold text-primary">{formatPrice(compareData.data.myAvgPrice)}</p>
                      </div>
                    </div>

                    {/* 비교 단지 */}
                    <div className="space-y-1">
                      {compareData.data.comparisons.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-accent/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium truncate">{c.name}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {c.dong}{c.builtYear ? ` · ${c.builtYear}년` : ''} · {c.tradeCount}건
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-[16px] font-bold">{formatPrice(c.avgPrice)}</p>
                            <span className={cn(
                              'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold mt-0.5',
                              c.diff > 0 ? 'bg-red-50 text-red-600' : c.diff < 0 ? 'bg-blue-50 text-blue-600' : 'bg-muted text-muted-foreground'
                            )}>
                              {c.diff > 0 ? '+' : ''}{c.diff}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* === 거래 내역 탭 === */}
            {activeTab === 'trades' && (
              <div className="py-3">
                {/* 면적 필터 */}
                {areaGroups.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap px-5 pb-3 border-b">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <button
                      onClick={() => setAreaFilter(null)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                        !areaFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                      )}
                    >
                      전체 {trades.length}
                    </button>
                    {areaGroups.map((g) => (
                      <button
                        key={g.area}
                        onClick={() => setAreaFilter(g.area)}
                        className={cn(
                          'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                          areaFilter === g.area ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                        )}
                      >
                        {g.area}㎡ ({g.count})
                      </button>
                    ))}
                  </div>
                )}

                {/* 거래 리스트 */}
                <div>
                  {filteredTrades.length === 0 ? (
                    <p className="text-center text-[14px] text-muted-foreground py-12">
                      해당 면적의 거래 내역이 없습니다.
                    </p>
                  ) : (
                    <>
                      {/* 헤더 */}
                      <div className="flex items-center justify-between px-5 py-2.5 text-[12px] text-muted-foreground font-medium border-b bg-muted/30">
                        <span>날짜 / 면적</span>
                        <span>거래가</span>
                      </div>
                      {filteredTrades.map((trade) => {
                        const pyeong = Math.round(toPyeong(trade.area));
                        const ppp = trade.pricePerPyeong;
                        return (
                          <div
                            key={trade.id}
                            className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors border-b border-border/20 last:border-0"
                          >
                            <div className="space-y-0.5">
                              <p className="text-[14px] font-medium tabular-nums">
                                {trade.dealDate.slice(0, 10)}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                                  {trade.area}㎡ ({pyeong}평)
                                </Badge>
                                <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                                  {trade.floor}층
                                </Badge>
                                {trade.dealType && (
                                  <Badge
                                    variant={trade.dealType === '직거래' ? 'secondary' : 'outline'}
                                    className="text-[11px] px-2 py-0.5"
                                  >
                                    {trade.dealType}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[16px] font-bold text-primary">
                                {formatPrice(trade.price)}
                              </p>
                              {ppp && (
                                <p className="text-[12px] text-muted-foreground">
                                  {ppp.toLocaleString()}만/평
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredTrades.length >= 200 && (
                        <p className="text-center text-[12px] text-muted-foreground py-3">
                          최근 200건까지 표시됩니다.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* === 건물정보 탭 === */}
            {activeTab === 'buildings' && (
              <div className="py-3">
                {!buildingData ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs text-muted-foreground">건축물대장 조회 중...</p>
                  </div>
                ) : buildingData.data.units.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 px-4">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">건축물대장 정보를 찾을 수 없습니다.</p>
                    <p className="text-[10px] text-muted-foreground text-center">
                      법정동코드 매핑이 되지 않았거나 데이터가 없을 수 있습니다.
                    </p>
                  </div>
                ) : (() => {
                  const { units, totalDong, totalHhld, bldNm } = buildingData.data;
                  const maxFloor = units.length > 0 ? Math.max(...units.map((u) => u.grndFlrCnt)) : 0;
                  const maxHhld = units.length > 0 ? Math.max(...units.map((u) => u.hhldCnt)) : 0;
                  const totalElvt = units.reduce((s, u) => s + u.rideUseElvtCnt, 0);
                  const hasEarthquake = units.some((u) => u.rserthqkAblty);

                  return (
                    <>
                      {/* 단지 요약 카드 */}
                      <div className="px-4 mb-4">
                        <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border p-4">
                          {bldNm && (
                            <p className="text-[11px] text-muted-foreground mb-1">건축물대장명</p>
                          )}
                          {bldNm && (
                            <p className="text-sm font-bold mb-3">{bldNm}</p>
                          )}
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center">
                              <p className="text-lg font-black text-blue-600">{totalDong}</p>
                              <p className="text-[10px] text-muted-foreground">총 동수</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-black text-emerald-600">{totalHhld.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">총 세대</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-black text-violet-600">{maxFloor}</p>
                              <p className="text-[10px] text-muted-foreground">최고 층수</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-black text-amber-600">{totalElvt}</p>
                              <p className="text-[10px] text-muted-foreground">승강기</p>
                            </div>
                          </div>
                          {hasEarthquake && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600">
                              <span className="font-medium">내진설계 적용 — {units.find((u) => u.rserthqkAblty)?.rserthqkAblty}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 동별 리스트 */}
                      <div className="px-4">
                        <h4 className="text-[12px] font-bold mb-2 flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          동별 정보
                        </h4>
                        <div className="space-y-2">
                          {units.map((unit) => {
                            const floorPct = (unit.grndFlrCnt / maxFloor) * 100;
                            const hhldPct = maxHhld > 0 ? (unit.hhldCnt / maxHhld) * 100 : 0;
                            return (
                              <div
                                key={unit.dongNm}
                                className="rounded-xl border p-3 space-y-2 hover:bg-accent/30 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-[11px] font-bold text-blue-600">
                                      {unit.dongNm}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {unit.mainPurpsCdNm}
                                    </span>
                                  </div>
                                  {unit.rideUseElvtCnt > 0 && (
                                    <span className="text-[9px] text-muted-foreground">
                                      승강기 {unit.rideUseElvtCnt}대
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">층수</p>
                                    <p className="text-[12px] font-bold">
                                      {unit.grndFlrCnt}F
                                      {unit.ugrndFlrCnt > 0 && (
                                        <span className="text-[9px] font-normal text-muted-foreground"> / B{unit.ugrndFlrCnt}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">세대수</p>
                                    <p className="text-[12px] font-bold">{unit.hhldCnt}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground">연면적</p>
                                    <p className="text-[12px] font-bold">{Math.round(unit.totArea).toLocaleString()}㎡</p>
                                  </div>
                                </div>

                                {/* 층수 바 */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-muted-foreground w-8">층수</span>
                                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                                    <div
                                      className="h-1.5 rounded-full bg-blue-500/50"
                                      style={{ width: `${floorPct}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-muted-foreground w-8">세대</span>
                                  <div className="flex-1 h-1.5 rounded-full bg-muted">
                                    <div
                                      className="h-1.5 rounded-full bg-emerald-500/50"
                                      style={{ width: `${hhldPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <p className="text-[10px] text-muted-foreground text-center mt-3 px-4">
                        국토교통부 건축물대장 · 건축HUB API
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* === 학군 탭 === */}
            {activeTab === 'schools' && (
              <div className="py-3">
                {!schoolData ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs text-muted-foreground">학군 정보 검색 중...</p>
                  </div>
                ) : (() => {
                  const { schools, summary } = schoolData.data;

                  const schoolTypes = [
                    { key: 'elementary' as const, label: '초등학교', shortLabel: '초', color: '#059669', data: summary.elementary, list: schools.elementary },
                    { key: 'middle' as const, label: '중학교', shortLabel: '중', color: '#2563eb', data: summary.middle, list: schools.middle },
                    { key: 'high' as const, label: '고등학교', shortLabel: '고', color: '#7c3aed', data: summary.high, list: schools.high },
                  ];

                  const totalSchools = schoolTypes.reduce((s, t) => s + t.data.count, 0);

                  return (
                    <>
                      {/* 요약 헤더 */}
                      <div className="px-5 py-3 border-b">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[15px] font-bold">주변 학교 {totalSchools}개</h4>
                          <span className="text-[12px] text-muted-foreground">반경 1.5km</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {schoolTypes.map((t) => (
                            <div key={t.key} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                              <span className="text-[13px] font-bold" style={{ color: t.color }}>{t.label}</span>
                              <span className="text-[13px] font-bold">{t.data.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 학교 목록 */}
                      <div className="space-y-1">
                        {schoolTypes.map((t) => {
                          if (t.list.length === 0) return null;
                          const nearestWalk = t.data.nearest ? Math.ceil(t.data.nearest.distance / 80) : null;
                          return (
                            <div key={t.key} className="border-b border-border/30 last:border-0">
                              <div className="flex items-center gap-2 px-5 py-3 bg-muted/30">
                                <h4 className="text-[14px] font-bold flex-1" style={{ color: t.color }}>{t.label}</h4>
                                {nearestWalk && (
                                  <span className="text-[12px] text-muted-foreground">
                                    최근접 도보 {nearestWalk}분
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5">
                                  {t.data.within500m > 0 && (
                                    <Badge className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border-0">
                                      500m 이내 {t.data.within500m}
                                    </Badge>
                                  )}
                                  <span className="text-[12px] text-muted-foreground">{t.data.count}개</span>
                                </div>
                              </div>
                              <div className="px-4">
                                {t.list.map((school, idx) => {
                                  const walkMin = Math.ceil(school.distance / 80);
                                  const isNear = school.distance <= 500;
                                  return (
                                    <div
                                      key={school.id}
                                      className={cn(
                                        'py-2.5 border-b border-border/20 last:border-0',
                                        idx === 0 && 'bg-primary/[0.02]'
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          {idx === 0 && (
                                            <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[8px] font-bold text-primary">
                                              최근접
                                            </span>
                                          )}
                                          {isNear && idx !== 0 && (
                                            <span className="shrink-0 rounded bg-emerald-500/10 px-1 py-0.5 text-[8px] font-bold text-emerald-600">
                                              도보권
                                            </span>
                                          )}
                                          <span className="text-[14px] font-medium truncate">{school.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          <span className={cn(
                                            'text-[13px] font-semibold',
                                            isNear ? 'text-emerald-600' : school.distance <= 800 ? 'text-blue-600' : 'text-muted-foreground'
                                          )}>
                                            도보 {walkMin}분
                                          </span>
                                          <span className="text-[12px] text-muted-foreground tabular-nums w-[48px] text-right">
                                            {school.distance}m
                                          </span>
                                        </div>
                                      </div>
                                      {/* 거리 바 */}
                                      <div className="h-1 rounded-full bg-muted mt-1">
                                        <div
                                          className="h-1 rounded-full transition-all"
                                          style={{
                                            width: `${Math.max(100 - (school.distance / 1500) * 100, 5)}%`,
                                            backgroundColor: isNear ? '#059669' : school.distance <= 800 ? '#2563eb' : '#94a3b8',
                                            opacity: idx === 0 ? 0.8 : 0.4,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[10px] text-muted-foreground text-center mt-3 px-4">
                        반경 1.5km · 도보 분당 80m 기준 · 카카오 로컬 API
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* === 주변시설 탭 === */}
            {activeTab === 'nearby' && (
              <div className="py-3">
                {!nearbyData ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs text-muted-foreground">주변시설 검색 중...</p>
                  </div>
                ) : (
                  <>
                    {/* 요약 헤더 */}
                    <div className="px-5 py-3 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[15px] font-bold">주변 편의시설</h4>
                        <span className="text-[12px] text-muted-foreground">반경 1km</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {nearbySummary.filter((s) => s.count > 0).map((s) => {
                          const cat = CATEGORY_CONFIG[s.key];
                          return (
                            <div
                              key={s.key}
                              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px]"
                            >
                              <span style={{ color: cat?.color }}>{cat?.icon}</span>
                              <span className="font-medium">{s.label}</span>
                              <span className="font-bold" style={{ color: cat?.color }}>{s.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 카테고리별 상세 */}
                    <div>
                      {nearbySummary.filter((s) => s.count > 0).map((s) => {
                        const places = nearbyPlaces[s.key] ?? [];
                        const cat = CATEGORY_CONFIG[s.key];

                        return (
                          <div key={s.key} className="border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2 px-5 py-3 bg-muted/30">
                              <span style={{ color: cat?.color }}>{cat?.icon}</span>
                              <h4 className="text-[14px] font-semibold flex-1">{s.label}</h4>
                              <span className="text-[12px] text-muted-foreground">{s.count}개</span>
                            </div>
                            <div>
                              {places.slice(0, 5).map((place, idx) => {
                                const grade = distanceGrade(place.distance);
                                const isNearest = idx === 0;
                                return (
                                  <div
                                    key={place.id}
                                    className={cn(
                                      'flex items-center justify-between px-5 py-3 border-b border-border/20 last:border-0',
                                      isNearest && 'bg-primary/[0.02]'
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {isNearest && (
                                        <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                          최근접
                                        </span>
                                      )}
                                      <span className="text-[14px] font-medium truncate">{place.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                      <span className={cn('text-[13px] font-semibold', grade.color)}>
                                        {walkMinutes(place.distance)}
                                      </span>
                                      <span className="text-[12px] text-muted-foreground tabular-nums w-[48px] text-right">
                                        {place.distance}m
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {nearbySummary.every((s) => s.count === 0) && (
                        <p className="text-center text-[14px] text-muted-foreground py-12">
                          반경 1km 내 시설 정보가 없습니다.
                        </p>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center py-3 px-5">
                      반경 1km · 도보 분당 80m 기준 · 카카오 로컬 API
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}
