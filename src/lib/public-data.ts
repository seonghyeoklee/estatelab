/**
 * 공공데이터포털 아파트매매 실거래가 API
 * https://www.data.go.kr — 국토교통부 아파트매매 실거래 상세 자료
 */

const API_BASE = 'http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev';

export interface RawTrade {
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  aptName: string;
  dong: string;
  jibun: string;
  bonbun: string;
  bubun: string;
  area: number;
  floor: number;
  price: number;
  buildYear: number;
  dealType: string | null;
  canceledAt: string | null;
  registeredAt: string | null;
  roadName: string | null;
  roadBonbun: string | null;
  roadBubun: string | null;
}

/**
 * 특정 지역+년월의 아파트 매매 실거래가를 조회합니다.
 */
export async function fetchApartmentTrades(
  lawdCd: string,
  dealYmd: string
): Promise<RawTrade[]> {
  const apiKey = (process.env.PUBLIC_DATA_API_KEY || '').replace(/^"|"$/g, '');
  if (!apiKey) throw new Error('PUBLIC_DATA_API_KEY 환경변수가 설정되지 않았습니다.');

  const url = new URL(`${API_BASE}/getRTMSDataSvcAptTradeDev`);
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('LAWD_CD', lawdCd);
  url.searchParams.set('DEAL_YMD', dealYmd);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '9999');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'EstateLab/1.0' },
  });
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);

  const text = await res.text();
  return parseTradeXml(text);
}

function parseTradeXml(xml: string): RawTrade[] {
  const items: RawTrade[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return m ? m[1].trim() : '';
    };

    const priceStr = get('dealAmount') || get('거래금액');
    const price = parseInt(priceStr.replace(/,/g, ''), 10);
    const area = parseFloat(get('excluUseAr') || get('전용면적'));
    const floor = parseInt(get('floor') || get('층'), 10);
    const dealYear = parseInt(get('dealYear') || get('년'), 10);
    const dealMonth = parseInt(get('dealMonth') || get('월'), 10);
    const dealDay = parseInt(get('dealDay') || get('일'), 10);

    if (!price || !area || isNaN(floor) || !dealYear) continue;

    items.push({
      dealYear,
      dealMonth,
      dealDay,
      aptName: get('aptNm') || get('아파트') || '미상',
      dong: get('umdNm') || get('법정동'),
      jibun: get('jibun') || get('지번'),
      bonbun: get('bonbun') || '',
      bubun: get('bubun') || '',
      area,
      floor,
      price,
      buildYear: parseInt(get('buildYear') || get('건축년도'), 10) || 0,
      dealType: get('dealingGbn') || get('거래유형') || null,
      canceledAt: get('cdealDay') || get('해제사유발생일') || null,
      registeredAt: get('rgstDate') || get('등기일자') || null,
      roadName: get('roadNm') || get('도로명') || null,
      roadBonbun: get('roadNmBonbun') || null,
      roadBubun: get('roadNmBubun') || null,
    });
  }

  return items;
}

/**
 * 완전한 도로명주소를 조합합니다.
 * 예: "압구정로42길 78" (도로명 + 건물번호)
 */
export function buildRoadAddress(
  roadName: string | null,
  roadBonbun: string | null,
  roadBubun: string | null
): string | null {
  if (!roadName) return null;
  const bonbun = parseInt(roadBonbun || '0', 10);
  const bubun = parseInt(roadBubun || '0', 10);
  if (!bonbun) return roadName;
  return bubun ? `${roadName} ${bonbun}-${bubun}` : `${roadName} ${bonbun}`;
}

/**
 * 완전한 지번주소를 조합합니다.
 * 예: "632" 또는 "632-1"
 */
export function buildJibunAddress(
  bonbun: string | null,
  bubun: string | null
): string {
  const bon = parseInt(bonbun || '0', 10);
  const bu = parseInt(bubun || '0', 10);
  if (!bon) return '';
  return bu ? `${bon}-${bu}` : `${bon}`;
}
