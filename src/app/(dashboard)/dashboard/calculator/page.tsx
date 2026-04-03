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

const PRICE_PRESETS = [
  { label: '5억', value: 50000 },
  { label: '7억', value: 70000 },
  { label: '9억', value: 90000 },
  { label: '12억', value: 120000 },
  { label: '15억', value: 150000 },
  { label: '20억', value: 200000 },
];

const DEPOSIT_PRESETS = [
  { label: '1억', value: 10000 },
  { label: '2억', value: 20000 },
  { label: '3억', value: 30000 },
  { label: '5억', value: 50000 },
  { label: '7억', value: 70000 },
];

const YEAR_PRESETS = [10, 15, 20, 25, 30, 35, 40];

/** 슬라이더 + 직접 입력 + 프리셋 */
function ValueInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  presets,
  formatFn,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  presets?: { label: string; value: number }[];
  formatFn?: (v: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const displayValue = formatFn ? formatFn(value) : `${value}${unit}`;

  const handleEditStart = () => {
    setEditing(true);
    setEditValue(String(value));
  };

  const handleEditEnd = () => {
    setEditing(false);
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      onChange(Math.min(Math.max(parsed, min), max));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditEnd}
              onKeyDown={(e) => e.key === 'Enter' && handleEditEnd()}
              autoFocus
              className="w-20 rounded-md border px-2 py-0.5 text-[13px] font-bold text-right outline-none focus:ring-1 focus:ring-primary/30"
            />
            <span className="text-[11px] text-muted-foreground">{unit}</span>
          </div>
        ) : (
          <button
            onClick={handleEditStart}
            className="text-[14px] font-bold text-primary hover:underline tabular-nums"
          >
            {displayValue}
          </button>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary h-2"
      />
      {presets && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                value === p.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    .map((s) => ({
      label: `${Math.ceil(s.month / 12)}년`,
      balance: s.balance,
    }));

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대출 계산기</h1>
        <p className="text-muted-foreground">월 상환액과 내 예산으로 살 수 있는 집을 확인하세요.</p>
      </div>

      {/* 입력 */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ValueInput
              label="매매가"
              value={price}
              onChange={setPrice}
              min={10000}
              max={300000}
              step={5000}
              unit="만원"
              presets={PRICE_PRESETS}
              formatFn={formatPrice}
            />
            <ValueInput
              label="자기자본 (보유 현금)"
              value={deposit}
              onChange={(v) => setDeposit(Math.min(v, price))}
              min={0}
              max={Math.min(price, 200000)}
              step={5000}
              unit="만원"
              presets={DEPOSIT_PRESETS}
              formatFn={formatPrice}
            />
            <ValueInput
              label="대출 금리"
              value={rate}
              onChange={setRate}
              min={1}
              max={8}
              step={0.1}
              unit="%"
              formatFn={(v) => `${v.toFixed(1)}%`}
            />
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">상환 기간</label>
              <div className="flex flex-wrap gap-1.5">
                {YEAR_PRESETS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                      years === y ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                    )}
                  >
                    {y}년
                  </button>
                ))}
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

      {/* 결과 — 핵심 숫자 강조 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-primary/30">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">월 상환액</p>
            <p className="text-2xl font-bold text-primary mt-1">{result.monthlyFirst.toLocaleString()}<span className="text-sm">만</span></p>
            {type === 'equalPrincipal' && (
              <p className="text-[10px] text-muted-foreground">→ {result.monthlyLast.toLocaleString()}만</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">대출금</p>
            <p className="text-lg font-bold mt-1">{formatPrice(result.loanAmount)}</p>
            <p className="text-[10px] text-muted-foreground">LTV {result.ltv}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">총 이자</p>
            <p className="text-lg font-bold text-amber-600 mt-1">{formatPrice(result.totalInterest)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">총 상환액</p>
            <p className="text-lg font-bold mt-1">{formatPrice(result.totalPayment)}</p>
          </CardContent>
        </Card>
      </div>

      {/* DSR */}
      {dsr > 0 && (
        <Card className={cn('border-l-4', dsr > 40 ? 'border-l-red-500' : dsr > 30 ? 'border-l-amber-500' : 'border-l-emerald-500')}>
          <CardContent className="p-4 flex items-start gap-3">
            <Info className={cn('h-4 w-4 mt-0.5 shrink-0', dsr > 40 ? 'text-red-500' : dsr > 30 ? 'text-amber-500' : 'text-emerald-500')} />
            <div className="text-[12px]">
              <p className="font-medium">
                DSR {dsr}% — {dsr > 40 ? '대출 한도 초과 가능성' : dsr > 30 ? '부담 높음' : '적정 범위'}
              </p>
              <p className="text-muted-foreground mt-0.5">
                월소득 {Math.round(income / 12).toLocaleString()}만 대비 상환액 {result.monthlyAvg.toLocaleString()}만
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 잔금 추이 */}
      {chartData.length > 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">대출 잔금 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
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

      {/* 내 예산 진단 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            내 예산 진단
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ValueInput
            label="연소득"
            value={income}
            onChange={setIncome}
            min={2000}
            max={20000}
            step={500}
            unit="만원"
            formatFn={formatPrice}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-primary/5 p-4 text-center">
              <p className="text-[11px] text-muted-foreground">DSR 40% 대출 한도</p>
              <p className="text-xl font-bold text-primary mt-1">{formatPrice(maxLoan)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 p-4 text-center">
              <p className="text-[11px] text-muted-foreground">매수 가능 금액</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatPrice(maxBuyable)}</p>
            </div>
            <div className={cn('rounded-xl p-4 text-center', maxBuyable >= price ? 'bg-emerald-500/5' : 'bg-red-500/5')}>
              <p className="text-[11px] text-muted-foreground">현재 매매가 대비</p>
              <p className={cn('text-xl font-bold mt-1', maxBuyable >= price ? 'text-emerald-600' : 'text-red-600')}>
                {maxBuyable >= price ? '매수 가능' : `${formatPrice(price - maxBuyable)} 부족`}
              </p>
            </div>
          </div>

          {/* CTA: 이 금액대 아파트 보기 */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button asChild className="flex-1">
              <Link href={`/dashboard/apartments?maxPrice=${maxBuyable}&sort=price`}>
                <Search className="h-4 w-4" />
                {formatPrice(maxBuyable)} 이하 아파트 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href={`/dashboard/gap-invest?maxRatio=100&sort=gap`}>
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
