/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import MemoCard, { ReactionType } from "./MemoCard";
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
  password?: string;
  reactions?: {
    thumbsup: number;
    heart: number;
    surprised: number;
    laugh: number;
    fire: number;
  };
}

interface MemoBoardCanvasProps {
  notes: Note[] | undefined;
  onAddNote: (shape: "square" | "circle" | "apple" | "heart", author: string, text: string, x: number, y: number, color: string, password?: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDelete: (id: string, password?: string) => void;
  onReact: (id: string, reactionType: ReactionType) => void;
  isConvexConnected: boolean;
}

// 1. 공통 캔버스 렌더러 컴포넌트
function MemoBoardCanvas({
  notes,
  onAddNote,
  onUpdatePosition,
  onDelete,
  onReact,
  isConvexConnected,
}: MemoBoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  // Z-Index 관리 (최근 선택한 카드 번호)
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // 삭제용 모달 상태
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [shapeFilter, setShapeFilter] = useState<"all" | "square" | "circle" | "apple" | "heart">("all");

  // 줌 & 팬 상태
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  // 스크립트 참조 동기화 (Event Listener에서 stale closure 방지)
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  // 중앙 정렬 함수
  const resetZoomAndCenter = () => {
    setZoom(1.0);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: (rect.width - 3000) / 2,
        y: (rect.height - 2000) / 2,
      });
    }
  };

  // 컴포넌트 마운트 시 대형 캔버스의 중앙으로 스크롤 이동
  useEffect(() => {
    resetZoomAndCenter();
    // 윈도우 크기 변경 시에도 안전 대응
    window.addEventListener("resize", resetZoomAndCenter);
    return () => window.removeEventListener("resize", resetZoomAndCenter);
  }, []);

  // 마우스 휠 및 트랙패드 줌/팬 이벤트 리스너 연동 (Passive: false 설정)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.ctrlKey) {
        // 줌인/줌아웃 (마우스 포인터 중심 줌 연산)
        const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
        const prevZoom = zoomRef.current;
        const nextZoom = Math.max(0.4, Math.min(2.0, prevZoom + zoomDelta));
        
        const xs = (mouseX - panRef.current.x) / prevZoom;
        const ys = (mouseY - panRef.current.y) / prevZoom;
        
        const nextPan = {
          x: mouseX - xs * nextZoom,
          y: mouseY - ys * nextZoom,
        };
        
        setZoom(nextZoom);
        setPan(nextPan);
      } else {
        // 팬 (화면 드래그 이동)
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, []);

  // 마우스 우클릭 혹은 칠판 배경 드래그로 Pan (화면 이동) 지원
  const handleBgPointerDown = (e: React.PointerEvent) => {
    // 메모 카드 또는 버튼 클릭 시에는 배경 드래그 작동 방지
    if (
      e.target !== e.currentTarget && 
      !(e.target as HTMLElement).classList.contains("board-bg-element")
    ) {
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPan = { ...panRef.current };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPan({
        x: initialPan.x + dx,
        y: initialPan.y + dy,
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // 칠판 전체 고해상도 PNG 이미지 저장
  const handleSaveImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      // html2canvas-pro를 사용하여 oklab/oklch 컬러 파싱 경고 해결
      const html2canvas = (await import("html2canvas-pro")).default;
      const boardElement = document.getElementById("canvas-board");
      if (!boardElement) return;

      // 캡처 중 스냅샷 왜곡 방지를 위해 줌/팬 임시 초기화
      const originalTransform = boardElement.style.transform;
      const originalTransition = boardElement.style.transition;
      
      boardElement.style.transform = "none";
      boardElement.style.transition = "none";

      // html2canvas 캡처 진행 (3000x2000 고해상도)
      const canvas = await html2canvas(boardElement, {
        width: 3000,
        height: 2000,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        backgroundColor: "#FDFBF6",
        scale: 1.5, // 텍스트 깨짐 방지 1.5배 스케일
        logging: false,
      });

      // 기존 줌/팬 설정 복원
      boardElement.style.transform = originalTransform;
      boardElement.style.transition = originalTransition;

      // 이미지 파일 다운로드 트리거
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `dabae-memo-board-${Date.now()}.png`;
      link.click();
    } catch (e) {
      console.error("Image capture error:", e);
      alert("칠판 이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCreateNote = (
    shape: "square" | "circle" | "apple" | "heart", 
    author: string, 
    text: string,
    password?: string
  ) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // 현재 사용자 뷰포트 영역의 중심 좌표 역계산 (줌/팬 좌표 반영)
    const containerRect = container.getBoundingClientRect();
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;

    // 줌/팬 위치를 대입하여 대형 캔버스 상의 절대좌표 도출
    const absoluteX = (viewportCenterX - pan.x) / zoom - 90;
    const absoluteY = (viewportCenterY - pan.y) / zoom - 90;

    // 약간의 랜덤 오프셋 부여 (겹침 방지)
    const offsetX = absoluteX + (Math.random() * 40 - 20);
    const offsetY = absoluteY + (Math.random() * 40 - 20);

    const randomColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];

    onAddNote(shape, author, text, offsetX, offsetY, randomColor, password);
  };

  // 검색어 필터링 검증
  const isCardDimmed = (note: Note) => {
    const query = searchQuery.trim().toLowerCase();
    
    // 1. 검색어 확인 (닉네임 혹은 본문 매칭)
    const searchMatch = !query || 
      note.text.toLowerCase().includes(query) || 
      note.author.toLowerCase().includes(query);

    // 2. 모양 확인
    const shapeMatch = shapeFilter === "all" || note.shape === shapeFilter;

    return !(searchMatch && shapeMatch);
  };

  // 카드 내 삭제 버튼 클릭 시 모달 팝업 트리거
  const handleDeleteClick = (id: string) => {
    setDeletingNoteId(id);
    setDeletePassword("");
  };

  // 삭제 확정 및 비밀번호 검증
  const confirmDelete = () => {
    if (!deletingNoteId) return;
    const targetNote = notes?.find((n) => n._id === deletingNoteId);
    if (!targetNote) return;

    // 비밀번호가 있을 때 검사
    if (targetNote.password && targetNote.password !== deletePassword.trim()) {
      alert("비밀번호가 일치하지 않습니다!");
      return;
    }

    onDelete(deletingNoteId, targetNote.password ? deletePassword.trim() : undefined);
    setDeletingNoteId(null);
    setDeletePassword("");
  };

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-[#FDFBF6] select-none">
      {/* 캡처 중일 때 로딩 오버레이 */}
      {isCapturing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white font-bold text-sm">칠판을 이미지로 저장하는 중입니다...</p>
        </div>
      )}

      {/* 비밀번호 입력용 삭제 확인 모달 */}
      {deletingNoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/85 shadow-2xl max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-stone-800 mb-2">메모 삭제</h3>
            <p className="text-stone-500 text-xs mb-4 leading-relaxed">
              이 메모를 삭제하려면 생성 시 설정한 비밀번호를 입력해 주세요.
            </p>
            
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmDelete();
              }}
              className="w-full bg-stone-50 border border-stone-200/85 rounded-xl px-4 py-2.5 text-stone-800 text-sm font-medium focus:outline-none focus:border-amber-500 transition-all mb-4"
              autoFocus
            />
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setDeletingNoteId(null);
                  setDeletePassword("");
                }}
                className="px-4 py-2 rounded-xl text-stone-500 hover:bg-stone-50 border border-stone-200 text-xs font-semibold cursor-pointer transition-all"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 최상단 헤더 (제목, 상태 정보, 검색 및 필터) */}
      <header className="absolute top-0 inset-x-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 bg-white/45 backdrop-blur-md border-b border-stone-200/50 shadow-xs">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-amber-600 to-rose-500">
            담빵메모지
          </h1>
        </div>

        {/* 실시간 검색 및 필터 */}
        <div className="flex items-center gap-2 self-center md:self-auto w-full md:w-auto max-w-md">
          <input
            type="text"
            placeholder="작성자 또는 내용 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/80 border border-stone-200/80 rounded-xl px-3 py-1.5 text-stone-800 text-sm font-medium w-full md:w-56 placeholder-stone-400 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/10 transition-all shadow-xs"
          />
          <select
            value={shapeFilter}
            onChange={(e: any) => setShapeFilter(e.target.value)}
            className="bg-white/80 border border-stone-200/80 rounded-xl px-3 py-1.5 text-stone-700 text-sm font-semibold focus:outline-none focus:border-amber-500/80 transition-all cursor-pointer shadow-xs"
          >
            <option value="all">도형 전체</option>
            <option value="square">■ 네모</option>
            <option value="circle">● 동그라미</option>
            <option value="apple">🍎 사과</option>
            <option value="heart">❤️ 하트</option>
          </select>
        </div>

        {/* 연결 상태 배지 */}
        <div className="flex items-center gap-2 self-end md:self-auto">
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
        <div className="absolute top-20 inset-x-4 z-30 flex items-center justify-between bg-linear-to-r from-amber-50/95 to-orange-100/95 border border-amber-200/60 text-amber-800 text-xs px-4 py-3 rounded-2xl shadow-md backdrop-blur-md">
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

      {/* 무한 캔버스 (마우스 Pan & Zoom 영역) */}
      <div
        ref={containerRef}
        onPointerDown={handleBgPointerDown}
        className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing board-bg-element"
      >
        {/* 대형 보드판 자체 (scale 및 translate 적용) */}
        <div
          id="canvas-board"
          className="w-[3000px] h-[2000px] absolute origin-top-left board-bg board-bg-element"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
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
                reactions={note.reactions}
                onUpdatePosition={onUpdatePosition}
                onDelete={handleDeleteClick} // 모달 팝업 삭제 핸들러로 변경
                onReact={onReact}
                isActive={activeCardId === note._id}
                onActivate={(id) => setActiveCardId(id)}
                isDimmed={isCardDimmed(note)}
                zoom={zoom}
                pan={pan}
              />
            ))
          )}
        </div>
      </div>

      {/* 줌 제어 컨트롤 패널 (좌하단 플로팅) */}
      <div className="absolute bottom-[29px] left-6 z-40 flex items-center gap-2 bg-white/75 backdrop-blur-xl border border-stone-200/80 px-3 py-2 rounded-2xl shadow-[0_15px_35px_-5px_rgba(139,92,26,0.08)]">
        <button
          onClick={() => setZoom((prev) => Math.max(0.4, prev - 0.1))}
          className="action-btn text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 p-1.5 rounded-lg border border-stone-200 cursor-pointer text-xs font-bold transition-all shadow-3xs"
          title="축소"
        >
          -
        </button>
        <span className="text-stone-600 text-xs font-bold w-12 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.1))}
          className="action-btn text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 p-1.5 rounded-lg border border-stone-200 cursor-pointer text-xs font-bold transition-all shadow-3xs"
          title="확대"
        >
          +
        </button>
        <div className="w-px h-4 bg-stone-200 mx-1" />
        <button
          onClick={resetZoomAndCenter}
          className="action-btn text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 px-2 py-1 rounded-lg border border-stone-200 cursor-pointer text-[10px] font-bold transition-all shadow-3xs"
          title="중앙 맞춤"
        >
          맞춤
        </button>
      </div>

      {/* 플로팅 컨트롤 바 */}
      <ActionBar 
        onAddNote={handleCreateNote} 
        onDownload={handleSaveImage}
        isDownloading={isCapturing}
      />
    </div>
  );
}

// 2. Convex 실시간 데이터 연동 컴포넌트
function ConvexMemoBoard() {
  const notes = useQuery(api.notes.get, {});
  const createNote = useMutation(api.notes.create);
  const updatePosition = useMutation(api.notes.updatePosition);
  const deleteNote = useMutation(api.notes.remove);
  const addReaction = useMutation(api.notes.addReaction);

  const handleAddNote = (
    shape: "square" | "circle" | "apple" | "heart",
    author: string,
    text: string,
    x: number,
    y: number,
    color: string,
    password?: string
  ) => {
    createNote({
      text,
      x,
      y,
      color,
      shape,
      author,
      password,
    });
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    updatePosition({ id: id as any, x, y });
  };

  const handleDelete = (id: string, password?: string) => {
    deleteNote({ id: id as any, password });
  };

  const handleReact = (id: string, reactionType: ReactionType) => {
    addReaction({ id: id as any, reactionType });
  };

  return (
    <MemoBoardCanvas
      notes={notes as any}
      onAddNote={handleAddNote}
      onUpdatePosition={handleUpdatePosition}
      onDelete={handleDelete}
      onReact={handleReact}
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
        // 정렬 상태 안정화
        setTimeout(() => setNotes(parsed), 0);
      } catch (e) {
        console.error(e);
      }
    } else {
      // 초기 데모 카드 2개 생성
      const initialNotes: Note[] = [
        {
          _id: "demo-1",
          text: "밀어서 움직이고 내용을 적어보세요! (삭제 비번: 1234)",
          x: 1410,
          y: 910,
          color: "#fef08a",
          shape: "square",
          author: "안내원",
          createdAt: Date.now(),
          password: "1234",
          reactions: { thumbsup: 1, heart: 0, surprised: 0, laugh: 0, fire: 0 }
        },
        {
          _id: "demo-2",
          text: "하트와 사과 같은 다양한 모양도 가능합니다! (삭제 비번: 1234)",
          x: 1610,
          y: 950,
          color: "#fecdd3",
          shape: "heart",
          author: "안내원",
          createdAt: Date.now(),
          password: "1234",
          reactions: { thumbsup: 0, heart: 2, surprised: 0, laugh: 0, fire: 0 }
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
    color: string,
    password?: string
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
      password,
      reactions: {
        thumbsup: 0,
        heart: 0,
        surprised: 0,
        laugh: 0,
        fire: 0,
      }
    };
    // 생성일자 기준 정렬을 보장하기 위해 새로운 메모는 맨 앞(또는 맨 뒤)에 배치
    saveToLocalStorage([newNote, ...notes]);
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    const updated = notes.map((note) =>
      note._id === id ? { ...note, x, y } : note
    );
    saveToLocalStorage(updated);
  };

  const handleDelete = (id: string, password?: string) => {
    // Find the note
    const note = notes.find((n) => n._id === id);
    if (!note) return;
    
    // Validate password
    if (note.password && note.password !== password) {
      alert("비밀번호가 일치하지 않습니다!");
      return;
    }
    
    const filtered = notes.filter((n) => n._id !== id);
    saveToLocalStorage(filtered);
  };

  const handleReact = (id: string, reactionType: ReactionType) => {
    const updated = notes.map((note) => {
      if (note._id === id) {
        const curReactions = note.reactions || {
          thumbsup: 0,
          heart: 0,
          surprised: 0,
          laugh: 0,
          fire: 0,
        };
        return {
          ...note,
          reactions: {
            ...curReactions,
            [reactionType]: (curReactions[reactionType] || 0) + 1,
          },
        };
      }
      return note;
    });
    saveToLocalStorage(updated);
  };

  return (
    <MemoBoardCanvas
      notes={notes}
      onAddNote={handleAddNote}
      onUpdatePosition={handleUpdatePosition}
      onDelete={handleDelete}
      onReact={handleReact}
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
