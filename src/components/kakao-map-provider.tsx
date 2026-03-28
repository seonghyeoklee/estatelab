'use client';

import Script from 'next/script';
import { useState, createContext, useContext } from 'react';

interface KakaoContextValue {
  loaded: boolean;
  error: boolean;
}

const KakaoContext = createContext<KakaoContextValue>({ loaded: false, error: false });

export function useKakaoLoaded() {
  return useContext(KakaoContext).loaded;
}

export function useKakaoError() {
  return useContext(KakaoContext).error;
}

export function KakaoMapProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;

  if (!appKey) {
    return (
      <KakaoContext.Provider value={{ loaded: false, error: true }}>
        {children}
      </KakaoContext.Provider>
    );
  }

  return (
    <KakaoContext.Provider value={{ loaded, error }}>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`}
        strategy="afterInteractive"
        onLoad={() => {
          try {
            window.kakao.maps.load(() => setLoaded(true));
          } catch {
            setError(true);
          }
        }}
        onError={() => setError(true)}
      />
      {children}
    </KakaoContext.Provider>
  );
}
