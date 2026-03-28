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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: '시장 개요', icon: LayoutDashboard, exact: true },
      { href: '/dashboard/map', label: '지도 탐색', icon: Map },
    ],
  },
  {
    label: '부동산',
    items: [
      { href: '/dashboard/apartments', label: '아파트', icon: Building2 },
      { href: '/dashboard/subscriptions', label: '청약', icon: CalendarDays },
    ],
  },
  {
    label: '경제',
    items: [
      { href: '/dashboard/rates', label: '금리 동향', icon: Landmark },
      { href: '/dashboard/indices', label: '가격지수', icon: TrendingUp },
    ],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Home className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight">EstateLab</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="space-y-4 p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-[7px] text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground/60 hover:bg-accent'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
