"use client";
// components/layout/Sidebar.tsx
// 좌측 네비게이션 사이드바

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Ship,
  LayoutDashboard,
  Anchor,
  Layers,
  ClipboardList,
  BarChart3,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",    label: "대시보드",    icon: LayoutDashboard },
  { href: "/ships",        label: "선박 관리",   icon: Anchor },
  { href: "/blocks",       label: "블록 관리",   icon: Layers },
  { href: "/inspections/new", label: "검사 요청", icon: Ship },
  { href: "/inspections",  label: "검사 이력",   icon: ClipboardList },
  { href: "/statistics",   label: "통계",        icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col">

      {/* 로고 */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Ship className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">선박 품질검사</p>
          <p className="text-slate-400 text-xs">AI Inspection System</p>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          // 현재 경로와 메뉴 경로 비교
          const isActive =
            href === "/inspections/new"
              ? pathname === "/inspections/new"
              : href === "/inspections"
              ? pathname === "/inspections" || (pathname.startsWith("/inspections/") && pathname !== "/inspections/new")
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 로그아웃 */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
