'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">문제가 발생했습니다</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          페이지를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/50 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <Button onClick={reset} variant="outline">
          다시 시도
        </Button>
      </div>
    </div>
  );
}
