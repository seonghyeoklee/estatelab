'use client';

import { cn } from '@/lib/utils';

interface SidoTabsProps {
  sidoList: string[];
  selectedSido: string;
  onSelect: (sido: string) => void;
}

export function SidoTabs({ sidoList, selectedSido, onSelect }: SidoTabsProps) {
  return (
    <div className="absolute top-3 left-3 z-10 flex gap-1.5 max-w-[calc(100%-100px)] md:max-w-[calc(100%-140px)] overflow-x-auto scrollbar-none md:flex-wrap">
      {sidoList.map((sido) => (
        <button
          key={sido}
          onClick={() => onSelect(sido)}
          className={cn(
            'rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-sm transition-all shrink-0',
            selectedSido === sido
              ? 'bg-primary text-primary-foreground'
              : 'bg-white/95 text-foreground/70 hover:bg-white backdrop-blur-sm border border-border/50'
          )}
        >
          {sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}
        </button>
      ))}
    </div>
  );
}
