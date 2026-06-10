"use client";
// components/layout/Header.tsx
// 상단 헤더 - 현재 페이지 이름 + 사용자 정보

import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard":        "대시보드",
  "/ships":            "선박 관리",
  "/blocks":           "블록 관리",
  "/inspections":      "검사 이력",
  "/inspections/new":  "검사 요청",
  "/statistics":       "통계",
};

interface HeaderProps {
  userEmail?: string;
}

export default function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();

  // 현재 경로에 맞는 타이틀 찾기
  const title =
    Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] ??
    "선박 품질검사 시스템";

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>

      <div className="flex items-center gap-3">
        {/* 알림 버튼 (추후 구현 가능) */}
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
          <Bell className="w-5 h-5" />
        </button>

        {/* 사용자 아바타 */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-sm text-slate-600 hidden md:block">
            {userEmail ?? "사용자"}
          </span>
        </div>
      </div>
    </header>
  );
}
