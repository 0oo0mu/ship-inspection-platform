// lib/inspectionMeta.ts
// 검사 공정(용접/가공/설치/조립) 및 불량 유형(23종) 공통 메타데이터
// InspectionForm, InspectionDetail, InspectionList, StatsDashboard 에서 공통 사용.
// v2: AIHub 579 재학습 단일 YOLO(23클래스) 기준.

export type InspectionCategory = "welding" | "machining" | "installation" | "assembly";

export const CATEGORY_LIST: InspectionCategory[] = ["welding", "machining", "installation", "assembly"];

export const categoryLabel: Record<InspectionCategory, string> = {
  welding: "용접부 검사",
  machining: "가공·표면 검사",
  installation: "설치 상태 검사",
  assembly: "조립 상태 검사",
};

export const categoryShortLabel: Record<InspectionCategory, string> = {
  welding: "용접",
  machining: "가공",
  installation: "설치",
  assembly: "조립",
};

export const categoryDescription: Record<InspectionCategory, string> = {
  welding: "기공, 슬래그 혼입, 언더컷, 오버랩, 융합 불량",
  machining: "스크래치, 절단 불량, 표면 불량",
  installation: "가공 불량, 단차, 덕트 손상, 도장 불량, 바인딩 불량, 보강재 설치 불량, 보온재 손상, 설치 불량, 연결 불량, 연계 처리 불량, 케이블 손상, 테이프 불량, 함석 처리 불량",
  assembly: "볼트 체결 불량, 파이프 손상",
};

export interface DefectOption {
  value: string;
  label: string;
}

export const defectTypesByCategory: Record<InspectionCategory, DefectOption[]> = {
  welding: [
    { value: "porosity", label: "기공" },
    { value: "slag_inclusion", label: "슬래그 혼입" },
    { value: "undercut", label: "언더컷" },
    { value: "overlap", label: "오버랩" },
    { value: "lack_of_fusion", label: "융합 불량" },
  ],
  machining: [
    { value: "scratch", label: "스크래치" },
    { value: "cut_defect", label: "절단 불량" },
    { value: "surface_defect", label: "표면 불량" },
  ],
  installation: [
    { value: "machining_defect", label: "가공 불량" },
    { value: "step_gap", label: "단차" },
    { value: "duct_damage", label: "덕트 손상" },
    { value: "coating_defect", label: "도장 불량" },
    { value: "binding_defect", label: "바인딩 불량" },
    { value: "stiffener_defect", label: "보강재 설치 불량" },
    { value: "insulation_damage", label: "보온재 손상" },
    { value: "install_defect", label: "설치 불량" },
    { value: "connection_defect", label: "연결 불량" },
    { value: "interface_defect", label: "연계 처리 불량" },
    { value: "cable_damage", label: "케이블 손상" },
    { value: "tape_defect", label: "테이프 불량" },
    { value: "sheetmetal_defect", label: "함석 처리 불량" },
  ],
  assembly: [
    { value: "bolt_defect", label: "볼트 체결 불량" },
    { value: "pipe_damage", label: "파이프 손상" },
  ],
};

// 전체 불량 코드 → 한국어 라벨 (공정 구분 없이 한번에 찾을 때)
export const defectTypeKr: Record<string, string> = Object.values(defectTypesByCategory)
  .flat()
  .reduce((acc, d) => ({ ...acc, [d.value]: d.label }), {} as Record<string, string>);

export type Severity = "주의" | "재검사" | "불합격";

export const severityColor: Record<Severity, string> = {
  "주의":   "text-amber-700 bg-amber-50 border-amber-200",
  "재검사": "text-orange-700 bg-orange-50 border-orange-200",
  "불합격": "text-red-700 bg-red-50 border-red-200",
};

export function getDefectLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return defectTypeKr[code] ?? code;
}
