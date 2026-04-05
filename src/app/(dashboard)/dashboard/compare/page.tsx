'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';

interface ComplexDetail {
  id: string;
  name: string;
  dong: string;
  roadAddress: string | null;
  builtYear: number | null;
  totalUnits: number | null;
  region: { sido: string; sigungu: string };
  trades: { price: number; area: number; floor: number; dealDate: string; pricePerPyeong: number | null }[];
  areaGroups: { area: number; count: number; avgPrice: number; avgPricePerPyeong: number }[];
}

interface SearchResult {
  id: string;
  name: string;
  dong: string;
  region?: { sigungu: string };
  latestTrade?: { price: number } | null;
}

function CompareRow({ label, valueA, valueB, highlight }: {
  label: string; valueA: string; valueB: string; highlight?: 'higher' | 'lower';
}) {
  const numA = parseFloat(valueA.replace(/[^0-9.-]/g, ''));
  const numB = parseFloat(valueB.replace(/[^0-9.-]/g, ''));
  const aWins = highlight === 'lower' ? numA < numB : numA > numB;
  const bWins = highlight === 'lower' ? numB < numA : numB > numA;

  return (
    <div className="grid grid-cols-3 gap-2 py-2.5 border-b last:border-0 items-center">
      <div className={cn('text-sm font-semibold text-right tabular-nums', aWins && 'text-primary')}>{valueA}</div>
      <div className="text-xs text-muted-foreground text-center">{label}</div>
      <div className={cn('text-sm font-semibold tabular-nums', bWins && 'text-primary')}>{valueB}</div>
    </div>
  );
}

function SearchInput({ value, onChange, results, onSelect, placeholder }: {
  value: string; onChange: (v: string) => void;
  results?: SearchResult[]; onSelect: (id: string) => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {results && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-white shadow-lg z-10 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors text-sm"
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{r.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{r.region?.sigungu} {r.dong}</span>
              {r.latestTrade && (
                <span className="text-xs font-semibold text-primary ml-auto shrink-0">{formatPrice(r.latestTrade.price)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const [idA, setIdA] = useState(searchParams.get('a') || '');
  const [idB, setIdB] = useState(searchParams.get('b') || '');
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');

  const { data: dataA } = useSWR<{ data: ComplexDetail }>(idA ? `/api/market/apartments/${idA}` : null);
  const { data: dataB } = useSWR<{ data: ComplexDetail }>(idB ? `/api/market/apartments/${idB}` : null);
  const { data: resultsA } = useSWR<{ data: SearchResult[] }>(
    searchA.length >= 2 ? `/api/market/apartments?q=${encodeURIComponent(searchA)}&limit=5` : null
  );
  const { data: resultsB } = useSWR<{ data: SearchResult[] }>(
    searchB.length >= 2 ? `/api/market/apartments?q=${encodeURIComponent(searchB)}&limit=5` : null
  );

  const a = dataA?.data;
  const b = dataB?.data;

  const selectA = (id: string) => { setIdA(id); setSearchA(''); };
  const selectB = (id: string) => { setIdB(id); setSearchB(''); };

  const stats = (d: ComplexDetail | undefined) => {
    if (!d || d.trades.length === 0) return null;
    const trades = d.trades;
    const avgPrice = Math.round(trades.reduce((s, t) => s + t.price, 0) / trades.length);
    const avgPpp = trades[0]?.pricePerPyeong
      ? Math.round(trades.reduce((s, t) => s + (t.pricePerPyeong ?? 0), 0) / trades.length)
      : 0;
    const maxPrice = Math.max(...trades.map((t) => t.price));
    const minPrice = Math.min(...trades.map((t) => t.price));
    return { avgPrice, avgPpp, maxPrice, minPrice, tradeCount: trades.length };
  };

  const statsA = stats(a);
  const statsB = stats(b);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">단지 비교</h1>
        <p className="text-muted-foreground">두 단지를 나란히 비교합니다.</p>
      </div>

      {/* 검색 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {idA && a ? (
            <Card className="border-primary/30">
              <CardContent className="p-4 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.region.sigungu} {a.dong}</p>
                </div>
                <button onClick={() => setIdA('')} className="rounded-full p-1 hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
              </CardContent>
            </Card>
          ) : (
            <SearchInput value={searchA} onChange={setSearchA} results={resultsA?.data} onSelect={selectA} placeholder="첫 번째 단지 검색..." />
          )}
        </div>
        <div>
          {idB && b ? (
            <Card className="border-primary/30">
              <CardContent className="p-4 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.region.sigungu} {b.dong}</p>
                </div>
                <button onClick={() => setIdB('')} className="rounded-full p-1 hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
              </CardContent>
            </Card>
          ) : (
            <SearchInput value={searchB} onChange={setSearchB} results={resultsB?.data} onSelect={selectB} placeholder="두 번째 단지 검색..." />
          )}
        </div>
      </div>

      {/* 비교 결과 */}
      {statsA && statsB && a && b && (
        <Card>
          <CardHeader className="pb-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Link href={`/dashboard/map?complex=${a.id}`} className="text-sm font-bold text-primary hover:underline truncate">{a.name}</Link>
              <span className="text-xs text-muted-foreground self-center">VS</span>
              <Link href={`/dashboard/map?complex=${b.id}`} className="text-sm font-bold text-primary hover:underline truncate">{b.name}</Link>
            </div>
          </CardHeader>
          <CardContent>
            <CompareRow label="평균 매매가" valueA={formatPrice(statsA.avgPrice)} valueB={formatPrice(statsB.avgPrice)} />
            <CompareRow label="평당가" valueA={`${statsA.avgPpp.toLocaleString()}만`} valueB={`${statsB.avgPpp.toLocaleString()}만`} />
            <CompareRow label="최고가" valueA={formatPrice(statsA.maxPrice)} valueB={formatPrice(statsB.maxPrice)} />
            <CompareRow label="최저가" valueA={formatPrice(statsA.minPrice)} valueB={formatPrice(statsB.minPrice)} highlight="lower" />
            <CompareRow label="거래 건수" valueA={`${statsA.tradeCount}건`} valueB={`${statsB.tradeCount}건`} />
            <CompareRow label="건축년도" valueA={a.builtYear ? `${a.builtYear}년` : '-'} valueB={b.builtYear ? `${b.builtYear}년` : '-'} />
            <CompareRow label="세대수" valueA={a.totalUnits ? `${a.totalUnits.toLocaleString()}세대` : '-'} valueB={b.totalUnits ? `${b.totalUnits.toLocaleString()}세대` : '-'} />
            <CompareRow label="위치" valueA={`${a.region.sigungu} ${a.dong}`} valueB={`${b.region.sigungu} ${b.dong}`} />
          </CardContent>
        </Card>
      )}

      {(!idA || !idB) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">두 단지를 검색해서 비교해보세요</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
