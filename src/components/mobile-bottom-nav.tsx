'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, LayoutDashboard, Building2, Landmark, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard/map', label: '지도', icon: Map },
  { href: '/dashboard/overview', label: '개요', icon: LayoutDashboard },
  { href: '/dashboard/apartments', label: '아파트', icon: Building2 },
  { href: '/dashboard/rates', label: '금리', icon: Landmark },
  { href: '/dashboard/my', label: 'MY', icon: Heart },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  // 지도 페이지에서는 숨김 (지도가 전체 화면)
  if (pathname === '/dashboard/map') return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px]',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
