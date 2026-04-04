'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';

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
  const { chartData, latest, minPoint, maxPoint, tradeCount } = useMemo(() => {
    if (trades.length === 0) return { chartData: [], latest: null, minPoint: null, maxPoint: null, tradeCount: 0 };

    const sorted = [...trades].sort((a, b) => a.dealDate.localeCompare(b.dealDate));

    // 월별 집계
    const monthlyMap = new Map<string, { total: number; count: number; min: number; max: number }>();
    for (const t of sorted) {
      const key = t.dealDate.slice(0, 7);
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.total += t.price;
        existing.count++;
        existing.min = Math.min(existing.min, t.price);
        existing.max = Math.max(existing.max, t.price);
      } else {
        monthlyMap.set(key, { total: t.price, count: 1, min: t.price, max: t.price });
      }
    }

    const chartData = Array.from(monthlyMap.entries())
      .map(([month, v]) => ({
        month,
        label: month.slice(2).replace('-', '.'),
        avg: Math.round(v.total / v.count),
        min: v.min,
        max: v.max,
        volume: v.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const latest = chartData[chartData.length - 1] || null;

    // 최고/최저 월
    const minPoint = chartData.length > 0
      ? chartData.reduce((m, c) => c.avg < m.avg ? c : m, chartData[0])
      : null;
    const maxPoint = chartData.length > 0
      ? chartData.reduce((m, c) => c.avg > m.avg ? c : m, chartData[0])
      : null;

    return { chartData, latest, minPoint, maxPoint, tradeCount: trades.length };
  }, [trades]);

  if (chartData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        거래 데이터가 없습니다.
      </div>
    );
  }

  const allPrices = chartData.flatMap((d) => [d.min, d.max]);
  const yMin = Math.floor(Math.min(...allPrices) / 1000) * 1000;
  const yMax = Math.ceil(Math.max(...allPrices) / 1000) * 1000;

  // 변동률
  const changePct = chartData.length >= 2 && chartData[0].avg > 0
    ? Math.round(((latest!.avg - chartData[0].avg) / chartData[0].avg) * 1000) / 10
    : null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* 헤더 */}
      {latest && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">최근 평균</p>
            <p className="text-xl font-bold text-primary">{formatPrice(latest.avg)}</p>
          </div>
          <div className="text-right">
            {changePct !== null && (
              <p className={cn('text-xs font-bold', changePct >= 0 ? 'text-red-500' : 'text-blue-500')}>
                {changePct >= 0 ? '+' : ''}{changePct}%
              </p>
            )}
            <p className="text-xs text-muted-foreground">{latest.volume}건 · {latest.label}</p>
          </div>
        </div>
      )}

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="mapChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatPrice(v)}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '8px 12px',
            }}
            formatter={(value, name) => {
              const v = Number(value);
              const label = name === 'avg' ? '평균' : name === 'volume' ? '거래량' : String(name);
              return [name === 'volume' ? `${v}건` : formatPrice(v), label];
            }}
            labelFormatter={(label) => String(label)}
          />

          {/* 거래량 바 */}
          {/* 거래량은 시각적 참고용 — 높이 고정 */}

          {/* 가격 범위 영역 */}
          <Area
            type="monotone"
            dataKey="max"
            stroke="none"
            fill="url(#mapChartGrad)"
            dot={false}
          />

          {/* 평균 추세선 */}
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#059669"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, fill: 'white', stroke: '#059669' }}
          />

          {/* 최고/최저 포인트 */}
          {maxPoint && (
            <ReferenceDot x={maxPoint.label} y={maxPoint.avg} r={4} fill="#ef4444" stroke="white" strokeWidth={2} />
          )}
          {minPoint && minPoint.label !== maxPoint?.label && (
            <ReferenceDot x={minPoint.label} y={minPoint.avg} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>실거래 {tradeCount}건</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-0.5 bg-primary rounded" />
            평균
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#ef4444]" />
            최고
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6]" />
            최저
          </span>
        </div>
      </div>
    </div>
  );
}
