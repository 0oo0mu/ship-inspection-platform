"use client";
// components/blocks/BlockList.tsx
// 블록 목록 + 선박 필터 + 등록/수정/삭제 모달

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Block, Ship, ProcessType } from "@/lib/types";
import { Plus, Layers, Pencil, Trash2, X, Loader2, Filter } from "lucide-react";

const processTypes: ProcessType[] = ["용접", "설치", "조립", "도장", "기타"];

// 공정 유형별 배지 색상
const processColor: Record<ProcessType, string> = {
  "용접": "bg-orange-100 text-orange-700",
  "설치": "bg-blue-100 text-blue-700",
  "조립": "bg-purple-100 text-purple-700",
  "도장": "bg-green-100 text-green-700",
  "기타": "bg-slate-100 text-slate-600",
};

interface Props {
  initialBlocks: Block[];
  ships: Ship[];
}

export default function BlockList({ initialBlocks, ships }: Props) {
  const router   = useRouter();
  const supabase = createClient();

  const [blocks, setBlocks]         = useState<Block[]>(initialBlocks);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<Block | null>(null);
  const [loading, setLoading]       = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [filterShipId, setFilterShipId] = useState<string>("all");

  // 폼 상태
  const [form, setForm] = useState({
    ship_id: ships[0]?.id ?? "",
    block_name: "",
    process_type: "용접" as ProcessType,
    location_description: "",
  });

  // 선박 필터 적용
  const filteredBlocks = useMemo(() =>
    filterShipId === "all"
      ? blocks
      : blocks.filter((b) => b.ship_id === filterShipId),
    [blocks, filterShipId]
  );

  function openCreate() {
    setEditTarget(null);
    setForm({
      ship_id: ships[0]?.id ?? "",
      block_name: "",
      process_type: "용접",
      location_description: "",
    });
    setShowModal(true);
  }

  function openEdit(block: Block) {
    setEditTarget(block);
    setForm({
      ship_id: block.ship_id,
      block_name: block.block_name,
      process_type: block.process_type,
      location_description: block.location_description ?? "",
    });
    setShowModal(true);
  }

  // ── 등록 / 수정 ───────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ship_id) { alert("선박을 선택해 주세요."); return; }
    setLoading(true);

    if (editTarget) {
      const { data, error } = await supabase
        .from("blocks")
        .update(form)
        .eq("id", editTarget.id)
        .select("*, ship:ships(id, name)")
        .single();

      if (!error && data) {
        setBlocks((prev) => prev.map((b) => (b.id === data.id ? data as Block : b)));
      }
    } else {
      const { data, error } = await supabase
        .from("blocks")
        .insert(form)
        .select("*, ship:ships(id, name)")
        .single();

      if (!error && data) {
        setBlocks((prev) => [data as Block, ...prev]);
      }
    }

    setLoading(false);
    setShowModal(false);
    router.refresh();
  }

  // ── 삭제 ─────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("블록을 삭제하면 연결된 검사 데이터도 모두 삭제됩니다. 계속하시겠습니까?")) return;
    setDeleteId(id);
    const { error } = await supabase.from("blocks").delete().eq("id", id);
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    }
    setDeleteId(null);
  }

  // 선박명 찾기 헬퍼
  function getShipName(shipId: string) {
    return ships.find((s) => s.id === shipId)?.name ?? "알 수 없음";
  }

  return (
    <>
      {/* 상단 툴바 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        {/* 선박 필터 */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterShipId}
            onChange={(e) => setFilterShipId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">전체 선박</option>
            {ships.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreate}
          disabled={ships.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          블록 등록
        </button>
      </div>

      {/* 선박 없음 안내 */}
      {ships.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          먼저 <strong>선박 관리</strong>에서 선박을 등록해 주세요. 선박이 있어야 블록을 등록할 수 있습니다.
        </div>
      )}

      {/* 블록 카드 목록 */}
      {filteredBlocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Layers className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">등록된 블록이 없습니다</p>
          <p className="text-sm mt-1">위의 "블록 등록" 버튼을 눌러 블록을 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBlocks.map((block) => {
            const pColor = processColor[block.process_type] ?? processColor["기타"];
            return (
              <div key={block.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{block.block_name}</p>
                      {/* 조인된 선박명 */}
                      <p className="text-xs text-slate-400">
                        {(block.ship as any)?.name ?? getShipName(block.ship_id)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${pColor}`}>
                    {block.process_type}
                  </span>
                </div>

                {/* 위치 설명 */}
                {block.location_description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                    {block.location_description}
                  </p>
                )}

                {/* 등록일 */}
                <p className="text-xs text-slate-400 mb-3">
                  {new Date(block.created_at).toLocaleDateString("ko-KR")} 등록
                </p>

                {/* 버튼 */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(block)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />수정
                  </button>
                  <button
                    onClick={() => handleDelete(block.id)}
                    disabled={deleteId === block.id}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors ml-2"
                  >
                    {deleteId === block.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 등록/수정 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800">
                {editTarget ? "블록 정보 수정" : "신규 블록 등록"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 선박 선택 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  선박 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.ship_id}
                  onChange={(e) => setForm({ ...form, ship_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선박을 선택하세요</option>
                  {ships.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* 블록 명칭 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  블록 명칭 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.block_name}
                  onChange={(e) => setForm({ ...form, block_name: e.target.value })}
                  placeholder="예) A-101, B-202"
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 공정 유형 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">공정 유형</label>
                <select
                  value={form.process_type}
                  onChange={(e) => setForm({ ...form, process_type: e.target.value as ProcessType })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {processTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 위치 설명 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">위치 설명</label>
                <textarea
                  value={form.location_description}
                  onChange={(e) => setForm({ ...form, location_description: e.target.value })}
                  placeholder="예) 선수 좌현 상단부 용접 구간"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTarget ? "수정 완료" : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
