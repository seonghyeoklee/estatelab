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
 * 비아파트 키워드 — 이름에 포함되면 필터링
 */
export const NON_APARTMENT_KEYWORDS = [
  '빌라', '연립', '다세대', '타운하우스', '오피스텔',
  '상가', '빌딩', '주택', '다가구', '원룸',
];

/**
 * Prisma where 조건 — 비아파트 제외
 */
export const APARTMENT_FILTER = {
  NOT: {
    OR: [
      { name: { startsWith: '(' } },
      ...NON_APARTMENT_KEYWORDS.map((kw) => ({ name: { contains: kw } })),
    ],
  },
};

/**
 * SQL WHERE 조건 — 비아파트 제외
 */
export const APARTMENT_SQL_FILTER = `
  AND c.name NOT LIKE '(%'
  AND c.name NOT LIKE '%빌라%'
  AND c.name NOT LIKE '%연립%'
  AND c.name NOT LIKE '%다세대%'
  AND c.name NOT LIKE '%타운하우스%'
  AND c.name NOT LIKE '%오피스텔%'
  AND c.name NOT LIKE '%상가%'
  AND c.name NOT LIKE '%빌딩%'
  AND c.name NOT LIKE '%주택%'
  AND c.name NOT LIKE '%다가구%'
  AND c.name NOT LIKE '%원룸%'
`;

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
