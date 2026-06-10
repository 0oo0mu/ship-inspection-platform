# STEP 1 — Supabase 설정 가이드

---

## 1-1. Supabase 프로젝트 생성

1. https://supabase.com 접속 → **Start your project** 클릭
2. GitHub 계정으로 로그인 (GitHub 없으면 이메일로 가입)
3. **New project** 클릭
4. 아래와 같이 입력:

   | 항목 | 입력값 예시 |
   |------|------------|
   | Organization | 개인 계정 선택 |
   | Project name | `ship-inspection` |
   | Database Password | 기억할 수 있는 비밀번호 입력 |
   | Region | **Northeast Asia (Seoul)** 선택 |

5. **Create new project** 클릭 → 약 1~2분 대기

---

## 1-2. 환경변수 확인 (나중에 필요)

프로젝트 생성 후 왼쪽 메뉴 → **Project Settings** → **API** 탭에서 확인:

```
NEXT_PUBLIC_SUPABASE_URL     = https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...
```

> ⚠️ 이 두 값은 나중에 Next.js `.env.local` 파일에 붙여넣을 예정입니다.

---

## 1-3. DB 테이블 생성 SQL

왼쪽 메뉴 → **SQL Editor** → **New query** → 아래 SQL을 복사해서 붙여넣고 **Run** 클릭

```sql
-- =============================================
-- 1. users 테이블 (Supabase Auth와 연동)
-- =============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'inspector',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. ships 테이블 (선박 정보)
-- =============================================
CREATE TABLE public.ships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ship_type TEXT,
  build_number TEXT,
  status TEXT DEFAULT 'building',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. blocks 테이블 (블록 정보)
-- =============================================
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id UUID NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL,
  process_type TEXT,
  location_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. inspections 테이블 (검사 결과)
-- =============================================
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id UUID REFERENCES public.ships(id),
  block_id UUID REFERENCES public.blocks(id),
  user_id UUID REFERENCES public.users(id),
  image_url TEXT NOT NULL,
  result TEXT NOT NULL,
  defect_type TEXT,
  confidence FLOAT,
  status TEXT DEFAULT 'pending',
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. defect_logs 테이블 (불량 위치 - 2단계용)
-- =============================================
CREATE TABLE public.defect_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  bbox_x FLOAT,
  bbox_y FLOAT,
  bbox_width FLOAT,
  bbox_height FLOAT,
  label TEXT,
  confidence FLOAT
);
```

---

## 1-4. RLS (보안 정책) 설정

> **RLS란?** Row Level Security — 로그인한 사용자만 데이터를 볼 수 있게 하는 보안 설정

SQL Editor에서 아래 SQL을 **추가로** 실행:

```sql
-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_logs ENABLE ROW LEVEL SECURITY;

-- 로그인한 사용자라면 모든 데이터 읽기/쓰기 허용 (개발 단계 설정)
CREATE POLICY "Allow all for authenticated users" ON public.ships
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.blocks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.inspections
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON public.defect_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- users 테이블: 자기 자신의 데이터만 읽기/쓰기 허용
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

---

## 1-5. 신규 회원가입 시 users 테이블 자동 생성 (중요!)

Supabase Auth로 가입하면 `auth.users`에는 저장되지만, 우리가 만든 `public.users`에는 자동으로 안 들어갑니다.  
아래 **트리거**를 추가하면 가입할 때 자동으로 `public.users`에도 추가됩니다.

SQL Editor에서 실행:

```sql
-- 회원가입 자동 처리 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '사용자')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 연결 (가입 시 자동 실행)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 1-6. Storage 버킷 생성 (이미지 저장 공간)

1. 왼쪽 메뉴 → **Storage** → **New bucket** 클릭
2. 아래와 같이 설정:

   | 항목 | 값 |
   |------|-----|
   | Bucket name | `inspections` |
   | Public bucket | ✅ 체크 (이미지 URL로 접근 가능하게) |

3. **Save** 클릭

그 다음 **Policies** 탭 → **New policy** → `For full customization` 선택 후:

```sql
-- 로그인한 사용자는 이미지 업로드 가능
CREATE POLICY "Allow upload for authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspections');

-- 누구나 이미지 읽기 가능 (공개 이미지)
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inspections');
```

---

## 1-7. 확인 체크리스트

| 항목 | 완료 |
|------|------|
| Supabase 프로젝트 생성 | ☐ |
| URL, ANON_KEY 복사해 둠 | ☐ |
| 5개 테이블 생성 완료 | ☐ |
| RLS 정책 적용 | ☐ |
| 회원가입 자동 트리거 적용 | ☐ |
| Storage 버킷 `inspections` 생성 | ☐ |

---

## 다음은?

모두 완료되면 **"다음 2"** 를 입력하세요.  
→ Next.js 프로젝트 초기 세팅 + 로그인 화면 코드를 작성합니다.
