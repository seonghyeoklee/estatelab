'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Map,
  Building2,
  Landmark,
  TrendingUp,
  CalendarDays,
  Search,
  MapPin,
  Heart,
} from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  name: string;
  dong: string;
  regionCode: string;
  region?: { sido: string; sigungu: string };
  latestTrade?: {
    price: number;
    area: number;
    dealDate: string;
  } | null;
  tradeCount?: number;
}

const MENU_ITEMS = [
  { label: '지도 탐색', href: '/dashboard/map', icon: Map },
  { label: '시장 개요', href: '/dashboard/overview', icon: LayoutDashboard },
  { label: '아파트', href: '/dashboard/apartments', icon: Building2 },
  { label: '금리 동향', href: '/dashboard/rates', icon: Landmark },
  { label: '가격지수', href: '/dashboard/indices', icon: TrendingUp },
  { label: '청약', href: '/dashboard/subscriptions', icon: CalendarDays },
  { label: '관심 단지', href: '/dashboard/my', icon: Heart },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // 단지 검색 debounce
  useEffect(() => {
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/market/apartments?q=${encodeURIComponent(query)}&limit=8`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data.data?.map((a: SearchResult) => ({
          id: a.id,
          name: a.name,
          dong: a.dong,
          regionCode: a.regionCode,
          region: a.region,
          latestTrade: a.latestTrade,
          tradeCount: a.tradeCount,
        })) || []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      }
      setLoading(false);
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (value.length < 2) setResults([]);
  }, []);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery('');
      setResults([]);
      router.push(href);
    },
    [router, onOpenChange]
  );

  const handleOpenChange = useCallback((value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setQuery('');
      setResults([]);
    }
  }, [onOpenChange]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="검색"
      className="fixed inset-0 z-50"
    >
      {/* 백드롭 */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => handleOpenChange(false)} />

      {/* 패널 */}
      <div className="fixed left-1/2 top-[12%] md:top-[20%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
        <div className="rounded-2xl border border-border/50 bg-white shadow-2xl overflow-hidden">
          {/* 검색 입력 */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={handleQueryChange}
              placeholder="단지명, 지역, 메뉴 검색..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* 결과 */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {loading ? '검색 중...' : query.length < 2 ? '2글자 이상 입력하세요' : '검색 결과가 없습니다'}
            </Command.Empty>

            {/* 단지 검색 결과 */}
            {results.length > 0 && (
              <Command.Group heading="아파트 단지">
                {results.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={`${r.name} ${r.dong} ${r.region?.sigungu || ''}`}
                    onSelect={() => go(`/dashboard/apartments/${r.id}`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{r.name}</span>
                        {r.region && (
                          <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {r.region.sigungu} {r.dong}
                          </span>
                        )}
                      </div>
                      {r.latestTrade && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatPrice(r.latestTrade.price)} · {r.latestTrade.area}㎡ · {r.latestTrade.dealDate.slice(0, 10)}
                          {r.tradeCount ? ` · ${r.tradeCount}건` : ''}
                        </p>
                      )}
                    </div>
                    {r.latestTrade && (
                      <span className="text-[12px] font-bold text-primary shrink-0">
                        {formatPrice(r.latestTrade.price)}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* 메뉴 */}
            <Command.Group heading="메뉴">
              {MENU_ITEMS.map((item) => (
                <Command.Item
                  key={item.href}
                  value={item.label}
                  onSelect={() => go(item.href)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* 하단 힌트 */}
          <div className="border-t px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↵</kbd>
              선택
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">esc</kbd>
              닫기
            </span>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}
