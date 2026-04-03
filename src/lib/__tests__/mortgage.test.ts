import { describe, it, expect } from 'vitest';
import { calculateMortgage, maxLoanByIncome } from '../mortgage';

describe('calculateMortgage', () => {
  it('대출금 = 매매가 - 자기자본', () => {
    const r = calculateMortgage({ price: 90000, deposit: 30000, rate: 3.5, years: 30, type: 'equal' });
    expect(r.loanAmount).toBe(60000);
  });

  it('LTV 계산', () => {
    const r = calculateMortgage({ price: 100000, deposit: 30000, rate: 3.5, years: 30, type: 'equal' });
    expect(r.ltv).toBe(70);
  });

  it('원리금균등: 매달 동일 상환액', () => {
    const r = calculateMortgage({ price: 50000, deposit: 10000, rate: 3.5, years: 30, type: 'equal' });
    expect(r.monthlyFirst).toBe(r.monthlyLast);
    expect(r.monthlyFirst).toBeGreaterThan(0);
  });

  it('원금균등: 첫달 > 마지막달', () => {
    const r = calculateMortgage({ price: 50000, deposit: 10000, rate: 3.5, years: 30, type: 'equalPrincipal' });
    expect(r.monthlyFirst).toBeGreaterThan(r.monthlyLast);
  });

  it('총 이자 = 총 상환 - 대출금', () => {
    const r = calculateMortgage({ price: 60000, deposit: 20000, rate: 4.0, years: 30, type: 'equal' });
    expect(r.totalInterest).toBe(r.totalPayment - r.loanAmount);
  });

  it('자기자본 >= 매매가이면 대출 0', () => {
    const r = calculateMortgage({ price: 50000, deposit: 60000, rate: 3.5, years: 30, type: 'equal' });
    expect(r.loanAmount).toBe(0);
    expect(r.monthlyFirst).toBe(0);
  });

  it('상환 스케줄 생성', () => {
    const r = calculateMortgage({ price: 50000, deposit: 10000, rate: 3.5, years: 30, type: 'equal' });
    expect(r.schedule.length).toBeGreaterThan(0);
    expect(r.schedule[0].month).toBe(1);
  });
});

describe('maxLoanByIncome', () => {
  it('연소득 6000만원 → DSR 40% 기준 대출 한도', () => {
    // 연소득 6000만원 = 월 500만원, DSR 40% = 월 200만원 상환
    const max = maxLoanByIncome(6000, 3.5, 30);
    expect(max).toBeGreaterThan(0);
    // 월 200만원 × 30년 원리금균등 → 약 4.4억
    expect(max).toBeGreaterThan(40000);
    expect(max).toBeLessThan(50000);
  });

  it('연소득 0이면 대출 0', () => {
    expect(maxLoanByIncome(0, 3.5, 30)).toBe(0);
  });
});
