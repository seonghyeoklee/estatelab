'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import { calculateMortgage, maxLoanByIncome } from '@/lib/mortgage';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function CalculatorPage() {
  const [price, setPrice] = useState(90000);       // 9억
  const [deposit, setDeposit] = useState(30000);    // 3억
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(30);
  const [type, setType] = useState<'equal' | 'equalPrincipal'>('equal');
  const [income, setIncome] = useState(6000);       // 연 6000만

  const result = useMemo(
    () => calculateMortgage({ price, deposit, rate, years, type }),
    [price, deposit, rate, years, type]
  );

  const maxLoan = useMemo(
    () => maxLoanByIncome(income, rate, years),
    [income, rate, years]
  );

  const maxBuyable = maxLoan + deposit;
  const dsr = result.loanAmount > 0 && income > 0
    ? Math.round((result.monthlyAvg / (income / 12)) * 100)
    : 0;

  // 차트 데이터 (연도별)
  const chartData = result.schedule
    .filter((s) => s.month % 12 === 0 || s.month === 1)
    .map((s) => ({
      year: Math.ceil(s.month / 12),
      label: `${Math.ceil(s.month / 12)}년`,
      balance: s.balance,
      interest: s.interest,
    }));

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대출 계산기</h1>
        <p className="text-muted-foreground">주택담보대출 상환액과 내 예산으로 살 수 있는 집을 확인하세요.</p>
      </div>

      {/* 입력 */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">매매가</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={10000}
                  max={300000}
                  step={5000}
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-bold w-16 text-right tabular-nums">{formatPrice(price)}</span>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">자기자본</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={0}
                  max={price}
                  step={5000}
                  value={deposit}
                  onChange={(e) => setDeposit(parseInt(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-bold w-16 text-right tabular-nums">{formatPrice(deposit)}</span>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">대출 금리</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.1}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-bold w-16 text-right tabular-nums">{rate.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">상환 기간</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={5}
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-sm font-bold w-16 text-right tabular-nums">{years}년</span>
              </div>
            </div>
          </div>

          {/* 상환 방식 */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">상환 방식</span>
            {(['equal', 'equalPrincipal'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                  type === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                )}
              >
                {t === 'equal' ? '원리금균등' : '원금균등'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 결과 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">대출금</p>
            <p className="text-xl font-bold text-primary mt-1">{formatPrice(result.loanAmount)}</p>
            <p className="text-[10px] text-muted-foreground">LTV {result.ltv}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">월 상환액</p>
            <p className="text-xl font-bold mt-1">{result.monthlyFirst.toLocaleString()}만</p>
            {type === 'equalPrincipal' && (
              <p className="text-[10px] text-muted-foreground">→ {result.monthlyLast.toLocaleString()}만</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">총 이자</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatPrice(result.totalInterest)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">총 상환액</p>
            <p className="text-xl font-bold mt-1">{formatPrice(result.totalPayment)}</p>
          </CardContent>
        </Card>
      </div>

      {/* DSR 경고 */}
      {dsr > 0 && (
        <Card className={cn('border-l-4', dsr > 40 ? 'border-l-red-500' : dsr > 30 ? 'border-l-amber-500' : 'border-l-emerald-500')}>
          <CardContent className="p-4 flex items-start gap-3">
            <Info className={cn('h-4 w-4 mt-0.5 shrink-0', dsr > 40 ? 'text-red-500' : dsr > 30 ? 'text-amber-500' : 'text-emerald-500')} />
            <div className="text-[12px]">
              <p className="font-medium">
                DSR {dsr}% — {dsr > 40 ? '대출 한도 초과 가능' : dsr > 30 ? '부담 높음' : '적정 범위'}
              </p>
              <p className="text-muted-foreground mt-0.5">
                월 소득 {Math.round(income / 12).toLocaleString()}만 대비 상환액 {result.monthlyAvg.toLocaleString()}만원
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 잔금 추이 차트 */}
      {chartData.length > 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">대출 잔금 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatPrice(v)} width={45} />
                <Tooltip formatter={(value) => [formatPrice(Number(value)), '잔금']} labelFormatter={(l) => String(l)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="balance" stroke="#059669" strokeWidth={2} fill="url(#balanceGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 내 예산 진단 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            내 예산 진단
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">연소득</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={2000}
                max={20000}
                step={500}
                value={income}
                onChange={(e) => setIncome(parseInt(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-bold w-20 text-right tabular-nums">{formatPrice(income)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-primary/5 p-4 text-center">
              <p className="text-[11px] text-muted-foreground">DSR 40% 대출 한도</p>
              <p className="text-xl font-bold text-primary mt-1">{formatPrice(maxLoan)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 p-4 text-center">
              <p className="text-[11px] text-muted-foreground">자기자본 포함 매수 가능</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatPrice(maxBuyable)}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-[11px] text-muted-foreground">현재 매매가 대비</p>
              <p className={cn('text-xl font-bold mt-1', maxBuyable >= price ? 'text-emerald-600' : 'text-red-600')}>
                {maxBuyable >= price ? '매수 가능' : `${formatPrice(price - maxBuyable)} 부족`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
