"use client";

import React, { useRef, useState } from "react";
import { Trash2, GripHorizontal, Camera } from "lucide-react";

export type ReactionType = "thumbsup" | "heart" | "surprised" | "laugh" | "fire";

interface MemoCardProps {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  shape: "square" | "circle" | "apple" | "heart";
  author: string;
  reactions?: {
    thumbsup: number;
    heart: number;
    surprised: number;
    laugh: number;
    fire: number;
  };
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onReact?: (id: string, reactionType: ReactionType) => void;
  isActive: boolean;
  onActivate?: (id: string) => void;
  isDimmed?: boolean;
  zoom: number;
  pan: { x: number; y: number };
}

const EMOJI_LIST = [
  { type: "thumbsup", emoji: "👍" },
  { type: "heart", emoji: "❤️" },
  { type: "surprised", emoji: "😮" },
  { type: "laugh", emoji: "😂" },
  { type: "fire", emoji: "🔥" },
] as const;

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
  reactions,
  onUpdatePosition,
  onDelete,
  onReact,
  isActive,
  onActivate,
  isDimmed,
  zoom,
  pan,
}: MemoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [prevPos, setPrevPos] = useState({ x, y });
  const [localPos, setLocalPos] = useState({ x, y });
  const currentPos = useRef({ x, y });
  const rotation = getRotationFromId(id);

  // DB에서 새로운 x, y 좌표가 내려오면 로컬 드래그 중이 아닐 때 동기화 (렌더 페이즈 동기화)
  if (x !== prevPos.x || y !== prevPos.y) {
    setPrevPos({ x, y });
    if (!isDragging) {
      setLocalPos({ x, y });
    }
  }

  // 드래그 시작 (Pointer Events)
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
    onActivate?.(id); // 현재 메모를 활성화 상태로 만듬 (z-index 향상)
    
    if (cardRef.current) {
      const parent = cardRef.current.parentElement;
      if (parent) {
        const container = parent.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          
          // 줌과 팬 배율이 적용된 화면 상의 좌표에서 칠판 기준의 실제 언스케일 좌표 역계산
          const pointerBoardX = (e.clientX - containerRect.left - pan.x) / zoom;
          const pointerBoardY = (e.clientY - containerRect.top - pan.y) / zoom;
          
          // 카드의 현재 로컬 좌표와 마우스 클릭 위치 사이의 언스케일 오프셋 저장
          dragOffset.current = {
            x: pointerBoardX - localPos.x,
            y: pointerBoardY - localPos.y,
          };
        }
      }
      currentPos.current = { x: localPos.x, y: localPos.y };
      cardRef.current.setPointerCapture(e.pointerId);
    }
  };

  // 드래그 중 (DOM 직접 조작으로 리렌더링 방지)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !cardRef.current) return;

    const parent = cardRef.current.parentElement;
    if (!parent) return;
    const container = parent.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    // 줌과 팬을 고려한 현재 마우스의 칠판 기준 실제 좌표 계산
    const pointerBoardX = (e.clientX - containerRect.left - pan.x) / zoom;
    const pointerBoardY = (e.clientY - containerRect.top - pan.y) / zoom;

    // 카드의 새로운 이동 좌표 계산 (언스케일 기준)
    const newX = pointerBoardX - dragOffset.current.x;
    const newY = pointerBoardY - dragOffset.current.y;

    // 보드 크기(3000x2000) 및 메모 카드 크기(180x180)를 기준으로 칠판 이탈 방지 clamping
    const clampedX = Math.max(0, Math.min(2820, newX));
    const clampedY = Math.max(0, Math.min(1820, newY));

    // React 렌더링 사이클 없이 DOM 스타일 직접 갱신 (성능 최적화)
    cardRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) rotate(${rotation}deg)`;
    currentPos.current = { x: clampedX, y: clampedY };
  };

  // 드래그 완료
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    cardRef.current?.releasePointerCapture(e.pointerId);

    // 최종 좌표 반영
    setLocalPos(currentPos.current);
    onUpdatePosition(id, currentPos.current.x, currentPos.current.y);
  };

  // 개별 메모 카드 이미지로 저장
  const handleDownloadCard = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 드래그/선택 활성화 방지
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import("html2canvas-pro")).default;

      // 회전값 임시 원복 (일직선 상태로 캡처하여 깔끔한 이미지 생성)
      const originalTransform = cardRef.current.style.transform;
      cardRef.current.style.transform = "none";

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: null, // 투명 배경 지원 (사과/하트 테두리 외 영역 투명화)
        scale: 2.0, // 고해상도 품질
        logging: false,
      });

      // 기존 transform 복원
      cardRef.current.style.transform = originalTransform;

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `dabae-memo-${author || "익명"}-${id.substring(0, 5)}.png`;
      link.click();
    } catch (err) {
      console.error("Card capture error:", err);
      alert("메모 카드 이미지 저장에 실패했습니다.");
    }
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
    textContainerClass = "absolute inset-0 p-4 pb-2 flex flex-col justify-between";
  } else if (shape === "circle") {
    shapeContent = (
      <div
        className="w-full h-full rounded-full shadow-md border border-black/5"
        style={{ backgroundColor: color }}
      />
    );
    textContainerClass = "absolute inset-0 pt-10 pb-8 px-8 flex flex-col justify-between items-center text-center";
  } else if (shape === "apple") {
    shapeContent = (
      <div className="w-full h-full relative" style={{ color }}>
        <svg viewBox="0 0 100 100" className="w-full h-full svg-shadow">
          <path d="M52 14 C58 9, 68 11, 66 21 C58 23, 52 17, 52 14 Z" fill="#22c55e" />
          <path d="M50 28 Q48 18, 55 12" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M50 32 C58 32, 82 34, 82 58 C82 76, 68 90, 50 90 C32 90, 18 76, 18 58 C18 34, 42 32, 50 32 Z" fill="currentColor" />
        </svg>
      </div>
    );
    textContainerClass = "absolute left-[16%] right-[16%] top-[35%] bottom-[12%] flex flex-col justify-between items-center text-center text-slate-800";
  } else if (shape === "heart") {
    shapeContent = (
      <div className="w-full h-full relative" style={{ color }}>
        <svg viewBox="0 0 100 100" className="w-full h-full svg-shadow">
          <path d="M50 88 C50 88, 15 56, 15 34 C15 18, 30 8, 50 25 C70 8, 85 18, 85 34 C85 56, 50 88, 50 88 Z" fill="currentColor" />
        </svg>
      </div>
    );
    textContainerClass = "absolute left-[18%] right-[18%] top-[25%] bottom-[20%] flex flex-col justify-between items-center text-center text-slate-800";
  }

  // 표시할 리액션이 있는지 체크
  const hasReactions = reactions && Object.values(reactions).some((val) => val > 0);

  const isSquare = shape === "square";
  const textAlignmentClass = isSquare ? "text-left" : "text-center";
  const authorAlignmentClass = isSquare ? "text-right" : "text-center";
  const reactionsAlignmentClass = isSquare ? "" : "justify-center";

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute w-[180px] h-[180px] group select-none touch-none transition-all duration-150 ${
        isDimmed ? "opacity-20 pointer-events-none" : ""
      } ${
        isDragging
          ? "z-50 cursor-grabbing shadow-xl scale-[1.03]"
          : isActive
          ? "z-30 cursor-grab shadow-md scale-[1.01]"
          : "z-10 cursor-grab hover:z-20 hover:shadow-md"
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
        {/* 드래그용 그립 & 이모지 리액션 바 & 작업 버튼 (호버 시 표시, 이미지 캡처 시 제외) */}
        <div 
          data-html2canvas-ignore="true"
          className="flex justify-between items-center w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 -mt-1 mb-1 z-10"
        >
          <div className="text-black/30 pointer-events-none">
            <GripHorizontal className="w-4 h-4" />
          </div>

          {/* 미니 이모지 리액션 패널 */}
          <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-black/5 shadow-xs">
            {EMOJI_LIST.map(({ type, emoji }) => (
              <button
                key={type}
                onClick={() => onReact?.(id, type)}
                className="action-btn hover:scale-130 active:scale-95 transition-transform duration-100 text-xs px-0.5 cursor-pointer"
                title={`${emoji} 리액션`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* 저장 및 삭제 버튼 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownloadCard}
              className="action-btn text-black/40 hover:text-amber-600 rounded p-0.5 hover:bg-black/5 transition-colors cursor-pointer"
              title="메모 이미지 저장"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(id)}
              className="action-btn text-black/40 hover:text-red-500 rounded p-0.5 hover:bg-black/5 transition-colors cursor-pointer"
              title="메모 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 메모 내용 표시 (수정 불가) */}
        <div
          className={`w-full grow text-slate-800 font-semibold leading-snug text-[13.5px] overflow-y-auto scrollbar-none select-text cursor-text pr-0.5 ${textAlignmentClass}`}
          style={{
            wordBreak: "break-all",
          }}
        >
          {text}
        </div>

        {/* 누적된 리액션 배지 렌더링 (리액션 존재 시) */}
        {hasReactions && (
          <div className={`flex flex-wrap gap-1 mt-1.5 w-full max-h-[36px] overflow-y-auto scrollbar-none z-10 ${reactionsAlignmentClass}`}>
            {EMOJI_LIST.map(({ type, emoji }) => {
              const count = reactions?.[type] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={type}
                  onClick={() => onReact?.(id, type)}
                  className="action-btn flex items-center gap-0.5 bg-white/60 border border-black/5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-slate-700 hover:bg-white/95 transition-all cursor-pointer shadow-3xs active:scale-90"
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 작성자 태그 */}
        <div className={`w-full ${authorAlignmentClass} mt-1 shrink-0 z-10`}>
          <span className="text-[10px] font-semibold text-slate-700/60 bg-black/5 px-2 py-0.5 rounded-full select-none">
            👤 {author || "익명"}
          </span>
        </div>
      </div>
    </div>
  );
}
