# 검사 체계 확장 — Supabase DB 업그레이드

검사 종류(용접/표면/조립)와 심각도, 권장조치를 저장하기 위해 `inspections` 테이블에 컬럼을 추가합니다.

**Supabase 대시보드 → SQL Editor → New query**에서 아래 SQL을 실행하세요:

```sql
-- 검사 종류 (welding / surface / assembly)
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS inspection_category TEXT NOT NULL DEFAULT 'welding';

-- 심각도 (주의 / 재검사 / 불합격)
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS severity TEXT;

-- 권장 조치 문구
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS recommended_action TEXT;
```

실행 후 **Table Editor → inspections** 테이블에서 3개 컬럼이 추가됐는지 확인하세요.

> 기존에 저장된 검사 기록은 `inspection_category`가 자동으로 `welding`(용접)으로 채워지고, `severity`/`recommended_action`은 비어있는 상태(NULL)가 됩니다. 화면에서는 "—"로 표시되니 정상입니다.
