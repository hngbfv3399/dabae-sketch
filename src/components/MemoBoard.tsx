/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import MemoCard from "./MemoCard";
import ActionBar from "./ActionBar";
import { Info, Wifi, WifiOff } from "lucide-react";

// 프리셋 파스텔 색상 정의 (어두운 색 배제)
const PASTEL_COLORS = [
  "#fef08a", // Soft Yellow
  "#fed7aa", // Light Orange
  "#fecdd3", // Pastel Rose
  "#e9d5ff", // Soft Purple
  "#bfdbfe", // Pastel Blue
  "#bbf7d0", // Mint Green
  "#99f6e4", // Light Teal
  "#fbcfe8", // Pastel Pink
];

interface Note {
  _id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  shape: "square" | "circle" | "apple" | "heart";
  author: string;
  createdAt: number;
}

interface MemoBoardCanvasProps {
  notes: Note[] | undefined;
  onAddNote: (shape: "square" | "circle" | "apple" | "heart", author: string, text: string, x: number, y: number, color: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  isConvexConnected: boolean;
}

// 1. 공통 캔버스 렌더러 컴포넌트
function MemoBoardCanvas({
  notes,
  onAddNote,
  onUpdatePosition,
  onDelete,
  isConvexConnected,
}: MemoBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showBanner, setShowBanner] = useState(true);

  // 컴포넌트 마운트 시 대형 캔버스의 중앙으로 스크롤 이동
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const boardWidth = 3000;
      const boardHeight = 2000;
      container.scrollLeft = (boardWidth - container.clientWidth) / 2;
      container.scrollTop = (boardHeight - container.clientHeight) / 2;
    }
  }, []);

  const handleCreateNote = (shape: "square" | "circle" | "apple" | "heart", author: string, text: string) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // 현재 사용자의 뷰포트 정중앙 좌표 계산
    const centerX = container.scrollLeft + container.clientWidth / 2 - 90;
    const centerY = container.scrollTop + container.clientHeight / 2 - 90;

    // 약간의 랜덤 오프셋 부여 (완전히 겹치지 않게 함)
    const offsetX = centerX + (Math.random() * 40 - 20);
    const offsetY = centerY + (Math.random() * 40 - 20);

    // 랜덤 파스텔 컬러 선택
    const randomColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];

    onAddNote(shape, author, text, offsetX, offsetY, randomColor);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-[#FDFBF6] select-none">
      {/* 최상단 헤더 표시 (상태 정보) */}
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 py-4 bg-white/45 backdrop-blur-md border-b border-stone-200/50 shadow-xs">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-amber-600 to-rose-500">
            담빵메모지
          </h1>
        </div>

        {/* 연결 상태 배지 */}
        <div className="flex items-center gap-2">
          {isConvexConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              <Wifi className="w-3.5 h-3.5" />
              서버 상태 : 정상
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/60 animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              서버 상태 : 문제있음
            </span>
          )}
        </div>
      </header>

      {/* 안내 배너 */}
      {showBanner && !isConvexConnected && (
        <div className="absolute top-18 inset-x-4 z-30 flex items-center justify-between bg-linear-to-r from-amber-50/95 to-orange-100/95 border border-amber-200/60 text-amber-800 text-xs px-4 py-3 rounded-2xl shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              현재 <strong>로컬 보관 모드</strong>로 작동 중입니다. 실시간 동시 협업 기능을 사용하려면 터미널에서{" "}
              <code className="bg-white text-amber-700 px-1.5 py-0.5 rounded font-mono border border-amber-200/60">npx convex dev</code>
              를 실행하고 Convex DB를 연동해보세요!
            </p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-amber-600/80 hover:text-amber-900 font-bold ml-4 cursor-pointer"
          >
            닫기
          </button>
        </div>
      )}

      {/* 무한 캔버스 (스크롤 영역) */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto board-bg relative scroll-smooth cursor-crosshair"
      >
        {/* 대형 보드판 자체 */}
        <div className="w-[3000px] h-[2000px] relative">
          {notes === undefined ? (
            // 로딩 스피너
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            // 빈 화면 가이드
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none select-none">
              <p className="text-lg font-bold mb-1">메모판이 비어 있습니다.</p>
              <p className="text-sm">하단 바에서 메모를 골라 붙여보세요!</p>
            </div>
          ) : (
            // 메모 리스트 렌더링
            notes.map((note) => (
              <MemoCard
                key={note._id}
                id={note._id}
                text={note.text}
                x={note.x}
                y={note.y}
                color={note.color}
                shape={note.shape}
                author={note.author}
                onUpdatePosition={onUpdatePosition}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* 플로팅 컨트롤 바 */}
      <ActionBar onAddNote={handleCreateNote} />
    </div>
  );
}

// 2. Convex 실시간 데이터 연동 컴포넌트
function ConvexMemoBoard() {
  const notes = useQuery(api.notes.get, {});
  const createNote = useMutation(api.notes.create);
  const updatePosition = useMutation(api.notes.updatePosition);
  const deleteNote = useMutation(api.notes.remove);

  const handleAddNote = (
    shape: "square" | "circle" | "apple" | "heart",
    author: string,
    text: string,
    x: number,
    y: number,
    color: string
  ) => {
    createNote({
      text,
      x,
      y,
      color,
      shape,
      author,
    });
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    updatePosition({ id: id as any, x, y });
  };

  const handleDelete = (id: string) => {
    deleteNote({ id: id as any });
  };

  return (
    <MemoBoardCanvas
      notes={notes as any}
      onAddNote={handleAddNote}
      onUpdatePosition={handleUpdatePosition}
      onDelete={handleDelete}
      isConvexConnected={true}
    />
  );
}

// 3. 로컬 저장소 백업용 단독 컴포넌트 (Convex 비활성화 상태용)
function LocalMemoBoard() {
  const [notes, setNotes] = useState<Note[]>([]);

  // 초기 렌더링 시 로컬스토리지에서 복원
  useEffect(() => {
    const saved = localStorage.getItem("local_memos");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => setNotes(parsed), 0);
      } catch (e) {
        console.error(e);
      }
    } else {
      // 초기 데모 카드 2개 생성
      const initialNotes: Note[] = [
        {
          _id: "demo-1",
          text: "밀어서 움직이고 내용을 적어보세요!",
          x: 1410,
          y: 910,
          color: "#fef08a",
          shape: "square",
          author: "안내원",
          createdAt: Date.now(),
        },
        {
          _id: "demo-2",
          text: "하트와 사과 같은 다양한 모양도 가능합니다!",
          x: 1610,
          y: 950,
          color: "#fecdd3",
          shape: "heart",
          author: "안내원",
          createdAt: Date.now(),
        },
      ];
      setTimeout(() => {
        setNotes(initialNotes);
        localStorage.setItem("local_memos", JSON.stringify(initialNotes));
      }, 0);
    }
  }, []);

  const saveToLocalStorage = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem("local_memos", JSON.stringify(newNotes));
  };

  const handleAddNote = (
    shape: "square" | "circle" | "apple" | "heart",
    author: string,
    text: string,
    x: number,
    y: number,
    color: string
  ) => {
    const newNote: Note = {
      _id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      x,
      y,
      color,
      shape,
      author,
      createdAt: Date.now(),
    };
    saveToLocalStorage([...notes, newNote]);
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    const updated = notes.map((note) =>
      note._id === id ? { ...note, x, y } : note
    );
    saveToLocalStorage(updated);
  };

  const handleDelete = (id: string) => {
    const filtered = notes.filter((note) => note._id !== id);
    saveToLocalStorage(filtered);
  };

  return (
    <MemoBoardCanvas
      notes={notes}
      onAddNote={handleAddNote}
      onUpdatePosition={handleUpdatePosition}
      onDelete={handleDelete}
      isConvexConnected={false}
    />
  );
}

// 4. 환경에 따른 동적 컴포넌트 배출
export default function MemoBoard() {
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    // NEXT_PUBLIC_CONVEX_URL 환경 변수가 있는지 감지
    const hasConvex = !!process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CONVEX_URL !== "https://dummy-url.convex.cloud";
    setIsLocal(!hasConvex);
  }, []);

  if (isLocal) {
    return <LocalMemoBoard />;
  }

  return <ConvexMemoBoard />;
}
