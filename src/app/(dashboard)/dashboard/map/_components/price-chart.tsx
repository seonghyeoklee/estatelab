'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatPrice, formatPriceShort } from '@/lib/format';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

interface ScatterPoint {
  date: string;
  dateNum: number;
  price: number;
  floor: number;
  area: number;
}

/** LOESS 회귀선 + 상하 밴드 */
function calcLoessWithBand(data: ScatterPoint[], bandwidth = 0.3) {
  if (data.length < 4) return [];
  const sorted = [...data].sort((a, b) => a.dateNum - b.dateNum);
  const xs = sorted.map((d) => d.dateNum);
  const ys = sorted.map((d) => d.price);
  const n = xs.length;
  const steps = Math.min(40, n);
  const xMin = xs[0], xMax = xs[n - 1];
  const result: { dateNum: number; smooth: number; bandUpper: number; bandLower: number }[] = [];

  for (let s = 0; s < steps; s++) {
    const x = xMin + (xMax - xMin) * (s / (steps - 1));
    const h = bandwidth * (xMax - xMin);
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    const windowPrices: number[] = [];

    for (let i = 0; i < n; i++) {
      const u = Math.abs(xs[i] - x) / h;
      if (u > 1) continue;
      const w = (1 - u * u * u);
      const weight = w * w * w;
      sumW += weight;
      sumWX += weight * xs[i];
      sumWY += weight * ys[i];
      sumWXX += weight * xs[i] * xs[i];
      sumWXY += weight * xs[i] * ys[i];
      windowPrices.push(ys[i]);
    }

    if (sumW === 0 || windowPrices.length === 0) continue;
    const denom = sumW * sumWXX - sumWX * sumWX;
    let smoothVal: number;
    if (Math.abs(denom) < 1e-10) {
      smoothVal = Math.round(sumWY / sumW);
    } else {
      const b = (sumW * sumWXY - sumWX * sumWY) / denom;
      const a = (sumWY - b * sumWX) / sumW;
      smoothVal = Math.round(a + b * x);
    }

    // 밴드: 윈도우 내 표준편차의 0.8배
    const mean = windowPrices.reduce((s, v) => s + v, 0) / windowPrices.length;
    const std = Math.sqrt(windowPrices.reduce((s, v) => s + (v - mean) ** 2, 0) / windowPrices.length);
    const bandWidth = Math.round(std * 0.8);

    result.push({
      dateNum: x,
      smooth: smoothVal,
      bandUpper: smoothVal + bandWidth,
      bandLower: smoothVal - bandWidth,
    });
  }
  return result;
}

export function PriceChart({ trades, className }: Props) {
  const { scatterData, bandData, recentAvg, recentCount, maxIdx, minIdx, tradeCount, yMin, yMax, changePct } = useMemo(() => {
    if (trades.length === 0) return { scatterData: [], bandData: [], recentAvg: 0, recentCount: 0, maxIdx: -1, minIdx: -1, tradeCount: 0, yMin: 0, yMax: 0, changePct: null };

    const sorted = [...trades].sort((a, b) => a.dealDate.localeCompare(b.dealDate));
    const scatterData: ScatterPoint[] = sorted.map((t) => ({
      date: t.dealDate.slice(0, 10),
      dateNum: new Date(t.dealDate).getTime(),
      price: t.price,
      floor: t.floor,
      area: t.area,
    }));

    const bandData = calcLoessWithBand(scatterData, 0.25);

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentTrades = sorted.filter((t) => new Date(t.dealDate) >= oneMonthAgo);
    const recentAvg = recentTrades.length > 0
      ? Math.round(recentTrades.reduce((s, t) => s + t.price, 0) / recentTrades.length)
      : sorted.length > 0 ? sorted[sorted.length - 1].price : 0;
    const recentCount = recentTrades.length;

    const threeMonthAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const recent3 = sorted.filter((t) => new Date(t.dealDate) >= threeMonthAgo);
    const prev3 = sorted.filter((t) => { const d = new Date(t.dealDate); return d >= sixMonthAgo && d < threeMonthAgo; });
    const recent3Avg = recent3.length > 0 ? recent3.reduce((s, t) => s + t.price, 0) / recent3.length : 0;
    const prev3Avg = prev3.length > 0 ? prev3.reduce((s, t) => s + t.price, 0) / prev3.length : 0;
    const changePct = prev3Avg > 0 ? Math.round(((recent3Avg - prev3Avg) / prev3Avg) * 1000) / 10 : null;

    const prices = scatterData.map((d) => d.price);
    const padding = Math.max((Math.max(...prices) - Math.min(...prices)) * 0.12, 1000);
    const yMin = Math.floor((Math.min(...prices) - padding) / 1000) * 1000;
    const yMax = Math.ceil((Math.max(...prices) + padding) / 1000) * 1000;

    let maxIdx = 0, minIdx = 0;
    for (let i = 1; i < scatterData.length; i++) {
      if (scatterData[i].price > scatterData[maxIdx].price) maxIdx = i;
      if (scatterData[i].price < scatterData[minIdx].price) minIdx = i;
    }

    return { scatterData, bandData, recentAvg, recentCount, maxIdx, minIdx, tradeCount: trades.length, yMin, yMax, changePct };
  }, [trades]);

  if (scatterData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        거래 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {/* 헤더 */}
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

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart margin={{ top: 15, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="dateNum"
            type="number"
            domain={[scatterData[0].dateNum, scatterData[scatterData.length - 1].dateNum]}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(v: number) => {
              const d = new Date(v);
              return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
            }}
          />
          <YAxis
            type="number"
            domain={[yMin, yMax]}
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatPriceShort(v)}
            width={40}
          />

          {/* 말풍선 툴팁 */}
          <Tooltip
            cursor={{ stroke: '#cbd5e1', strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d?.price || !d?.area) return null;
              return (
                <div className="rounded-lg border bg-white px-3 py-2 shadow-lg text-xs space-y-0.5">
                  <p className="font-bold text-sm">{formatPrice(d.price)}</p>
                  <p className="text-muted-foreground">{d.area}㎡ · {d.floor}층</p>
                  <p className="text-muted-foreground">{d.date}</p>
                </div>
              );
            }}
          />

          {/* 시세 범위 밴드 */}
          <Area
            data={bandData}
            dataKey="bandUpper"
            stroke="none"
            fill="url(#bandGrad)"
            isAnimationActive={false}
          />
          <Area
            data={bandData}
            dataKey="bandLower"
            stroke="none"
            fill="#ffffff"
            isAnimationActive={false}
          />

          {/* LOESS 시세 곡선 */}
          <Line
            data={bandData}
            dataKey="smooth"
            stroke="#4338ca"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          {/* 산점도 — 연한 빨강 작은 점 */}
          <Scatter data={scatterData} dataKey="price" isAnimationActive={false}>
            {scatterData.map((_, idx) => {
              const isMax = idx === maxIdx;
              const isMin = idx === minIdx;
              return (
                <Cell
                  key={idx}
                  fill={isMax ? '#dc2626' : isMin ? '#2563eb' : '#f87171'}
                  r={isMax || isMin ? 4 : 1.8}
                  opacity={isMax || isMin ? 1 : 0.5}
                  cursor="pointer"
                />
              );
            })}
          </Scatter>

          {/* 최고/최저 라벨 */}
          {maxIdx >= 0 && (
            <ReferenceDot x={scatterData[maxIdx].dateNum} y={scatterData[maxIdx].price} r={0}>
              <Label value="최고" position="top" offset={6} style={{ fontSize: 9, fontWeight: 700, fill: '#dc2626' }} />
            </ReferenceDot>
          )}
          {minIdx >= 0 && (
            <ReferenceDot x={scatterData[minIdx].dateNum} y={scatterData[minIdx].price} r={0}>
              <Label value="최저" position="bottom" offset={6} style={{ fontSize: 9, fontWeight: 700, fill: '#2563eb' }} />
            </ReferenceDot>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 하단 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>실거래 {tradeCount}건</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-indigo-900 rounded" />
            시세
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400 opacity-50" />
            실거래
          </span>
        </div>
      </div>
    </div>
  );
}
