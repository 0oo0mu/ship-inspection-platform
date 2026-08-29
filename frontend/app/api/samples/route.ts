// app/api/samples/route.ts
// public/samples/ 안의 모든 이미지 파일 목록을 반환합니다. (하위 폴더 포함)
// 테스트용 샘플 이미지를 폴더에 넣어두면 자동으로 인식됩니다.
// 반환 형식: { files: ["welding/a.jpg", "b.png", "machining/x/y.jpg", ...] }
//  - 경로는 public/samples/ 기준 상대경로이며, 프런트에서 `/samples/${f}` 로 접근합니다.

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

// dir 이하를 재귀적으로 훑어 이미지 파일들의 상대경로를 모읍니다.
function walk(dir: string, base: string, out: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // 폴더가 없으면 무시
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, base, out);
    } else if (IMAGE_EXT.includes(path.extname(e.name).toLowerCase())) {
      // base(=public/samples) 기준 상대경로, 윈도우 역슬래시는 슬래시로 변환
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
}

export async function GET() {
  const root = path.join(process.cwd(), "public", "samples");
  const files: string[] = [];
  walk(root, root, files);
  return NextResponse.json({ files });
}
