/**
 * 포맷팅 유틸
 */

/** 가격을 억/만 단위로 표시 */
export function formatPrice(price: number): string {
  if (price >= 100000) return (price / 10000).toFixed(0) + '억';
  if (price >= 10000) return (price / 10000).toFixed(1) + '억';
  return price.toLocaleString() + '만';
}

/** 평당가 표시 */
export function formatPricePerPyeong(price: number): string {
  return price.toLocaleString() + '만/평';
}

/** 가격대별 CSS 클래스 (bg + text) */
export function priceColorClass(price: number): { bg: string; text: string } {
  if (price >= 200000) return { bg: 'bg-violet-500/10', text: 'text-violet-600' };
  if (price >= 100000) return { bg: 'bg-blue-500/10', text: 'text-blue-600' };
  if (price >= 50000) return { bg: 'bg-emerald-500/10', text: 'text-emerald-600' };
  return { bg: 'bg-slate-500/10', text: 'text-slate-600' };
}
