// lib/api.ts
// FastAPI AI 서버 호출 함수

import { AIInspectionResult } from "./types";

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000";

/**
 * 이미지를 FastAPI 서버로 전송하고 AI 분석 결과를 받습니다.
 */
export async function inspectImage(file: File): Promise<AIInspectionResult> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${AI_API_URL}/inspect`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "AI 서버 오류가 발생했습니다.");
  }

  return response.json();
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
