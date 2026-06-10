// app/statistics/page.tsx
// 통계 대시보드 - 서버에서 전체 데이터 불러오기

import { createServerSupabaseClient } from "@/lib/supabase-server";
import StatsDashboard from "@/components/dashboard/StatsDashboard";

export default async function StatisticsPage() {
  const supabase = createServerSupabaseClient();

  const [
    { data: inspections },
    { data: ships },
  ] = await Promise.all([
    supabase
      .from("inspections")
      .select("id, result, defect_type, confidence, status, created_at, ship_id, ship:ships(name)")
      .order("created_at", { ascending: true }),
    supabase
      .from("ships")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">통계</h1>
        <p className="text-slate-500 text-sm mt-1">검사 결과 통계 및 불량 현황을 확인합니다.</p>
      </div>
      <StatsDashboard
        inspections={inspections ?? []}
        ships={ships ?? []}
      />
    </div>
  );
}
