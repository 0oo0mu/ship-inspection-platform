// app/inspections/new/page.tsx
// 검사 요청 페이지 - 선박/블록 선택 + 이미지 업로드 폼

import { createServerSupabaseClient } from "@/lib/supabase-server";
import InspectionForm from "@/components/inspections/InspectionForm";
import { Ship, Block } from "@/lib/types";

export default async function NewInspectionPage() {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: ships }, { data: blocks }] = await Promise.all([
    supabase.from("ships").select("id, name, ship_type").order("name"),
    supabase.from("blocks").select("id, ship_id, block_name, process_type").order("block_name"),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI 검사 요청</h1>
        <p className="text-slate-500 text-sm mt-1">
          검사할 선박·블록을 선택하고 이미지를 업로드하면 AI가 정상/불량을 판정합니다.
        </p>
      </div>
      <InspectionForm
        ships={(ships as Ship[]) ?? []}
        blocks={(blocks as Block[]) ?? []}
        userId={user?.id ?? ""}
      />
    </div>
  );
}
