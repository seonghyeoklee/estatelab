'use client';

import { SWRConfig } from 'swr';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
});

let lastErrorTime = 0;

interface SWRProviderProps {
  children: React.ReactNode;
  fallback?: Record<string, unknown>;
}

export function SWRProvider({ children, fallback = {} }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        fallback,
        revalidateOnFocus: false,
        dedupingInterval: 30000,
        errorRetryCount: 2,
        onError: () => {
          // 너무 자주 토스트 안 뜨게 5초 간격
          const now = Date.now();
          if (now - lastErrorTime > 5000) {
            lastErrorTime = now;
            toast.error('데이터를 불러오지 못했습니다', {
              description: '잠시 후 다시 시도해주세요.',
              duration: 3000,
            });
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
