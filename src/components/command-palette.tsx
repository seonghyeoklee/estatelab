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
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  name: string;
  dong: string;
  regionCode: string;
}

const MENU_ITEMS = [
  { label: '지도 탐색', href: '/dashboard/map', icon: Map },
  { label: '시장 개요', href: '/dashboard/overview', icon: LayoutDashboard },
  { label: '아파트', href: '/dashboard/apartments', icon: Building2 },
  { label: '금리 동향', href: '/dashboard/rates', icon: Landmark },
  { label: '가격지수', href: '/dashboard/indices', icon: TrendingUp },
  { label: '청약', href: '/dashboard/subscriptions', icon: CalendarDays },
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
        setResults(data.data?.map((a: { id: string; name: string; dong: string; regionCode: string }) => ({
          id: a.id,
          name: a.name,
          dong: a.dong,
          regionCode: a.regionCode,
        })) || []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      }
      setLoading(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // 쿼리 초기화 시 결과 비우기
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (value.length < 2) setResults([]);
  }, []);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery('');
      router.push(href);
    },
    [router, onOpenChange]
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="검색"
      className="fixed inset-0 z-50"
    >
      {/* 백드롭 */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      {/* 패널 */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2">
        <div className="rounded-2xl border border-border/50 bg-white shadow-2xl overflow-hidden">
          {/* 검색 입력 */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={handleQueryChange}
              placeholder="단지명, 메뉴 검색..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* 결과 */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {loading ? '검색 중...' : query.length < 2 ? '2글자 이상 입력하세요' : '검색 결과가 없습니다'}
            </Command.Empty>

            {/* 단지 검색 결과 */}
            {results.length > 0 && (
              <Command.Group heading="아파트 단지">
                {results.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={`${r.name} ${r.dong}`}
                    onSelect={() => go(`/dashboard/apartments/${r.id}`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-accent"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.dong}</p>
                    </div>
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
        </div>
      </div>
    </Command.Dialog>
  );
}
