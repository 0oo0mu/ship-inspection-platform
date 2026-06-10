# main.py
# FastAPI 앱 진입점

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers.inspection import router as inspection_router

# .env 파일 로드
load_dotenv()

app = FastAPI(
    title="선박 부품 품질검사 AI API",
    description="AI 기반 선박 부품 이미지 분석 서버",
    version="1.0.0",
)

# ── CORS 설정 ─────────────────────────────────────────
# FRONTEND_URL 환경변수로 Vercel 도메인을 지정합니다.
_frontend_url = os.getenv("FRONTEND_URL", "")
_allowed_origins = [
    "http://localhost:3000",       # 로컬 개발
    "https://*.vercel.app",        # Vercel 와일드카드
]
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",   # 와일드카드 대신 정규식 사용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 라우터 등록 ───────────────────────────────────────
app.include_router(inspection_router, tags=["검사"])


# ── 헬스체크 ──────────────────────────────────────────
@app.get("/health", tags=["시스템"])
async def health_check():
    """서버 상태 확인"""
    dummy_mode = os.getenv("DUMMY_MODE", "true").lower() == "true"
    return {
        "status": "ok",
        "mode": "dummy" if dummy_mode else "model",
        "message": "AI 검사 서버가 정상 작동 중입니다.",
    }


@app.get("/", tags=["시스템"])
async def root():
    return {"message": "선박 부품 품질검사 AI API", "docs": "/docs"}
