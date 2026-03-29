'use client';

import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/user-menu';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
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

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = now
    ? `${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAYS[now.getDay()]})`
    : '';
  const timeStr = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
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

      {/* 실시간 날짜·시각 */}
      {now && (
        <div className="hidden md:flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium">{dateStr}</span>
          <span className="tabular-nums font-mono text-foreground/70 font-semibold">
            {timeStr}
          </span>
        </div>
      )}

      {/* spacer */}
      <div className="flex-1" />

      {/* 유저 메뉴 */}
      <UserMenu />
    </header>
  );
}
