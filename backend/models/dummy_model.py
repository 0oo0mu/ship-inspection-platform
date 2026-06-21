# models/dummy_model.py
# 더미 AI 모델 - 실제 학습 없이 랜덤 결과를 반환합니다.
# 검사 종류(용접/표면/조립)별로 다른 불량 유형 목록을 사용합니다.
# 나중에 실제 학습된 모델(welding/surface/assembly)로 교체 예정 (STEP 10)

import random
from PIL import Image
from schemas.inspection import InspectionResponse, DefectBox

# ── 검사 종류별 불량 유형 목록 ────────────────────────
DEFECT_TYPES_BY_CATEGORY = {
    "welding": ["crack", "undercut", "overlap", "bead_defect", "weld_missing", "spatter"],
    "surface": ["rust", "scratch", "dent", "delamination", "contamination"],
    "assembly": ["bolt_missing", "hole_misalign", "part_missing", "wrong_orientation", "shape_mismatch"],
}

# 불량 유형별 한국어 이름
DEFECT_TYPE_KR = {
    # 용접
    "crack": "균열", "undercut": "언더컷", "overlap": "오버랩",
    "bead_defect": "비드 형상 불량", "weld_missing": "용접 누락", "spatter": "과도한 스패터",
    # 표면
    "rust": "녹·부식", "scratch": "긁힘", "dent": "찍힘·찌그러짐",
    "delamination": "표면 박리", "contamination": "오염",
    # 조립
    "bolt_missing": "볼트·너트 누락", "hole_misalign": "구멍 위치 불량",
    "part_missing": "부품 누락", "wrong_orientation": "부품 방향 오류",
    "shape_mismatch": "기준 형상 불일치",
}


def _calc_severity_and_action(confidence: float) -> tuple[str, str]:
    """신뢰도 기반으로 심각도와 권장 조치를 규칙 기반으로 계산합니다."""
    if confidence >= 0.90:
        return "불합격", "작업자 육안검사 및 재작업이 필요합니다."
    elif confidence >= 0.75:
        return "재검사", "정밀 재검사를 권장합니다."
    else:
        return "주의", "경미한 의심 소견입니다. 작업 진행 가능하나 추후 모니터링하세요."


def dummy_inspect(image: Image.Image, category: str = "welding") -> InspectionResponse:
    """
    더미 AI 추론 함수
    - 실제 모델이 없어도 전체 시스템 흐름을 테스트할 수 있습니다.
    - DUMMY_MODE=true 일 때 사용됩니다.
    - category: "welding" | "surface" | "assembly"
    """
    defect_types = DEFECT_TYPES_BY_CATEGORY.get(category, DEFECT_TYPES_BY_CATEGORY["welding"])

    # 70% 확률로 불량 판정 (테스트 목적)
    is_defect = random.random() < 0.7

    if is_defect:
        defect_type = random.choice(defect_types)
        confidence  = round(random.uniform(0.70, 0.98), 3)
        severity, action = _calc_severity_and_action(confidence)

        # 더미 불량 위치 박스 1~2개 생성
        boxes = []
        for _ in range(random.randint(1, 2)):
            cx = round(random.uniform(0.2, 0.8), 3)
            cy = round(random.uniform(0.2, 0.8), 3)
            w  = round(random.uniform(0.08, 0.25), 3)
            h  = round(random.uniform(0.08, 0.20), 3)
            boxes.append(DefectBox(
                x=cx, y=cy,
                width=w, height=h,
                label=defect_type,
                confidence=round(random.uniform(0.65, 0.95), 3),
            ))

        return InspectionResponse(
            result="defect",
            confidence=confidence,
            defect_type=defect_type,
            defect_boxes=boxes,
            severity=severity,
            recommended_action=action,
            message=f"불량 감지: {DEFECT_TYPE_KR.get(defect_type, defect_type)}",
        )
    else:
        confidence = round(random.uniform(0.82, 0.99), 3)
        return InspectionResponse(
            result="normal",
            confidence=confidence,
            defect_type=None,
            defect_boxes=[],
            severity=None,
            recommended_action="정상 - 조치 불필요",
            message="정상 판정",
        )
