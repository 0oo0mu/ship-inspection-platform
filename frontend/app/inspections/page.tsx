// app/inspections/page.tsx
// 검사 이력 목록 - 서버에서 데이터 불러오기

import { createServerSupabaseClient } from "@/lib/supabase-server";
import InspectionList from "@/components/inspections/InspectionList";
import { Ship } from "@/lib/types";

export default async function InspectionsPage() {
  const supabase = createServerSupabaseClient();

  const [{ data: inspections }, { data: ships }] = await Promise.all([
    supabase
      .from("inspections")
      .select("*, ship:ships(id, name), block:blocks(block_name, process_type)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("ships")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">검사 이력</h1>
        <p className="text-slate-500 text-sm mt-1">
          선박·블록·날짜별로 검사 결과를 조회합니다.
        </p>
      </div>
      <InspectionList
        initialInspections={inspections ?? []}
        ships={(ships as Ship[]) ?? []}
      />
    </div>
  );
}
