"use client";
// components/dashboard/StatsDashboard.tsx
// 통계 대시보드 - recharts 차트 4종 + 요약 카드

import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import {
  CheckCircle, AlertTriangle, Activity, TrendingUp, BarChart2
} from "lucide-react";
import { defectTypeKr, CATEGORY_LIST, categoryShortLabel } from "@/lib/inspectionMeta";

// ────────────────────────────────────────────────────────────
// 색상 팔레트
// ────────────────────────────────────────────────────────────
const COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────
interface Props {
  inspections: any[];
  ships: { id: string; name: string }[];
}

// ────────────────────────────────────────────────────────────
// 요약 카드
// ────────────────────────────────────────────────────────────
function StatCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────
export default function StatsDashboard({ inspections, ships }: Props) {
  const [selectedShip, setSelectedShip] = useState("all");
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  // 선박 필터 적용
  const filtered = useMemo(() => {
    if (selectedShip === "all") return inspections;
    return inspections.filter((ins) => ins.ship_id === selectedShip);
  }, [inspections, selectedShip]);

  // 기간 필터
  const now = Date.now();
  const periodFiltered = useMemo(() => {
    const cutoff = now - Number(period) * 24 * 60 * 60 * 1000;
    return filtered.filter((ins) => new Date(ins.created_at).getTime() >= cutoff);
  }, [filtered, period, now]);

  // ── 요약 통계 ──
  const total    = periodFiltered.length;
  const defects  = periodFiltered.filter((i) => i.result === "defect").length;
  const normals  = total - defects;
  const defectRate = total ? ((defects / total) * 100).toFixed(1) : "0.0";
  const avgConf  = total
    ? ((periodFiltered.reduce((s, i) => s + (i.confidence ?? 0), 0) / total) * 100).toFixed(1)
    : "0.0";

  // ── 1) 정상/불량 파이차트 ──
  const pieData = [
    { name: "정상", value: normals  },
    { name: "불량", value: defects  },
  ];
  const PIE_COLORS = ["#22c55e", "#ef4444"];

  // ── 2) 불량 유형 바차트 ──
  const defectTypeMap: Record<string, number> = {};
  periodFiltered.forEach((ins) => {
    if (ins.result === "defect" && ins.defect_type) {
      defectTypeMap[ins.defect_type] = (defectTypeMap[ins.defect_type] ?? 0) + 1;
    }
  });
  const defectTypeData = Object.entries(defectTypeMap).map(([key, cnt]) => ({
    name: defectTypeKr[key] ?? key,
    count: cnt,
  })).sort((a, b) => b.count - a.count);

  // ── 3) 일별 추이 라인차트 ──
  const dayMap: Record<string, { date: string; total: number; defect: number }> = {};
  periodFiltered.forEach((ins) => {
    const d = new Date(ins.created_at).toISOString().slice(0, 10);
    if (!dayMap[d]) dayMap[d] = { date: d, total: 0, defect: 0 };
    dayMap[d].total++;
    if (ins.result === "defect") dayMap[d].defect++;
  });
  const trendData = Object.values(dayMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date.slice(5), // MM-DD
      total: d.total,
      defect: d.defect,
    }));

  // ── 4) 선박별 불량 건수 바차트 ──
  const shipMap: Record<string, { name: string; total: number; defect: number }> = {};
  inspections.forEach((ins) => {
    const sid  = ins.ship_id;
    const sname = ins.ship?.name ?? sid;
    if (!shipMap[sid]) shipMap[sid] = { name: sname, total: 0, defect: 0 };
    shipMap[sid].total++;
    if (ins.result === "defect") shipMap[sid].defect++;
  });
  const shipData = Object.values(shipMap)
    .sort((a, b) => b.defect - a.defect)
    .slice(0, 8);

  return (
    <div className="space-y-6">

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl p-4">
        <div>
          <label className="text-xs text-slate-500 mr-2">선박</label>
          <select
            value={selectedShip}
            onChange={(e) => setSelectedShip(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            {ships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mr-2">기간</label>
          {(["7", "30", "90"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`text-xs px-3 py-1.5 rounded-lg border mr-1 transition-colors ${
                period === d
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="전체 검사"    value={total}       icon={Activity}      color="bg-blue-500"   />
        <StatCard title="불량 건수"    value={defects}     icon={AlertTriangle} color="bg-red-500"    sub={`불량률 ${defectRate}%`} />
        <StatCard title="정상 건수"    value={normals}     icon={CheckCircle}   color="bg-green-500"  />
        <StatCard title="평균 신뢰도"  value={`${avgConf}%`} icon={TrendingUp}  color="bg-purple-500" />
      </div>

      {/* 차트 2열 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. 정상/불량 파이차트 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            정상 / 불량 비율
          </h3>
          {total === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v}건`, ""]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2. 불량 유형 바차트 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            불량 유형별 건수
          </h3>
          {defectTypeData.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">불량 데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={defectTypeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [`${v}건`, "건수"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {defectTypeData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3. 일별 추이 라인차트 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            일별 검사 추이
          </h3>
          {trendData.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [`${v}건`, ""]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="전체"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="defect"
                  name="불량"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 4. 선박별 불량 건수 바차트 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            선박별 검사 현황
          </h3>
          {shipData.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={shipData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={45}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [`${v}건`, ""]} />
                <Legend />
                <Bar dataKey="total"  name="전체" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                <Bar dataKey="defect" name="불량" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
