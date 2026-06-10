# utils/image.py
# 이미지 전처리 유틸리티

from PIL import Image
import io


def read_image(file_bytes: bytes) -> Image.Image:
    """바이트 데이터를 PIL 이미지로 변환"""
    return Image.open(io.BytesIO(file_bytes)).convert("RGB")


def resize_image(image: Image.Image, size: tuple = (224, 224)) -> Image.Image:
    """이미지 크기 조정 (AI 모델 입력용)"""
    return image.resize(size)


def validate_image(file_bytes: bytes) -> bool:
    """유효한 이미지인지 검증"""
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
        return True
    except Exception:
        return False
