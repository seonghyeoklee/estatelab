'use client';

import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Train, GraduationCap, Store, ShoppingCart, Stethoscope, Coffee, Landmark } from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof Train> = {
  subway: Train,
  school: GraduationCap,
  convenience: Store,
  mart: ShoppingCart,
  hospital: Stethoscope,
  cafe: Coffee,
  bank: Landmark,
};

const CATEGORY_COLORS: Record<string, string> = {
  subway: 'text-blue-500 bg-blue-50',
  school: 'text-amber-500 bg-amber-50',
  convenience: 'text-emerald-500 bg-emerald-50',
  mart: 'text-orange-500 bg-orange-50',
  hospital: 'text-red-500 bg-red-50',
  cafe: 'text-yellow-600 bg-yellow-50',
  bank: 'text-violet-500 bg-violet-50',
};

interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  address: string;
  distance: number;
  phone: string;
}

interface Summary {
  key: string;
  label: string;
  count: number;
  nearest: NearbyPlace | null;
}


function formatDistance(m: number): string {
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function NearbyFacilities({ complexId }: { complexId: string }) {
  const { data, isLoading } = useSWR<{
    data: { summary: Summary[]; places: Record<string, NearbyPlace[]>; radius: number };
  }>(`/api/market/apartments/${complexId}/nearby`);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">주변 시설</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">주변 시설</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            좌표 정보가 없어 주변 시설을 검색할 수 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { summary, places } = data.data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">주변 시설</CardTitle>
          <Badge variant="outline" className="text-xs">반경 1km</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 요약 카드 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {summary.map((s) => {
            const Icon = CATEGORY_ICONS[s.key] || Store;
            const colorClass = CATEGORY_COLORS[s.key] || 'text-gray-500 bg-gray-50';
            return (
              <div key={s.key} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-bold">{s.count}개</p>
                  </div>
                </div>
                {s.nearest && (
                  <p className="text-xs text-muted-foreground truncate">
                    가장 가까운: {s.nearest.name} ({formatDistance(s.nearest.distance)})
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* 상세 리스트 — 학교와 지하철만 */}
        {(['subway', 'school'] as const).map((key) => {
          const items = places[key] || [];
          if (items.length === 0) return null;
          const Icon = CATEGORY_ICONS[key];
          const label = summary.find((s) => s.key === key)?.label || key;

          return (
            <div key={key}>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {label} ({items.length})
              </p>
              <div className="space-y-1">
                {items.slice(0, 5).map((place) => (
                  <div
                    key={place.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{place.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{place.category}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      {formatDistance(place.distance)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
