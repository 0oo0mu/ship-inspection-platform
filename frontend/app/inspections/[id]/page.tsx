// app/inspections/[id]/page.tsx
// 검사 결과 상세 화면

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import InspectionDetail from "@/components/inspections/InspectionDetail";

export default async function InspectionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();

  const { data: inspection } = await supabase
    .from("inspections")
    .select("*, ship:ships(name, ship_type), block:blocks(block_name, process_type)")
    .eq("id", params.id)
    .single();

  if (!inspection) notFound();

  const { data: defectLogs } = await supabase
    .from("defect_logs")
    .select("*")
    .eq("inspection_id", params.id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">검사 결과 상세</h1>
        <p className="text-slate-500 text-sm mt-1">AI 분석 결과 및 불량 위치를 확인합니다.</p>
      </div>
      <InspectionDetail inspection={inspection} defectLogs={defectLogs ?? []} />
    </div>
  );
}
