# models/dummy_model.py
# 더미 AI 모델 - 실제 학습 없이 랜덤 결과를 반환합니다.
# 나중에 실제 EfficientNet 또는 YOLO 모델로 교체 예정

import random
from PIL import Image
from schemas.inspection import InspectionResponse, DefectBox

# 가능한 불량 유형 목록
DEFECT_TYPES = ["crack", "porosity", "undercut", "overlap", "spatter"]

# 불량 유형별 한국어 이름
DEFECT_TYPE_KR = {
    "crack":    "균열",
    "porosity": "기공",
    "undercut": "언더컷",
    "overlap":  "오버랩",
    "spatter":  "스패터",
}


def dummy_inspect(image: Image.Image) -> InspectionResponse:
    """
    더미 AI 추론 함수
    - 실제 모델이 없어도 전체 시스템 흐름을 테스트할 수 있습니다.
    - DUMMY_MODE=true 일 때 사용됩니다.
    - 나중에 실제 모델(EfficientNet/YOLO)로 교체하면 됩니다.
    """

    # 70% 확률로 불량 판정 (테스트 목적)
    is_defect = random.random() < 0.7

    if is_defect:
        defect_type = random.choice(DEFECT_TYPES)
        confidence  = round(random.uniform(0.70, 0.98), 3)

        # 더미 불량 위치 박스 1~2개 생성
        boxes = []
        for _ in range(random.randint(1, 2)):
            # 이미지 내 랜덤 위치에 박스 생성 (0~1 비율)
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
            message=f"불량 감지: {DEFECT_TYPE_KR.get(defect_type, defect_type)}",
        )
    else:
        confidence = round(random.uniform(0.82, 0.99), 3)
        return InspectionResponse(
            result="normal",
            confidence=confidence,
            defect_type=None,
            defect_boxes=[],
            message="정상 판정",
        )
