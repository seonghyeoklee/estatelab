'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/format';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';

interface Trade {
  dealDate: string;
  price: number;
  area: number;
  floor: number;
}

interface PriceChartProps {
  trades: Trade[];
}

export function PriceChart({ trades }: PriceChartProps) {
  if (trades.length === 0) return null;

  // 월별 평균가 계산
  const monthlyMap = new Map<string, { total: number; count: number; min: number; max: number }>();
  for (const t of trades) {
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
    .map(([month, { total, count, min, max }]) => ({
      month,
      label: month.slice(2).replace('-', '.'),
      avgPrice: Math.round(total / count),
      minPrice: min,
      maxPrice: max,
      count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  if (chartData.length === 0) return null;

  const latest = chartData[chartData.length - 1];
  const first = chartData[0];
  const allPrices = chartData.flatMap((d) => [d.minPrice, d.maxPrice]);
  const yMin = Math.floor(Math.min(...allPrices) / 1000) * 1000;
  const yMax = Math.ceil(Math.max(...allPrices) / 1000) * 1000;

  // 변동률 (0으로 나누기 방지)
  const changePct = chartData.length >= 2 && first.avgPrice > 0
    ? Math.round(((latest.avgPrice - first.avgPrice) / first.avgPrice) * 1000) / 10
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">매매가 추이</CardTitle>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{formatPrice(latest.avgPrice)}</p>
            {changePct !== null && (
              <p className={`text-[11px] font-semibold ${changePct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {changePct >= 0 ? '+' : ''}{changePct}% ({first.label}→{latest.label})
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatPrice(v)}
              width={45}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              formatter={(value) => [formatPrice(Number(value)), '평균가']}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="avgPrice"
              stroke="#059669"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: 'white', stroke: '#059669' }}
            />
            <ReferenceDot
              x={latest.label}
              y={latest.avgPrice}
              r={5}
              fill="#059669"
              stroke="white"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span>{chartData.length}개월 데이터</span>
          <span>총 {trades.length}건 거래</span>
        </div>
      </CardContent>
    </Card>
  );
}
