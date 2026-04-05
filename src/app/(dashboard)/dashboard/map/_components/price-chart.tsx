'use client';

import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatPrice, formatPriceShort } from '@/lib/format';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
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

/** 이동평균 계산 */
function calcMovingAverage(
  data: ScatterPoint[],
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
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const { scatterData, trendData, recentAvg, recentCount, maxIdx, minIdx, tradeCount, yMin, yMax, changePct } = useMemo(() => {
    if (trades.length === 0) return { scatterData: [], trendData: [], recentAvg: 0, recentCount: 0, maxIdx: -1, minIdx: -1, tradeCount: 0, yMin: 0, yMax: 0, changePct: null };

    const sorted = [...trades].sort((a, b) => a.dealDate.localeCompare(b.dealDate));

    const scatterData: ScatterPoint[] = sorted.map((t) => ({
      date: t.dealDate.slice(0, 10),
      dateNum: new Date(t.dealDate).getTime(),
      price: t.price,
      floor: t.floor,
      area: t.area,
    }));

    const windowSize = Math.min(5, Math.max(3, Math.floor(scatterData.length / 8)));
    const trendData = calcMovingAverage(scatterData, windowSize);

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
    const padding = Math.max((Math.max(...prices) - Math.min(...prices)) * 0.1, 1000);
    const yMin = Math.floor((Math.min(...prices) - padding) / 1000) * 1000;
    const yMax = Math.ceil((Math.max(...prices) + padding) / 1000) * 1000;

    let maxIdx = 0, minIdx = 0;
    for (let i = 1; i < scatterData.length; i++) {
      if (scatterData[i].price > scatterData[maxIdx].price) maxIdx = i;
      if (scatterData[i].price < scatterData[minIdx].price) minIdx = i;
    }

    return { scatterData, trendData, recentAvg, recentCount, maxIdx, minIdx, tradeCount: trades.length, yMin, yMax, changePct };
  }, [trades]);

  const handleMouseOver = useCallback((_: unknown, idx: number) => setActiveIdx(idx), []);
  const handleMouseOut = useCallback(() => setActiveIdx(null), []);

  if (scatterData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        거래 데이터가 없습니다.
      </div>
    );
  }

  const activePoint = activeIdx !== null ? scatterData[activeIdx] : null;

  return (
    <div className={cn('space-y-1', className)}>
      {/* 헤더 */}
      <div>
        {activePoint ? (
          // 호버 시 해당 거래 정보
          <div>
            <p className="text-xs text-muted-foreground">{activePoint.date} · {activePoint.area}㎡ · {activePoint.floor}층</p>
            <p className="text-2xl font-extrabold tracking-tight">{formatPrice(activePoint.price)}</p>
          </div>
        ) : (
          // 기본: 최근 평균
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
        )}
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 15, right: 8, left: -10, bottom: 0 }}>
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
          <Tooltip content={() => null} />

          {/* 추세선 — Scatter 위에 Line으로 별도 데이터 */}
          <Scatter
            data={trendData}
            dataKey="ma"
            fill="none"
            line={{ stroke: '#4338ca', strokeWidth: 2 }}
            shape={() => null}
            isAnimationActive={false}
          />

          {/* 산점도 — 개별 거래 점 */}
          <Scatter
            data={scatterData}
            dataKey="price"
            isAnimationActive={false}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            {scatterData.map((_, idx) => {
              const isMax = idx === maxIdx;
              const isMin = idx === minIdx;
              const isActive = idx === activeIdx;
              return (
                <Cell
                  key={idx}
                  fill={isMax ? '#ef4444' : isMin ? '#3b82f6' : '#059669'}
                  r={isActive ? 5 : isMax || isMin ? 4 : 2.5}
                  stroke={isActive ? '#059669' : 'none'}
                  strokeWidth={isActive ? 2 : 0}
                  cursor="pointer"
                />
              );
            })}
          </Scatter>

          {/* 최고/최저 라벨 */}
          {maxIdx >= 0 && (
            <ReferenceDot x={scatterData[maxIdx].dateNum} y={scatterData[maxIdx].price} r={0}>
              <Label value="최고" position="top" offset={8} style={{ fontSize: 10, fontWeight: 700, fill: '#ef4444' }} />
            </ReferenceDot>
          )}
          {minIdx >= 0 && (
            <ReferenceDot x={scatterData[minIdx].dateNum} y={scatterData[minIdx].price} r={0}>
              <Label value="최저" position="bottom" offset={8} style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} />
            </ReferenceDot>
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {/* 하단 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>실거래 {tradeCount}건</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-indigo-700 rounded" />
            추세
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            거래
          </span>
        </div>
      </div>
    </div>
  );
}
