/** 거래 내역 */
export interface Trade {
  id: string;
  dealDate: string;
  area: number;
  floor: number;
  price: number;
  pricePerPyeong: number | null;
  dealType: string | null;
}

/** 거래 내역 + 단지 정보 */
export interface TradeWithComplex extends Trade {
  complex: {
    name: string;
    dong: string;
    regionCode: string;
  };
}

/** 면적별 통계 */
export interface AreaGroup {
  area: number;
  count: number;
  avgPrice: number;
  avgPricePerPyeong: number;
}

/** 단지 (지도용) */
export interface MapComplex {
  id: string;
  name: string;
  dong: string;
  regionCode: string;
  lat: number | null;
  lng: number | null;
  _count: { trades: number };
  avgPrice: number;
  avgPricePerPyeong: number;
  latestDealDate: string | null;
}

/** 좌표가 있는 단지 (non-null) */
export interface MapComplexWithCoords extends MapComplex {
  lat: number;
  lng: number;
}

/** 지역 */
export interface Region {
  code: string;
  sido: string;
  sigungu: string;
}

/** 금리 */
export interface Rate {
  name: string;
  nameKr: string;
  date: string;
  rate: number;
  change: number;
}
