'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin, Calculator, Percent, ChevronDown, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { calculateInvestment } from '@/lib/investment';

interface GapItem {
  complexId: string;
  name: string;
  dong: string;
  sigungu: string;
  sido: string;
  builtYear: number | null;
  area: number;
  avgTrade: number;
  avgJeonse: number;
  gapAmount: number;
  jeonseRatio: number;
  tradeCount: number;
  jeonseCount: number;
}

const RATIO_OPTIONS = [
  { label: '전체', min: 0, max: 100 },
  { label: '70%+', min: 70, max: 100 },
  { label: '60~70%', min: 60, max: 70 },
  { label: '50~60%', min: 50, max: 60 },
  { label: '~50%', min: 0, max: 50 },
];

const AREA_OPTIONS = [
  { label: '전체', min: '', max: '' },
  { label: '~59㎡', min: '', max: '59' },
  { label: '59~84㎡', min: '59', max: '84' },
  { label: '84㎡+', min: '84', max: '' },
];

const SORT_OPTIONS = [
  { label: '전세가율순', value: 'ratio' },
  { label: '갭 적은순', value: 'gap' },
  { label: '매매가순', value: 'price' },
];

function ratioColor(ratio: number): string {
  if (ratio >= 80) return 'text-red-600 bg-red-500/10';
  if (ratio >= 70) return 'text-orange-600 bg-orange-500/10';
  if (ratio >= 60) return 'text-amber-600 bg-amber-500/10';
  return 'text-emerald-600 bg-emerald-500/10';
}

function riskLevel(ratio: number): { label: string; color: string } {
  if (ratio >= 80) return { label: '고위험', color: 'text-red-600' };
  if (ratio >= 70) return { label: '주의', color: 'text-orange-600' };
  if (ratio >= 60) return { label: '보통', color: 'text-amber-600' };
  return { label: '안전', color: 'text-emerald-600' };
}

export default function GapInvestPage() {
  const [ratioFilter, setRatioFilter] = useState({ min: 0, max: 100 });
  const [areaFilter, setAreaFilter] = useState({ min: '', max: '' });
  const [sort, setSort] = useState('ratio');
  const [page, setPage] = useState(1);
  const [showCalc, setShowCalc] = useState<string | null>(null);
  const [loanRate, setLoanRate] = useState(3.5);
  const [loanRatio, setLoanRatio] = useState(70);
  const [holdYears, setHoldYears] = useState(3);
  const [growthRate, setGrowthRate] = useState(3);

  const params = new URLSearchParams();
  params.set('minRatio', String(ratioFilter.min));
  params.set('maxRatio', String(ratioFilter.max));
  params.set('sort', sort);
  params.set('page', String(page));
  params.set('limit', '20');
  if (areaFilter.min) params.set('minArea', areaFilter.min);
  if (areaFilter.max) params.set('maxArea', areaFilter.max);

  const { data, isLoading } = useSWR<{
    data: GapItem[];
    meta: { total: number; page: number; totalPages: number };
  }>(`/api/market/gap-invest?${params.toString()}`);

  const items = data?.data ?? [];

  const calcInvest = (item: GapItem) => calculateInvestment({
    tradePrice: item.avgTrade,
    jeonsePrice: item.avgJeonse,
    loanRate,
    loanRatio,
    holdYears,
    priceGrowthRate: growthRate,
  });

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">갭투자 분석</h1>
        <p className="text-muted-foreground">전세가율이 높은 단지를 찾아 투자 기회를 분석합니다.</p>
      </div>

      {/* 안내 카드 */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-[12px] text-muted-foreground space-y-1">
            <p><strong className="text-foreground">전세가율</strong> = 전세보증금 / 매매가 × 100. 높을수록 갭(투자금)이 적습니다.</p>
            <p><strong className="text-foreground">70% 이상</strong>은 역전세 위험이 있으므로 주의가 필요합니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* 필터 */}
      <div className="space-y-3">
        {/* 전세가율 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-medium text-muted-foreground mr-1">전세가율</span>
          {RATIO_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => { setRatioFilter({ min: opt.min, max: opt.max }); setPage(1); }}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                ratioFilter.min === opt.min && ratioFilter.max === opt.max
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 면적 + 정렬 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-muted-foreground mr-1">면적</span>
            {AREA_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => { setAreaFilter({ min: opt.min, max: opt.max }); setPage(1); }}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  areaFilter.min === opt.min && areaFilter.max === opt.max
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSort(opt.value); setPage(1); }}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  sort === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 대출 조건 설정 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[13px] font-semibold">투자 시뮬레이션</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0">대출금리</label>
                <input
                  type="number"
                  value={loanRate}
                  onChange={(e) => setLoanRate(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  max="10"
                  className="w-16 rounded-md border px-2 py-1.5 text-[12px] text-center outline-none focus:ring-1 focus:ring-primary/30"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0">대출비율</label>
                <input
                  type="number"
                  value={loanRatio}
                  onChange={(e) => setLoanRatio(parseInt(e.target.value) || 0)}
                  step="10"
                  min="0"
                  max="100"
                  className="w-16 rounded-md border px-2 py-1.5 text-[12px] text-center outline-none focus:ring-1 focus:ring-primary/30"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0">보유기간</label>
                <input
                  type="number"
                  value={holdYears}
                  onChange={(e) => setHoldYears(parseInt(e.target.value) || 1)}
                  min="1"
                  max="30"
                  className="w-16 rounded-md border px-2 py-1.5 text-[12px] text-center outline-none focus:ring-1 focus:ring-primary/30"
                />
                <span className="text-xs text-muted-foreground">년</span>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground shrink-0">연 상승률</label>
                <input
                  type="number"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="-10"
                  max="20"
                  className="w-16 rounded-md border px-2 py-1.5 text-[12px] text-center outline-none focus:ring-1 focus:ring-primary/30"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 결과 */}
      {data?.meta && (
        <p className="text-[13px] text-muted-foreground">
          총 <span className="font-bold text-foreground">{data.meta.total.toLocaleString()}</span>건
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="조건에 맞는 단지가 없습니다"
          description="필터 조건을 변경해보세요."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const risk = riskLevel(item.jeonseRatio);
            const inv = calcInvest(item);
            const isExpanded = showCalc === `${item.complexId}-${item.area}`;

            return (
              <Card key={`${item.complexId}-${item.area}`} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  {/* 상단: 단지 정보 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/apartments/${item.complexId}`}
                          className="text-[15px] font-bold hover:text-primary transition-colors truncate"
                        >
                          {item.name}
                        </Link>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {item.area}㎡
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.sigungu} {item.dong}
                        </span>
                        {item.builtYear && <span>{item.builtYear}년</span>}
                      </div>
                    </div>

                    {/* 전세가율 뱃지 */}
                    <div className={cn('rounded-xl px-3 py-2 text-center', ratioColor(item.jeonseRatio).split(' ')[1])}>
                      <p className={cn('text-xl font-bold', ratioColor(item.jeonseRatio).split(' ')[0])}>
                        {item.jeonseRatio}%
                      </p>
                      <p className={cn('text-xs font-medium', risk.color)}>{risk.label}</p>
                    </div>
                  </div>

                  {/* 중간: 가격 비교 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">매매</p>
                      <p className="text-[14px] font-bold">{formatPrice(item.avgTrade)}</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/5 p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">전세</p>
                      <p className="text-[14px] font-bold text-amber-700">{formatPrice(item.avgJeonse)}</p>
                    </div>
                    <div className="rounded-lg bg-primary/5 p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">갭(투자금)</p>
                      <p className="text-[14px] font-bold text-primary">{formatPrice(item.gapAmount)}</p>
                    </div>
                  </div>

                  {/* 시뮬레이션 토글 */}
                  <button
                    onClick={() => setShowCalc(isExpanded ? null : `${item.complexId}-${item.area}`)}
                    className="flex items-center gap-1 mt-3 text-xs font-medium text-primary hover:underline"
                  >
                    <Calculator className="h-3 w-3" />
                    투자 시뮬레이션
                    <ChevronDown className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')} />
                  </button>

                  {isExpanded && (
                    <div className="mt-2 rounded-lg border p-3 space-y-3 bg-muted/30">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                        <div>
                          <span className="text-muted-foreground">자기자본</span>
                          <p className="font-bold text-primary">{formatPrice(inv.selfFund)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">대출금</span>
                          <p className="font-semibold">{formatPrice(inv.loanAmount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">월 이자</span>
                          <p className="font-semibold">{inv.monthlyInterest.toLocaleString()}만</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">월 원리금</span>
                          <p className="font-semibold">{inv.monthlyPrincipalInterest.toLocaleString()}만</p>
                        </div>
                      </div>
                      <div className="border-t pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                        <div>
                          <span className="text-muted-foreground">{holdYears}년 후 예상가</span>
                          <p className="font-semibold">{formatPrice(inv.futurePrice)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">총 이자비용</span>
                          <p className="font-semibold">{formatPrice(inv.totalInterest)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">예상 수익</span>
                          <p className={cn('font-bold', inv.profit >= 0 ? 'text-red-600' : 'text-blue-600')}>
                            {inv.profit >= 0 ? '+' : ''}{formatPrice(inv.profit)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">투자 수익률</span>
                          <p className={cn('font-bold', inv.roi >= 0 ? 'text-red-600' : 'text-blue-600')}>
                            {inv.roi >= 0 ? '+' : ''}{inv.roi}% ({inv.annualRoi}%/년)
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        매매 {item.tradeCount}건 · 전세 {item.jeonseCount}건 · 연 {growthRate}% 상승 가정
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* 페이지네이션 */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                이전
              </Button>
              <span className="text-[12px] text-muted-foreground">
                {page} / {data.meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page >= data.meta.totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
