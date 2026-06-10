// app/dashboard/page.tsx
// 대시보드 메인 화면 - 다음 단계에서 실제 데이터로 채울 예정

import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  Ship,
  Layers,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  // 각 테이블의 건수를 한번에 가져오기
  const [
    { count: shipCount },
    { count: blockCount },
    { count: totalCount },
    { count: defectCount },
  ] = await Promise.all([
    supabase.from("ships").select("*", { count: "exact", head: true }),
    supabase.from("blocks").select("*", { count: "exact", head: true }),
    supabase.from("inspections").select("*", { count: "exact", head: true }),
    supabase.from("inspections").select("*", { count: "exact", head: true }).eq("result", "defect"),
  ]);

  const defectRate =
    totalCount && totalCount > 0
      ? ((defectCount ?? 0) / totalCount * 100).toFixed(1)
      : "0.0";

  const stats = [
    {
      label: "등록된 선박",
      value: shipCount ?? 0,
      unit: "척",
      icon: Ship,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "등록된 블록",
      value: blockCount ?? 0,
      unit: "개",
      icon: Layers,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "전체 검사",
      value: totalCount ?? 0,
      unit: "건",
      icon: ClipboardCheck,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "불량률",
      value: defectRate,
      unit: "%",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
        <p className="text-slate-500 text-sm mt-1">AI 기반 선박 부품 품질검사 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-800">
                {value}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <p className="text-blue-800 font-medium text-sm">💡 시작하는 방법</p>
        <ol className="mt-2 text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>왼쪽 메뉴에서 <strong>선박 관리</strong>를 눌러 선박을 등록하세요.</li>
          <li><strong>블록 관리</strong>에서 해당 선박의 블록을 등록하세요.</li>
          <li><strong>검사 요청</strong>에서 이미지를 업로드하고 AI 분석을 시작하세요.</li>
        </ol>
      </div>
    </div>
  );
}
