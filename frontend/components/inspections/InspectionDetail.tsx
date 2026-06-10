"use client";
// components/inspections/InspectionDetail.tsx
// 검사 결과 상세 카드 + 불량 위치 오버레이 + 재작업 상태 변경

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Inspection, DefectLog, InspectionStatus } from "@/lib/types";
import {
  CheckCircle, AlertTriangle, Anchor, Layers,
  Calendar, User, ChevronDown, Loader2
} from "lucide-react";

const defectTypeKr: Record<string, string> = {
  crack: "균열", porosity: "기공", undercut: "언더컷",
  overlap: "오버랩", spatter: "스패터",
};

const statusConfig: Record<InspectionStatus, { label: string; color: string }> = {
  pending:          { label: "대기",        color: "bg-slate-100 text-slate-600" },
  rework_requested: { label: "재작업 요청", color: "bg-amber-100 text-amber-700" },
  completed:        { label: "완료",        color: "bg-green-100 text-green-700" },
};

interface Props {
  inspection: any;
  defectLogs: DefectLog[];
}

export default function InspectionDetail({ inspection, defectLogs }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [status, setStatus]   = useState<InspectionStatus>(inspection.status);
  const [saving, setSaving]   = useState(false);
  const isDefect = inspection.result === "defect";

  async function handleStatusChange(newStatus: InspectionStatus) {
    setSaving(true);
    await supabase.from("inspections").update({ status: newStatus }).eq("id", inspection.id);
    setStatus(newStatus);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">

      {/* 판정 결과 배너 */}
      <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${
        isDefect ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
      }`}>
        {isDefect
          ? <AlertTriangle className="w-10 h-10 text-red-500 flex-shrink-0" />
          : <CheckCircle   className="w-10 h-10 text-green-500 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className={`text-xl font-bold ${isDefect ? "text-red-700" : "text-green-700"}`}>
            {isDefect ? "불량 감지" : "정상 판정"}
          </p>
          <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-600">
            <span>신뢰도: <strong>{(inspection.confidence * 100).toFixed(1)}%</strong></span>
            {isDefect && inspection.defect_type && (
              <span>불량 유형: <strong>{defectTypeKr[inspection.defect_type] ?? inspection.defect_type}</strong></span>
            )}
          </div>
        </div>

        {/* 재작업 상태 변경 */}
        <div className="flex-shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[status].color}`}>
            {statusConfig[status].label}
          </span>
        </div>
      </div>

      {/* 이미지 + 불량 박스 */}
      {inspection.image_url && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">검사 이미지</p>
          <div className="relative rounded-lg overflow-hidden bg-slate-100">
            <img
              src={inspection.image_url}
              alt="검사 이미지"
              className="w-full object-contain max-h-96"
            />
            {/* 불량 위치 박스 오버레이 */}
            {defectLogs.map((log, i) => (
              <div
                key={i}
                className="absolute border-2 border-red-500 bg-red-500/10"
                style={{
                  left:   `${(log.bbox_x - log.bbox_width  / 2) * 100}%`,
                  top:    `${(log.bbox_y - log.bbox_height / 2) * 100}%`,
                  width:  `${log.bbox_width  * 100}%`,
                  height: `${log.bbox_height * 100}%`,
                }}
              >
                <span className="absolute -top-5 left-0 text-xs bg-red-500 text-white px-1 py-0.5 rounded whitespace-nowrap">
                  {defectTypeKr[log.label] ?? log.label} {(log.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검사 정보 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Anchor className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">선박</p>
            <p className="text-sm font-medium text-slate-700">{inspection.ship?.name ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">블록 / 공정</p>
            <p className="text-sm font-medium text-slate-700">
              {inspection.block?.block_name ?? "—"} · {inspection.block?.process_type ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">검사 일시</p>
            <p className="text-sm font-medium text-slate-700">
              {new Date(inspection.created_at).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
        {inspection.memo && (
          <div className="col-span-2">
            <p className="text-xs text-slate-400 mb-1">메모</p>
            <p className="text-sm text-slate-700">{inspection.memo}</p>
          </div>
        )}
      </div>

      {/* 재작업 상태 변경 버튼 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-700 mb-3">재작업 상태 변경</p>
        <div className="flex gap-2">
          {(["pending", "rework_requested", "completed"] as InspectionStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={status === s || saving}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                status === s
                  ? `${statusConfig[s].color} border-transparent`
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {saving && status !== s ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* 뒤로가기 */}
      <button
        onClick={() => router.push("/inspections")}
        className="w-full py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium"
      >
        검사 이력 목록으로
      </button>
    </div>
  );
}
