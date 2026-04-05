'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatPrice, formatPriceShort } from '@/lib/format';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceDot,
  Label,
} from 'recharts';

interface Trade {
  dealDate: string;
  price: number;
  floor: number;
  area: number;
}

interface Props {
  trades: Trade[];
  className?: string;
}

/** 이동평균 계산 (window 기반) */
function calcMovingAverage(
  data: { dateNum: number; price: number }[],
  windowSize: number
): { dateNum: number; ma: number }[] {
  if (data.length < windowSize) return [];
  const sorted = [...data].sort((a, b) => a.dateNum - b.dateNum);
  const result: { dateNum: number; ma: number }[] = [];

  for (let i = windowSize - 1; i < sorted.length; i++) {
    const window = sorted.slice(i - windowSize + 1, i + 1);
    const avg = Math.round(window.reduce((s, d) => s + d.price, 0) / window.length);
    result.push({ dateNum: sorted[i].dateNum, ma: avg });
  }
  return result;
}

export function PriceChart({ trades, className }: Props) {
  const { chartData, trendData, recentAvg, recentCount, maxTrade, minTrade, tradeCount, yMin, yMax, changePct } = useMemo(() => {
    if (trades.length === 0) return { chartData: [], trendData: [], recentAvg: 0, recentCount: 0, maxTrade: null, minTrade: null, tradeCount: 0, yMin: 0, yMax: 0, changePct: null };

    const sorted = [...trades].sort((a, b) => a.dealDate.localeCompare(b.dealDate));

    const chartData = sorted.map((t) => ({
      date: t.dealDate.slice(0, 10),
      dateNum: new Date(t.dealDate).getTime(),
      price: t.price,
      floor: t.floor,
      area: t.area,
    }));

    // 이동평균 추세선 (5건 단위)
    const windowSize = Math.min(5, Math.max(3, Math.floor(chartData.length / 8)));
    const trendData = calcMovingAverage(chartData, windowSize);

    // 최근 1개월 평균
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentTrades = sorted.filter((t) => new Date(t.dealDate) >= oneMonthAgo);
    const recentAvg = recentTrades.length > 0
      ? Math.round(recentTrades.reduce((s, t) => s + t.price, 0) / recentTrades.length)
      : sorted.length > 0 ? sorted[sorted.length - 1].price : 0;
    const recentCount = recentTrades.length;

    // 변동률: 최근 3개월 vs 직전 3개월
    const threeMonthAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recent3 = sorted.filter((t) => new Date(t.dealDate) >= threeMonthAgo);
    const prev3 = sorted.filter((t) => { const d = new Date(t.dealDate); return d >= sixMonthAgo && d < threeMonthAgo; });
    const recent3Avg = recent3.length > 0 ? recent3.reduce((s, t) => s + t.price, 0) / recent3.length : 0;
    const prev3Avg = prev3.length > 0 ? prev3.reduce((s, t) => s + t.price, 0) / prev3.length : 0;
    const changePct = prev3Avg > 0 ? Math.round(((recent3Avg - prev3Avg) / prev3Avg) * 1000) / 10 : null;

    const prices = chartData.map((d) => d.price);
    const padding = Math.max((Math.max(...prices) - Math.min(...prices)) * 0.1, 1000);
    const yMin = Math.floor((Math.min(...prices) - padding) / 1000) * 1000;
    const yMax = Math.ceil((Math.max(...prices) + padding) / 1000) * 1000;

    const maxTrade = chartData.reduce((m, c) => c.price > m.price ? c : m, chartData[0]);
    const minTrade = chartData.reduce((m, c) => c.price < m.price ? c : m, chartData[0]);

    return { chartData, trendData, recentAvg, recentCount, maxTrade, minTrade, tradeCount: trades.length, yMin, yMax, changePct };
  }, [trades]);

  if (chartData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        거래 데이터가 없습니다.
      </div>
    );
  }

  // 추세선 + 산점도를 하나의 ComposedChart로 합침
  // 추세선 데이터를 chartData에 병합
  const trendMap = new Map(trendData.map((t) => [t.dateNum, t.ma]));
  const mergedData = chartData.map((d) => ({
    ...d,
    trend: trendMap.get(d.dateNum) ?? null,
  }));

  // 추세선이 없는 포인트에 보간값 넣기 (Line이 끊기지 않도록)
  // 별도 trendLine 데이터로 처리
  const trendLineData = trendData.map((t) => ({ dateNum: t.dateNum, trend: t.ma }));

  return (
    <div className={cn('space-y-1', className)}>
      {/* 헤더 — 호갱노노 스타일 */}
      <div>
        <p className="text-xs text-muted-foreground">
          최근 실거래 기준 {recentCount > 0 ? '1개월' : ''} 평균
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-extrabold tracking-tight">{formatPrice(recentAvg)}</p>
          {changePct !== null && (
            <span className={cn('text-sm font-bold', changePct >= 0 ? 'text-red-500' : 'text-blue-500')}>
              {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct)}%
            </span>
          )}
        </div>
      </div>

      {/* 산점도 + 추세선 차트 */}
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={mergedData} margin={{ top: 15, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="dateNum"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(v: number) => {
              const d = new Date(v);
              return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
            }}
          />
          <YAxis
            dataKey="price"
            type="number"
            domain={[yMin, yMax]}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatPriceShort(v)}
            width={40}
          />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              if (!d.price) return null;
              return (
                <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-xs space-y-0.5">
                  <p className="font-bold">{formatPrice(d.price)}</p>
                  <p className="text-muted-foreground">{d.area}㎡ · {d.floor}층</p>
                  <p className="text-muted-foreground">{d.date}</p>
                </div>
              );
            }}
          />

          {/* 추세선 */}
          <Line
            data={trendLineData}
            dataKey="trend"
            xAxisId={0}
            stroke="#4338ca"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />

          {/* 산점도 */}
          <Scatter dataKey="price" isAnimationActive={false}>
            {mergedData.map((entry, idx) => {
              const isMax = entry === maxTrade;
              const isMin = entry === minTrade;
              return (
                <Cell
                  key={idx}
                  fill={isMax ? '#ef4444' : isMin ? '#3b82f6' : '#94a3b8'}
                  r={isMax || isMin ? 5 : 2.5}
                  opacity={isMax || isMin ? 1 : 0.5}
                />
              );
            })}
          </Scatter>

          {/* 최고/최저 라벨 */}
          {maxTrade && (
            <ReferenceDot x={maxTrade.dateNum} y={maxTrade.price} r={0} yAxisId={0}>
              <Label
                value="최고"
                position="top"
                offset={8}
                style={{ fontSize: 10, fontWeight: 700, fill: '#ef4444' }}
              />
            </ReferenceDot>
          )}
          {minTrade && (
            <ReferenceDot x={minTrade.dateNum} y={minTrade.price} r={0} yAxisId={0}>
              <Label
                value="최저"
                position="bottom"
                offset={8}
                style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }}
              />
            </ReferenceDot>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 하단 정보 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>실거래 {tradeCount}건</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-indigo-700 rounded" />
            추세
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
            거래
          </span>
        </div>
      </div>
    </div>
  );
}
