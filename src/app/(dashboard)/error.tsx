'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-lg font-bold">페이지 로드 실패</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          데이터를 불러오는 중 오류가 발생했습니다.
        </p>
        {error.digest && (
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            {error.digest}
          </p>
        )}
        <Button onClick={reset} size="sm">
          다시 시도
        </Button>
      </div>
    </div>
  );
}
