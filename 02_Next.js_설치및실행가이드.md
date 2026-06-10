# STEP 2 — Next.js 프로젝트 설치 및 실행 가이드

---

## 2-1. Node.js 설치 확인

터미널(명령 프롬프트 또는 PowerShell)에서:

```bash
node -v   # v18 이상이어야 합니다
npm -v
```

Node.js가 없다면 https://nodejs.org → LTS 버전 설치

---

## 2-2. 프로젝트 생성

```bash
# 1. 작업 폴더로 이동
cd "D:\AI\AI 기반 선박 부품 품질검사 웹 플랫폼"

# 2. Next.js 앱 생성 (이미 frontend 폴더가 있으므로 아래 명령 실행)
npx create-next-app@14.2.5 frontend-temp \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

# ※ 위 명령이 복잡하면 아래처럼 대화형으로 실행해도 됩니다
npx create-next-app@14.2.5 frontend-new
# 질문에 대해:
#   TypeScript? → Yes
#   ESLint?     → Yes
#   Tailwind?   → Yes
#   src dir?    → No
#   App Router? → Yes
#   import alias? → Yes (@/*)
```

> **주의:** 이미 제가 frontend 폴더에 파일을 만들어 두었으므로,
> 새로 생성한 폴더의 파일과 합쳐야 합니다. 아래 방법 중 하나 선택:
>
> **방법 A (쉬운 방법):** `frontend-new` 폴더에서 `npm install` 하고,
> 내가 만든 파일들(app/, components/, lib/, middleware.ts 등)을 복사해서 덮어씌우기
>
> **방법 B (권장):** 이미 만든 frontend 폴더에서 바로 의존성 설치

---

## 2-3. 의존성 설치

```bash
cd "D:\AI\AI 기반 선박 부품 품질검사 웹 플랫폼\frontend"
npm install
```

Supabase 패키지 추가 설치:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install lucide-react recharts clsx tailwind-merge
```

---

## 2-4. 환경변수 설정

```bash
# .env.local.example 파일을 복사해서 실제 파일 생성
copy .env.local.example .env.local
```

`.env.local` 파일을 열어서 실제 값 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=https://여기에실제URL입력.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc여기에실제키입력...
NEXT_PUBLIC_AI_API_URL=http://localhost:8000
```

> Supabase URL과 KEY는 STEP 1에서 확인한 값을 붙여넣으세요.

---

## 2-5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 자동으로 `/login` 화면으로 이동됩니다.

---

## 2-6. 현재 완성된 화면

| 화면 | 경로 | 상태 |
|------|------|------|
| 로그인/회원가입 | `/login` | ✅ 완성 |
| 대시보드 | `/dashboard` | ✅ 완성 (통계 카드) |
| 사이드바 | 공통 레이아웃 | ✅ 완성 |
| 헤더 | 공통 레이아웃 | ✅ 완성 |

---

## 2-7. 생성된 파일 구조

```
frontend/
├── app/
│   ├── globals.css           ← Tailwind 기본 스타일
│   ├── layout.tsx            ← 루트 레이아웃
│   ├── page.tsx              ← / → /dashboard 리디렉트
│   ├── login/
│   │   └── page.tsx          ← 로그인/회원가입 화면 ★
│   └── dashboard/
│       ├── layout.tsx        ← 사이드바+헤더 레이아웃 ★
│       └── page.tsx          ← 대시보드 메인 ★
│
├── components/
│   └── layout/
│       ├── Sidebar.tsx       ← 좌측 네비게이션 ★
│       └── Header.tsx        ← 상단 헤더 ★
│
├── lib/
│   ├── supabase.ts           ← 클라이언트용 Supabase ★
│   ├── supabase-server.ts    ← 서버용 Supabase ★
│   └── types.ts              ← TypeScript 타입 정의 ★
│
├── middleware.ts             ← 인증 보호 미들웨어 ★
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── .env.local                ← 직접 만들어야 함 (★ 중요!)
```

---

## 2-8. 자주 발생하는 오류

| 오류 | 원인 | 해결 |
|------|------|------|
| `supabaseUrl is required` | .env.local 파일 없음 | .env.local 파일 생성 후 값 입력 |
| `Module not found: @supabase/ssr` | 패키지 미설치 | `npm install @supabase/ssr` |
| 로그인 후 대시보드 안 보임 | RLS 정책 미적용 | STEP 1의 RLS SQL 실행 확인 |
| 이미지 깨짐 | next.config.ts 설정 | 파일 저장 후 재시작 |

---

## 다음은?

로그인 화면이 뜨고 회원가입이 된다면 **"다음 3"** 을 입력하세요.  
→ 선박 등록 & 목록 화면 코드를 작성합니다.
