"use client";
// components/inspections/InspectionForm.tsx
// 검사 요청 폼 - 선박/블록 선택 → 이미지 업로드 → AI 분석 → 결과 저장

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { inspectImage } from "@/lib/api";
import { Ship, Block, AIInspectionResult } from "@/lib/types";
import {
  CATEGORY_LIST, categoryLabel, categoryShortLabel, categoryDescription,
  severityColor, getDefectLabel,
  InspectionCategory, Severity,
} from "@/lib/inspectionMeta";
import {
  Upload, X, Loader2, CheckCircle, AlertTriangle,
  ChevronDown, ImageIcon, Wrench, Layers, Package
} from "lucide-react";

interface Props {
  ships: Ship[];
  blocks: Block[];
  userId: string;
}

// 단계 정의
type Step = "form" | "analyzing" | "result";

const categoryIcon: Record<InspectionCategory, any> = {
  welding: Wrench,
  surface: Layers,
  assembly: Package,
};

export default function InspectionForm({ ships, blocks, userId }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState<Step>("form");
  const [category, setCategory]   = useState<InspectionCategory>("welding");
  const [selectedShip, setSelectedShip] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [memo, setMemo]           = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [dragging, setDragging]   = useState(false);
  const [aiResult, setAiResult]   = useState<AIInspectionResult | null>(null);
  const [savedId, setSavedId]     = useState<string>("");
  const [error, setError]         = useState("");

  // 선택된 선박에 속한 블록만 필터링
  const filteredBlocks = blocks.filter((b) => b.ship_id === selectedShip);

  // ── 이미지 선택 처리 ──────────────────────────────
  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  // ── AI 검사 실행 ──────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) { setError("이미지를 업로드해 주세요."); return; }
    if (!selectedShip) { setError("선박을 선택해 주세요."); return; }
    if (!selectedBlock) { setError("블록을 선택해 주세요."); return; }

    setError("");
    setStep("analyzing");

    try {
      // 1. FastAPI AI 서버에 이미지 전송 (검사 종류 함께 전달)
      const result = await inspectImage(imageFile, category);
      setAiResult(result);

      // 2. Supabase Storage에 이미지 업로드
      const ext       = imageFile.name.split(".").pop();
      const fileName  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath  = `inspections/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inspections")
        .upload(filePath, imageFile, { contentType: imageFile.type });

      if (uploadError) throw new Error("이미지 업로드 실패: " + uploadError.message);

      // 3. 이미지 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from("inspections")
        .getPublicUrl(filePath);

      // 4. 검사 결과 DB 저장
      const { data: inspection, error: dbError } = await supabase
        .from("inspections")
        .insert({
          ship_id:             selectedShip,
          block_id:            selectedBlock,
          user_id:             userId,
          image_url:           urlData.publicUrl,
          result:              result.result,
          defect_type:         result.defect_type,
          confidence:          result.confidence,
          status:              "pending",
          inspection_category: category,
          severity:            result.severity,
          recommended_action:  result.recommended_action,
          memo:                memo || null,
        })
        .select()
        .single();

      if (dbError) throw new Error("검사 결과 저장 실패: " + dbError.message);

      // 5. 불량 위치 박스 저장 (defect_logs)
      if (result.defect_boxes.length > 0 && inspection) {
        await supabase.from("defect_logs").insert(
          result.defect_boxes.map((box) => ({
            inspection_id: inspection.id,
            bbox_x:        box.x,
            bbox_y:        box.y,
            bbox_width:    box.width,
            bbox_height:   box.height,
            label:         box.label,
            confidence:    box.confidence,
          }))
        );
      }

      setSavedId(inspection?.id ?? "");
      setStep("result");

    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
      setStep("form");
    }
  }

  // ── 결과 화면 ─────────────────────────────────────
  if (step === "result" && aiResult) {
    const isDefect = aiResult.result === "defect";
    const severity = aiResult.severity as Severity | null;
    return (
      <div className="space-y-4">
        {/* 결과 카드 */}
        <div className={`rounded-2xl border-2 p-6 ${
          isDefect ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
        }`}>
          <div className="flex items-center gap-4 mb-4">
            {isDefect
              ? <AlertTriangle className="w-10 h-10 text-red-500" />
              : <CheckCircle  className="w-10 h-10 text-green-500" />
            }
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${isDefect ? "text-red-700" : "text-green-700"}`}>
                  {isDefect ? "불량 감지" : "정상"}
                </p>
                {severity && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${severityColor[severity]}`}>
                    {severity}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                검사 종류: <strong>{categoryShortLabel[category]}</strong>
                <span className="mx-2">·</span>
                신뢰도: <strong>{(aiResult.confidence * 100).toFixed(1)}%</strong>
                {isDefect && aiResult.defect_type && (
                  <span className="ml-2">
                    · 불량 유형: <strong>{getDefectLabel(aiResult.defect_type)}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 권장 조치 */}
          {aiResult.recommended_action && (
            <div className="mb-4 px-4 py-2.5 bg-white/70 border border-slate-200 rounded-lg text-sm text-slate-700">
              <span className="font-semibold">권장 조치: </span>{aiResult.recommended_action}
            </div>
          )}

          {/* 이미지 미리보기 */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-video">
              <img src={imagePreview} alt="검사 이미지" className="w-full h-full object-contain" />
              {/* 불량 위치 박스 오버레이 */}
              {aiResult.defect_boxes.map((box, i) => (
                <div
                  key={i}
                  className="absolute border-2 border-red-500 bg-red-500/10"
                  style={{
                    left:   `${(box.x - box.width  / 2) * 100}%`,
                    top:    `${(box.y - box.height / 2) * 100}%`,
                    width:  `${box.width  * 100}%`,
                    height: `${box.height * 100}%`,
                  }}
                >
                  <span className="absolute -top-5 left-0 text-xs bg-red-500 text-white px-1 py-0.5 rounded whitespace-nowrap">
                    {getDefectLabel(box.label)} {(box.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/inspections/${savedId}`)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm"
          >
            결과 상세 보기
          </button>
          <button
            onClick={() => {
              setStep("form"); setAiResult(null);
              setImageFile(null); setImagePreview(""); setMemo("");
            }}
            className="flex-1 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-sm"
          >
            새 검사 요청
          </button>
        </div>
      </div>
    );
  }

  // ── 분석 중 화면 ──────────────────────────────────
  if (step === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-lg font-semibold text-slate-700">AI 분석 중...</p>
        <p className="text-sm text-slate-400">이미지를 분석하고 있습니다. 잠시만 기다려 주세요.</p>
        <div className="w-48 bg-slate-200 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  // ── 검사 폼 ───────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 검사 종류 선택 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-semibold text-slate-800 text-sm">① 검사 종류 선택</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CATEGORY_LIST.map((cat) => {
            const Icon = categoryIcon[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-left p-3.5 rounded-xl border-2 transition-colors ${
                  active
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-semibold ${active ? "text-blue-700" : "text-slate-700"}`}>
                    {categoryLabel[cat]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{categoryDescription[cat]}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 선박 선택 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm">② 검사 대상 선택</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">선박 <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedShip}
                onChange={(e) => { setSelectedShip(e.target.value); setSelectedBlock(""); }}
                required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선박 선택</option>
                {ships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">블록 <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                required
                disabled={!selectedShip}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">블록 선택</option>
                {filteredBlocks.map((b) => (
                  <option key={b.id} value={b.id}>{b.block_name} ({b.process_type})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 업로드 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-semibold text-slate-800 text-sm">③ 검사 이미지 업로드</h3>

        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="미리보기" className="w-full max-h-64 object-contain rounded-lg bg-slate-100" />
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(""); }}
              className="absolute top-2 right-2 w-7 h-7 bg-slate-800/70 hover:bg-slate-800 text-white rounded-full flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-xs text-slate-500 mt-1.5">{imageFile?.name} ({(imageFile!.size / 1024).toFixed(0)}KB)</p>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
            }`}
          >
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">클릭하거나 이미지를 드래그해 주세요</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · 최대 10MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* 메모 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
        <h3 className="font-semibold text-slate-800 text-sm">④ 메모 (선택)</h3>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="검사 관련 메모를 입력하세요 (선택사항)"
          rows={2}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={!imageFile || !selectedShip || !selectedBlock}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Upload className="w-4 h-4" />
        AI 검사 시작
      </button>

      {ships.length === 0 && (
        <p className="text-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          먼저 <strong>선박</strong>과 <strong>블록</strong>을 등록해 주세요.
        </p>
      )}
    </form>
  );
}
