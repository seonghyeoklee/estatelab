import { Card, CardContent } from '@/components/ui/card';
import { Building2, TrendingUp, Landmark, MapPin, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

export async function StatsCards() {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [regionCount, complexCount, tradeCount, tradesThisMonth, tradesLastMonth, baseRate] = await Promise.all([
    prisma.region.count(),
    prisma.apartmentComplex.count(),
    prisma.apartmentTrade.count(),
    prisma.apartmentTrade.count({ where: { dealDate: { gte: thisMonth } } }),
    prisma.apartmentTrade.count({ where: { dealDate: { gte: lastMonth, lt: thisMonth } } }),
    prisma.interestRate.findFirst({
      where: { name: 'BASE_RATE' },
      orderBy: { date: 'desc' },
    }),
  ]);

  const tradeGrowth = tradesLastMonth > 0
    ? Math.round(((tradesThisMonth - tradesLastMonth) / tradesLastMonth) * 100)
    : null;

  const stats = [
    {
      label: '수집 지역',
      value: regionCount.toLocaleString(),
      unit: '개 시군구',
      icon: MapPin,
      color: 'bg-emerald-500/10 text-emerald-600',
      iconBg: 'bg-emerald-500/10',
    },
    {
      label: '아파트 단지',
      value: complexCount.toLocaleString(),
      unit: '개 단지',
      icon: Building2,
      color: 'bg-blue-500/10 text-blue-600',
      iconBg: 'bg-blue-500/10',
    },
    {
      label: '실거래 건수',
      value: tradeCount.toLocaleString(),
      unit: '건',
      icon: TrendingUp,
      color: 'bg-violet-500/10 text-violet-600',
      iconBg: 'bg-violet-500/10',
      change: tradeGrowth,
      changeLabel: '전월 대비',
    },
    {
      label: '기준금리',
      value: baseRate ? `${baseRate.rate.toFixed(2)}%` : '—',
      unit: baseRate
        ? `${baseRate.date.toISOString().slice(0, 7)} 기준`
        : '',
      icon: Landmark,
      color: 'bg-amber-500/10 text-amber-600',
      iconBg: 'bg-amber-500/10',
      change: baseRate ? baseRate.change : null,
      changeLabel: 'bp',
      changeReverse: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-muted-foreground">{stat.label}</span>
              <div className={cn('rounded-lg p-2', stat.iconBg)}>
                <stat.icon className={cn('h-4 w-4', stat.color.split(' ')[1])} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted-foreground">{stat.unit}</span>
              {stat.change !== null && stat.change !== undefined && stat.change !== 0 && (
                <span className={cn(
                  'inline-flex items-center gap-0.5 text-[11px] font-semibold',
                  (stat.changeReverse ? stat.change < 0 : stat.change > 0) ? 'text-red-500' : 'text-blue-500'
                )}>
                  {stat.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.change > 0 ? '+' : ''}{stat.change}{stat.changeLabel === 'bp' ? 'bp' : '%'}
                </span>
              )}
            </div>
          </CardContent>
          {/* 배경 장식 */}
          <div className={cn('absolute -bottom-4 -right-4 h-20 w-20 rounded-full opacity-[0.04]', stat.color.split(' ')[0])} />
        </Card>
      ))}
    </div>
  );
}
