"use client";
// components/ships/ShipList.tsx
// 선박 목록 + 등록 모달을 담은 클라이언트 컴포넌트

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Ship as ShipType, ShipStatus } from "@/lib/types";
import { Plus, Anchor, Pencil, Trash2, X, Loader2 } from "lucide-react";

// 상태 배지 색상
const statusConfig: Record<ShipStatus, { label: string; color: string }> = {
  building:  { label: "건조 중",  color: "bg-blue-100 text-blue-700" },
  completed: { label: "건조 완료", color: "bg-green-100 text-green-700" },
  delivered: { label: "인도 완료", color: "bg-slate-100 text-slate-600" },
};

const shipTypes = ["컨테이너선", "탱커", "벌크선", "LNG선", "크루즈선", "군함", "기타"];

interface Props {
  initialShips: ShipType[];
}

export default function ShipList({ initialShips }: Props) {
  const router  = useRouter();
  const supabase = createClient();

  const [ships, setShips]         = useState<ShipType[]>(initialShips);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ShipType | null>(null);
  const [loading, setLoading]     = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  // 폼 상태
  const [form, setForm] = useState({
    name: "",
    ship_type: "컨테이너선",
    build_number: "",
    status: "building" as ShipStatus,
  });

  function openCreate() {
    setEditTarget(null);
    setForm({ name: "", ship_type: "컨테이너선", build_number: "", status: "building" });
    setShowModal(true);
  }

  function openEdit(ship: ShipType) {
    setEditTarget(ship);
    setForm({
      name: ship.name,
      ship_type: ship.ship_type,
      build_number: ship.build_number,
      status: ship.status,
    });
    setShowModal(true);
  }

  // ── 등록 / 수정 ───────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (editTarget) {
      // 수정
      const { data, error } = await supabase
        .from("ships")
        .update(form)
        .eq("id", editTarget.id)
        .select()
        .single();

      if (!error && data) {
        setShips((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      }
    } else {
      // 신규 등록
      const { data, error } = await supabase
        .from("ships")
        .insert(form)
        .select()
        .single();

      if (!error && data) {
        setShips((prev) => [data, ...prev]);
      }
    }

    setLoading(false);
    setShowModal(false);
    router.refresh();
  }

  // ── 삭제 ─────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("선박을 삭제하면 연결된 블록과 검사 데이터도 모두 삭제됩니다. 계속하시겠습니까?")) return;
    setDeleteId(id);
    await supabase.from("ships").delete().eq("id", id);
    setShips((prev) => prev.filter((s) => s.id !== id));
    setDeleteId(null);
  }

  return (
    <>
      {/* 상단 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          선박 등록
        </button>
      </div>

      {/* 선박 카드 목록 */}
      {ships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Anchor className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">등록된 선박이 없습니다</p>
          <p className="text-sm mt-1">위의 "선박 등록" 버튼을 눌러 선박을 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ships.map((ship) => {
            const st = statusConfig[ship.status] ?? statusConfig.building;
            return (
              <div key={ship.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* 헤더 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Anchor className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{ship.name}</p>
                      <p className="text-xs text-slate-400">{ship.ship_type}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>
                    {st.label}
                  </span>
                </div>

                {/* 건조 번호 */}
                <div className="text-sm text-slate-500 mb-4">
                  건조번호: <span className="font-medium text-slate-700">{ship.build_number || "—"}</span>
                </div>

                {/* 하단 버튼 */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(ship)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(ship.id)}
                    disabled={deleteId === ship.id}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors ml-2"
                  >
                    {deleteId === ship.id
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
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800">
                {editTarget ? "선박 정보 수정" : "신규 선박 등록"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 선박명 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  선박명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예) 현대 드림호"
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 선박 유형 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">선박 유형</label>
                <select
                  value={form.ship_type}
                  onChange={(e) => setForm({ ...form, ship_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {shipTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 건조 번호 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">건조 번호</label>
                <input
                  type="text"
                  value={form.build_number}
                  onChange={(e) => setForm({ ...form, build_number: e.target.value })}
                  placeholder="예) HHI-2025-001"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 상태 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">건조 상태</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ShipStatus })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="building">건조 중</option>
                  <option value="completed">건조 완료</option>
                  <option value="delivered">인도 완료</option>
                </select>
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
