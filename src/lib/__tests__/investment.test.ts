import { describe, it, expect } from 'vitest';
import { calculateInvestment } from '../investment';

describe('calculateInvestment', () => {
  const base = {
    tradePrice: 100000,  // 10억
    jeonsePrice: 70000,  // 7억
    loanRate: 3.5,
    loanRatio: 70,
    holdYears: 3,
    priceGrowthRate: 5,
  };

  it('갭 = 매매가 - 전세가', () => {
    const result = calculateInvestment(base);
    expect(result.gap).toBe(30000); // 3억
  });

  it('대출금 = 갭 × 대출비율', () => {
    const result = calculateInvestment(base);
    expect(result.loanAmount).toBe(21000); // 3억 × 70%
  });

  it('자기자본 = 갭 - 대출금', () => {
    const result = calculateInvestment(base);
    expect(result.selfFund).toBe(9000); // 3억 - 2.1억
  });

  it('월 이자가 양수', () => {
    const result = calculateInvestment(base);
    expect(result.monthlyInterest).toBeGreaterThan(0);
    // 2.1억 × 3.5% / 12 ≈ 61만원
    expect(result.monthlyInterest).toBeCloseTo(61, -1);
  });

  it('미래 매매가 = 현재 × (1 + 상승률)^기간', () => {
    const result = calculateInvestment(base);
    // 10억 × 1.05^3 ≈ 11.58억
    expect(result.futurePrice).toBeCloseTo(115763, -2);
  });

  it('수익 = 미래가 - 현재가 - 이자비용', () => {
    const result = calculateInvestment(base);
    expect(result.profit).toBe(result.futurePrice - base.tradePrice - result.totalInterest);
  });

  it('ROI = 수익 / 자기자본', () => {
    const result = calculateInvestment(base);
    expect(result.roi).toBeCloseTo((result.profit / result.selfFund) * 100, 0);
  });

  it('대출 0%이면 월 이자 0', () => {
    const result = calculateInvestment({ ...base, loanRatio: 0 });
    expect(result.loanAmount).toBe(0);
    expect(result.monthlyInterest).toBe(0);
    expect(result.selfFund).toBe(30000);
  });

  it('상승률 0%이면 수익 = -이자비용', () => {
    const result = calculateInvestment({ ...base, priceGrowthRate: 0 });
    expect(result.futurePrice).toBe(base.tradePrice);
    expect(result.profit).toBe(-result.totalInterest);
  });

  it('전세가 > 매매가이면 갭 음수, 자기자본 0', () => {
    const result = calculateInvestment({ ...base, jeonsePrice: 110000 });
    expect(result.gap).toBeLessThan(0);
    expect(result.selfFund).toBe(0);
  });
});
