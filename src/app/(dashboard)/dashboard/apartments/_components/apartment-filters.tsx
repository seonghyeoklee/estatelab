'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Region {
  code: string;
  sido: string;
  sigungu: string;
}

export interface FilterValues {
  regionCode: string;
  sido: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  minYear: string;
  sort: string;
}

const PRICE_OPTIONS = [
  { label: '전체', min: '', max: '' },
  { label: '~3억', min: '', max: '30000' },
  { label: '3~5억', min: '30000', max: '50000' },
  { label: '5~10억', min: '50000', max: '100000' },
  { label: '10~20억', min: '100000', max: '200000' },
  { label: '20억~', min: '200000', max: '' },
];

const AREA_OPTIONS = [
  { label: '전체', min: '', max: '' },
  { label: '~59㎡', min: '', max: '59' },
  { label: '59~84㎡', min: '59', max: '84' },
  { label: '84~114㎡', min: '84', max: '114' },
  { label: '114㎡~', min: '114', max: '' },
];

const YEAR_OPTIONS = [
  { label: '전체', value: '' },
  { label: '2020년~', value: '2020' },
  { label: '2015년~', value: '2015' },
  { label: '2010년~', value: '2010' },
  { label: '2000년~', value: '2000' },
];

const SORT_OPTIONS = [
  { label: '이름순', value: 'name' },
  { label: '가격순', value: 'price' },
  { label: '거래수순', value: 'trades' },
  { label: '연식순', value: 'year' },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

export function ApartmentFilters({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { data: regionData } = useSWR<{ data: Region[] }>('/api/market/regions', fetcher);

  const regions = regionData?.data || [];
  const sidoList = [...new Set(regions.map((r) => r.sido))];
  const sigunguList = filters.sido
    ? regions.filter((r) => r.sido === filters.sido)
    : [];

  const activeCount = [
    filters.sido,
    filters.regionCode,
    filters.minPrice || filters.maxPrice,
    filters.minArea || filters.maxArea,
    filters.minYear,
  ].filter(Boolean).length;

  const reset = () => {
    onChange({
      regionCode: '',
      sido: '',
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
      minYear: '',
      sort: 'name',
    });
  };

  return (
    <div className="space-y-2">
      {/* 필터 토글 + 정렬 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
            open || activeCount > 0
              ? 'bg-primary text-primary-foreground border-primary'
              : 'hover:bg-accent'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          필터
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-white/20 text-inherit">
              {activeCount}
            </Badge>
          )}
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>

        {/* 정렬 */}
        <div className="flex items-center gap-1 ml-auto">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, sort: opt.value })}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                filters.sort === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {activeCount > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            초기화
          </button>
        )}
      </div>

      {/* 필터 패널 */}
      {open && (
        <Card className="animate-fade-up">
          <CardContent className="p-4 space-y-4">
            {/* 지역 */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">지역</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onChange({ ...filters, sido: '', regionCode: '' })}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    !filters.sido ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                  )}
                >
                  전체
                </button>
                {sidoList.map((sido) => (
                  <button
                    key={sido}
                    onClick={() => onChange({ ...filters, sido, regionCode: '' })}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                      filters.sido === sido ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                    )}
                  >
                    {sido.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}
                  </button>
                ))}
              </div>
              {sigunguList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    onClick={() => onChange({ ...filters, regionCode: '' })}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                      !filters.regionCode ? 'bg-primary/80 text-primary-foreground' : 'bg-muted/80 hover:bg-accent'
                    )}
                  >
                    전체
                  </button>
                  {sigunguList.map((r) => (
                    <button
                      key={r.code}
                      onClick={() => onChange({ ...filters, regionCode: r.code })}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                        filters.regionCode === r.code ? 'bg-primary/80 text-primary-foreground' : 'bg-muted/80 hover:bg-accent'
                      )}
                    >
                      {r.sigungu}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 가격대 */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">가격대</p>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_OPTIONS.map((opt) => {
                  const active = filters.minPrice === opt.min && filters.maxPrice === opt.max;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => onChange({ ...filters, minPrice: opt.min, maxPrice: opt.max })}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 면적 */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">전용면적</p>
              <div className="flex flex-wrap gap-1.5">
                {AREA_OPTIONS.map((opt) => {
                  const active = filters.minArea === opt.min && filters.maxArea === opt.max;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => onChange({ ...filters, minArea: opt.min, maxArea: opt.max })}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 건축년도 */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">건축년도</p>
              <div className="flex flex-wrap gap-1.5">
                {YEAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => onChange({ ...filters, minYear: opt.value })}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                      filters.minYear === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
