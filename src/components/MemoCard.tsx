"use client";

import React, { useRef, useState } from "react";
import { Trash2, GripHorizontal } from "lucide-react";

interface MemoCardProps {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  shape: "square" | "circle" | "apple" | "heart";
  author: string;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

// ID에 기반한 결정론적(stable) 회전각 생성기 (-3도 ~ 3도)
const getRotationFromId = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (hash % 7) - 3; // -3, -2, -1, 0, 1, 2, 3도 중 하나 반환
};

export default function MemoCard({
  id,
  text,
  x,
  y,
  color,
  shape,
  author,
  onUpdatePosition,
  onDelete,
}: MemoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [prevPos, setPrevPos] = useState({ x, y });
  const [localPos, setLocalPos] = useState({ x, y });

  const rotation = getRotationFromId(id);

  // DB에서 새로운 x, y 좌표가 내려오면 로컬 드래그 중이 아닐 때 동기화 (렌더 페이즈 동기화)
  if (x !== prevPos.x || y !== prevPos.y) {
    setPrevPos({ x, y });
    if (!isDragging) {
      setLocalPos({ x, y });
    }
  }

  // 드래그 시작 (Pointer Events로 모바일 터치 대응)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 버튼 클릭 시 드래그 동작 차단
    if (
      e.target instanceof HTMLButtonElement ||
      (e.target as HTMLElement).closest(".action-btn")
    ) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    
    // 클릭된 로컬 좌표와 카드의 현재 좌표 간의 오프셋 구하기
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const parent = cardRef.current.parentElement?.getBoundingClientRect();
      if (parent) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
    
    // 마우스 포인터 캡처
    cardRef.current?.setPointerCapture(e.pointerId);
  };

  // 드래그 중
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !cardRef.current) return;

    const parent = cardRef.current.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();

    // 캔버스 범위 내에서 좌표 구하기 (스크롤바 고려)
    const newX = e.clientX - parentRect.left - dragOffset.x + parent.scrollLeft;
    const newY = e.clientY - parentRect.top - dragOffset.y + parent.scrollTop;

    setLocalPos({ x: newX, y: newY });
  };

  // 드래그 완료
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    cardRef.current?.releasePointerCapture(e.pointerId);

    // Convex DB에 새로운 위치 업데이트
    onUpdatePosition(id, localPos.x, localPos.y);
  };

  // 모양별 인셋 패딩 및 스타일 분기
  let shapeContent = null;
  let textContainerClass = "";

  if (shape === "square") {
    shapeContent = (
      <div
        className="w-full h-full rounded-2xl shadow-md border border-black/5"
        style={{ backgroundColor: color }}
      />
    );
    textContainerClass = "absolute inset-0 p-5 flex flex-col justify-between";
  } else if (shape === "circle") {
    shapeContent = (
      <div
        className="w-full h-full rounded-full shadow-md border border-black/5"
        style={{ backgroundColor: color }}
      />
    );
    textContainerClass = "absolute inset-0 p-8 flex flex-col justify-between items-center text-center";
  } else if (shape === "apple") {
    shapeContent = (
      <div className="w-full h-full relative" style={{ color }}>
        <svg viewBox="0 0 100 100" className="w-full h-full svg-shadow">
          {/* Leaf */}
          <path d="M52 14 C58 9, 68 11, 66 21 C58 23, 52 17, 52 14 Z" fill="#22c55e" />
          {/* Stem */}
          <path d="M50 28 Q48 18, 55 12" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Apple Body */}
          <path d="M50 32 C58 32, 82 34, 82 58 C82 76, 68 90, 50 90 C32 90, 18 76, 18 58 C18 34, 42 32, 50 32 Z" fill="currentColor" />
        </svg>
      </div>
    );
    textContainerClass = "absolute inset-x-0 bottom-0 top-[28%] px-6 pb-6 pt-2 flex flex-col justify-between text-slate-800";
  } else if (shape === "heart") {
    shapeContent = (
      <div className="w-full h-full relative" style={{ color }}>
        <svg viewBox="0 0 100 100" className="w-full h-full svg-shadow">
          <path d="M50 88 C50 88, 15 56, 15 34 C15 18, 30 8, 50 25 C70 8, 85 18, 85 34 C85 56, 50 88, 50 88 Z" fill="currentColor" />
        </svg>
      </div>
    );
    textContainerClass = "absolute inset-0 pt-6 pb-8 px-7 flex flex-col justify-between items-center text-center text-slate-800";
  }

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute w-[180px] h-[180px] select-none touch-none transition-shadow ${
        isDragging ? "z-50 cursor-grabbing" : "z-10 cursor-grab hover:z-20"
      }`}
      style={{
        transform: `translate3d(${localPos.x}px, ${localPos.y}px, 0) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.15s ease-out, shadow 0.15s ease-out",
      }}
    >
      {/* 백그라운드 도형 */}
      {shapeContent}

      {/* 텍스트 및 콘텐츠 레이어 */}
      <div className={textContainerClass}>
        {/* 드래그 가능을 나타내는 그립 & 삭제 툴바 (호버 시 선명하게 표시) */}
        <div className="flex justify-between items-center w-full opacity-0 hover:opacity-100 transition-opacity duration-200 -mt-1 mb-1">
          <div className="text-black/30 pointer-events-none">
            <GripHorizontal className="w-4 h-4" />
          </div>
          <button
            onClick={() => onDelete(id)}
            className="action-btn text-black/40 hover:text-red-500 rounded p-0.5 hover:bg-black/5 transition-colors cursor-pointer"
            title="메모 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 메모 내용 표시 (수정 불가) */}
        <div
          className="w-full grow text-slate-800 font-semibold leading-normal text-[14.5px] overflow-y-auto scrollbar-none select-text cursor-text pr-0.5 text-left"
          style={{
            wordBreak: "break-all",
          }}
        >
          {text}
        </div>

        {/* 작성자 태그 */}
        <div className="w-full text-right mt-1 shrink-0">
          <span className="text-[11px] font-semibold text-slate-700/60 bg-black/5 px-2 py-0.5 rounded-full select-none">
            👤 {author || "익명"}
          </span>
        </div>
      </div>
    </div>
  );
}
