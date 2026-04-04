/**
 * 지역 코드 상수
 */

export const SEOUL_CODES = [
  '11110', '11140', '11170', '11200', '11215', '11230', '11260', '11290',
  '11305', '11320', '11350', '11380', '11410', '11440', '11470', '11500',
  '11530', '11545', '11560', '11590', '11620', '11650', '11680', '11710', '11740',
];

export const BUCHEON_CODES = ['41192', '41194', '41196'];

export const GYEONGGI_CODES = [
  ...BUCHEON_CODES,
  '41117', '41135', '41173', '41190', '41285', '41465', '41570',
];

export const MAJOR_CODES = [
  ...SEOUL_CODES,
  ...GYEONGGI_CODES,
  '26350', '26260', // 부산
  '28185', '28260', // 인천
];

/**
 * 주변시설 카테고리
 */
export const NEARBY_CATEGORIES: Record<string, { label: string; color: string; border: string }> = {
  subway: { label: '지하철', color: '#2563eb', border: '#1d4ed8' },
  school: { label: '학교', color: '#d97706', border: '#b45309' },
  convenience: { label: '편의점', color: '#059669', border: '#047857' },
  mart: { label: '마트', color: '#7c3aed', border: '#6d28d9' },
  hospital: { label: '병원', color: '#dc2626', border: '#b91c1c' },
  cafe: { label: '카페', color: '#92400e', border: '#78350f' },
  bank: { label: '은행', color: '#0369a1', border: '#075985' },
};
