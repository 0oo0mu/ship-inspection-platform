// components/layout/ProtectedLayout.tsx
// 사이드바 + 헤더가 포함된 공통 레이아웃 (서버 컴포넌트)

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={user.email} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
