import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Info,
  Link as LinkIcon,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "./Toast";
import type { ProjectDocumentDTO } from "@icp/shared";
import { apiClient } from "../lib/api/client";
import { isImageDocument } from "../lib/documents";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentViewerProps {
  doc: ProjectDocumentDTO;
  projectId: string;
  onClose: () => void;
  getDownloadUrl?: (doc: ProjectDocumentDTO) => Promise<string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function typeIcon(type: string) {
  if (type === "PDF" || type === "DOCX") return <FileText className="w-4 h-4" />;
  if (type === "XLSX") return <FileSpreadsheet className="w-4 h-4" />;
  if (type === "DWG" || type === "DXF") return <FileImage className="w-4 h-4" />;
  if (type === "OTHER") return <FileArchive className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function IconBtn({
  children, onClick, label, active, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-white/45">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}

// ─── CSS-art fallback panel ───────────────────────────────────────────────────

const PANEL_BG: Record<string, string> = {
  PDF:   "from-red-700 to-red-900",
  DOCX:  "from-blue-700 to-blue-900",
  XLSX:  "from-green-700 to-green-900",
  DWG:   "from-[#0d2b5e] to-[#0a1e42]",
  DXF:   "from-[#0d2b5e] to-[#0a1e42]",
  OTHER: "from-slate-600 to-slate-800",
};

const TYPE_APP: Record<string, string> = {
  DOCX: "Word",
  XLSX: "Excel",
  DWG:  "AutoCAD",
  DXF:  "AutoCAD",
};

function DocArtSvg({ type }: { type: string }) {
  if (type === "XLSX") return (
    <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      {[0,1,2,3].flatMap(col => [0,1,2,3,4].map(row => (
        <rect key={`${col}-${row}`} x={`${12 + col * 20}%`} y={`${14 + row * 15}%`} width="14%" height="10%" rx="1" fill="white" />
      )))}
    </svg>
  );
  if (type === "DWG" || type === "DXF") return (
    <svg className="w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 75">
      {[15,30,45,60].map(y => <line key={`h${y}`} x1="8" y1={y} x2="92" y2={y} stroke="white" strokeWidth="0.5" />)}
      {[20,40,60,80].map(x => <line key={`v${x}`} x1={x} y1="8" x2={x} y2="67" stroke="white" strokeWidth="0.5" />)}
      <polyline points="20,58 38,28 56,44 74,18" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="58" r="2.5" fill="white" /><circle cx="74" cy="18" r="2.5" fill="white" />
    </svg>
  );
  if (type === "DOCX") return (
    <svg className="w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <line x1="12%" y1="24%" x2="55%" y2="24%" stroke="white" strokeWidth="4" strokeLinecap="round" />
      {[36, 48, 60, 72].map((y) => (
        <line key={y} x1="12%" y1={`${y}%`} x2="88%" y2={`${y}%`} stroke="white" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
  return null;
}

function DownloadFallback({ doc, url }: { doc: ProjectDocumentDTO; url: string }) {
  const bg = PANEL_BG[doc.type] ?? PANEL_BG.OTHER;
  const app = TYPE_APP[doc.type];
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-10 overflow-auto">
      <div className={`relative w-40 h-52 sm:w-52 sm:h-64 rounded-2xl bg-gradient-to-br ${bg} overflow-hidden shadow-2xl mb-8 shrink-0`}>
        <DocArtSvg type={doc.type} />
        <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest text-white/60 uppercase bg-black/20">
          {doc.type}
        </div>
      </div>
      <p className="text-white font-semibold text-base sm:text-lg text-center max-w-sm leading-snug mb-1">{doc.name}</p>
      <p className="text-white/50 text-sm text-center mb-6">{doc.size} · Uploaded {doc.date}</p>
      <p className="text-white/40 text-xs text-center mb-5">
        This file type can't be previewed in the browser.
        {app && <><br />It opens in {app}.</>}
      </p>
      <a
        href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 min-h-11 px-6 py-2.5 rounded-xl bg-white text-neutral-900 text-sm font-semibold hover:bg-white/90 transition-colors"
      >
        <Download className="w-4 h-4" />
        Download to view
      </a>
    </div>
  );
}

// ─── PDF viewer — native iframe ────────────────────────────────────────────────

function PdfViewer({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="pointer-events-none relative z-10 flex h-full w-full items-center justify-center px-3 py-4 sm:px-16">
      <div
        className="pointer-events-auto h-full w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`${url}#toolbar=1&navpanes=0&view=FitH`}
          title={fileName}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}

// ─── Image viewer ─────────────────────────────────────────────────────────────

const IMG_MIN = 1;
const IMG_MAX = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 70;

interface ImageViewerProps {
  url: string;
  fileName: string;
  showDetails: boolean;
  onToggleDetails: () => void;
  onClose: () => void;
}

function ImageViewer({ url, fileName, showDetails, onToggleDetails, onClose }: ImageViewerProps) {
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [sizeLabel, setSizeLabel] = useState<string | null>(null);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const [pinching, setPinching] = useState(false);
  const isZoomed = scale > 1;

  const enterTransition = useMemo(() =>
    reduceMotion ? { duration: 0.12 } : { type: "spring" as const, stiffness: 320, damping: 32 },
    [reduceMotion],
  );

  const resetZoom = useCallback(() => { setScale(1); panX.set(0); panY.set(0); }, [panX, panY]);
  const zoomBy = useCallback((delta: number) => {
    setScale(s => Math.min(IMG_MAX, Math.max(IMG_MIN, s + delta)));
  }, []);

  useEffect(() => { if (scale === 1) { panX.set(0); panY.set(0); } }, [scale, panX, panY]);
  useEffect(() => { resetZoom(); setRotation(0); setDims(null); setSizeLabel(null); }, [url, resetZoom]);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then(res => { const len = res.headers.get("Content-Length"); if (!cancelled && len) setSizeLabel(formatBytes(Number(len))); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [url]);

  const pointerDist = () => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      pinchRef.current = { startDist: pointerDist(), startScale: scale };
      setPinching(true);
    }
  }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size === 2) {
      const d = pointerDist();
      if (pinch.startDist > 0) setScale(Math.min(IMG_MAX, Math.max(IMG_MIN, (d / pinch.startDist) * pinch.startScale)));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const endPointer = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2 && pinchRef.current) {
      pinchRef.current = null; setPinching(false);
      if (scale <= 1.05) resetZoom();
    }
  }, [resetZoom, scale]);

  const ext = /\.([^.]+)$/.exec(fileName)?.[1]?.toUpperCase() ?? "—";

  return (
    <>
      {/* Image-specific controls injected into the top bar via render prop pattern —
          instead, expose zoom handlers upward. We render the stage here only. */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={e => zoomBy(e.deltaY < 0 ? 0.35 : -0.35)}
        onClick={onClose}
      >
        <div
          className="pointer-events-none relative z-10 flex h-full w-full items-center justify-center px-3 py-4 sm:px-16"
        >
          <motion.div
            drag={pinching ? false : isZoomed ? true : "x"}
            dragConstraints={isZoomed ? undefined : { left: 0, right: 0 }}
            dragElastic={isZoomed ? 0 : 0.25}
            dragMomentum={false}
            style={isZoomed ? { x: panX, y: panY } : undefined}
            onDragEnd={(_, info) => {
              if (isZoomed) return;
              if (info.offset.x > SWIPE_THRESHOLD) onClose();
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onDoubleClick={() => { if (isZoomed) resetZoom(); else setScale(DOUBLE_TAP_SCALE); }}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex max-h-full max-w-full touch-none items-center justify-center"
          >
            <motion.img
              src={url}
              alt={fileName}
              draggable={false}
              onLoad={e => { const img = e.currentTarget; setDims({ w: img.naturalWidth, h: img.naturalHeight }); }}
              animate={{ scale, rotate: rotation }}
              transition={enterTransition}
              className="max-h-[82vh] max-w-[94vw] select-none rounded-lg object-contain shadow-2xl sm:max-w-[86vw]"
              style={{ cursor: isZoomed ? "grab" : "zoom-in" }}
            />
          </motion.div>
        </div>

        {/* Details card */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="absolute right-3 top-3 z-30 w-[min(18rem,80vw)] rounded-2xl bg-neutral-900/85 p-4 text-sm text-white/90 ring-1 ring-white/10 backdrop-blur-xl sm:right-5"
            >
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Details</p>
              <div className="space-y-1.5">
                <DetailRow label="Name" value={fileName} />
                {dims && <DetailRow label="Dimensions" value={`${dims.w} × ${dims.h} px`} />}
                <DetailRow label="Type" value={ext} />
                {sizeLabel && <DetailRow label="Size" value={sizeLabel} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Zoom/rotate controls — floating bottom-right, matches original's unified bar pattern */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/10 backdrop-blur pointer-events-auto">
        <IconBtn label="Zoom out" onClick={() => zoomBy(-0.5)} disabled={scale <= IMG_MIN}><Minus className="h-[18px] w-[18px]" /></IconBtn>
        <IconBtn label="Reset zoom" onClick={resetZoom} disabled={!isZoomed}><RotateCcw className="h-[18px] w-[18px]" /></IconBtn>
        <IconBtn label="Zoom in" onClick={() => zoomBy(0.5)} disabled={scale >= IMG_MAX}><Plus className="h-[18px] w-[18px]" /></IconBtn>
        <IconBtn label="Rotate" onClick={() => setRotation(r => (r + 90) % 360)}><RotateCw className="h-[18px] w-[18px]" /></IconBtn>
        <span className="mx-0.5 h-5 w-px bg-white/15" />
        <IconBtn label="Details" active={showDetails} onClick={onToggleDetails}><Info className="h-[18px] w-[18px]" /></IconBtn>
      </div>
    </>
  );
}

// ─── Main DocumentViewer ──────────────────────────────────────────────────────

export function DocumentViewer({ doc, projectId, onClose, getDownloadUrl }: DocumentViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const reduceMotion = useMemo(() => prefersReducedMotion(), []);
  const isImg = isImageDocument(doc);
  const isPdf = doc.type === "PDF";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    const fetcher = getDownloadUrl
      ? () => getDownloadUrl(doc)
      : () => apiClient.getProjectDocumentDownloadUrl(projectId, doc.id);
    fetcher()
      .then(u => { if (!cancelled) setUrl(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [doc.id, projectId, getDownloadUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, [url]);

  if (!mounted) return null;

  const renderContent = () => {
    if (!url) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <span className="text-sm text-white/50">Loading…</span>
          </div>
        </div>
      );
    }
    if (isImg) return (
      <ImageViewer
        url={url}
        fileName={doc.name}
        showDetails={showDetails}
        onToggleDetails={() => setShowDetails(v => !v)}
        onClose={onClose}
      />
    );
    if (isPdf) return (
      <div className="flex-1 min-h-0">
        <PdfViewer url={url} fileName={doc.name} />
      </div>
    );
    return (
      <div className="flex-1 min-h-0" onClick={e => e.stopPropagation()}>
        <DownloadFallback doc={doc} url={url} />
      </div>
    );
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex flex-col">
        {/* Full-screen panel — clicking empty areas closes */}
        <motion.div
          key="viewer-panel"
          className="absolute inset-0 flex flex-col bg-neutral-950/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.05 : 0.18 }}
          onClick={onClose}
        >
        {/* ── Top control bar — same glass pill pattern as originals ── */}
        <div
          className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5"
          onClick={e => e.stopPropagation()}
        >
          {/* Left: file type icon + filename */}
          <div className="flex min-w-0 items-center gap-2 text-white">
            <span className="text-white/50 shrink-0">
              {isImg ? <FileImage className="w-4 h-4" /> : typeIcon(doc.type)}
            </span>
            <span className="truncate text-sm text-white/70">{doc.name}</span>
            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase text-white/40 bg-white/10 hidden sm:inline">
              {isImg ? doc.mimeType.split("/")[1]?.toUpperCase() : doc.type}
            </span>
          </div>

          {/* Right: glass pill actions */}
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/8 p-1 ring-1 ring-white/10 backdrop-blur">
            {url && (
              <a
                href={url} target="_blank" rel="noreferrer"
                title="Open in new tab" aria-label="Open in new tab"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 active:scale-95"
              >
                <ExternalLink className="h-[18px] w-[18px]" />
              </a>
            )}
            <IconBtn label="Copy link" onClick={() => void handleCopyLink()}>
              <LinkIcon className="h-[18px] w-[18px]" />
            </IconBtn>
            {url && (
              <a
                href={url} download={doc.name}
                title="Download" aria-label="Download"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 active:scale-95"
              >
                <Download className="h-[18px] w-[18px]" />
              </a>
            )}
            <span className="mx-0.5 h-5 w-px bg-white/15" />
            <IconBtn label="Close" onClick={onClose}>
              <X className="h-[18px] w-[18px]" />
            </IconBtn>
          </div>
        </div>

        {/* ── Content ── clicking the padding around content closes */}
        <div className="relative flex flex-col flex-1 min-h-0 pt-2">
          {renderContent()}
        </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
