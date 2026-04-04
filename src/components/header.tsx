'use client';

import { usePathname } from 'next/navigation';
import { Menu, Map, LayoutDashboard, Building2, Landmark, TrendingUp, CalendarDays, Heart, Percent, Calculator, GitCompareArrows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';

const PAGE_TITLES: Record<string, { label: string; icon: typeof Map }> = {
  '/dashboard/map': { label: '지도 탐색', icon: Map },
  '/dashboard/overview': { label: '시장 개요', icon: LayoutDashboard },
  '/dashboard/apartments': { label: '아파트', icon: Building2 },
  '/dashboard/gap-invest': { label: '갭투자 분석', icon: Percent },
  '/dashboard/calculator': { label: '대출 계산기', icon: Calculator },
  '/dashboard/compare': { label: '단지 비교', icon: GitCompareArrows },
  '/dashboard/rates': { label: '금리 동향', icon: Landmark },
  '/dashboard/indices': { label: '가격지수', icon: TrendingUp },
  '/dashboard/subscriptions': { label: '청약', icon: CalendarDays },
  '/dashboard/my': { label: '관심 단지', icon: Heart },
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();

  const pageKey = Object.keys(PAGE_TITLES).find((key) =>
    pathname === key || pathname.startsWith(key + '/')
  );
  const page = pageKey ? PAGE_TITLES[pageKey] : null;

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center border-b border-border/50 bg-card/90 backdrop-blur-sm px-4 md:px-6 gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 shrink-0"
        onClick={onMenuClick}
        aria-label="메뉴 열기"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {page && (
        <div className="hidden md:flex items-center gap-2">
          <page.icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{page.label}</span>
        </div>
      )}

      <div className="flex-1" />

      <UserMenu />
    </header>
  );
}
