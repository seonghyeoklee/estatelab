'use client';

import Script from 'next/script';
import { useState, createContext, useContext } from 'react';

const KakaoContext = createContext(false);

export function useKakaoLoaded() {
  return useContext(KakaoContext);
}

export function KakaoMapProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;

  if (!appKey) {
    return <>{children}</>;
  }

  return (
    <KakaoContext.Provider value={loaded}>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`}
        strategy="afterInteractive"
        onLoad={() => {
          window.kakao.maps.load(() => setLoaded(true));
        }}
      />
      {children}
    </KakaoContext.Provider>
  );
}
