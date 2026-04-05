# CLAUDE.md

## Project Overview

**estatelab** — 부동산 데이터 수집·분석·투자 플랫폼

아파트 실거래가, 전세가, 금리 동향 등 부동산 데이터를 수집하고,
갭투자 분석, 대출 시뮬레이션, 적정가 진단 등을 제공하는 서비스.
지도 기반 탐색 + 텔레그램 알림 + Google Analytics 연동.

## Technology Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: TailwindCSS 3 + shadcn/ui (New York style)
- **ORM**: Prisma 7
- **Database**: Neon (PostgreSQL, Vercel Marketplace)
- **Data Fetching**: SWR (클라이언트, 글로벌 fetcher), Prisma 직접 쿼리 (서버)
- **Charts**: recharts (금리, 시세, 거래량, 잔금 추이)
- **Map**: 카카오맵 SDK + VWORLD WFS API (건물 폴리곤, 행정구역 경계, 히트맵)
- **Auth**: NextAuth (Credentials, JWT)
- **Alert**: Telegram Bot API
- **Analytics**: Google Analytics 4
- **Toast**: Sonner
- **Test**: Vitest (48개 테스트)
- **Deploy**: Vercel (자동 배포, Cron Jobs)

## Project Structure

```
estatelab/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (GA, SessionProvider)
│   │   ├── page.tsx                      # / → /dashboard/map 리다이렉트
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── error.tsx
│   │   │   └── dashboard/
│   │   │       ├── map/                  # 지도 탐색 (메인)
│   │   │       ├── overview/             # 시장 개요
│   │   │       ├── apartments/           # 아파트 검색 + [id] 상세
│   │   │       ├── gap-invest/           # 갭투자 분석
│   │   │       ├── calculator/           # 대출 계산기
│   │   │       ├── compare/              # 단지 비교
│   │   │       ├── rates/                # 금리 동향
│   │   │       └── my/                   # 관심 단지
│   │   └── api/
│   │       ├── market/                   # 데이터 조회 (GET, 인증 없음)
│   │       │   ├── apartments/           # 통합 검색 + [id] 상세/비교/순위/학군/주변/전세
│   │       │   ├── map/                  # complexes, region-stats, dong-stats, region-boundaries
│   │       │   ├── gap-invest/           # 갭투자 분석
│   │       │   ├── summary/              # insights, monthly-volume, regions
│   │       │   ├── rates/                # 금리 현재 + 히스토리
│   │       │   ├── trades/               # 최근 거래
│   │       │   ├── regions/              # 지역 목록
│   │       │   └── building-polygon/     # VWORLD 건물 폴리곤 (삭제됨, 클라이언트 직접 호출)
│   │       ├── collect/                  # 데이터 수집 (POST, CRON_SECRET)
│   │       ├── cron/                     # 알림 (POST, CRON_SECRET)
│   │       │   ├── daily-report/         # 일일 리포트 + 관심 단지 알림
│   │       │   └── watchlist-alert/      # (daily-report에 통합됨)
│   │       ├── auth/                     # NextAuth + 회원가입 (rate limit)
│   │       └── user/                     # 관심 단지, 히스토리, 설정
│   ├── components/
│   │   ├── ui/                           # shadcn/ui (수정 금지)
│   │   ├── sidebar.tsx                   # 사이드바 네비게이션
│   │   ├── header.tsx                    # 헤더 (페이지 제목)
│   │   ├── mobile-bottom-nav.tsx         # 모바일 하단 탭바
│   │   ├── command-palette.tsx           # ⌘K 검색 (최근 검색어)
│   │   ├── google-analytics.tsx          # GA4 (페이지뷰 + 이벤트)
│   │   ├── swr-provider.tsx              # SWR 글로벌 설정 (에러 토스트)
│   │   ├── watchlist-button.tsx          # ♥ 관심 단지 (Undo 토스트)
│   │   ├── share-button.tsx              # 공유 (Web Share / 클립보드)
│   │   ├── compare-button.tsx            # 비교에 추가
│   │   ├── empty-state.tsx               # 빈 상태 공통 (아이콘+제목+CTA)
│   │   └── page-skeleton.tsx             # 로딩 스켈레톤 공통
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma 클라이언트 싱글톤
│   │   ├── constants.ts                  # 지역코드, 카테고리, 비아파트 필터
│   │   ├── format.ts                     # formatPrice, formatDate, priceColorClass
│   │   ├── apartment-search.ts           # 검색 쿼리 빌더 (통합검색, 한글정렬)
│   │   ├── investment.ts                 # 갭투자 시뮬레이션 계산
│   │   ├── mortgage.ts                   # 대출 상환 계산 (원리금균등/원금균등, DSR)
│   │   ├── calculations.ts              # pricePerPyeong, toPyeong
│   │   ├── public-data.ts               # 공공데이터 API (timeout + retry)
│   │   ├── telegram.ts                   # 텔레그램 전송 + 일일 리포트 빌더
│   │   ├── auth.ts                       # validateCronAuth (타이밍 공격 방지)
│   │   ├── api-client.ts                # 외부 API 공통 래퍼 (재시도, 로깅)
│   │   ├── api-handler.ts               # API route 에러 핸들러
│   │   ├── env.ts                        # 환경변수 관리
│   │   └── geocode.ts                    # 카카오 지오코딩
│   ├── types/
│   │   ├── trade.ts                      # 공통 타입 (Trade, MapComplex, ComplexDetail 등)
│   │   └── kakao.d.ts                    # 카카오맵 + services 타입
│   └── test/
│       └── setup.ts
├── scripts/
│   ├── bulk-collect.ts                   # 실거래가 수집 (순차)
│   ├── bulk-collect-fast.ts              # 실거래가 고속 수집 (메모리 캐시 + 병렬)
│   ├── bulk-collect-rents.ts             # 전월세 수집 (순차)
│   ├── bulk-collect-rents-fast.ts        # 전월세 고속 수집 (캐시 + 병렬 + 스킵)
│   ├── seed-regions.ts                   # 지역 시드 (160개 시군구)
│   └── geocode-complexes.ts             # 좌표 없는 단지 지오코딩
├── prisma/
│   └── schema.prisma
├── vercel.json                           # Cron Jobs 설정
└── .env.local

## Development Commands

```bash
npm run dev              # 개발 서버
npm run build            # 빌드
npm run lint             # ESLint
npm run type-check       # 타입 체크
npm run format           # 포맷
npm run test             # Vitest 전체 (48개)
npm run test:watch       # 변경 감지
npm run test:coverage    # 커버리지

npx prisma db push       # 스키마 → DB
npx prisma generate      # 클라이언트 생성

# 데이터 수집 (로컬)
npx tsx scripts/bulk-collect-fast.ts --months=60 --regions=seoul
npx tsx scripts/bulk-collect-rents-fast.ts --months=60 --regions=seoul
```

## Code Conventions

### General
- TypeScript strict mode
- 라이트 모드 only (dark 클래스 사용 금지)
- 한국어 주석 허용, 코드는 영어
- import alias: `@/` → `src/`
- `any` 타입 사용 금지, 최소한 `unknown`
- **최소 폰트 12px** — `text-[10px]`, `text-[11px]` 사용 금지 → `text-xs` 이상
- **CardContent 패딩 p-5 통일**
- 가격 색상은 `priceColorClass()` (format.ts) 사용
- 비아파트 필터는 `APARTMENT_FILTER` (constants.ts) 사용
- 인증 체크는 `validateCronAuth()` (auth.ts) 사용

### Naming
- 파일명: kebab-case
- 컴포넌트명: PascalCase
- 함수/변수: camelCase
- 상수: UPPER_SNAKE_CASE
- 타입/인터페이스: PascalCase
- 훅: `use` prefix

### Components
- shadcn/ui는 `@/components/ui/` (수정 금지)
- 커스텀 컴포넌트는 `@/components/`
- 페이지 전용은 `_components/`
- Server Component 기본, 필요 시에만 `'use client'`
- DB 쿼리 페이지는 `export const dynamic = 'force-dynamic'`

### API Routes
- `GET /api/market/*` — 인증 없음
- `POST /api/collect/*`, `POST /api/cron/*` — CRON_SECRET 필수 (`validateCronAuth`)
- 응답: `{ data: T }` 또는 `{ data: T, meta: { total, page } }`
- 에러: `{ error: string }` + HTTP 상태 코드

### Git
- prefix 필수: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `perf:`
- 한글로 간결하게
- 이슈: `[Epic N] 작업내용`

## Environment Variables

```env
# Neon
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=

# External APIs
PUBLIC_DATA_API_KEY=              # 공공데이터포털
KAKAO_REST_API_KEY=               # 카카오 지오코딩
NEXT_PUBLIC_KAKAO_APP_KEY=        # 카카오맵 JavaScript
NEXT_PUBLIC_VWORLD_API_KEY=       # VWORLD WFS (건물 폴리곤, 행정구역)
NEXT_PUBLIC_GA_ID=                # Google Analytics 4

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Design Principles

- 화이트 배경 + emerald 시그니처 컬러 (라이트 모드 only)
- 상승: 빨강, 하락: 파랑 (한국 부동산 컨벤션)
- 지도 마커: emerald 단일 컬러 (가격은 텍스트 크기로 구분)
- 구별 히트맵: 빨강(고가) / 주황(중가) / 파랑(저가)
- Pretendard 폰트 (CDN)
- 모바일: 하단 탭바 + safe-area-inset + 키보드 감지

## 주요 기능

### 지도 탐색
- 3단계 줌: 구별(서버 집계 30건) → 동별(서버 집계 200건+) → 단지별(bounds 기반)
- 면적 필터, 비교 모드, NEW 뱃지
- 건물 폴리곤 (VWORLD), 행정구역 경계, 구별 가격 히트맵
- 마커 포커스 효과 (선택 시 나머지 40% 투명)

### 아파트 상세
- 통계 카드, 지도, 매매가 추이 (recharts), 면적 비교, 층별 분석
- 적정가 진단 (주변 비교), 전세가율, 동네 순위, 주변시설
- 거래 내역 (면적 필터, 모바일 카드뷰)
- 대출 계산 링크, 비교에 추가, 공유

### 갭투자 분석
- 전세가율 기반 랭킹 + 리스크 등급
- 투자 시뮬레이션 (자기자본, 월이자, 수익률)

### 대출 계산기
- 월 상환액 최상단 강조, 슬라이더 + 프리셋
- DSR 경고, 잔금 추이 차트
- 내 예산 진단 → 아파트 검색 연결

### 알림
- 일일 리포트 (평일 18시 KST) + 관심 단지 신규 거래
- 텔레그램 전송

## Cron Jobs (vercel.json)

| 시간 (KST) | 주기 | 작업 |
|------------|------|------|
| 매월 16일 09:00~09:30 | 월 1회 ×7 | 실거래가 배치 수집 |
| 매주 월 10:00 | 주 1회 | 금리 수집 |
| 평일 18:00 | 매일 | 일일 리포트 + 관심 단지 알림 |

## 주의사항

- **`force-dynamic` 필수**: DB 쿼리 Server Component 페이지
- **날짜**: `toLocaleDateString()` 금지 → `formatDate()` 또는 `.slice(0,10)`
- **비아파트 필터**: `APARTMENT_FILTER` (Prisma) / `APARTMENT_SQL_FILTER` (SQL)
- **외부 API**: `fetchWithRetry` (public-data) 또는 `apiCall` (api-client) 사용
- **SWR**: 글로벌 fetcher (ok 체크 포함), 로컬 fetcher 정의 금지
- **폰트**: 최소 `text-xs` (12px), `text-[10px]`/`text-[11px]` 금지
- **VWORLD**: 클라이언트 직접 호출 (Referer 인증), 폴리곤 캐시 적용
