// app/page.tsx
// 루트 경로 → /dashboard 로 리디렉트

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
