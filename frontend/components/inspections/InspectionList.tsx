"use client";
// components/inspections/InspectionList.tsx
// 검사 이력 목록 + 필터 + 테이블

import { useState, useMemo } from "react";
import Link from "next/link";
import { Ship, InspectionStatus } from "@/lib/types";
import {
  CheckCircle, AlertTriangle, Clock, Search,
  Filter, ChevronRight, RefreshCw, Wrench
} from "lucide-react";

// 결과 배지
const resultBadge = {
  normal: { label: "정상", icon: CheckCircle,  color: "text-green-600 bg-green-50 border-green-200" },
  defect: { label: "불량", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200"   },
};

// 재작업 상태 배지
const statusBadge: Record<InspectionStatus, { label: string; color: string }> = {
  pending:          { label: "대기",        color: "bg-slate-100 text-slate-500" },
  rework_requested: { label: "재작업 요청", color: "bg-amber-100 text-amber-700" },
  completed:        { label: "완료",        color: "bg-green-100 text-green-700" },
};

const defectTypeKr: Record<string, string> = {
  crack: "균열", porosity: "기공", undercut: "언더컷",
  overlap: "오버랩", spatter: "스패터",
};

interface Props {
  initialInspections: any[];
  ships: Ship[];
}

export default function InspectionList({ initialInspections, ships }: Props) {
  const [search,       setSearch]       = useState("");
  const [filterShip,   setFilterShip]   = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate,   setFilterDate]   = useState("");
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 10;

  // 필터 적용
  const filtered = useMemo(() => {
    return initialInspections.filter((ins) => {
      if (filterShip   !== "all" && ins.ship_id !== filterShip)     return false;
      if (filterResult !== "all" && ins.result  !== filterResult)   return false;
      if (filterStatus !== "all" && ins.status  !== filterStatus)   return false;
      if (filterDate) {
        const insDate = new Date(ins.created_at).toISOString().slice(0, 10);
        if (insDate !== filterDate) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const shipName  = (ins.ship?.name  ?? "").toLowerCase();
        const blockName = (ins.block?.block_name ?? "").toLowerCase();
        if (!shipName.includes(q) && !blockName.includes(q)) return false;
      }
      return true;
    });
  }, [initialInspections, filterShip, filterResult, filterStatus, filterDate, search]);

  // 페이지네이션
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setSearch(""); setFilterShip("all"); setFilterResult("all");
    setFilterStatus("all"); setFilterDate(""); setPage(1);
  }

  return (
    <div className="space-y-4">

      {/* 필터 바 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="선박명 또는 블록명 검색"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 필터 드롭다운 */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />

          {/* 선박 필터 */}
          <select
            value={filterShip}
            onChange={(e) => { setFilterShip(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">전체 선박</option>
            {ships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* 결과 필터 */}
          <select
            value={filterResult}
            onChange={(e) => { setFilterResult(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">전체 결과</option>
            <option value="normal">정상</option>
            <option value="defect">불량</option>
          </select>

          {/* 상태 필터 */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">전체 상태</option>
            <option value="pending">대기</option>
            <option value="rework_requested">재작업 요청</option>
            <option value="completed">완료</option>
          </select>

          {/* 날짜 필터 */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />

          {/* 초기화 */}
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />초기화
          </button>
        </div>
      </div>

      {/* 결과 수 */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>총 <strong className="text-slate-800">{filtered.length}</strong>건</span>
        {totalPages > 1 && (
          <span>{page} / {totalPages} 페이지</span>
        )}
      </div>

      {/* 테이블 */}
      {paged.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>검사 이력이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">날짜</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">선박 / 블록</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">결과</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">불량 유형</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">신뢰도</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">상태</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((ins) => {
                const rb = resultBadge[ins.result as "normal" | "defect"] ?? resultBadge.normal;
                const Icon = rb.icon;
                const sb = statusBadge[ins.status as InspectionStatus] ?? statusBadge.pending;
                return (
                  <tr key={ins.id} className="hover:bg-slate-50 transition-colors">
                    {/* 날짜 */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(ins.created_at).toLocaleDateString("ko-KR")}
                      <br />
                      <span className="text-xs text-slate-400">
                        {new Date(ins.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>

                    {/* 선박 / 블록 */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{ins.ship?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">
                        {ins.block?.block_name ?? "—"} · {ins.block?.process_type ?? "—"}
                      </p>
                    </td>

                    {/* 결과 배지 */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${rb.color}`}>
                        <Icon className="w-3 h-3" />
                        {rb.label}
                      </span>
                    </td>

                    {/* 불량 유형 */}
                    <td className="px-4 py-3 text-slate-600">
                      {ins.defect_type
                        ? defectTypeKr[ins.defect_type] ?? ins.defect_type
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* 신뢰도 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-full rounded-full ${ins.result === "defect" ? "bg-red-400" : "bg-green-400"}`}
                            style={{ width: `${(ins.confidence ?? 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {((ins.confidence ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* 재작업 상태 */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${sb.color}`}>
                        {sb.label}
                      </span>
                    </td>

                    {/* 상세 보기 */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/inspections/${ins.id}`}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        상세 <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                p === page
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
