/**
 * 부동산 관련 계산 유틸
 */

export const PYEONG_RATIO = 3.3058;

/** ㎡ → 평 변환 */
export function toPyeong(areaM2: number): number {
  return areaM2 / PYEONG_RATIO;
}

/** 평당가 계산 (만원 단위) */
export function pricePerPyeong(totalPrice: number, areaM2: number): number {
  return Math.round(totalPrice / toPyeong(areaM2));
}
