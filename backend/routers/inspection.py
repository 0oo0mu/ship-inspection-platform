# routers/inspection.py
# AI 검사 API 엔드포인트

import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.inspection import InspectionResponse
from utils.image import read_image, validate_image

router = APIRouter()


@router.post("/inspect", response_model=InspectionResponse)
async def inspect_image(image: UploadFile = File(...)):
    """
    이미지를 받아 AI로 정상/불량을 판정합니다.

    검사종류(용접/가공/설치/조립)는 사람이 선택하지 않고 AI가 사진을 보고 자동 판별합니다.

    - DUMMY_MODE=true: 더미 모델로 랜덤 결과 반환
    - DUMMY_MODE=false: 실제 학습된 단일 YOLOv8(23클래스) 모델 사용
      · 탐지된 결함 클래스가 곧 공정(용접/가공/설치/조립)을 의미하므로
        별도 분류기 없이 모델 하나로 검사종류 판별 + 결함 탐지를 동시에 수행
    """

    # 파일 유효성 검사
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    file_bytes = await image.read()

    if not validate_image(file_bytes):
        raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

    # 이미지 → PIL 변환
    pil_image = read_image(file_bytes)

    # 더미 모드 여부 확인
    dummy_mode = os.getenv("DUMMY_MODE", "true").lower() == "true"

    if dummy_mode:
        from models.dummy_model import dummy_inspect
        result = dummy_inspect(pil_image)
    else:
        from models.real_model import real_inspect
        result = real_inspect(pil_image)

    return result
