import { Building2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-6 text-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          EstateLab
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          부동산 데이터 수집 · 분석 · 알림 플랫폼
        </p>
        <div className="mt-4 flex gap-3 text-sm text-muted-foreground">
          <span className="rounded-full border px-3 py-1">실거래가</span>
          <span className="rounded-full border px-3 py-1">청약</span>
          <span className="rounded-full border px-3 py-1">금리</span>
          <span className="rounded-full border px-3 py-1">AI 분석</span>
        </div>
      </main>
    </div>
  );
}
