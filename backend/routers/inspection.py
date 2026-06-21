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

    검사종류(용접/표면/조립)는 사람이 선택하지 않고 AI가 사진을 보고 자동 판별합니다.

    - DUMMY_MODE=true: 더미 모델로 랜덤 결과 반환 (검사종류도 랜덤 판별)
    - DUMMY_MODE=false: 실제 학습된 모델 사용
      1) 카테고리 분류기로 용접/표면/조립 판별
      2) 판별된 카테고리에 맞는 전용 불량 탐지 모델 실행
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
