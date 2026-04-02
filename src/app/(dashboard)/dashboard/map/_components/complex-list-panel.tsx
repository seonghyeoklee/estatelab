'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { X, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import type { MapComplex } from '@/types/trade';

function getPriceColor(avgPrice: number) {
  if (avgPrice >= 300000) return '#9333ea';
  if (avgPrice >= 200000) return '#7c3aed';
  if (avgPrice >= 100000) return '#0369a1';
  if (avgPrice >= 50000) return '#059669';
  if (avgPrice >= 30000) return '#0d9488';
  return '#64748b';
}

interface ComplexListPanelProps {
  complexes: MapComplex[];
  visibleIds: string[];
  selectedId: string | null;
  onSelect: (complex: MapComplex) => void;
  onClose: () => void;
}

export function ComplexListPanel({
  complexes,
  visibleIds,
  selectedId,
  onSelect,
  onClose,
}: ComplexListPanelProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'price' | 'trades'>('price');

  const filtered = complexes
    .filter((c) => {
      if (search && !c.name.includes(search) && !c.dong.includes(search)) return false;
      if (visibleIds.length > 0 && !visibleIds.includes(c.id)) return false;
      return true;
    })
    .sort((a, b) =>
      sort === 'price' ? b.avgPrice - a.avgPrice : b._count.trades - a._count.trades
    );

  return (
    <div className="absolute right-3 top-24 z-10 w-80 max-h-[calc(100%-120px)] animate-fade-up">
      <Card className="shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b px-4 py-2.5 bg-white">
            <h3 className="text-sm font-semibold">단지 목록</h3>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-accent transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* 검색 + 정렬 */}
          <div className="px-3 py-2 border-b space-y-2 bg-slate-50/80">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="단지명 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border bg-white py-1.5 pl-8 pr-3 text-[12px] outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSort('price')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                  sort === 'price' ? 'bg-primary text-primary-foreground' : 'bg-white border hover:bg-accent'
                )}
              >
                <ArrowUpDown className="h-2.5 w-2.5" />
                가격순
              </button>
              <button
                onClick={() => setSort('trades')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                  sort === 'trades' ? 'bg-primary text-primary-foreground' : 'bg-white border hover:bg-accent'
                )}
              >
                <ArrowUpDown className="h-2.5 w-2.5" />
                거래수순
              </button>
              <div className="flex items-center gap-1.5 ml-auto text-[9px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#7c3aed' }} />20억+</span>
                <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#0369a1' }} />10억+</span>
                <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm" style={{ background: '#059669' }} />5억+</span>
              </div>
            </div>
          </div>

          {/* 리스트 */}
          <div className="max-h-[350px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {search ? `"${search}" 검색 결과 없음` : '현재 지도 영역에 단지가 없습니다'}
              </div>
            ) : (
              filtered.map((c) => {
                const color = getPriceColor(c.avgPrice);
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className={cn(
                      'flex items-center gap-3 border-b last:border-0 px-4 py-2.5 transition-colors w-full text-left',
                      selectedId === c.id ? 'bg-primary/5' : 'hover:bg-accent/50'
                    )}
                  >
                    <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.dong} · {c._count.trades}건</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color }}>
                        {formatPrice(c.avgPrice)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.avgPricePerPyeong.toLocaleString()}만/평
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t px-4 py-2 bg-slate-50/80 text-[10px] text-muted-foreground">
            현재 지도 영역: {visibleIds.length}개 단지
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
