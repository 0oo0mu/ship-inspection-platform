# models/real_model.py
# 실제 학습된 AI 모델로 추론합니다 (Colab에서 학습 → ONNX로 변환한 4개 모델 사용)
#
# 처리 순서:
#   1) category.onnx   → 사진이 용접/표면/조립 중 무엇인지 판별
#   2) welding/surface/assembly.onnx (YOLOv8) → 판별된 도메인의 불량 위치를 탐지
#      탐지된 박스가 없으면(또는 전부 "정상" 클래스면) → 정상 판정
#
# DUMMY_MODE=false 일 때 routers/inspection.py 에서 이 모듈을 사용합니다.

import os
import numpy as np
import onnxruntime as ort
from PIL import Image

from schemas.inspection import InspectionResponse, DefectBox

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")

CATEGORY_CLASSES = ["welding", "surface", "assembly"]

# ── YOLO 클래스 인덱스 → 우리 시스템의 defect_type 코드 매핑 ──
# None 으로 매핑된 클래스는 "정상"을 의미합니다 (불량으로 집계하지 않음).
WELDING_CLASS_MAP = {
    0: "bead_defect",  # Bad Weld
    1: None,            # Good Weld → 정상
    2: "weld_missing",  # Defect
}
SURFACE_CLASS_MAP = {
    0: "delamination",  # crazing
    1: "contamination",  # inclusion
    2: "contamination",  # patches
    3: "dent",            # pitted surface
    4: "rust",             # rolled-in scale
    5: "scratch",          # scratches
}
# 조립 데이터셋 클래스(B1~B6)는 볼트 위치별 코드라서, 5가지 조립 불량 유형에 순서대로 매핑합니다.
ASSEMBLY_CLASS_MAP = {
    0: "bolt_missing",
    1: "hole_misalign",
    2: "part_missing",
    3: "wrong_orientation",
    4: "shape_mismatch",
    5: "bolt_missing",
}

CLASS_MAPS = {
    "welding": WELDING_CLASS_MAP,
    "surface": SURFACE_CLASS_MAP,
    "assembly": ASSEMBLY_CLASS_MAP,
}

DEFECT_TYPE_KR = {
    "bead_defect": "비드 형상 불량", "weld_missing": "용접 누락",
    "crack": "균열", "undercut": "언더컷", "overlap": "오버랩", "spatter": "과도한 스패터",
    "rust": "녹·부식", "scratch": "긁힘", "dent": "찍힘·찌그러짐",
    "delamination": "표면 박리", "contamination": "오염",
    "bolt_missing": "볼트·너트 누락", "hole_misalign": "구멍 위치 불량",
    "part_missing": "부품 누락", "wrong_orientation": "부품 방향 오류", "shape_mismatch": "기준 형상 불일치",
}

CONF_THRESH = 0.35
IOU_THRESH = 0.5

_sessions: dict[str, ort.InferenceSession] = {}


def _get_session(name: str) -> ort.InferenceSession:
    if name not in _sessions:
        path = os.path.join(WEIGHTS_DIR, f"{name}.onnx")
        _sessions[name] = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    return _sessions[name]


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()


def _classify_category(image: Image.Image) -> tuple[str, float]:
    """category.onnx로 용접/표면/조립 판별"""
    session = _get_session("category")
    img = image.convert("RGB").resize((224, 224))
    arr = np.asarray(img).astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    arr = (arr - mean) / std
    arr = arr.transpose(2, 0, 1)[None].astype(np.float32)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: arr})
    logits = outputs[0][0]
    probs = _softmax(logits)
    idx = int(np.argmax(probs))
    return CATEGORY_CLASSES[idx], float(probs[idx])


def _letterbox(image: Image.Image, size: int = 640):
    """가로세로 비율을 유지하면서 size x size 정사각형으로 패딩 (YOLO 표준 전처리)"""
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


def _run_yolo(category: str, image: Image.Image) -> list:
    """YOLOv8 onnx 모델 실행 → 0~1 비율 좌표의 박스 리스트 반환"""
    session = _get_session(category)
    canvas, scale, pad_x, pad_y = _letterbox(image, 640)
    arr = np.asarray(canvas).astype(np.float32) / 255.0
    arr = arr.transpose(2, 0, 1)[None]

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: arr})
    pred = outputs[0][0]            # (4+num_classes, 8400)
    pred = pred.transpose(1, 0)     # (8400, 4+num_classes)

    boxes_xywh = pred[:, :4]
    class_scores = pred[:, 4:]
    class_ids = np.argmax(class_scores, axis=1)
    confidences = np.max(class_scores, axis=1)

    keep_mask = confidences > CONF_THRESH
    results = []
    img_w, img_h = image.size
    for (cx, cy, w, h), cls_id, conf in zip(boxes_xywh[keep_mask], class_ids[keep_mask], confidences[keep_mask]):
        orig_cx = (cx - pad_x) / scale
        orig_cy = (cy - pad_y) / scale
        orig_w  = w / scale
        orig_h  = h / scale
        results.append({
            "cx": orig_cx / img_w,
            "cy": orig_cy / img_h,
            "w": orig_w / img_w,
            "h": orig_h / img_h,
            "class_id": int(cls_id),
            "confidence": float(conf),
        })

    return _nms(results)


def _calc_severity_and_action(confidence: float) -> tuple[str, str]:
    if confidence >= 0.90:
        return "불합격", "작업자 육안검사 및 재작업이 필요합니다."
    elif confidence >= 0.75:
        return "재검사", "정밀 재검사를 권장합니다."
    else:
        return "주의", "경미한 의심 소견입니다. 작업 진행 가능하나 추후 모니터링하세요."


def real_inspect(image: Image.Image) -> InspectionResponse:
    """실제 학습된 모델로 검사종류 판별 + 불량 탐지를 수행합니다."""
    category, cat_conf = _classify_category(image)
    class_map = CLASS_MAPS[category]

    detections = _run_yolo(category, image)
    # "정상" 클래스(예: Good Weld)로 매핑된 탐지는 불량 집계에서 제외
    defect_dets = [d for d in detections if class_map.get(d["class_id"]) is not None]

    if not defect_dets:
        return InspectionResponse(
            result="normal",
            confidence=0.95 if not detections else round(1.0 - max(d["confidence"] for d in detections) * 0.2, 3),
            inspection_category=category,
            category_confidence=round(cat_conf, 3),
            defect_type=None,
            defect_boxes=[],
            severity=None,
            recommended_action="정상 - 조치 불필요",
            message="정상 판정",
        )

    best = max(defect_dets, key=lambda d: d["confidence"])
    defect_type = class_map[best["class_id"]]
    confidence = best["confidence"]
    severity, action = _calc_severity_and_action(confidence)

    boxes = [
        DefectBox(
            x=d["cx"], y=d["cy"], width=d["w"], height=d["h"],
            label=class_map.get(d["class_id"]) or "기타",
            confidence=round(d["confidence"], 3),
        )
        for d in defect_dets
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
        message=f"불량 감지: {DEFECT_TYPE_KR.get(defect_type, defect_type)}",
    )
