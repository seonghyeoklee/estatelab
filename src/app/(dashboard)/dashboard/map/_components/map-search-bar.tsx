'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { MapComplex } from '@/types/trade';

interface Props {
  complexes: MapComplex[];
  onSelect: (complex: MapComplex) => void;
}

export function MapSearchBar({ complexes, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return complexes
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.dong.toLowerCase().includes(q)
      )
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 8);
  }, [query, complexes]);

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (complex: MapComplex) => {
    onSelect(complex);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute top-3 left-3 z-[21] w-72 md:w-80 pointer-events-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="단지명, 동 검색..."
          aria-label="지도 내 검색"
          className="w-full rounded-xl bg-white/95 backdrop-blur-sm border border-border/50 shadow-sm py-2 pl-9 pr-8 text-[13px] outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-accent"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* 결과 드롭다운 */}
      {open && results.length > 0 && (
        <div className="mt-1 rounded-xl bg-white border border-border/50 shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-accent/50 transition-colors border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{c.dong} · {c._count.trades}건</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold text-primary">{formatPrice(c.avgPrice)}</p>
                <p className="text-[10px] text-muted-foreground">{c.avgPricePerPyeong.toLocaleString()}만/평</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="mt-1 rounded-xl bg-white border border-border/50 shadow-lg px-4 py-3">
          <p className="text-[12px] text-muted-foreground text-center">검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
}
