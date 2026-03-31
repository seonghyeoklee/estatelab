import { describe, it, expect } from 'vitest';
import {
  parseSearchParams,
  buildSearchCondition,
  buildWhereClause,
  buildOrderBy,
  getRecentTradeDate,
} from '../apartment-search';

describe('parseSearchParams', () => {
  it('기본값으로 파싱한다', () => {
    const sp = new URLSearchParams();
    const result = parseSearchParams(sp);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sort).toBe('name');
    expect(result.q).toBeUndefined();
  });

  it('모든 파라미터를 올바르게 파싱한다', () => {
    const sp = new URLSearchParams({
      q: '래미안',
      regionCode: '11680',
      sido: '서울특별시',
      dong: '대치동',
      minPrice: '50000',
      maxPrice: '100000',
      minArea: '59',
      maxArea: '84',
      minYear: '2010',
      sort: 'trades',
      page: '3',
      limit: '10',
    });
    const result = parseSearchParams(sp);
    expect(result.q).toBe('래미안');
    expect(result.regionCode).toBe('11680');
    expect(result.dong).toBe('대치동');
    expect(result.minPrice).toBe(50000);
    expect(result.maxPrice).toBe(100000);
    expect(result.minArea).toBe(59);
    expect(result.maxArea).toBe(84);
    expect(result.minYear).toBe(2010);
    expect(result.sort).toBe('trades');
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('page는 최소 1이다', () => {
    const sp = new URLSearchParams({ page: '-5' });
    expect(parseSearchParams(sp).page).toBe(1);
  });

  it('limit는 최대 100이다', () => {
    const sp = new URLSearchParams({ limit: '999' });
    expect(parseSearchParams(sp).limit).toBe(100);
  });
});

describe('buildSearchCondition', () => {
  it('빈 문자열이면 빈 객체를 반환한다', () => {
    expect(buildSearchCondition('')).toEqual({});
    expect(buildSearchCondition('  ')).toEqual({});
  });

  it('단일 키워드는 OR 조건으로 변환한다', () => {
    const result = buildSearchCondition('래미안');
    expect(result).toHaveProperty('OR');
    const or = result.OR as unknown[];
    expect(or).toHaveLength(4);
    // 이름, 동, 도로명, 시군구
    expect(or[0]).toEqual({ name: { contains: '래미안', mode: 'insensitive' } });
    expect(or[1]).toEqual({ dong: { contains: '래미안', mode: 'insensitive' } });
    expect(or[2]).toEqual({ roadAddress: { contains: '래미안', mode: 'insensitive' } });
    expect(or[3]).toEqual({ region: { sigungu: { contains: '래미안', mode: 'insensitive' } } });
  });

  it('복합 키워드("강남 래미안")는 AND+OR 조건으로 변환한다', () => {
    const result = buildSearchCondition('강남 래미안');
    expect(result).toHaveProperty('AND');
    const and = result.AND as unknown[];
    expect(and).toHaveLength(2);
    // 각 파트가 OR 조건
    expect((and[0] as Record<string, unknown>).OR).toHaveLength(4);
    expect((and[1] as Record<string, unknown>).OR).toHaveLength(4);
  });

  it('3개 이상 키워드도 처리한다', () => {
    const result = buildSearchCondition('서울 강남 래미안');
    const and = result.AND as unknown[];
    expect(and).toHaveLength(3);
  });

  it('앞뒤 공백을 제거한다', () => {
    const result = buildSearchCondition('  래미안  ');
    expect(result).toHaveProperty('OR');
  });
});

describe('buildWhereClause', () => {
  it('기본 조건: 지번 제외 + 거래 있는 단지만', () => {
    const where = buildWhereClause({});
    expect(where.NOT).toEqual({ name: { startsWith: '(' } });
    expect(where.trades).toEqual({ some: {} });
  });

  it('regionCode 필터', () => {
    const where = buildWhereClause({ regionCode: '11680' });
    expect(where.regionCode).toBe('11680');
  });

  it('sido 필터 (regionCode 없을 때)', () => {
    const where = buildWhereClause({ sido: '서울특별시' });
    expect(where.region).toEqual({ sido: '서울특별시' });
  });

  it('regionCode가 sido보다 우선', () => {
    const where = buildWhereClause({ regionCode: '11680', sido: '서울특별시' });
    expect(where.regionCode).toBe('11680');
    // sido가 region을 덮어쓰면 안됨
    expect(where.region).toBeUndefined();
  });

  it('dong 필터', () => {
    const where = buildWhereClause({ dong: '대치동' });
    expect(where.dong).toBe('대치동');
  });

  it('검색어가 있으면 통합 검색 조건이 포함된다', () => {
    const where = buildWhereClause({ q: '래미안' });
    expect(where.OR).toBeDefined();
  });

  it('건축년도 필터', () => {
    const where = buildWhereClause({ minYear: 2015 });
    expect(where.builtYear).toEqual({ gte: 2015 });
  });

  it('가격 필터가 있으면 trades.some에 price 조건 추가', () => {
    const where = buildWhereClause({ minPrice: 50000, maxPrice: 100000 });
    expect(where.trades).toEqual({
      some: { price: { gte: 50000, lte: 100000 } },
    });
  });

  it('면적 필터', () => {
    const where = buildWhereClause({ minArea: 59, maxArea: 84 });
    expect(where.trades).toEqual({
      some: { area: { gte: 59, lte: 84 } },
    });
  });

  it('가격 + 면적 복합 필터', () => {
    const where = buildWhereClause({ minPrice: 50000, minArea: 59 });
    const trades = where.trades as Record<string, Record<string, unknown>>;
    expect(trades.some.price).toEqual({ gte: 50000 });
    expect(trades.some.area).toEqual({ gte: 59 });
  });

  it('모든 필터를 동시에 적용할 수 있다', () => {
    const where = buildWhereClause({
      q: '강남 래미안',
      regionCode: '11680',
      dong: '대치동',
      minPrice: 50000,
      maxPrice: 200000,
      minArea: 84,
      minYear: 2010,
    });
    expect(where.regionCode).toBe('11680');
    expect(where.dong).toBe('대치동');
    expect(where.AND).toBeDefined(); // 복합 검색
    expect(where.builtYear).toEqual({ gte: 2010 });
    expect(where.NOT).toBeDefined();
  });
});

describe('buildOrderBy', () => {
  it('기본값은 이름순', () => {
    expect(buildOrderBy('name')).toEqual({ name: 'asc' });
  });

  it('연식순', () => {
    expect(buildOrderBy('year')).toEqual({ builtYear: 'desc' });
  });

  it('거래수순', () => {
    expect(buildOrderBy('trades')).toEqual({ trades: { _count: 'desc' } });
  });

  it('알 수 없는 값은 이름순 기본값', () => {
    expect(buildOrderBy('unknown')).toEqual({ name: 'asc' });
  });
});

describe('getRecentTradeDate', () => {
  it('기본 30일 전 날짜를 반환한다', () => {
    const result = getRecentTradeDate();
    const expected = new Date();
    expected.setDate(expected.getDate() - 30);
    expected.setHours(0, 0, 0, 0);
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('커스텀 일수를 지원한다', () => {
    const result = getRecentTradeDate(7);
    const expected = new Date();
    expected.setDate(expected.getDate() - 7);
    expected.setHours(0, 0, 0, 0);
    expect(result.getTime()).toBe(expected.getTime());
  });
});
