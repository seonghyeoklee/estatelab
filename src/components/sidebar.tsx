'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  Map,
  Landmark,
  TrendingUp,
  Home,
  CalendarDays,
  Search,
  Heart,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Map;
  exact?: boolean;
  badge?: string;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard/map', label: '지도 탐색', icon: Map },
      { href: '/dashboard/overview', label: '시장 개요', icon: LayoutDashboard },
    ],
  },
  {
    label: '부동산',
    items: [
      { href: '/dashboard/apartments', label: '아파트', icon: Building2, exact: true },
      { href: '/dashboard/gap-invest', label: '갭투자 분석', icon: Percent },
      { href: '/dashboard/subscriptions', label: '청약', icon: CalendarDays, badge: '준비중' },
    ],
  },
  {
    label: '경제',
    items: [
      { href: '/dashboard/rates', label: '금리 동향', icon: Landmark },
      { href: '/dashboard/indices', label: '가격지수', icon: TrendingUp, badge: '준비중' },
    ],
  },
  {
    label: 'My',
    items: [
      { href: '/dashboard/my', label: '관심 단지', icon: Heart },
    ],
  },
];

export function Sidebar({ onNavigate, onCommandOpen }: { onNavigate?: () => void; onCommandOpen?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[240px] flex-col bg-[hsl(var(--sidebar-background))] border-r border-border/40">
      {/* Logo */}
      <Link href="/" className="flex h-16 items-center gap-2.5 px-5 hover:opacity-80 transition-opacity">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Home className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-tight leading-none">
            EstateLab
          </span>
          <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase mt-0.5">
            Real Estate Intelligence
          </span>
        </div>
      </Link>

      {/* Search trigger */}
      <div className="px-4 pb-2">
        <button
          onClick={onCommandOpen}
          className="w-full flex items-center gap-2 rounded-xl h-8 px-2.5 bg-primary/[0.04] border border-primary/20 hover:border-primary/40 hover:bg-primary/[0.07] transition-all text-xs text-foreground/50 hover:text-foreground/80"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">단지, 지역 검색...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-muted px-1 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-1 pb-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest px-2.5 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground/60 hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary-foreground' : '')} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && !isActive && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
