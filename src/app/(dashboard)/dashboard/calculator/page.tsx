'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Info, Search, ArrowRight } from 'lucide-react';
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

const PRICE_PRESETS = [50000, 70000, 90000, 120000, 150000, 200000];
const DEPOSIT_PRESETS = [10000, 20000, 30000, 50000, 70000];
const YEAR_OPTIONS = [10, 15, 20, 25, 30, 35, 40];

function CalculatorContent() {
  const searchParams = useSearchParams();
  const initialPrice = searchParams.get('price') ? parseInt(searchParams.get('price')!) : 90000;

  const [price, setPrice] = useState(initialPrice);
  const [deposit, setDeposit] = useState(30000);
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(30);
  const [type, setType] = useState<'equal' | 'equalPrincipal'>('equal');
  const [income, setIncome] = useState(6000);

  const result = useMemo(
    () => calculateMortgage({ price, deposit: Math.min(deposit, price), rate, years, type }),
    [price, deposit, rate, years, type]
  );

  const maxLoan = useMemo(() => maxLoanByIncome(income, rate, years), [income, rate, years]);
  const maxBuyable = maxLoan + deposit;
  const dsr = result.loanAmount > 0 && income > 0
    ? Math.round((result.monthlyAvg / (income / 12)) * 100) : 0;

  const chartData = result.schedule
    .filter((s) => s.month % 12 === 0 || s.month === 1)
    .map((s) => ({ label: `${Math.ceil(s.month / 12)}년`, balance: s.balance }));

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대출 계산기</h1>
        <p className="text-muted-foreground">월 상환액과 매수 가능 금액을 확인하세요.</p>
      </div>

      {/* ── 핵심 결과 (가장 먼저 보이게) ── */}
      <Card className="border-primary/30 bg-primary/[0.02]">
        <CardContent className="p-5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">월 상환액</p>
            <p className="text-4xl font-bold text-primary mt-1 tabular-nums">
              {result.monthlyFirst.toLocaleString()}<span className="text-lg font-medium">만원</span>
            </p>
            {type === 'equalPrincipal' && result.monthlyFirst !== result.monthlyLast && (
              <p className="text-sm text-muted-foreground mt-1">
                첫 달 {result.monthlyFirst.toLocaleString()}만 → 마지막 달 {result.monthlyLast.toLocaleString()}만
              </p>
            )}
          </div>

          {/* 요약 3열 */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">대출금</p>
              <p className="text-base font-bold">{formatPrice(result.loanAmount)}</p>
              <p className="text-xs text-muted-foreground">LTV {result.ltv}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">총 이자</p>
              <p className="text-base font-bold text-amber-600">{formatPrice(result.totalInterest)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">총 상환</p>
              <p className="text-base font-bold">{formatPrice(result.totalPayment)}</p>
            </div>
          </div>

          {/* DSR */}
          {dsr > 0 && (
            <div className={cn(
              'mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
              dsr > 40 ? 'bg-red-500/10 text-red-600' : dsr > 30 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
            )}>
              <Info className="h-4 w-4 shrink-0" />
              <span className="font-medium">DSR {dsr}%</span>
              <span className="text-muted-foreground">
                — {dsr > 40 ? '한도 초과 가능' : dsr > 30 ? '부담 높음' : '적정'}
                (월소득 {Math.round(income / 12).toLocaleString()}만 기준)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 입력 조절 ── */}
      <Card>
        <CardContent className="p-5 space-y-5">
          {/* 매매가 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">매매가</span>
              <span className="text-sm font-bold text-primary tabular-nums">{formatPrice(price)}</span>
            </div>
            <input type="range" min={10000} max={300000} step={5000} value={price}
              onChange={(e) => setPrice(parseInt(e.target.value))} className="w-full accent-primary h-2" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRICE_PRESETS.map((v) => (
                <button key={v} onClick={() => setPrice(v)}
                  className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    price === v ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}>
                  {formatPrice(v)}
                </button>
              ))}
            </div>
          </div>

          {/* 자기자본 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">자기자본</span>
              <span className="text-sm font-bold tabular-nums">{formatPrice(deposit)}</span>
            </div>
            <input type="range" min={0} max={Math.min(price, 200000)} step={5000} value={deposit}
              onChange={(e) => setDeposit(parseInt(e.target.value))} className="w-full accent-primary h-2" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {DEPOSIT_PRESETS.map((v) => (
                <button key={v} onClick={() => setDeposit(Math.min(v, price))}
                  className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    deposit === v ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}>
                  {formatPrice(v)}
                </button>
              ))}
            </div>
          </div>

          {/* 금리 + 기간 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">대출 금리</span>
                <span className="text-sm font-bold tabular-nums">{rate.toFixed(1)}%</span>
              </div>
              <input type="range" min={1} max={8} step={0.1} value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))} className="w-full accent-primary h-2" />
            </div>
            <div>
              <span className="text-sm font-medium block mb-2">상환 기간</span>
              <div className="flex flex-wrap gap-1.5">
                {YEAR_OPTIONS.map((y) => (
                  <button key={y} onClick={() => setYears(y)}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      years === y ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}>
                    {y}년
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 상환 방식 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">상환 방식</span>
            <div className="flex gap-1.5 ml-auto">
              {(['equal', 'equalPrincipal'] as const).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    type === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}>
                  {t === 'equal' ? '원리금균등' : '원금균등'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 잔금 추이 ── */}
      {chartData.length > 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">대출 잔금 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatPrice(v)} width={45} />
                <Tooltip formatter={(value) => [formatPrice(Number(value)), '잔금']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="balance" stroke="#059669" strokeWidth={2} fill="url(#balGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── 내 예산 진단 ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            내 예산 진단
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">연소득</span>
              <span className="text-sm font-bold tabular-nums">{formatPrice(income)}</span>
            </div>
            <input type="range" min={2000} max={20000} step={500} value={income}
              onChange={(e) => setIncome(parseInt(e.target.value))} className="w-full accent-primary h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">대출 한도 (DSR 40%)</p>
              <p className="text-xl font-bold text-primary mt-1">{formatPrice(maxLoan)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">매수 가능 금액</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatPrice(maxBuyable)}</p>
            </div>
            <div className={cn('rounded-xl p-4 text-center', maxBuyable >= price ? 'bg-emerald-500/5' : 'bg-red-500/5')}>
              <p className="text-xs text-muted-foreground">현재 매매가 대비</p>
              <p className={cn('text-xl font-bold mt-1', maxBuyable >= price ? 'text-emerald-600' : 'text-red-600')}>
                {maxBuyable >= price ? '매수 가능' : `${formatPrice(price - maxBuyable)} 부족`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="flex-1">
              <Link href="/dashboard/map">
                <Search className="h-4 w-4" />
                {formatPrice(maxBuyable)} 이하 아파트 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/dashboard/gap-invest?sort=gap">
                갭투자 기회 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense>
      <CalculatorContent />
    </Suspense>
  );
}
