# CLAUDE.md

## Project Overview

**estatelab** — 부동산 데이터 수집·분석·알림 플랫폼

아파트 실거래가, 전세가, 청약 정보, 금리 동향 등 부동산 전반의 데이터를 수집하고,
AI 기반 분석 결과를 웹 대시보드와 텔레그램으로 제공하는 서비스.

## Technology Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: TailwindCSS 3 + shadcn/ui (New York style)
- **ORM**: Prisma 7
- **Database**: Supabase (PostgreSQL)
- **Data Fetching**: SWR (클라이언트), Prisma 직접 쿼리 (서버)
- **AI**: Claude API
- **Alert**: Telegram Bot API
- **Toast**: Sonner
- **Deploy**: Vercel (자동 배포) + GitHub Actions (cron)

## Project Structure

```
estatelab/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # 랜딩 페이지
│   │   ├── globals.css
│   │   ├── (dashboard)/                  # 대시보드 레이아웃 그룹
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── market/                   # 데이터 조회 (GET, 인증 없음)
│   │       ├── collect/                  # 데이터 수집 (POST, CRON_SECRET 인증 필수)
│   │       └── cron/                     # 알림 (POST, CRON_SECRET 인증 필수)
│   ├── components/
│   │   └── ui/                           # shadcn/ui 컴포넌트 (수정 금지)
│   ├── lib/
│   │   ├── utils.ts                      # cn 등 공통 유틸
│   │   └── prisma.ts                     # Prisma 클라이언트 싱글톤
│   └── hooks/
│       └── use-mobile.ts                 # 모바일 뷰포트 감지
├── prisma/
│   └── schema.prisma                     # DB 스키마
├── .github/
│   └── workflows/                        # GitHub Actions (수집 + 알림 Cron)
├── vercel.json
├── CLAUDE.md
└── .env.local                            # 로컬 환경변수 (git 제외)
```

## Development Commands

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 린트
npm run lint

# 타입 체크
npm run type-check

# 포맷
npm run format

# 테스트
npm run test           # 전체
npm run test:watch     # 변경 감지
npm run test:coverage  # 커버리지

# Prisma
npx prisma db push        # 스키마 → DB 반영
npx prisma generate        # 클라이언트 생성
npx prisma studio          # DB GUI
```

## Code Conventions

### General
- TypeScript strict mode
- 라이트 모드 only (dark 클래스 사용 금지)
- 한국어 주석 허용, 코드(변수명, 함수명, 타입명)는 영어
- import alias: `@/` → `src/`
- 절대 경로 import 사용 (`@/lib/utils` O, `../../lib/utils` X)
- 사용하지 않는 import, 변수 금지 (ESLint로 체크)
- `any` 타입 사용 금지, 최소한 `unknown` 사용
- 비동기 함수는 에러 핸들링 필수 (try-catch 또는 .catch)

### Naming
- 파일명: kebab-case (`apartment-card.tsx`, `real-estate-api.ts`)
- 컴포넌트명: PascalCase (`ApartmentCard`)
- 함수/변수: camelCase (`fetchApartmentPrice`, `isLoading`)
- 상수: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRY_COUNT`)
- 타입/인터페이스: PascalCase (`ApartmentPrice`, `RegionOverview`)
- 훅: `use` prefix (`useApartmentData`, `useRegionSearch`)

### Components
- shadcn/ui 컴포넌트는 `@/components/ui/`에 위치 (수정 금지, 재생성으로 관리)
- 커스텀 컴포넌트는 `@/components/`에 위치
- 페이지 전용 컴포넌트는 해당 라우트 폴더의 `_components/`에 위치
- Server Component 기본, 클라이언트 필요 시에만 `'use client'` 선언
- DB 쿼리하는 Server Component 페이지는 반드시 `export const dynamic = 'force-dynamic'` 추가
- Props 타입은 컴포넌트 파일 상단에 정의

### API Routes
- `app/api/` 하위에 RESTful 구조
- 데이터 조회: `GET /api/market/*` (인증 없음)
- 데이터 수집: `POST /api/collect/*` (**CRON_SECRET Authorization 헤더 필수**)
- Cron/알림: `POST /api/cron/*` (**CRON_SECRET Authorization 헤더 필수**)
- 성공 응답: `{ data: T }` 또는 `{ data: T, meta: { total, page } }`
- 에러 응답: `{ error: string }` + 적절한 HTTP 상태 코드
- Prisma 쿼리는 Server Component 또는 API Route에서만 실행

### Git Workflow

작업 규모에 따라 세 가지 플로우로 구분한다.

| 케이스 | 플로우 |
|--------|--------|
| 기능 개발, 버그 수정, 리팩터링 | 이슈 → 브랜치 → PR → 머지 |
| 오타/주석/문서 등 trivial 수정 | main 직접 커밋 허용 |
| 핫픽스 (프로덕션 장애) | 이슈 생략 가능, `hotfix/` 브랜치 → PR |

- **main 직접 push는 trivial 수정에 한해서만 허용**
- 브랜치명: `feat/기능명`, `fix/버그명`, `chore/작업명`, `hotfix/내용`
- PR 생성 후 `gh pr merge {번호} --merge --delete-branch` 로 머지
- 머지 후 반드시 `git checkout main && git pull`

### Commit Convention
- prefix 필수: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- 한글로 간결하게 작성
- 예시:
  - `feat: 아파트 실거래가 대시보드 구현`
  - `fix: 공공데이터 API 파싱 오류 수정`
  - `chore: ESLint 규칙 보강`
  - `refactor: 데이터 수집 로직 공통 유틸로 분리`

### 이슈 규칙
- 로드맵 계획 이슈: `[Epic N] 작업내용`
- 즉석 버그/개선 이슈: 한글 설명
- 이슈 제목에 `feat:` / `fix:` 등 커밋 prefix 사용 금지

### PR 규칙
- PR 제목: prefix + 작업 내용 (70자 이내)
- PR 본문 형식:
  ```
  ## Summary
  - 변경 사항 요약 (1~3줄)

  ## Changes
  - 구체적 변경 내용 리스트

  ## Test
  - 테스트 방법 또는 확인 사항

  Closes #이슈번호
  ```
- 1 PR = 1개 기능 단위
- `npm run build` 통과 필수 (CI 실패 PR 머지 금지)

## Environment Variables

```env
# Supabase
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=

# AI
ANTHROPIC_API_KEY=
```

## Design Principles

- 화이트 배경 + 시그니처 컬러 (라이트 모드 only)
- 시그니처 컬러: teal 계열 (hsl 168 70% 40%)
- shadcn/ui + TailwindCSS 기반
- 반응형 (모바일 사이드바 → 드로어)
- 상승: 빨강, 하락: 파랑 (한국 부동산 컨벤션)
- Pretendard 폰트 (CDN)

## 주의사항

- **`force-dynamic` 필수**: DB 쿼리하는 Server Component 페이지에 추가하지 않으면 빌드 시 정적 렌더링 시도로 오류 발생
- **Vercel Hobby 10초 타임아웃**: 대량 수집은 로컬 실행 또는 GitHub Actions 사용
- **SWR `fallbackData`**: SSR 초기값 전달 시 `null` 필터링 후 전달 (타입 오류 방지)
- **날짜 직렬화**: `toLocaleDateString()` 사용 금지 (hydration mismatch) → `toISOString().slice(0,10)` 사용
- **collect 인증**: 모든 `/api/collect/*` 엔드포인트는 `Authorization: Bearer {CRON_SECRET}` 필수
