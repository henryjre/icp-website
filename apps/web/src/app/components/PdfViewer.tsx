import React, { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

// The matching PDF.js worker is copied into `public/` so Vite serves it as a
// stable asset in development and production. A package-relative URL is left
// unresolved by Vite and causes every PDF load to fail when the worker 404s.
pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string | { data: ArrayBuffer };
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // scale is relative to fit-width (1 = fills container width)
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width so we can fit the page to it
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setFitWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset pan when page changes
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [currentPage]);

  const onDocumentLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const prevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
    setOffset({ x: 0, y: 0 });
  };
  const nextPage = () => {
    setCurrentPage((p) => Math.min(numPages ?? 1, p + 1));
    setOffset({ x: 0, y: 0 });
  };

  // Mouse pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };
  const onMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  // All touch + wheel interactions need { passive: false } so preventDefault() works,
  // which React doesn't allow via JSX handlers. Use native listeners instead.
  const touchState = useRef<{
    // single-finger pan
    panX: number; panY: number; ox: number; oy: number;
    // two-finger pinch
    pinchDist: number; pinchScale: number;
    mode: "idle" | "pan" | "pinch";
  }>({ panX: 0, panY: 0, ox: 0, oy: 0, pinchDist: 0, pinchScale: 1, mode: "idle" });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dist = (a: Touch, b: Touch) =>
      Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchState.current = {
          ...touchState.current,
          mode: "pan",
          panX: t.clientX, panY: t.clientY,
          ox: 0, oy: 0,
        };
        // capture current offset at gesture start
        setOffset((cur) => {
          touchState.current.ox = cur.x;
          touchState.current.oy = cur.y;
          return cur;
        });
      } else if (e.touches.length === 2) {
        touchState.current = {
          ...touchState.current,
          mode: "pinch",
          pinchDist: dist(e.touches[0], e.touches[1]),
          pinchScale: 0, // will be set from state below
        };
        setScale((cur) => {
          touchState.current.pinchScale = cur;
          return cur;
        });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const state = touchState.current;
      if (state.mode === "pan" && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - state.panX;
        const dy = t.clientY - state.panY;
        setOffset({ x: state.ox + dx, y: state.oy + dy });
      } else if (state.mode === "pinch" && e.touches.length === 2) {
        const d = dist(e.touches[0], e.touches[1]);
        const ratio = d / state.pinchDist;
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(state.pinchScale * ratio).toFixed(2)));
        setScale(next);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        touchState.current.mode = "idle";
      } else if (e.touches.length === 1) {
        // Finger lifted during pinch — switch back to pan from current position
        const t = e.touches[0];
        touchState.current.mode = "pan";
        touchState.current.panX = t.clientX;
        touchState.current.panY = t.clientY;
        setOffset((cur) => {
          touchState.current.ox = cur.x;
          touchState.current.oy = cur.y;
          return cur;
        });
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + delta).toFixed(2))));
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-brand-primary-hover rounded-xl overflow-hidden border border-white/10">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/20 border-b border-white/10 shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white/80 text-xs min-w-[5rem] text-center">
            {numPages ? `${currentPage} / ${numPages}` : "—"}
          </span>
          <button
            onClick={nextPage}
            disabled={!numPages || currentPage >= numPages}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="px-2 py-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition text-xs min-w-[3.5rem] text-center"
            title="Reset zoom and pan"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition ml-1"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-white/40 text-xs hidden sm:block">Drag to pan · Pinch or Ctrl+Scroll to zoom</p>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        >
          <Document
            file={url}
            onLoadSuccess={onDocumentLoad}
            loading={
              <div className="text-white/60 text-sm">Loading PDF…</div>
            }
            error={
              <div className="text-white/60 text-sm">Failed to load PDF.</div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={fitWidth > 0 ? fitWidth * scale : undefined}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
