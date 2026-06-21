# routers/inspection.py
# AI 검사 API 엔드포인트

import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from schemas.inspection import InspectionResponse
from utils.image import read_image, validate_image

router = APIRouter()

VALID_CATEGORIES = {"welding", "surface", "assembly"}


@router.post("/inspect", response_model=InspectionResponse)
async def inspect_image(
    image: UploadFile = File(...),
    category: str = Form("welding"),
):
    """
    이미지를 받아 AI로 정상/불량을 판정합니다.

    - category: "welding"(용접) | "surface"(표면) | "assembly"(조립)
    - DUMMY_MODE=true: 더미 모델로 랜덤 결과 반환
    - DUMMY_MODE=false: 실제 학습된 모델 사용 (카테고리별 모델 로드)
    """

    if category not in VALID_CATEGORIES:
        category = "welding"

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
        result = dummy_inspect(pil_image, category)
    else:
        from models.real_model import real_inspect
        result = real_inspect(pil_image, category)

    return result
