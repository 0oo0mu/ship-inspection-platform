// app/blocks/page.tsx
// 블록 목록 화면 - 선박 목록도 함께 불러와서 필터에 사용

import { createServerSupabaseClient } from "@/lib/supabase-server";
import BlockList from "@/components/blocks/BlockList";
import { Block, Ship } from "@/lib/types";

export default async function BlocksPage() {
  const supabase = createServerSupabaseClient();

  // 블록 목록 (선박 정보 조인)
  const { data: blocks } = await supabase
    .from("blocks")
    .select("*, ship:ships(id, name)")
    .order("created_at", { ascending: false });

  // 선박 목록 (등록 드롭다운용)
  const { data: ships } = await supabase
    .from("ships")
    .select("id, name, ship_type")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">블록 관리</h1>
        <p className="text-slate-500 text-sm mt-1">선박별 블록을 등록하고 공정 정보를 관리합니다.</p>
      </div>
      <BlockList
        initialBlocks={(blocks as Block[]) ?? []}
        ships={(ships as Ship[]) ?? []}
      />
    </div>
  );
}
