/**
 * 환경변수 중앙 관리
 * Vercel에서 따옴표로 감싸진 값 자동 처리
 */

/** 환경변수를 읽고 따옴표를 제거합니다. 없으면 빈 문자열 반환. */
export function env(key: string): string {
  return (process.env[key] || '').replace(/^"|"$/g, '');
}

/** 환경변수를 읽고 없으면 에러를 던집니다. */
export function envRequired(key: string): string {
  const value = env(key);
  if (!value) throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
  return value;
}
