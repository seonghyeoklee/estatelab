/**
 * 갭투자 시뮬레이션 계산 유틸
 */

export interface InvestmentInput {
  tradePrice: number;   // 매매가 (만원)
  jeonsePrice: number;  // 전세가 (만원)
  loanRate: number;     // 대출 금리 (%)
  loanRatio: number;    // 대출 비율 (%, 갭 대비)
  holdYears: number;    // 보유 기간 (년)
  priceGrowthRate: number; // 연간 매매가 상승률 (%)
}

export interface InvestmentResult {
  gap: number;              // 갭 (만원)
  loanAmount: number;       // 대출금 (만원)
  selfFund: number;         // 자기자본 (만원)
  monthlyInterest: number;  // 월 이자 (만원, 이자만)
  monthlyPrincipalInterest: number; // 월 원리금균등 상환액 (만원)
  totalInterest: number;    // 총 이자 비용 (만원)
  futurePrice: number;      // 예상 미래 매매가 (만원)
  profit: number;           // 예상 수익 (만원)
  roi: number;              // 투자 수익률 (%)
  annualRoi: number;        // 연 수익률 (%)
}

/**
 * 갭투자 시뮬레이션
 */
export function calculateInvestment(input: InvestmentInput): InvestmentResult {
  const { tradePrice, jeonsePrice, loanRate, loanRatio, holdYears, priceGrowthRate } = input;

  const gap = tradePrice - jeonsePrice;
  const loanAmount = Math.round(gap * (loanRatio / 100));
  const selfFund = gap - loanAmount;

  // 월 이자 (이자만 납부)
  const monthlyInterest = loanAmount > 0
    ? Math.round((loanAmount * 10000 * (loanRate / 100 / 12)) / 10000)
    : 0;

  // 원리금균등 상환액
  const monthlyPrincipalInterest = loanAmount > 0 && loanRate > 0
    ? calculateMonthlyPayment(loanAmount * 10000, loanRate / 100, holdYears * 12) / 10000
    : loanAmount > 0 ? Math.round(loanAmount / (holdYears * 12)) : 0;

  // 총 이자 비용
  const totalInterest = monthlyInterest * holdYears * 12;

  // 예상 미래 매매가
  const futurePrice = Math.round(tradePrice * Math.pow(1 + priceGrowthRate / 100, holdYears));

  // 수익 = 미래매매가 - 현재매매가 - 총이자
  const profit = futurePrice - tradePrice - totalInterest;

  // ROI = 수익 / 자기자본
  const roi = selfFund > 0 ? Math.round((profit / selfFund) * 1000) / 10 : 0;
  const annualRoi = holdYears > 0 ? Math.round(roi / holdYears * 10) / 10 : 0;

  return {
    gap,
    loanAmount,
    selfFund: Math.max(selfFund, 0),
    monthlyInterest,
    monthlyPrincipalInterest: Math.round(monthlyPrincipalInterest),
    totalInterest,
    futurePrice,
    profit,
    roi,
    annualRoi,
  };
}

/**
 * 원리금균등 상환 월 납부액 (원 단위)
 */
function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / months;
  return principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
}
