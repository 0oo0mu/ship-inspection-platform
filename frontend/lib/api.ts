// lib/api.ts
// FastAPI AI 서버 호출 함수

import { AIInspectionResult } from "./types";

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 이미지를 FastAPI 서버로 전송하고 AI 분석 결과를 받습니다.
 * 검사종류(용접/가공/설치/조립)는 AI가 사진을 보고 자동으로 판별합니다.
 *
 * Render 무료 인스턴스는 미사용 시 잠들었다가(cold start) 첫 요청이
 * 502/끊김으로 실패할 수 있어, 그런 경우 한 번 자동 재시도합니다.
 */
export async function inspectImage(file: File): Promise<AIInspectionResult> {
  const formData = new FormData();
  formData.append("image", file);

  const send = () =>
    fetch(`${AI_API_URL}/inspect`, { method: "POST", body: formData });

  let response: Response;
  try {
    response = await send();
    // 콜드스타트 중 게이트웨이 오류 → 잠깐 뒤 1회 재시도
    if ([502, 503, 504].includes(response.status)) {
      await sleep(5000);
      response = await send();
    }
  } catch {
    // 첫 요청이 네트워크 레벨에서 끊김(예열 중) → 1회 재시도
    await sleep(5000);
    response = await send();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "AI 서버 오류가 발생했습니다.");
  }

  return response.json();
}

/**
 * AI 서버 예열 (fire-and-forget).
 * 검사 화면 진입 시 미리 호출해 Render 인스턴스를 깨워둡니다.
 * 실제 검사 요청 시점에는 이미 준비돼 있어 대기 시간이 줄어듭니다.
 */
export function warmUpAI(): void {
  try {
    fetch(`${AI_API_URL}/health`, { signal: AbortSignal.timeout(60000) }).catch(() => {});
  } catch {
    /* 무시 */
  }
}

/**
 * AI 서버 상태 확인
 */
export async function checkAIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}
