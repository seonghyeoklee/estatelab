import Link from 'next/link';
import {
  Home,
  Building2,
  Map,
  Landmark,
  TrendingUp,
  Bell,
  ArrowRight,
  MapPin,
  CalendarDays,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const categories = [
    {
      icon: Building2,
      title: '아파트 실거래가',
      titleEn: 'Apartments',
      href: '/dashboard/apartments',
      description: '전국 아파트 매매 실거래가를 수집하고, 단지별 가격 추이를 분석합니다.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      icon: Map,
      title: '지도 탐색',
      titleEn: 'Map',
      href: '/dashboard/map',
      description: '카카오맵 기반으로 지역별 가격을 지도 위에서 한눈에 비교합니다.',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      icon: Landmark,
      title: '금리 동향',
      titleEn: 'Rates',
      href: '/dashboard/rates',
      description: '기준금리, 주담대, CD금리 등 부동산 수요에 직결되는 금리를 추적합니다.',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      icon: TrendingUp,
      title: '가격지수',
      titleEn: 'Index',
      href: '/dashboard/indices',
      description: '한국부동산원 매매·전세 가격지수로 시장 흐름을 파악합니다.',
      color: 'text-rose-500',
      bg: 'bg-rose-50',
    },
    {
      icon: CalendarDays,
      title: '청약 정보',
      titleEn: 'Subscriptions',
      href: '/dashboard/subscriptions',
      description: '분양 일정, 청약 경쟁률, 당첨 정보를 한곳에서 확인합니다.',
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      icon: Bell,
      title: '실시간 알림',
      titleEn: 'Alerts',
      href: '/dashboard',
      description: '가격 변동, 청약 일정 등 주요 이벤트를 텔레그램으로 알려드립니다.',
      color: 'text-primary',
      bg: 'bg-secondary',
    },
  ];

  const features = [
    {
      icon: BarChart3,
      title: '단지별 가격 분석',
      desc: '면적별·층별 매매가 추이와 평당가를 차트로 확인할 수 있습니다.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      icon: MapPin,
      title: '지역별 비교',
      desc: '구·동 단위 평균 매매가와 거래량을 한눈에 비교합니다.',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      icon: Landmark,
      title: '금리 모니터링',
      desc: '기준금리 변동과 주담대 금리 추이를 실시간으로 추적합니다.',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      icon: Bell,
      title: '맞춤 알림',
      desc: '관심 지역 거래 발생, 금리 변동 시 텔레그램으로 즉시 알림.',
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
  ];

  const stats = [
    { value: '160+', label: '수집 지역' },
    { value: '전국', label: '아파트 실거래가' },
    { value: '매월', label: '자동 수집' },
    { value: '24/7', label: '알림 모니터링' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">EstateLab</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">둘러보기</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                시작하기 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-dot-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-primary/[0.03] to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/[0.12] blur-[120px]" />
        <div className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full bg-emerald-400/[0.08] blur-[100px]" />
        <div className="absolute top-40 -left-20 w-[300px] h-[300px] rounded-full bg-teal-400/[0.06] blur-[80px]" />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full border border-primary/[0.08]" />
        <div className="absolute top-40 -left-16 w-56 h-56 rounded-full border border-primary/[0.08]" />

        <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-20 pb-14 md:pt-28 md:pb-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              실거래가 데이터 수집 중
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[60px] font-bold tracking-tight leading-[1.1]">
              부동산의 모든 데이터를
              <br />
              <span className="text-primary">하나의 화면</span>에서
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              아파트 실거래가·금리·청약·가격지수까지.
              <br className="hidden md:block" />
              AI 기반 분석과 실시간 알림으로 부동산 시장을 읽어드립니다.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button size="lg" asChild className="rounded-xl px-6 h-11">
                <Link href="/dashboard">
                  시작하기 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="rounded-xl px-6 h-11">
                <Link href="/dashboard">둘러보기</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="border-y border-border/50 bg-slate-50/80">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/40">
            {stats.map((s) => (
              <div key={s.label} className="py-5 px-4 md:px-8 text-center">
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Categories ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary mb-2">한눈에 보는 부동산 시장</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              필요한 데이터를 모두 모았습니다
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link key={cat.title} href={cat.href}>
                <div className="group rounded-2xl border border-border/50 bg-background p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        cat.bg
                      )}
                    >
                      <cat.icon className={cn('h-5 w-5', cat.color)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{cat.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{cat.titleEn}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/[0.03] to-background">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary mb-2">
              부동산 의사결정의 주도권을 가질 수 있도록
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              EstateLab이 제공하는 기능
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border/50 bg-background p-5 hover:shadow-sm transition-shadow"
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl mb-4', f.bg)}>
                  <f.icon className={cn('h-5 w-5', f.color)} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              부동산 시장, 데이터로 읽어보세요
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              실거래가부터 금리, 청약까지. 모든 부동산 데이터를 한 곳에서 확인하세요.
            </p>
            <Button size="lg" asChild className="rounded-xl px-8 h-12">
              <Link href="/dashboard">
                대시보드 시작하기 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 bg-slate-50/50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <Home className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium">EstateLab</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 EstateLab. 공공데이터포털 실거래가 기반.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
