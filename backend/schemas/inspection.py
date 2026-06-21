# schemas/inspection.py
# FastAPI 요청/응답 데이터 구조 정의 (Pydantic)

from pydantic import BaseModel
from typing import Optional, List


class DefectBox(BaseModel):
    """불량 위치 바운딩 박스"""
    x: float          # 중심 x 좌표 (0.0 ~ 1.0 비율)
    y: float          # 중심 y 좌표
    width: float      # 박스 너비 비율
    height: float     # 박스 높이 비율
    label: str        # 불량 유형
    confidence: float # 신뢰도


class InspectionResponse(BaseModel):
    """AI 분석 결과 응답"""
    result: str                        # "normal" | "defect"
    confidence: float                  # 신뢰도 (0.0 ~ 1.0)
    inspection_category: str           # "welding" | "surface" | "assembly" - AI가 자동 판별
    category_confidence: float = 1.0   # 검사종류 판별 신뢰도
    defect_type: Optional[str] = None  # 불량 유형 코드 (정상이면 null)
    defect_boxes: List[DefectBox] = [] # 불량 위치 박스들
    severity: Optional[str] = None     # "주의" | "재검사" | "불합격" (정상이면 null)
    recommended_action: str = ""       # 권장 조치 문구
    message: str = ""                  # 추가 메시지
