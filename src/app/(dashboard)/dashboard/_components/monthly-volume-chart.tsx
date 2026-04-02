'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface MonthlyVolume {
  month: string;
  count: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MonthlyVolumeChart() {
  const { data, isLoading } = useSWR<{ data: MonthlyVolume[] }>(
    '/api/market/summary/monthly-volume',
    fetcher,
    { refreshInterval: 600_000 }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          월별 거래량 추이
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[220px] animate-pulse rounded-lg bg-muted/60" />
        ) : !data?.data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            거래 데이터가 없습니다.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(v: string) => v.slice(2).replace('-', '.')}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
                formatter={(value) => [`${Number(value).toLocaleString()}건`, '거래량']}
                labelFormatter={(label) => String(label)}
              />
              <Bar
                dataKey="count"
                fill="#059669"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
