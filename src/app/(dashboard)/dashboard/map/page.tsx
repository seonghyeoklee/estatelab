'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { KakaoMapProvider } from '@/components/kakao-map-provider';
import { TradeMap } from './_components/trade-map';

function MapContent() {
  const searchParams = useSearchParams();
  const complexId = searchParams.get('complexId');

  // 지도 페이지에서는 main 패딩 제거
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const original = main.style.padding;
    main.style.padding = '0';
    main.style.overflow = 'hidden';
    return () => {
      main.style.padding = original;
      main.style.overflow = '';
    };
  }, []);

  return (
    <div className="h-[calc(100vh-56px)] w-full">
      <KakaoMapProvider>
        <TradeMap focusComplexId={complexId} />
      </KakaoMapProvider>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense>
      <MapContent />
    </Suspense>
  );
}
