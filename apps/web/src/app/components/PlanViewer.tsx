import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ProjectDocumentDTO } from "@icp/shared";
import { ImageIcon, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { isImageDocument } from "../lib/documents";
import { PdfViewer } from "./PdfViewer";

interface PlanViewerProps {
  document: ProjectDocumentDTO;
  url: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export function PlanViewer({ document, url }: PlanViewerProps) {
  if (isImageDocument(document)) {
    return <ImagePlanViewer name={document.name} url={url} />;
  }

  return <PdfViewer url={url} />;
}

export function ImagePlanViewer({ name, url }: { name: string; url: string }) {
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ pointerId: number; x: number; y: number; ox: number; oy: number } | null>(null);

  const availableWidth = Math.max(1, viewportSize.width - 32);
  const availableHeight = Math.max(1, viewportSize.height - 32);
  const fitRatio = imageSize.width > 0 && imageSize.height > 0
    ? Math.min(availableWidth / imageSize.width, availableHeight / imageSize.height)
    : 0;
  const fittedWidth = imageSize.width * fitRatio;
  const fittedHeight = imageSize.height * fitRatio;
  const renderedWidth = fittedWidth * scale;
  const renderedHeight = fittedHeight * scale;

  const clampOffset = (next: { x: number; y: number }) => {
    const maxX = Math.max(0, (renderedWidth - viewportSize.width) / 2 + 16);
    const maxY = Math.max(0, (renderedHeight - viewportSize.height) / 2 + 16);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  };

  useEffect(() => {
    setScale(1);
    setFailed(false);
    setImageSize({ width: 0, height: 0 });
    setOffset({ x: 0, y: 0 });
  }, [url]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
      setScale((value) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(value + delta).toFixed(2))));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (scale <= 1) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    setOffset((current) => clampOffset(current));
  }, [scale, viewportSize.width, viewportSize.height, fittedWidth, fittedHeight]);

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    setIsDragging(true);
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setOffset(clampOffset({
      x: start.ox + event.clientX - start.x,
      y: start.oy + event.clientY - start.y,
    }));
  };

  const stopPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    dragStart.current = null;
    setIsDragging(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-brand-primary-hover">
      <div className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-white/75">
          <ImageIcon className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs">{name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
            disabled={scale <= MIN_SCALE}
            className="flex h-8 w-8 items-center justify-center rounded text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="min-w-14 rounded px-2 py-1 text-center text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Reset zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
            disabled={scale >= MAX_SCALE}
            className="flex h-8 w-8 items-center justify-center rounded text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Reset view"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden overscroll-contain bg-[#111d68] touch-none select-none"
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
      >
        {failed ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
            Failed to load image plan.
          </div>
        ) : (
          <img
            src={url}
            alt={name}
            draggable={false}
            onLoad={(event) => setImageSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })}
            onError={() => setFailed(true)}
            className="pointer-events-none absolute left-1/2 top-1/2 block max-w-none rounded-sm shadow-2xl"
            style={{
              width: renderedWidth || "auto",
              height: renderedHeight || "auto",
              opacity: fitRatio > 0 ? 1 : 0,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
            }}
          />
        )}
        {!failed && scale > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm">
            Drag to pan
          </div>
        )}
      </div>
    </div>
  );
}
