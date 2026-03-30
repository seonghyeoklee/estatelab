'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface Trade {
  dealDate: string;
  price: number;
  floor: number;
}

interface Props {
  trades: Trade[];
  className?: string;
}

export function PriceChart({ trades, className }: Props) {
  const chartData = useMemo(() => {
    if (trades.length === 0) return null;

    const sorted = [...trades].sort((a, b) => a.dealDate.localeCompare(b.dealDate));

    // 전체 범위
    const prices = sorted.map((t) => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // 날짜 범위
    const firstDate = new Date(sorted[0].dealDate);
    const lastDate = new Date(sorted[sorted.length - 1].dealDate);
    const dateRange = lastDate.getTime() - firstDate.getTime() || 1;

    // 산점도 점 (각 거래)
    const dots = sorted.map((t) => {
      const date = new Date(t.dealDate);
      const x = ((date.getTime() - firstDate.getTime()) / dateRange) * 100;
      const y = 100 - ((t.price - minPrice) / priceRange) * 100;
      const isLow = t.floor <= 3;
      return { x, y, price: t.price, date: t.dealDate, floor: t.floor, isLow };
    });

    // 월별 평균 (추세선)
    const monthlyMap = new Map<string, { total: number; count: number }>();
    for (const t of sorted) {
      const key = t.dealDate.slice(0, 7);
      const existing = monthlyMap.get(key);
      if (existing) { existing.total += t.price; existing.count++; }
      else monthlyMap.set(key, { total: t.price, count: 1 });
    }
    const monthlyAvg = Array.from(monthlyMap.entries())
      .map(([month, { total, count }]) => ({
        month,
        avg: Math.round(total / count),
        count,
        date: new Date(month + '-15'),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const trendLine = monthlyAvg.map((m) => {
      const x = ((m.date.getTime() - firstDate.getTime()) / dateRange) * 100;
      const y = 100 - ((m.avg - minPrice) / priceRange) * 100;
      return { x: Math.max(0, Math.min(100, x)), y, avg: m.avg, month: m.month, count: m.count };
    });

    // 최저/최고 포인트
    const minTrade = sorted.reduce((min, t) => t.price < min.price ? t : min, sorted[0]);
    const maxTrade = sorted.reduce((max, t) => t.price > max.price ? t : max, sorted[0]);
    const minDot = {
      x: ((new Date(minTrade.dealDate).getTime() - firstDate.getTime()) / dateRange) * 100,
      y: 100 - ((minTrade.price - minPrice) / priceRange) * 100,
      price: minTrade.price,
    };
    const maxDot = {
      x: ((new Date(maxTrade.dealDate).getTime() - firstDate.getTime()) / dateRange) * 100,
      y: 100 - ((maxTrade.price - minPrice) / priceRange) * 100,
      price: maxTrade.price,
    };

    // 거래량 (월별)
    const maxVolume = Math.max(...monthlyAvg.map((m) => m.count));
    const volumeBars = monthlyAvg.map((m) => ({
      x: ((m.date.getTime() - firstDate.getTime()) / dateRange) * 100,
      height: (m.count / (maxVolume || 1)) * 100,
      count: m.count,
      month: m.month,
    }));

    // 최근 월 평균
    const latest = monthlyAvg[monthlyAvg.length - 1];

    // Y축 라벨 (5단계)
    const step = priceRange / 4;
    const yLabels = Array.from({ length: 5 }, (_, i) => {
      const price = minPrice + step * i;
      return { price: Math.round(price), y: 100 - (i / 4) * 100 };
    });

    // X축 라벨 (최대 5개)
    const totalMonths = monthlyAvg.length;
    const xStep = Math.max(1, Math.floor(totalMonths / 4));
    const xLabels = monthlyAvg
      .filter((_, i) => i % xStep === 0 || i === totalMonths - 1)
      .map((m) => ({
        label: m.month.slice(2).replace('-', '.'),
        x: ((m.date.getTime() - firstDate.getTime()) / dateRange) * 100,
      }));

    return { dots, trendLine, minDot, maxDot, volumeBars, latest, yLabels, xLabels, minPrice, maxPrice, tradeCount: trades.length };
  }, [trades]);

  if (!chartData || chartData.dots.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-[14px] text-muted-foreground', className)}>
        거래 데이터가 없습니다.
      </div>
    );
  }

  const { dots, trendLine, minDot, maxDot, volumeBars, latest, yLabels, xLabels, tradeCount } = chartData;

  // 추세선 path
  // trendPath는 SVG에서 인라인으로 생성

  return (
    <div className={cn('space-y-2', className)}>
      {/* 최근 평균 */}
      {latest && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-muted-foreground">최근 1개월 평균</p>
            <p className="text-2xl font-bold text-primary">{formatPrice(latest.avg)}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-muted-foreground">{latest.month.slice(2).replace('-', '.')} 기준</p>
            <p className="text-[14px] font-semibold">{latest.count}건 거래</p>
          </div>
        </div>
      )}

      {/* 차트 */}
      <div className="relative">
        {/* Y축 라벨 */}
        <div className="absolute left-0 top-0 bottom-[40px] w-[44px] flex flex-col justify-between pointer-events-none">
          {yLabels.slice().reverse().map((label, i) => (
            <span key={i} className="text-[11px] text-muted-foreground tabular-nums leading-none">
              {formatPrice(label.price)}
            </span>
          ))}
        </div>

        {/* SVG 차트 */}
        <div className="ml-[48px]">
          <svg viewBox="0 0 100 80" className="w-full h-[200px]" preserveAspectRatio="none">
            {/* 가로 그리드 */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line key={y} x1="0" y1={y * 0.65} x2="100" y2={y * 0.65} stroke="#e5e7eb" strokeWidth="0.15" />
            ))}

            {/* 산점도 (개별 거래) */}
            {dots.map((dot, i) => (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y * 0.65}
                r="0.6"
                fill={dot.isLow ? '#93c5fd' : '#d1d5db'}
                opacity="0.6"
              />
            ))}

            {/* 추세선 */}
            <path
              d={trendLine.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y * 0.65}`).join(' ')}
              fill="none"
              stroke="#2563eb"
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 추세선 점 */}
            {trendLine.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y * 0.65}
                r={i === trendLine.length - 1 ? '1' : '0.4'}
                fill={i === trendLine.length - 1 ? '#2563eb' : '#2563eb'}
                opacity={i === trendLine.length - 1 ? 1 : 0.5}
              />
            ))}

            {/* 최저점 */}
            <circle cx={minDot.x} cy={minDot.y * 0.65} r="1" fill="#2563eb" />
            <text x={minDot.x} y={minDot.y * 0.65 + 3} textAnchor="middle" fontSize="2.5" fill="#2563eb" fontWeight="600">
              최저
            </text>

            {/* 최고점 */}
            {maxDot.y !== minDot.y && (
              <>
                <circle cx={maxDot.x} cy={maxDot.y * 0.65} r="1" fill="#f97316" />
              </>
            )}

            {/* 거래량 바 (하단) */}
            {volumeBars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x - 0.8}
                y={68 - bar.height * 0.1}
                width="1.6"
                height={bar.height * 0.1 + 0.5}
                fill="#d1d5db"
                rx="0.2"
              />
            ))}
          </svg>

          {/* X축 라벨 */}
          <div className="flex justify-between px-1 -mt-1">
            {xLabels.map((label, i) => (
              <span key={i} className="text-[10px] text-muted-foreground tabular-nums">
                {label.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 범례 */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>실거래 {tradeCount}건</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#93c5fd]" />
            저층
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#d1d5db]" />
            일반
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
            월 평균
          </span>
        </div>
      </div>
    </div>
  );
}
