/**
 * 공공데이터포털 아파트매매 실거래가 API
 * https://www.data.go.kr — 국토교통부 아파트매매 실거래 상세 자료
 */

const API_BASE = 'http://openapi.molit.go.kr/OpenAPI_ToolInstall/service/rest/RTMSOBJSvc';

export interface RawTrade {
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  dong: string;
  jibun: string;
  area: number; // 전용면적 (㎡)
  floor: number;
  price: number; // 만원
  buildYear: number;
  dealType: string | null;
  canceledAt: string | null;
  registeredAt: string | null;
  roadAddress: string | null;
}

/**
 * 특정 지역+년월의 아파트 매매 실거래가를 조회합니다.
 */
export async function fetchApartmentTrades(
  lawdCd: string,
  dealYmd: string
): Promise<RawTrade[]> {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) throw new Error('PUBLIC_DATA_API_KEY 환경변수가 설정되지 않았습니다.');

  const url = new URL(`${API_BASE}/getRTMSDataSvcAptTradeDev`);
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('LAWD_CD', lawdCd);
  url.searchParams.set('DEAL_YMD', dealYmd);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '9999');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);

  const text = await res.text();
  return parseTradeXml(text);
}

function parseTradeXml(xml: string): RawTrade[] {
  const items: RawTrade[] = [];

  // <item> 블록 추출
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m ? m[1].trim() : '';
    };

    const price = parseInt(get('거래금액').replace(/,/g, ''), 10);
    const area = parseFloat(get('전용면적'));
    const floor = parseInt(get('층'), 10);
    const dealYear = parseInt(get('년'), 10);
    const dealMonth = parseInt(get('월'), 10);
    const dealDay = parseInt(get('일'), 10);

    if (!price || !area || isNaN(floor) || !dealYear) continue;

    items.push({
      dealYear,
      dealMonth,
      dealDay,
      aptName: get('아파트') || get('단지명') || '미상',
      dong: get('법정동'),
      jibun: get('지번'),
      area,
      floor,
      price,
      buildYear: parseInt(get('건축년도'), 10) || 0,
      dealType: get('거래유형') || null,
      canceledAt: get('해제사유발생일') || null,
      registeredAt: get('등기일자') || null,
      roadAddress: get('도로명') || null,
    });
  }

  return items;
}
