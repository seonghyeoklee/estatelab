'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatPrice, formatPriceShort } from '@/lib/format';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
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

export function PriceChart({ trades, className }: Props) {
  const { scatterData, latest, tradeCount, yMin, yMax, changePct } = useMemo(() => {
    if (trades.length === 0) return { scatterData: [], latest: null, tradeCount: 0, yMin: 0, yMax: 0, changePct: null };

    const sorted = [...trades].sort((a, b) => a.dealDate.localeCompare(b.dealDate));

    // 개별 거래를 산점도 데이터로
    const scatterData = sorted.map((t) => ({
      date: t.dealDate.slice(0, 10),
      dateLabel: t.dealDate.slice(2, 7).replace('-', '.'),
      // X축 값: 날짜를 숫자로 (정렬/간격용)
      dateNum: new Date(t.dealDate).getTime(),
      price: t.price,
      floor: t.floor,
      area: t.area,
    }));

    const prices = scatterData.map((d) => d.price);
    const yMin = Math.floor(Math.min(...prices) / 1000) * 1000;
    const yMax = Math.ceil(Math.max(...prices) / 1000) * 1000;

    const latest = scatterData[scatterData.length - 1] || null;

    // 변동률: 최근 3개월 평균 vs 그 이전 3개월 평균
    const now = new Date();
    const recent = sorted.filter((t) => {
      const d = new Date(t.dealDate);
      return d >= new Date(now.getFullYear(), now.getMonth() - 3, 1);
    });
    const prev = sorted.filter((t) => {
      const d = new Date(t.dealDate);
      return d >= new Date(now.getFullYear(), now.getMonth() - 6, 1) && d < new Date(now.getFullYear(), now.getMonth() - 3, 1);
    });
    const recentAvg = recent.length > 0 ? recent.reduce((s, t) => s + t.price, 0) / recent.length : 0;
    const prevAvg = prev.length > 0 ? prev.reduce((s, t) => s + t.price, 0) / prev.length : 0;
    const changePct = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 1000) / 10 : null;

    return { scatterData, latest, tradeCount: trades.length, yMin, yMax, changePct };
  }, [trades]);

  if (scatterData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        거래 데이터가 없습니다.
      </div>
    );
  }

  // 최고/최저 거래
  const maxTrade = scatterData.reduce((m, c) => c.price > m.price ? c : m, scatterData[0]);
  const minTrade = scatterData.reduce((m, c) => c.price < m.price ? c : m, scatterData[0]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* 헤더 */}
      {latest && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">최근 거래</p>
            <p className="text-xl font-bold text-primary">{formatPrice(latest.price)}</p>
          </div>
          <div className="text-right">
            {changePct !== null && (
              <p className={cn('text-xs font-bold', changePct >= 0 ? 'text-red-500' : 'text-blue-500')}>
                {changePct >= 0 ? '+' : ''}{changePct}%
              </p>
            )}
            <p className="text-xs text-muted-foreground">{latest.area}㎡ · {latest.floor}층 · {latest.date}</p>
          </div>
        </div>
      )}

      {/* 산점도 차트 */}
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
            cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-xs space-y-0.5">
                  <p className="font-bold text-primary">{formatPrice(d.price)}</p>
                  <p className="text-muted-foreground">{d.area}㎡ · {d.floor}층</p>
                  <p className="text-muted-foreground">{d.date}</p>
                </div>
              );
            }}
          />
          <Scatter data={scatterData} fill="#059669">
            {scatterData.map((entry, idx) => {
              const isMax = entry === maxTrade;
              const isMin = entry === minTrade;
              return (
                <Cell
                  key={idx}
                  fill={isMax ? '#ef4444' : isMin ? '#3b82f6' : '#059669'}
                  r={isMax || isMin ? 5 : 3}
                  opacity={isMax || isMin ? 1 : 0.6}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>실거래 {tradeCount}건</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary opacity-60" />
            개별 거래
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#ef4444]" />
            최고가
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6]" />
            최저가
          </span>
        </div>
      </div>
    </div>
  );
}
