'use client';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  Satellite, Layers, Construction, GraduationCap, TreePine,
  Map as MapIcon, Store, MapPinned, Eye, Building2, Settings2, X,
} from 'lucide-react';

interface MapSettingsProps {
  open: boolean;
  onClose: () => void;
  // 지도 타입
  mapType: 'road' | 'skyview';
  onToggleMapType: () => void;
  // 레이어 토글
  showDistrict: boolean;
  onToggleDistrict: () => void;
  showRedevelopment: boolean;
  onToggleRedevelopment: () => void;
  showSchoolZone: boolean;
  onToggleSchoolZone: () => void;
  showGreenbelt: boolean;
  onToggleGreenbelt: () => void;
  showLandUse: boolean;
  onToggleLandUse: () => void;
  showCommercial: boolean;
  onToggleCommercial: () => void;
  showNearby: boolean;
  onToggleNearby: () => void;
  showBuildingPolygon: boolean;
  onToggleBuildingPolygon: () => void;
  // 로드뷰 (선택 단지 있을 때만)
  showRoadview?: boolean;
  onToggleRoadview?: () => void;
  roadviewAvailable?: boolean;
}

interface SettingItem {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function MapSettingsPanel(props: MapSettingsProps) {
  if (!props.open) return null;

  const layers: SettingItem[] = [
    {
      key: 'district', label: '지적편집도', description: '토지 경계선 표시',
      icon: Layers, color: 'text-primary', checked: props.showDistrict, onToggle: props.onToggleDistrict,
    },
    {
      key: 'building', label: '건물 폴리곤', description: '선택 단지 건물 윤곽',
      icon: Building2, color: 'text-primary', checked: props.showBuildingPolygon, onToggle: props.onToggleBuildingPolygon,
    },
    {
      key: 'redevelopment', label: '재개발/재건축', description: '정비사업 구역 표시',
      icon: Construction, color: 'text-orange-500', checked: props.showRedevelopment, onToggle: props.onToggleRedevelopment,
    },
    {
      key: 'school', label: '학군 통학구역', description: '초등학교 통학구역',
      icon: GraduationCap, color: 'text-yellow-500', checked: props.showSchoolZone, onToggle: props.onToggleSchoolZone,
    },
    {
      key: 'greenbelt', label: '그린벨트', description: '개발제한구역',
      icon: TreePine, color: 'text-green-500', checked: props.showGreenbelt, onToggle: props.onToggleGreenbelt,
    },
    {
      key: 'landuse', label: '용도지역', description: '토지이용계획',
      icon: MapIcon, color: 'text-violet-500', checked: props.showLandUse, onToggle: props.onToggleLandUse,
    },
    {
      key: 'commercial', label: '주요 상권', description: '상업 밀집 지역',
      icon: Store, color: 'text-pink-500', checked: props.showCommercial, onToggle: props.onToggleCommercial,
    },
    {
      key: 'nearby', label: '주변시설', description: '지하철, 학교, 편의시설',
      icon: MapPinned, color: 'text-primary', checked: props.showNearby, onToggle: props.onToggleNearby,
    },
  ];

  if (props.roadviewAvailable && props.onToggleRoadview) {
    layers.push({
      key: 'roadview', label: '로드뷰', description: '거리 뷰',
      icon: Eye, color: 'text-primary', checked: props.showRoadview ?? false, onToggle: props.onToggleRoadview,
    });
  }

  const activeCount = layers.filter((l) => l.checked).length;

  return (
    <div className="absolute top-14 right-3 z-[30] w-[280px] animate-fade-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">지도 설정</span>
            {activeCount > 0 && (
              <span className="text-xs text-primary font-medium">{activeCount}개 활성</span>
            )}
          </div>
          <button onClick={props.onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 지도 타입 */}
        <div className="px-4 py-3 border-b">
          <button
            onClick={props.onToggleMapType}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
              props.mapType === 'skyview' ? 'bg-primary/5' : 'hover:bg-accent/50'
            )}
          >
            <Satellite className="h-4 w-4 text-muted-foreground" />
            <div className="text-left flex-1">
              <p className="text-[13px] font-medium">
                {props.mapType === 'road' ? '위성지도로 전환' : '일반지도로 전환'}
              </p>
            </div>
          </button>
        </div>

        {/* 레이어 토글 목록 */}
        <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
          {layers.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0 transition-colors',
                  item.checked ? 'bg-accent/30' : ''
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', item.checked ? item.color : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={item.checked}
                  onCheckedChange={item.onToggle}
                  disabled={item.disabled}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
