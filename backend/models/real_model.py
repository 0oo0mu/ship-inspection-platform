# models/real_model.py
# 단일 YOLOv8(23클래스) 모델로 추론합니다. (AIHub 579 재학습본, ONNX)
#
# 이전 버전의 "공정 분류기 + 공정별 탐지모델(5개)" 구조를 단일 모델 1개로 대체.
# - 탐지된 클래스가 곧 공정(용접/가공/설치/조립)을 의미하므로 별도 분류기가 불필요.
# - DUMMY_MODE=false 일 때 routers/inspection.py 에서 이 모듈을 사용합니다.

import os
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from schemas.inspection import InspectionResponse, DefectBox

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")
MODEL_PATH = os.path.join(WEIGHTS_DIR, "ship_defect.onnx")

# ── 23클래스 정의 (YOLO 인덱스 순서) → (코드, 한글, 공정) ──
CLASS_DEFS = [
    ("scratch",           "스크래치",        "machining"),
    ("cut_defect",        "절단 불량",       "machining"),
    ("surface_defect",    "표면 불량",       "machining"),
    ("machining_defect",  "가공 불량",       "installation"),
    ("step_gap",          "단차",            "installation"),
    ("duct_damage",       "덕트 손상",       "installation"),
    ("coating_defect",    "도장 불량",       "installation"),
    ("binding_defect",    "바인딩 불량",     "installation"),
    ("stiffener_defect",  "보강재 설치 불량", "installation"),
    ("insulation_damage", "보온재 손상",     "installation"),
    ("install_defect",    "설치 불량",       "installation"),
    ("connection_defect", "연결 불량",       "installation"),
    ("interface_defect",  "연계 처리 불량",  "installation"),
    ("cable_damage",      "케이블 손상",     "installation"),
    ("tape_defect",       "테이프 불량",     "installation"),
    ("sheetmetal_defect", "함석 처리 불량",  "installation"),
    ("porosity",          "기공",            "welding"),
    ("slag_inclusion",    "슬래그 혼입",     "welding"),
    ("undercut",          "언더컷",          "welding"),
    ("overlap",           "오버랩",          "welding"),
    ("lack_of_fusion",    "융합 불량",       "welding"),
    ("bolt_defect",       "볼트 체결 불량",  "assembly"),
    ("pipe_damage",       "파이프 손상",     "assembly"),
]
CODE  = [c[0] for c in CLASS_DEFS]
KR    = {c[0]: c[1] for c in CLASS_DEFS}
CAT   = [c[2] for c in CLASS_DEFS]          # yolo idx → 공정

CONF_THRESH = 0.35
IOU_THRESH  = 0.5

_session = None


def _get_session() -> ort.InferenceSession:
    global _session
    if _session is None:
        _session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    return _session


def _letterbox(image: Image.Image, size: int = 640):
    """가로세로 비율 유지하며 size×size 패딩 (YOLO 표준 전처리)"""
    img = image.convert("RGB")
    w, h = img.size
    scale = size / max(w, h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = img.resize((nw, nh))
    canvas = Image.new("RGB", (size, size), (114, 114, 114))
    pad_x, pad_y = (size - nw) // 2, (size - nh) // 2
    canvas.paste(resized, (pad_x, pad_y))
    return canvas, scale, pad_x, pad_y


def _iou(a: dict, b: dict) -> float:
    ax1, ay1 = a["cx"] - a["w"] / 2, a["cy"] - a["h"] / 2
    ax2, ay2 = a["cx"] + a["w"] / 2, a["cy"] + a["h"] / 2
    bx1, by1 = b["cx"] - b["w"] / 2, b["cy"] - b["h"] / 2
    bx2, by2 = b["cx"] + b["w"] / 2, b["cy"] + b["h"] / 2
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    union = a["w"] * a["h"] + b["w"] * b["h"] - inter
    return inter / union if union > 0 else 0.0


def _nms(boxes: list, iou_thresh: float = IOU_THRESH) -> list:
    boxes = sorted(boxes, key=lambda b: b["confidence"], reverse=True)
    keep = []
    while boxes:
        best = boxes.pop(0)
        keep.append(best)
        boxes = [b for b in boxes if _iou(best, b) < iou_thresh]
    return keep


def _calc_severity_and_action(confidence: float) -> tuple:
    if confidence >= 0.90:
        return "불합격", "작업자 육안검사 및 재작업이 필요합니다."
    elif confidence >= 0.75:
        return "재검사", "정밀 재검사를 권장합니다."
    else:
        return "주의", "경미한 의심 소견입니다. 작업 진행 가능하나 추후 모니터링하세요."


# 최대 표시 박스 수 (과도한 오버레이 방지)
MAX_BOXES = 20


def real_inspect(image: Image.Image) -> InspectionResponse:
    """단일 YOLOv8 23클래스 모델로 결함 탐지."""
    image = ImageOps.exif_transpose(image.convert("RGB"))  # 모바일 회전 보정
    img_w, img_h = image.size

    session = _get_session()
    canvas, scale, pad_x, pad_y = _letterbox(image, 640)
    arr = np.asarray(canvas).astype(np.float32) / 255.0
    arr = arr.transpose(2, 0, 1)[None]

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: arr})
    pred = outputs[0][0]            # (27, 8400)
    pred = pred.transpose(1, 0)     # (8400, 27)

    boxes_xywh   = pred[:, :4]
    class_scores = pred[:, 4:]      # (8400, 23)
    class_ids    = np.argmax(class_scores, axis=1)
    confidences  = np.max(class_scores, axis=1)

    # ── AI가 판별한 공정: 전체 최고 신뢰도 박스의 클래스 기준 (정상이어도 공정은 표시) ──
    top_idx  = int(np.argmax(confidences))
    category = CAT[class_ids[top_idx]]
    cat_conf = float(confidences[top_idx])

    # ── 임계값 이상 박스만 채택 ──
    keep_mask = confidences > CONF_THRESH
    dets = []
    for (cx, cy, w, h), cls_id, conf in zip(
        boxes_xywh[keep_mask], class_ids[keep_mask], confidences[keep_mask]
    ):
        ocx = (cx - pad_x) / scale
        ocy = (cy - pad_y) / scale
        ow, oh = w / scale, h / scale
        dets.append({
            "cx": ocx / img_w, "cy": ocy / img_h,
            "w": ow / img_w,  "h": oh / img_h,
            "class_id": int(cls_id), "confidence": float(conf),
        })
    dets = _nms(dets)[:MAX_BOXES]

    # ── 결함 없음 → 정상 ──
    if not dets:
        return InspectionResponse(
            result="normal",
            confidence=round(1.0 - cat_conf * 0.2, 3) if cat_conf else 0.95,
            inspection_category=category,
            category_confidence=round(cat_conf, 3),
            defect_type=None,
            defect_boxes=[],
            severity=None,
            recommended_action="정상 - 조치 불필요",
            message="정상 판정",
        )

    # ── 결함 있음 ──
    best = max(dets, key=lambda d: d["confidence"])
    defect_type = CODE[best["class_id"]]
    confidence  = best["confidence"]
    # 대표 공정: 결함 박스들 중 최고 신뢰도 박스의 공정
    category = CAT[best["class_id"]]
    severity, action = _calc_severity_and_action(confidence)

    boxes = [
        DefectBox(
            x=d["cx"], y=d["cy"], width=d["w"], height=d["h"],
            label=CODE[d["class_id"]],
            confidence=round(d["confidence"], 3),
        )
        for d in dets
    ]

    return InspectionResponse(
        result="defect",
        confidence=round(confidence, 3),
        inspection_category=category,
        category_confidence=round(cat_conf, 3),
        defect_type=defect_type,
        defect_boxes=boxes,
        severity=severity,
        recommended_action=action,
        message=f"불량 감지: {KR.get(defect_type, defect_type)}",
    )
