// lib/inspectionMeta.ts
// 검사 종류(용접/표면/조립) 및 불량 유형 관련 공통 메타데이터
// InspectionForm, InspectionDetail, InspectionList, StatsDashboard 에서 공통으로 사용합니다.

export type InspectionCategory = "welding" | "surface" | "assembly";

export const CATEGORY_LIST: InspectionCategory[] = ["welding", "surface", "assembly"];

export const categoryLabel: Record<InspectionCategory, string> = {
  welding: "용접부 외관 검사",
  surface: "부품 표면 검사",
  assembly: "조립 상태 검사",
};

export const categoryShortLabel: Record<InspectionCategory, string> = {
  welding: "용접",
  surface: "표면",
  assembly: "조립",
};

export const categoryDescription: Record<InspectionCategory, string> = {
  welding: "균열, 언더컷, 오버랩, 비드 형상 불량, 용접 누락, 과도한 스패터",
  surface: "녹·부식, 긁힘, 찍힘·찌그러짐, 표면 박리, 오염",
  assembly: "볼트·너트 누락, 구멍 위치 불량, 부품 누락, 부품 방향 오류, 기준 형상 불일치",
};

export interface DefectOption {
  value: string;
  label: string;
}

export const defectTypesByCategory: Record<InspectionCategory, DefectOption[]> = {
  welding: [
    { value: "crack", label: "균열" },
    { value: "undercut", label: "언더컷" },
    { value: "overlap", label: "오버랩" },
    { value: "bead_defect", label: "비드 형상 불량" },
    { value: "weld_missing", label: "용접 누락" },
    { value: "spatter", label: "과도한 스패터" },
  ],
  surface: [
    { value: "rust", label: "녹·부식" },
    { value: "scratch", label: "긁힘" },
    { value: "dent", label: "찍힘·찌그러짐" },
    { value: "delamination", label: "표면 박리" },
    { value: "contamination", label: "오염" },
  ],
  assembly: [
    { value: "bolt_missing", label: "볼트·너트 누락" },
    { value: "hole_misalign", label: "구멍 위치 불량" },
    { value: "part_missing", label: "부품 누락" },
    { value: "wrong_orientation", label: "부품 방향 오류" },
    { value: "shape_mismatch", label: "기준 형상 불일치" },
  ],
};

// 전체 불량 유형 코드 → 한국어 라벨 (검사종류 구분 없이 한번에 찾을 때 사용)
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
