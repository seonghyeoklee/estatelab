import { KakaoMapProvider } from '@/components/kakao-map-provider';
import { TradeMap } from './_components/trade-map';

export default function MapPage() {
  return (
    <div className="flex h-[calc(100vh-56px-32px)] md:h-[calc(100vh-56px-48px)] flex-col gap-2 md:gap-4">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight">지도 탐색</h1>
        <p className="text-muted-foreground">지역별 아파트 실거래가를 지도에서 확인하세요.</p>
      </div>

      <div className="flex-1 min-h-0">
        <KakaoMapProvider>
          <TradeMap />
        </KakaoMapProvider>
      </div>
    </div>
  );
}
