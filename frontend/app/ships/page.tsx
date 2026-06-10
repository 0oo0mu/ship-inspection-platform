// app/ships/page.tsx
// 선박 목록 & 등록 화면 (서버 컴포넌트 + 클라이언트 모달)

import { createServerSupabaseClient } from "@/lib/supabase-server";
import ShipList from "@/components/ships/ShipList";
import { Ship as ShipType } from "@/lib/types";

export default async function ShipsPage() {
  const supabase = createServerSupabaseClient();

  const { data: ships, error } = await supabase
    .from("ships")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("선박 목록 조회 오류:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">선박 관리</h1>
        <p className="text-slate-500 text-sm mt-1">등록된 선박을 관리하고 신규 선박을 등록합니다.</p>
      </div>
      <ShipList initialShips={(ships as ShipType[]) ?? []} />
    </div>
  );
}
