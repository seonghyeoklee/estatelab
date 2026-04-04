import { Card, CardContent } from '@/components/ui/card';
import { Building2, TrendingUp, Landmark, MapPin, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

export async function StatsCards() {
  // 최근 거래 기준월 (이번 달 거래 없으면 직전 월)
  const latestTrade = await prisma.apartmentTrade.findFirst({
    orderBy: { dealDate: 'desc' },
    select: { dealDate: true },
  });
  const refDate = latestTrade?.dealDate ?? new Date();
  const thisMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const lastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);

  const [regionCount, complexCount, tradeCount, tradesThisMonth, tradesLastMonth, baseRate] = await Promise.all([
    prisma.region.count(),
    prisma.apartmentComplex.count({ where: { NOT: { name: { startsWith: '(' } } } }),
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
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-500/10',
      decorBg: 'bg-emerald-500/10',
    },
    {
      label: '아파트 단지',
      value: complexCount.toLocaleString(),
      unit: '개 단지',
      icon: Building2,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-500/10',
      decorBg: 'bg-blue-500/10',
    },
    {
      label: '실거래 건수',
      value: tradeCount.toLocaleString(),
      unit: '건',
      icon: TrendingUp,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-500/10',
      decorBg: 'bg-violet-500/10',
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
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-500/10',
      decorBg: 'bg-amber-500/10',
      change: baseRate ? baseRate.change : null,
      changeLabel: 'bp',
      changeReverse: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-muted-foreground">{stat.label}</span>
              <div className={cn('rounded-lg p-2', stat.iconBg)}>
                <stat.icon className={cn('h-4 w-4', stat.iconColor)} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{stat.unit}</span>
              {stat.change !== null && stat.change !== undefined && stat.change !== 0 && (
                <span className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold',
                  (stat.changeReverse ? stat.change < 0 : stat.change > 0) ? 'text-red-500' : 'text-blue-500'
                )}>
                  {stat.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.change > 0 ? '+' : ''}{stat.change}{stat.changeLabel === 'bp' ? 'bp' : '%'}
                </span>
              )}
            </div>
          </CardContent>
          {/* 배경 장식 */}
          <div className={cn('absolute -bottom-4 -right-4 h-20 w-20 rounded-full opacity-[0.04]', stat.decorBg)} />
        </Card>
      ))}
    </div>
  );
}
