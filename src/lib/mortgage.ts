/**
 * 주택담보대출 시뮬레이션
 */

export interface MortgageInput {
  price: number;        // 매매가 (만원)
  deposit: number;      // 자기자본 (만원)
  rate: number;         // 금리 (%)
  years: number;        // 상환 기간 (년)
  type: 'equal' | 'equalPrincipal'; // 원리금균등 | 원금균등
}

export interface MortgageResult {
  loanAmount: number;       // 대출금 (만원)
  ltv: number;              // LTV (%)
  monthlyFirst: number;     // 첫 달 상환액 (만원)
  monthlyAvg: number;       // 평균 월 상환액 (만원)
  monthlyLast: number;      // 마지막 달 상환액 (만원)
  totalPayment: number;     // 총 상환액 (만원)
  totalInterest: number;    // 총 이자 (만원)
  schedule: { month: number; principal: number; interest: number; balance: number }[];
}

/**
 * 대출 상환 시뮬레이션
 */
export function calculateMortgage(input: MortgageInput): MortgageResult {
  const { price, deposit, rate, years, type } = input;
  const loanAmount = Math.max(price - deposit, 0);
  const ltv = price > 0 ? Math.round((loanAmount / price) * 100) : 0;
  const months = years * 12;
  const monthlyRate = rate / 100 / 12;

  if (loanAmount <= 0 || months <= 0) {
    return {
      loanAmount: 0, ltv: 0, monthlyFirst: 0, monthlyAvg: 0, monthlyLast: 0,
      totalPayment: 0, totalInterest: 0, schedule: [],
    };
  }

  const schedule: MortgageResult['schedule'] = [];
  let balance = loanAmount * 10000; // 원 단위
  let totalPayment = 0;

  if (type === 'equal') {
    // 원리금균등
    const monthly = monthlyRate > 0
      ? balance * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
      : balance / months;

    for (let m = 1; m <= months; m++) {
      const interest = balance * monthlyRate;
      const principal = monthly - interest;
      balance -= principal;
      totalPayment += monthly;
      if (m <= 12 || m > months - 12 || m % 12 === 0) {
        schedule.push({
          month: m,
          principal: Math.round(principal / 10000),
          interest: Math.round(interest / 10000),
          balance: Math.round(Math.max(balance, 0) / 10000),
        });
      }
    }

    const monthlyWon = Math.round(monthly / 10000);
    return {
      loanAmount,
      ltv,
      monthlyFirst: monthlyWon,
      monthlyAvg: monthlyWon,
      monthlyLast: monthlyWon,
      totalPayment: Math.round(totalPayment / 10000),
      totalInterest: Math.round(totalPayment / 10000) - loanAmount,
      schedule,
    };
  } else {
    // 원금균등
    const monthlyPrincipal = balance / months;

    for (let m = 1; m <= months; m++) {
      const interest = balance * monthlyRate;
      const payment = monthlyPrincipal + interest;
      balance -= monthlyPrincipal;
      totalPayment += payment;
      if (m <= 12 || m > months - 12 || m % 12 === 0) {
        schedule.push({
          month: m,
          principal: Math.round(monthlyPrincipal / 10000),
          interest: Math.round(interest / 10000),
          balance: Math.round(Math.max(balance, 0) / 10000),
        });
      }
    }

    const firstPayment = monthlyPrincipal + loanAmount * 10000 * monthlyRate;
    const lastPayment = monthlyPrincipal + monthlyPrincipal * monthlyRate;

    return {
      loanAmount,
      ltv,
      monthlyFirst: Math.round(firstPayment / 10000),
      monthlyAvg: Math.round(totalPayment / months / 10000),
      monthlyLast: Math.round(lastPayment / 10000),
      totalPayment: Math.round(totalPayment / 10000),
      totalInterest: Math.round(totalPayment / 10000) - loanAmount,
      schedule,
    };
  }
}

/**
 * 연소득 기반 대출 한도 (DSR 40% 기준)
 */
export function maxLoanByIncome(annualIncome: number, rate: number, years: number): number {
  // annualIncome: 만원 단위 (예: 6000 = 연봉 6000만원)
  const monthlyPaymentLimit = (annualIncome / 12) * 0.4; // DSR 40%, 만원 단위
  const monthlyRate = rate / 100 / 12;
  const months = years * 12;

  if (monthlyRate === 0) return Math.round(monthlyPaymentLimit * months);

  // 만원 단위로 계산
  const maxLoan = monthlyPaymentLimit * (Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, months));
  return Math.round(maxLoan); // 만원 단위
}
