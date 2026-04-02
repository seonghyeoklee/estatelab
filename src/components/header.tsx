'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Map, LayoutDashboard, Building2, Landmark, TrendingUp, CalendarDays, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';

const PAGE_TITLES: Record<string, { label: string; icon: typeof Map }> = {
  '/dashboard/map': { label: '지도 탐색', icon: Map },
  '/dashboard/overview': { label: '시장 개요', icon: LayoutDashboard },
  '/dashboard/apartments': { label: '아파트', icon: Building2 },
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
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    const t = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, []);

  // 현재 페이지 찾기 (아파트 상세도 아파트로 표시)
  const pageKey = Object.keys(PAGE_TITLES).find((key) =>
    pathname === key || pathname.startsWith(key + '/')
  );
  const page = pageKey ? PAGE_TITLES[pageKey] : null;

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = now
    ? `${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAYS[now.getDay()]})`
    : '';
  const timeStr = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : '';

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center border-b border-border/50 bg-card/90 backdrop-blur-sm px-4 md:px-6 gap-3">
      {/* 모바일 메뉴 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 shrink-0"
        onClick={onMenuClick}
        aria-label="메뉴 열기"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* 현재 페이지 */}
      {page && (
        <div className="hidden md:flex items-center gap-2">
          <page.icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{page.label}</span>
        </div>
      )}

      {/* spacer */}
      <div className="flex-1" />

      {/* 날짜·시각 */}
      {now && (
        <div className="hidden md:flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium">{dateStr}</span>
          <span className="tabular-nums font-mono text-foreground/70 font-semibold">
            {timeStr}
          </span>
        </div>
      )}

      {/* 유저 메뉴 */}
      <UserMenu />
    </header>
  );
}
