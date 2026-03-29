import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, Landmark, MapPin } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export async function StatsCards() {
  const [regionCount, complexCount, tradeCount, baseRate] = await Promise.all([
    prisma.region.count(),
    prisma.apartmentComplex.count(),
    prisma.apartmentTrade.count(),
    prisma.interestRate.findFirst({
      where: { name: 'BASE_RATE' },
      orderBy: { date: 'desc' },
    }),
  ]);

  const stats = [
    {
      label: '수집 지역',
      value: regionCount.toLocaleString(),
      unit: '개 시군구',
      icon: MapPin,
    },
    {
      label: '아파트 단지',
      value: complexCount.toLocaleString(),
      unit: '개',
      icon: Building2,
    },
    {
      label: '실거래 건수',
      value: tradeCount.toLocaleString(),
      unit: '건',
      icon: TrendingUp,
    },
    {
      label: '기준금리',
      value: baseRate ? `${baseRate.rate.toFixed(2)}%` : '—',
      unit: baseRate
        ? `${baseRate.change > 0 ? '+' : ''}${baseRate.change}bp · ${baseRate.date.toISOString().slice(0, 7)}`
        : 'ECOS 연동 예정',
      icon: Landmark,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, idx) => (
        <Card key={stat.label} className={`hover-lift animate-fade-up delay-${idx + 1}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.unit}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
