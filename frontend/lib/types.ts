// lib/types.ts
// 프로젝트 전체에서 사용하는 TypeScript 타입 정의

export type UserRole = "admin" | "inspector";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export type ShipStatus = "building" | "completed" | "delivered";

export interface Ship {
  id: string;
  name: string;
  ship_type: string;
  build_number: string;
  status: ShipStatus;
  created_at: string;
}

export type ProcessType = "용접" | "설치" | "조립" | "도장" | "기타";

export interface Block {
  id: string;
  ship_id: string;
  block_name: string;
  process_type: ProcessType;
  location_description: string;
  created_at: string;
  ship?: Ship; // 조인 시 사용
}

export type InspectionResult = "normal" | "defect";
export type InspectionStatus = "pending" | "rework_requested" | "completed";
export type DefectType = "crack" | "porosity" | "undercut" | "overlap" | "spatter" | "기타";

export interface Inspection {
  id: string;
  ship_id: string;
  block_id: string;
  user_id: string;
  image_url: string;
  result: InspectionResult;
  defect_type: DefectType | null;
  confidence: number;
  status: InspectionStatus;
  memo: string | null;
  created_at: string;
  ship?: Ship;   // 조인 시 사용
  block?: Block; // 조인 시 사용
}

export interface DefectLog {
  id: string;
  inspection_id: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  label: string;
  confidence: number;
}

// FastAPI AI 서버 응답 타입
export interface AIInspectionResult {
  result: InspectionResult;
  confidence: number;
  defect_type: DefectType | null;
  defect_boxes: DefectBox[];
}

export interface DefectBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}
