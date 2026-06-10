// lib/supabase-server.ts
// Supabase 클라이언트 - 서버 컴포넌트/미들웨어에서 사용
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // 서버 컴포넌트에서는 쿠키 쓰기가 불가하므로 try/catch로 무시
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 미들웨어에서 세션 갱신을 처리하므로 무시해도 됩니다.
          }
        },
      },
    }
  );
}
