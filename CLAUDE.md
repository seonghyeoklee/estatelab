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
- **Charts**: recharts (산점도 + LOESS 시세 곡선, 금리, 잔금 추이)
- **Map**: 카카오맵 SDK + VWORLD WFS API (서버 프록시)
- **Auth**: NextAuth (Credentials, JWT)
- **Alert**: Telegram Bot API
- **Analytics**: Google Analytics 4 (dynamic import, useSyncExternalStore)
- **Toast**: Sonner
- **Test**: Vitest (48개 테스트)
- **Deploy**: Vercel (자동 배포, Cron Jobs)

## Project Structure

```
estatelab/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (GA dynamic import, SessionProvider)
│   │   ├── page.tsx                      # / → /dashboard/map 리다이렉트
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── error.tsx
│   │   │   └── dashboard/
│   │   │       ├── map/                  # 지도 탐색 (메인, 단지 상세 통합)
│   │   │       │   ├── page.tsx          # ?complex=id 파라미터로 단지 선택
│   │   │       │   └── _components/
│   │   │       │       ├── trade-map.tsx          # 메인 지도 + 마커 + 상세 패널
│   │   │       │       ├── complex-detail-panel.tsx # 단지 상세 (차트, 거래, 면적, 층별)
│   │   │       │       ├── price-chart.tsx        # 산점도 + LOESS 시세 곡선
│   │   │       │       ├── map-settings-panel.tsx # 지도 설정 (레이어 토글)
│   │   │       │       ├── use-vworld-layers.ts   # VWORLD 레이어 훅 (5종)
│   │   │       │       ├── map-search-bar.tsx     # 지도 내 검색
│   │   │       │       └── sido-tabs.tsx          # 시도 탭
│   │   │       ├── apartments/           # → /dashboard/map 리다이렉트 (통합됨)
│   │   │       ├── overview/             # 시장 개요
│   │   │       ├── gap-invest/           # 갭투자 분석
│   │   │       ├── calculator/           # 대출 계산기
│   │   │       ├── compare/              # 단지 비교
│   │   │       ├── rates/                # 금리 동향
│   │   │       └── my/                   # 관심 단지
│   │   └── api/
│   │       ├── market/                   # 데이터 조회 (GET, 인증 없음)
│   │       │   ├── apartments/           # [id] 상세/비교/순위/학군/주변/전세
│   │       │   ├── map/
│   │       │   │   ├── complexes/        # 단지 목록 (raw SQL, 좌표 그리드 스냅, CDN 캐시)
│   │       │   │   ├── region-stats/     # 구별 집계 (6개월)
│   │       │   │   ├── dong-stats/       # 동별 집계 (6개월)
│   │       │   │   ├── region-boundaries/ # 구 경계 폴리곤
│   │       │   │   └── vworld-proxy/     # VWORLD WFS 프록시 (CORS 우회)
│   │       │   ├── gap-invest/           # 갭투자 분석
│   │       │   ├── summary/              # insights, monthly-volume, regions
│   │       │   ├── rates/                # 금리 현재 + 히스토리
│   │       │   ├── trades/               # 최근 거래
│   │       │   └── regions/              # 지역 목록
│   │       ├── collect/                  # 데이터 수집 (POST, CRON_SECRET)
│   │       ├── cron/                     # 알림 (POST, CRON_SECRET)
│   │       │   ├── daily-report/         # 일일 리포트 + 관심 단지 알림
│   │       │   └── watchlist-alert/      # (daily-report에 통합됨)
│   │       ├── auth/                     # NextAuth + 회원가입 (rate limit)
│   │       └── user/                     # 관심 단지, 히스토리, 설정
│   ├── components/
│   │   ├── ui/                           # shadcn/ui (수정 금지) — switch 포함
│   │   ├── sidebar.tsx                   # 사이드바 네비게이션
│   │   ├── header.tsx                    # 헤더 (페이지 제목)
│   │   ├── mobile-bottom-nav.tsx         # 모바일 하단 탭바
│   │   ├── command-palette.tsx           # ⌘K 검색 (최근 검색어, /dashboard/map?complex=id)
│   │   ├── google-analytics.tsx          # GA4 (useSyncExternalStore, hydration-safe)
│   │   ├── swr-provider.tsx              # SWR 글로벌 설정 (에러 토스트)
│   │   ├── watchlist-button.tsx          # ♥ 관심 단지 (Undo 토스트)
│   │   ├── share-button.tsx              # 공유 (Web Share / 클립보드)
│   │   ├── compare-button.tsx            # 비교에 추가
│   │   ├── empty-state.tsx               # 빈 상태 공통 (아이콘+제목+CTA)
│   │   └── page-skeleton.tsx             # 로딩 스켈레톤 공통
│   ├── lib/
│   │   ├── prisma.ts                     # Prisma 클라이언트 싱글톤
│   │   ├── constants.ts                  # 지역코드 (서울25+경기44), 비아파트 필터
│   │   ├── format.ts                     # formatPrice (정확), formatPriceShort (마커용)
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
│   │   └── geocode.ts                    # 카카오 지오코딩 (키워드 검색 1순위)
│   ├── types/
│   │   ├── trade.ts                      # 공통 타입 (Trade, MapComplex, ComplexDetail 등)
│   │   └── kakao.d.ts                    # 카카오맵 + services 타입
│   └── test/
│       └── setup.ts
├── scripts/
│   ├── bulk-collect-fast.ts              # 실거래가 고속 수집 (--regions=seoul|seoul-gyeonggi|all)
│   ├── bulk-collect-rents-fast.ts        # 전월세 고속 수집
│   ├── bulk-collect.ts                   # 실거래가 수집 (순차)
│   ├── bulk-collect-rents.ts             # 전월세 수집 (순차)
│   ├── seed-regions.ts                   # 지역 시드 (163개 시군구)
│   └── geocode-complexes.ts             # 지오코딩 (--fix-duplicates 옵션)
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
npx tsx scripts/bulk-collect-fast.ts --months=60 --regions=seoul-gyeonggi
npx tsx scripts/bulk-collect-rents-fast.ts --months=60 --regions=seoul-gyeonggi
npx tsx scripts/geocode-complexes.ts --fix-duplicates   # 좌표 중복 보정
```

## Data Status

- **매매 거래**: ~385,000건 (서울 25구 + 경기 44개 시군구, 5년치)
- **단지**: ~10,400개
- **지역**: 163개 시군구 (서울/경기/부산/인천)
- **수집 기간**: 2021-04 ~ 2026-03

## Code Conventions

### General
- TypeScript strict mode
- 라이트 모드 only (dark 클래스 사용 금지)
- 한국어 주석 허용, 코드는 영어
- import alias: `@/` → `src/`
- `any` 타입 사용 금지, 최소한 `unknown`
- **최소 폰트 12px** — `text-[10px]`, `text-[11px]` 사용 금지 → `text-xs` 이상
- **CardContent 패딩 p-5 통일**
- 가격 표시: `formatPrice()` (정확), `formatPriceShort()` (마커/차트축)
- 비아파트 필터: `APARTMENT_FILTER` (Prisma) / `APARTMENT_SQL_FILTER` (SQL)
- 인증 체크: `validateCronAuth()` (auth.ts)

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
- **CDN 캐시**: `s-maxage=300, stale-while-revalidate=600` (빈 응답은 `no-store`)
- **지도 API**: raw SQL 집계, 좌표 0.01도 그리드 스냅, parameterized query

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
NEXT_PUBLIC_VWORLD_API_KEY=       # VWORLD WFS (서버 프록시 경유)
NEXT_PUBLIC_GA_ID=                # Google Analytics 4 (trim 처리)
VWORLD_API_KEY=                   # VWORLD 서버 사이드 (프록시용)

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Design Principles

- 화이트 배경 + emerald 시그니처 컬러 (라이트 모드 only)
- 상승: 빨강, 하락: 파랑 (한국 부동산 컨벤션)
- 지도 마커: emerald (기본 가격+면적, 호버 시 색 반전+상세 팝업)
- 구 경계: stroke만 (fill 없음, slate 색상)
- Pretendard 폰트 (CDN)
- 모바일: 하단 탭바 + safe-area-inset + 키보드 감지

## 주요 기능

### 지도 탐색
- 3단계 줌: 구별(서버 집계 30건) → 동별(서버 집계 200건+) → 단지별(bounds 기반)
- 면적 필터 (범위 기반: <60, 60~100, 100+), 비교 모드, NEW 뱃지
- 마커: 기본(가격+면적), 호버(색 반전+이름+가격범위+건수 팝업), 클릭(반전 유지)
- 단지 선택 시 URL ?complex=id 반영 (공유/북마크 가능)
- 건물 폴리곤 (VWORLD, 단지명 필터), 행정구역 경계 (구/동 자동)
- VWORLD 레이어 5종: 재개발, 학군, 그린벨트, 용도지역, 상권
- 지도 설정 패널 (Switch 토글, 우측 하단 ⚙️ 버튼)
- 줌 컨트롤 (+/- 원형 버튼)

### 단지 상세 (지도 패널 통합)
- 산점도 차트 + LOESS 시세 곡선 + 시세 밴드
- 최근 거래 내역 (차트 바로 아래)
- 면적별 비교 바 차트, 층별 가격 분석
- 적정가 진단 (주변 비교), 전세가율, 주변시설, 학군
- 관심 단지, 공유

### 갭투자 분석
- 전세가율 기반 랭킹 + 리스크 등급
- 투자 시뮬레이션 (자기자본, 월이자, 수익률)

### 대출 계산기
- 월 상환액 최상단 강조, 슬라이더 + 프리셋
- DSR 경고, 잔금 추이 차트
- 내 예산 진단 → 지도 검색 연결

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
- **VWORLD**: 서버 프록시 경유 (`/api/market/map/vworld-proxy`), 클라이언트 직접 호출 금지 (CORS)
- **가격 표시**: `formatPrice` (정확, "4억 7,500만"), `formatPriceShort` (짧게, "4.8억")
- **면적**: 반올림 금지, 실제 면적 그대로 표시 (59.98㎡)
- **지오코딩**: 키워드 검색 1순위 (같은 지번 다른 단지 구분)
- **CDN 캐시**: 빈 응답은 `no-store`, 유효 응답만 `s-maxage=300`
- **GA**: `useSyncExternalStore`로 hydration mismatch 방지
