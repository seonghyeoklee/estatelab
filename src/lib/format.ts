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
