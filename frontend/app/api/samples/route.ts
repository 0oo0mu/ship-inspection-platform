// app/api/samples/route.ts
// public/samples/{welding,surface,assembly} 폴더 안의 이미지 파일 목록을 반환합니다.
// 테스트용 샘플 이미지를 폴더에 넣어두면 자동으로 인식됩니다.

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CATEGORIES = ["welding", "surface", "assembly"] as const;
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

export async function GET() {
  const result: Record<string, string[]> = {};

  for (const cat of CATEGORIES) {
    const dir = path.join(process.cwd(), "public", "samples", cat);
    try {
      const files = fs
        .readdirSync(dir)
        .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()));
      result[cat] = files;
    } catch {
      result[cat] = []; // 폴더가 없으면 빈 배열
    }
  }

  return NextResponse.json(result);
}
