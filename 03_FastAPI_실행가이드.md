# STEP 5 — FastAPI AI 서버 실행 가이드

---

## 5-1. Python 설치 확인

```cmd
python --version   # 3.10 이상 권장
```

없으면 https://python.org → 3.11 LTS 설치 (설치 시 "Add to PATH" 체크!)

---

## 5-2. 가상환경 생성 및 활성화

```cmd
cd "D:\AI\AI 기반 선박 부품 품질검사 웹 플랫폼\backend"

:: 가상환경 생성
python -m venv venv

:: 활성화 (Windows cmd)
venv\Scripts\activate

:: 활성화 후 앞에 (venv) 표시가 되어야 정상
```

---

## 5-3. 패키지 설치

```cmd
pip install -r requirements.txt
```

---

## 5-4. 서버 실행

```cmd
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

실행 후 터미널에 아래 메시지가 보이면 성공:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

---

## 5-5. 동작 확인

### 방법 1: 브라우저에서 확인
- http://localhost:8000 → `{"message": "선박 부품 품질검사 AI API"}`
- http://localhost:8000/health → `{"status": "ok", "mode": "dummy"}`
- http://localhost:8000/docs → **Swagger UI (API 문서 자동 생성)**

### 방법 2: Swagger UI에서 직접 테스트
1. http://localhost:8000/docs 접속
2. `POST /inspect` 클릭 → `Try it out`
3. 이미지 파일 선택 → `Execute`
4. 아래 응답 결과 확인:

```json
{
  "result": "defect",
  "confidence": 0.876,
  "defect_type": "crack",
  "defect_boxes": [
    { "x": 0.45, "y": 0.32, "width": 0.15, "height": 0.12, "label": "crack", "confidence": 0.82 }
  ],
  "message": "불량 감지: 균열"
}
```

---

## 5-6. 생성된 파일 구조

```
backend/
├── main.py                  ← FastAPI 앱 진입점 ★
├── requirements.txt         ← 패키지 목록 ★
├── .env                     ← DUMMY_MODE=true 설정
├── Dockerfile               ← Render 배포용
│
├── routers/
│   └── inspection.py        ← POST /inspect 엔드포인트 ★
│
├── models/
│   └── dummy_model.py       ← 더미 AI 모델 ★
│                               (나중에 실제 모델로 교체)
│
├── schemas/
│   └── inspection.py        ← 요청/응답 데이터 구조
│
├── utils/
│   └── image.py             ← 이미지 전처리
│
└── weights/                 ← 실제 모델 가중치 파일 저장 예정
```

---

## 5-7. 더미 모델 동작 방식

```
이미지 업로드
    │
    ▼
DUMMY_MODE=true?
    │
    Yes ──→ 70% 확률로 불량 판정
            랜덤 불량 유형 선택 (crack/porosity/undercut...)
            랜덤 신뢰도 생성 (0.70~0.98)
            랜덤 불량 위치 박스 1~2개 생성
            │
            ▼
          결과 반환 (JSON)
```

실제 모델 학습 전에도 **전체 시스템 흐름을 테스트**할 수 있습니다.

---

## 주의사항

- Next.js와 FastAPI를 **동시에 실행**해야 합니다.
  - Next.js: `npm run dev` (포트 3000)
  - FastAPI: `uvicorn main:app --reload` (포트 8000)

---

## 다음은?

서버가 정상 실행되면 **"다음 6"** 을 입력하세요.  
→ Next.js에서 이미지 업로드 + AI 검사 요청 화면을 작성합니다.
