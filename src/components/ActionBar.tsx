"use client";

import React, { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { Download } from "lucide-react";

interface ActionBarProps {
  onAddNote: (shape: "square" | "circle" | "apple" | "heart", author: string, text: string, password?: string) => void;
  onDownload?: () => void;
  isDownloading?: boolean;
}

export default function ActionBar({ 
  onAddNote, 
  onDownload, 
  isDownloading = false 
}: ActionBarProps) {
  const [selectedShape, setSelectedShape] = useState<"square" | "circle" | "apple" | "heart">("square");
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [author, setAuthor] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("memo_author") || "익명";
    }
    return "익명";
  });

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAuthor(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("memo_author", val);
    }
  };

  const handleAdd = () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      alert("메모 내용을 입력해 주세요!");
      return;
    }
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      alert("메모 삭제 시 사용할 비밀번호를 입력해 주세요!");
      return;
    }
    onAddNote(selectedShape, author.trim() || "익명", trimmedText, trimmedPassword);
    setText(""); // 등록 후 메모 입력 필드 초기화
    setPassword(""); // 등록 후 비밀번호 입력 필드 초기화
  };

  return (
    <div className="fixed bottom-[29px] left-1/2 -translate-x-1/2 z-40 flex flex-col sm:flex-row items-center gap-4 bg-white/75 backdrop-blur-xl border border-black/15 px-5 py-4 sm:py-3.5 rounded-3xl shadow-[0_15px_35px_-5px_rgba(139,92,26,0.08)] transition-all duration-300 hover:border-black/25">
      
      {/* 닉네임 설정 영역 */}
      <div className="flex items-center gap-2">
        <span className="text-stone-500 text-xs font-semibold select-none">닉네임:</span>
        <input
          type="text"
          value={author}
          onChange={handleAuthorChange}
          placeholder="닉네임 입력"
          maxLength={10}
          className="bg-stone-50 border border-stone-200/85 rounded-xl px-3 py-1.5 text-stone-800 text-sm font-medium w-24 placeholder-stone-400 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/10 transition-all"
        />
      </div>

      <div className="hidden sm:block w-px h-6 bg-stone-200" />

      {/* 비밀번호 설정 영역 */}
      <div className="flex items-center gap-2">
        <span className="text-stone-500 text-xs font-semibold select-none">비밀번호:</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 (필수)"
          maxLength={15}
          className="bg-stone-50 border border-stone-200/85 rounded-xl px-3 py-1.5 text-stone-800 text-sm font-medium w-28 placeholder-stone-400 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/10 transition-all"
        />
      </div>

      <div className="hidden sm:block w-px h-6 bg-stone-200" />

      {/* 메모 입력 영역 */}
      <div className="flex items-center gap-2">
        <span className="text-stone-500 text-xs font-semibold select-none">메모:</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메모를 입력하세요"
          maxLength={60}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          className="bg-stone-50 border border-stone-200/85 rounded-xl px-3 py-1.5 text-stone-800 text-sm font-medium w-48 sm:w-64 placeholder-stone-400 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/10 transition-all"
        />
      </div>

      <div className="hidden sm:block w-px h-6 bg-stone-200" />

      {/* 도형 선택 버튼 영역 */}
      <div className="flex items-center gap-3">
        <span className="text-stone-500 text-xs font-semibold select-none">도형:</span>
        
        {/* 네모 */}
        <button
          onClick={() => setSelectedShape("square")}
          className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
            selectedShape === "square"
              ? "bg-amber-50 border-amber-500 text-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "bg-transparent border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300"
          }`}
          title="네모 메모지"
        >
          <div className="w-4 h-4 rounded-sm border-2 border-current" />
        </button>

        {/* 원 */}
        <button
          onClick={() => setSelectedShape("circle")}
          className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
            selectedShape === "circle"
              ? "bg-amber-50 border-amber-500 text-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "bg-transparent border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300"
          }`}
          title="동그라미 메모지"
        >
          <div className="w-4 h-4 rounded-full border-2 border-current" />
        </button>

        {/* 사과 */}
        <button
          onClick={() => setSelectedShape("apple")}
          className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
            selectedShape === "apple"
              ? "bg-amber-50 border-amber-500 text-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "bg-transparent border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300"
          }`}
          title="사과 메모지"
        >
          <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current">
            <path d="M50 32 C58 32, 82 34, 82 58 C82 76, 68 90, 50 90 C32 90, 18 76, 18 58 C18 34, 42 32, 50 32 Z" />
          </svg>
        </button>

        {/* 하트 */}
        <button
          onClick={() => setSelectedShape("heart")}
          className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
            selectedShape === "heart"
              ? "bg-amber-50 border-amber-500 text-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              : "bg-transparent border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300"
          }`}
          title="하트 메모지"
        >
          <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current">
            <path d="M50 88 C50 88, 15 56, 15 34 C15 18, 30 8, 50 25 C70 8, 85 18, 85 34 C85 56, 50 88, 50 88 Z" />
          </svg>
        </button>
      </div>

      <div className="hidden sm:block w-px h-6 bg-stone-200" />

      {/* 이미지 저장 버튼 */}
      {onDownload && (
        <>
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className={`flex items-center justify-center bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 rounded-2xl p-2.5 shadow-3xs active:scale-95 transition-all cursor-pointer ${
              isDownloading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="칠판 이미지로 저장"
          >
            {isDownloading ? (
              <div className="w-5 h-5 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>
          <div className="hidden sm:block w-px h-6 bg-stone-200" />
        </>
      )}

      {/* 추가 버튼 (react-icons/fa6의 FaPlus 아이콘 전용 버튼으로 대체) */}
      <button
        onClick={handleAdd}
        className="flex items-center justify-center bg-linear-to-r from-amber-500 to-rose-400 hover:from-amber-400 hover:to-rose-300 text-white rounded-2xl p-2.5 shadow-[0_4px_12px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer"
        title="메모 붙이기"
      >
        <FaPlus className="w-5 h-5" />
      </button>
    </div>
  );
}
