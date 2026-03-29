'use client';

import { ZoomIn, ZoomOut, Locate, Map as MapIcon, Layers, Satellite } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapControlsProps {
  mapType: 'road' | 'skyview';
  showDistrict: boolean;
  onToggleMapType: () => void;
  onToggleDistrict: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitBounds: () => void;
}

export function MapControls({
  mapType,
  showDistrict,
  onToggleMapType,
  onToggleDistrict,
  onZoomIn,
  onZoomOut,
  onFitBounds,
}: MapControlsProps) {
  return (
    <>
      {/* 지도 타입 + 지적편집도 */}
      <div className="flex flex-col rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
        <button
          onClick={onToggleMapType}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors border-b border-border/30',
            mapType === 'skyview' ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
          )}
        >
          {mapType === 'road' ? <Satellite className="h-3.5 w-3.5" /> : <MapIcon className="h-3.5 w-3.5" />}
          {mapType === 'road' ? '위성지도' : '일반지도'}
        </button>
        <button
          onClick={onToggleDistrict}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-[11px] font-medium transition-colors',
            showDistrict ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          지적편집도
          {showDistrict && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {/* 줌 컨트롤 */}
      <div className="flex flex-col rounded-lg bg-white/95 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
        <button onClick={onZoomIn} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-accent transition-colors border-b border-border/30">
          <ZoomIn className="h-3.5 w-3.5" />
          확대
        </button>
        <button onClick={onZoomOut} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-accent transition-colors border-b border-border/30">
          <ZoomOut className="h-3.5 w-3.5" />
          축소
        </button>
        <button onClick={onFitBounds} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-accent transition-colors">
          <Locate className="h-3.5 w-3.5" />
          전체 보기
        </button>
      </div>
    </>
  );
}
