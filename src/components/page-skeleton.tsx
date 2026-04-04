/**
 * 페이지 로딩 스켈레톤 — 일관된 로딩 UI
 */

export function CardGridSkeleton({ count = 4, cols = 4 }: { count?: number; cols?: 2 | 3 | 4 }) {
  const colClass = cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  return (
    <div className={`grid gap-4 ${colClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[120px] animate-pulse rounded-xl bg-muted/60" />
      ))}
    </div>
  );
}
