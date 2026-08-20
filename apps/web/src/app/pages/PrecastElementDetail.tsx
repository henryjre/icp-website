import { useLoaderData, useParams, NavLink, useNavigate } from "react-router";
import { Paginator } from "../components/Paginator";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { PrecastElementDTO, ProgressImageDTO, ProgressUpdateDTO, ProjectActivityDTO, ProjectDocumentDTO } from "@icp/shared";
import {
  ChevronRight,
  FileText,
  User,
  Calendar,
  MapPin,
  History,
  QrCode,
  Download,
  CheckCircle2,
  Clock,
  Pencil,
  Save,
  X,
  Trash2,
  Lock,
  Layers,
  Upload,
  Camera,
  Send,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { Modal } from "../components/Modal";
import { MobileQrScanner } from "../components/MobileQrScanner";
import { SlidingSectionTabs } from "../components/SlidingSectionTabs";
import { PageBreadcrumb } from "../components/PageBreadcrumb";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import { uploadToPresignedUrl } from "../lib/uploads";
import {
  EASE_STRUCTURAL,
  heroContainerVariants,
  heroItemVariants,
  staggerContainerVariants,
  staggerChildVariants,
  fadeUpVariants,
  slideFromLeftVariants,
  slideFromRightVariants,
  transitionFast,
  VIEWPORT,
} from "../lib/animations";

const DocumentViewer = React.lazy(() => import("../components/DocumentViewer").then((module) => ({ default: module.DocumentViewer })));

// ─── Activity styles ─────────────────────────────────────────────────────────

const activityIcons: Record<string, { color: string; dot: string }> = {
  created:   { color: "bg-blue-100 text-blue-600",        dot: "bg-blue-500" },
  updated:   { color: "bg-brand-soft text-brand-primary", dot: "bg-brand-secondary" },
  status:    { color: "bg-purple-100 text-purple-600",    dot: "bg-purple-500" },
  document:  { color: "bg-green-100 text-green-600",      dot: "bg-green-500" },
  comment:   { color: "bg-gray-100 text-brand-muted",     dot: "bg-gray-400" },
  delivered: { color: "bg-orange-100 text-orange-600",    dot: "bg-orange-500" },
};

// ─── Tab types ───────────────────────────────────────────────────────────────

type Tab = "details" | "progress" | "testResults" | "planDocs" | "activity";

const COLLAPSED_PROGRESS_COUNT = 3;
const MAX_PROGRESS_TIMELINE_ITEMS = 5;

// ─── DocPreviewPanel ─────────────────────────────────────────────────────────

type DocPreviewPanelProps = {
  doc: { id: string; type: string; mimeType: string; name: string; isConfidential: boolean };
  onGetUrl: () => Promise<string>;
};

function DocPreviewPanel({ doc, onGetUrl }: DocPreviewPanelProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const isImage = doc.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    onGetUrl().then((url) => { if (!cancelled) setImgSrc(url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [doc.id, isImage]);

  const panelGraphic = () => {
    if (isImage) {
      return imgSrc
        ? <img src={imgSrc} alt={doc.name} className="absolute inset-0 w-full h-full object-cover" />
        : <div className="absolute inset-0 animate-pulse bg-white/10" />;
    }
    if (doc.type === "PDF") return (
      <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        {[18, 30, 42, 54, 66, 78, 90].map((y, i) => (
          <line key={y} x1={i % 3 === 2 ? "18%" : "12%"} y1={`${y}%`} x2={i % 3 === 2 ? "72%" : i % 3 === 1 ? "85%" : "90%"} y2={`${y}%`} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </svg>
    );
    if (doc.type === "XLSX") return (
      <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        {[0, 1, 2, 3].flatMap((col) => [0, 1, 2, 3, 4].map((row) => (
          <rect key={`${col}-${row}`} x={`${10 + col * 21}%`} y={`${14 + row * 16}%`} width="16%" height="11%" rx="1" fill="white" />
        )))}
      </svg>
    );
    if (doc.type === "DWG" || doc.type === "DXF") return (
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 75">
        {[15, 30, 45, 60].map((y) => <line key={`h${y}`} x1="8" y1={y} x2="92" y2={y} stroke="white" strokeWidth="0.5" />)}
        {[20, 40, 60, 80].map((x) => <line key={`v${x}`} x1={x} y1="8" x2={x} y2="67" stroke="white" strokeWidth="0.5" />)}
        <polyline points="20,58 38,28 56,44 74,18" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="58" r="2" fill="white" /><circle cx="74" cy="18" r="2" fill="white" />
      </svg>
    );
    if (doc.type === "DOCX") return (
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <line x1="14%" y1="26%" x2="58%" y2="26%" stroke="white" strokeWidth="3" strokeLinecap="round" />
        {[38, 51, 64, 77].map((y) => (
          <line key={y} x1="14%" y1={`${y}%`} x2="86%" y2={`${y}%`} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        ))}
      </svg>
    );
    return null;
  };

  const panelBg: Record<string, string> = {
    PDF:   "bg-gradient-to-br from-red-700 to-red-900",
    DOCX:  "bg-gradient-to-br from-blue-700 to-blue-900",
    XLSX:  "bg-gradient-to-br from-green-700 to-green-900",
    DWG:   "bg-gradient-to-br from-[#0d2b5e] to-[#0a1e42]",
    DXF:   "bg-gradient-to-br from-[#0d2b5e] to-[#0a1e42]",
    OTHER: "bg-gradient-to-br from-slate-600 to-slate-800",
  };
  const bg = isImage ? "bg-gray-100" : (panelBg[doc.type] ?? panelBg.OTHER);

  return (
    <div className={`relative w-full h-28 sm:h-32 ${bg} overflow-hidden`}>
      {panelGraphic()}
      {!isImage && (
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest text-white/60 uppercase bg-black/20">
          {doc.type}
        </div>
      )}
      {doc.isConfidential && (
        <div className="absolute top-3 right-[-22px] bg-red-600 text-white text-[8px] font-bold tracking-widest uppercase px-8 py-0.5 rotate-45 shadow">
          Confidential
        </div>
      )}
    </div>
  );
}

// ─── ProgressImageThumb ──────────────────────────────────────────────────────

function ProgressImageThumb({ image, onOpen, className = "aspect-square" }: { image: ProgressImageDTO; onOpen: () => void; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.getProgressImageDownloadUrl(image.id)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [image.id]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative ${className} overflow-hidden rounded-lg border border-brand-border/50 bg-[#f5f7fc] transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 cursor-pointer`}
      title={image.name}
    >
      {src
        ? <img src={src} alt={image.name} className="absolute inset-0 h-full w-full object-cover" />
        : <div className="absolute inset-0 animate-pulse bg-brand-soft" />}
    </button>
  );
}

// ─── ActivityDescription ─────────────────────────────────────────────────────

function ActivityDescription({ description }: { description: string }) {
  const lines = description.split("\n").filter((l) => l.trim().length > 0);
  const diffPattern = /^\s*-?\s*([^:]+):\s*(.+?)\s*->\s*(.+)\s*$/;
  return (
    <div className="text-brand-muted text-sm mt-1 space-y-1">
      {lines.map((line, i) => {
        const match = line.match(diffPattern);
        if (!match) return <p key={i} className="leading-relaxed">{line}</p>;
        const [, field, before, after] = match;
        return (
          <p key={i} className="leading-relaxed">
            <span className="text-brand-muted">{field}: </span>
            <span className="line-through text-brand-muted/60">{before}</span>
            <span className="mx-1 text-brand-primary font-bold">→</span>
            <span className="text-brand-primary font-semibold">{after}</span>
          </p>
        );
      })}
    </div>
  );
}

// ─── progressImageToDoc ──────────────────────────────────────────────────────
// Adapts a progress image into the document shape the shared DocumentViewer expects.

function progressImageToDoc(image: ProgressImageDTO, date: string): ProjectDocumentDTO {
  return {
    id: image.id,
    name: image.name,
    mimeType: image.mimeType,
    category: "TEST_RESULT",
    scope: "ELEMENT",
    type: "OTHER",
    size: image.size,
    uploadedBy: "",
    date,
    isConfidential: false,
  };
}

function formatProgressDate(date: string) {
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsed = isoMatch
    ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    : new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 bg-brand-soft rounded-xl flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand-secondary" />
      </div>
      <h2 className="text-brand-primary text-lg sm:text-xl font-bold leading-tight">{label}</h2>
    </div>
  );
}

// ─── EditField + inputCls ─────────────────────────────────────────────────────

const inputCls = "mt-1 min-h-11 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm bg-[#f5f7fc] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition";

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-brand-muted uppercase tracking-wider font-medium">{label}</label>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PrecastElementDetail() {
  const { projectId: projectIdParam, elementId: elementIdParam, projectCode } = useParams<{
    projectId?: string;
    elementId?: string;
    projectCode?: string;
    elementToken?: string;
  }>();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const loaderElement = useLoaderData() as PrecastElementDTO | null;
  const [element, setElement] = useState<PrecastElementDTO | null>(loaderElement);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityItems, setActivityItems] = useState<ProjectActivityDTO[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [testResults, setTestResults] = useState<ProjectDocumentDTO[]>(loaderElement?.testResults ?? []);
  const [planDocuments, setPlanDocuments] = useState<ProjectDocumentDTO[]>(loaderElement?.planDocuments ?? []);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdateDTO[]>(loaderElement?.progressUpdates ?? []);
  const [progressNote, setProgressNote] = useState("");
  const [progressFiles, setProgressFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [progressDragActive, setProgressDragActive] = useState(false);
  const [postingProgress, setPostingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [viewingProgressImage, setViewingProgressImage] = useState<ProjectDocumentDTO | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isTestResultDragActive, setIsTestResultDragActive] = useState(false);
  const [isPlanDocDragActive, setIsPlanDocDragActive] = useState(false);
  const [testResultDocPage, setTestResultDocPage] = useState(1);
  const [planDocPage, setPlanDocPage] = useState(1);
  const [viewingDoc, setViewingDoc] = useState<ProjectDocumentDTO | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const testResultInputRef = useRef<HTMLInputElement | null>(null);
  const planDocInputRef = useRef<HTMLInputElement | null>(null);
  const progressInputRef = useRef<HTMLInputElement | null>(null);
  const progressTimelineRef = useRef<HTMLDivElement | null>(null);
  const progressFirstMobileMarkerRef = useRef<HTMLElement | null>(null);
  const progressLastMobileMarkerRef = useRef<HTMLElement | null>(null);
  const progressFirstDesktopMarkerRef = useRef<HTMLElement | null>(null);
  const progressLastDesktopMarkerRef = useRef<HTMLElement | null>(null);
  const progressMeasureFrameRef = useRef<number | null>(null);
  const [progressLineMetrics, setProgressLineMetrics] = useState({ left: 0, top: 0, height: 0 });
  const [progressLineFollowingToggle, setProgressLineFollowingToggle] = useState(false);
  const sectionRefs = useRef<Record<Tab, HTMLElement | null>>({
    details: null, progress: null, testResults: null, planDocs: null, activity: null,
  });
  const isManualScrollingRef = useRef(false);

  const draftKey = `form:element-edit:${projectIdParam ?? loaderElement?.projectId ?? ""}:${elementIdParam ?? loaderElement?.id ?? ""}`;
  const [form, setForm] = useState(() => getDraft(draftKey, {
    batch: loaderElement?.batch?.toString() ?? "",
    serialNumber: loaderElement?.serialNumber ?? "",
    name: loaderElement?.name ?? "",
    location: loaderElement?.location ?? "",
    status: loaderElement?.status ?? "Casted",
    castingDate: loaderElement?.castingDate ?? "",
  }));

  const currentUser = apiClient.getStoredUser();
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "editor";
  const canViewConfidential = canEdit;
  const canViewActivity = canEdit;

  const configuredSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim().replace(/\/+$/, "");
  const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const siteOrigin = configuredSiteUrl && configuredSiteUrl.length > 0 ? configuredSiteUrl : runtimeOrigin;
  const resolvedProjectId = element?.projectId ?? loaderElement?.projectId ?? projectIdParam;
  const resolvedElementId = element?.id ?? loaderElement?.id ?? elementIdParam;
  const projectPath = projectCode ? `/projects/${projectCode}` : "/projects";
  const elementPath = projectCode && element?.shortToken
    ? `/projects/${projectCode}/e/${element.shortToken}`
    : "/projects";
  const elementUrl = element?.shortToken ? `${siteOrigin}/e/${element.shortToken}` : `${siteOrigin}${elementPath}`;
  const displayableProgressUpdates = useMemo(
    () => progressUpdates.slice(0, MAX_PROGRESS_TIMELINE_ITEMS),
    [progressUpdates],
  );
  const visibleProgressUpdates = progressExpanded
    ? displayableProgressUpdates
    : displayableProgressUpdates.slice(0, COLLAPSED_PROGRESS_COUNT);
  const hiddenProgressCount = Math.max(0, displayableProgressUpdates.length - COLLAPSED_PROGRESS_COUNT);
  const canToggleProgressUpdates = hiddenProgressCount > 0;
  const progressLimitReached = progressUpdates.length >= MAX_PROGRESS_TIMELINE_ITEMS;
  const measureProgressLineMetrics = useCallback(() => {
    const container = progressTimelineRef.current;
    const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    const first = isDesktop ? progressFirstDesktopMarkerRef.current : progressFirstMobileMarkerRef.current;
    const last = isDesktop ? progressLastDesktopMarkerRef.current : progressLastMobileMarkerRef.current;
    if (!container || !first || !last) {
      return null;
    }

    const containerRect = container.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const left = firstRect.left + firstRect.width / 2 - containerRect.left;
    const top = firstRect.top + firstRect.height / 2 - containerRect.top;
    const bottom = lastRect.top + lastRect.height / 2 - containerRect.top;
    const height = Math.max(0, bottom - top);
    return { left, top, height };
  }, []);
  const updateProgressLineMetrics = useCallback(() => {
    const metrics = measureProgressLineMetrics();
    if (!metrics) {
      setProgressLineMetrics({ left: 0, top: 0, height: 0 });
      return null;
    }

    setProgressLineMetrics((current) => (
      Math.abs(current.left - metrics.left) < 0.5 && Math.abs(current.top - metrics.top) < 0.5 && Math.abs(current.height - metrics.height) < 0.5
        ? current
        : metrics
    ));
    return metrics;
  }, [measureProgressLineMetrics]);
  const scheduleProgressLineMeasurements = useCallback((duration = 360, onComplete?: (metrics: { left: number; top: number; height: number } | null) => void) => {
    if (typeof window === "undefined") return;
    if (progressMeasureFrameRef.current != null) {
      window.cancelAnimationFrame(progressMeasureFrameRef.current);
    }

    const startedAt = performance.now();
    let latestMetrics = updateProgressLineMetrics();
    const measureUntilSettled = (now: number) => {
      latestMetrics = updateProgressLineMetrics();
      if (now - startedAt < duration) {
        progressMeasureFrameRef.current = window.requestAnimationFrame(measureUntilSettled);
      } else {
        progressMeasureFrameRef.current = null;
        onComplete?.(latestMetrics);
      }
    };

    progressMeasureFrameRef.current = window.requestAnimationFrame(measureUntilSettled);
  }, [updateProgressLineMetrics]);
  const handleToggleProgressExpanded = useCallback(() => {
    setProgressLineFollowingToggle(true);
    flushSync(() => {
      setProgressExpanded((expanded) => !expanded);
    });
    scheduleProgressLineMeasurements(700, () => {
      setProgressLineFollowingToggle(false);
    });
  }, [scheduleProgressLineMeasurements]);

  const tabs: { key: Tab; label: string; mobileLabel: string; icon: typeof FileText }[] = [
    { key: "details",     label: "Details",        mobileLabel: "Details",  icon: FileText },
    { key: "progress",    label: "Progress",       mobileLabel: "Progress", icon: Camera },
    { key: "testResults", label: "Test Results",   mobileLabel: "Tests",    icon: FileText },
    { key: "planDocs",    label: "Plan Documents", mobileLabel: "Plans",    icon: Layers },
    ...(canViewActivity ? [{ key: "activity" as Tab, label: "Activity", mobileLabel: "Activity", icon: History }] : []),
  ];

  const closeScanner = useCallback(() => setScannerOpen(false), []);
  const handleScannedElement = useCallback((path: string) => {
    setScannerOpen(false);
    void navigate(path);
  }, [navigate]);

  useEffect(() => {
    setElement(loaderElement);
    if (loaderElement) {
      setTestResults(loaderElement.testResults);
      setPlanDocuments(loaderElement.planDocuments);
      setProgressUpdates(loaderElement.progressUpdates);
      setForm(getDraft(draftKey, {
        batch: loaderElement.batch?.toString() ?? "",
        serialNumber: loaderElement.serialNumber ?? "",
        name: loaderElement.name,
        location: loaderElement.location,
        status: loaderElement.status,
        castingDate: loaderElement.castingDate,
      }));
    }
    window.scrollTo({ top: 0 });
  }, [loaderElement, elementIdParam, draftKey]);

  useEffect(() => {
    if (editing) setDraft(draftKey, form);
  }, [editing, form, draftKey]);

  // Revoke any staged progress-image preview URLs when leaving the page.
  useEffect(() => () => {
    progressFiles.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    updateProgressLineMetrics();
    const frame = window.requestAnimationFrame(updateProgressLineMetrics);
    const settleTimer = window.setTimeout(updateProgressLineMetrics, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, [canToggleProgressUpdates, progressExpanded, updateProgressLineMetrics, visibleProgressUpdates.length]);

  useEffect(() => {
    window.addEventListener("resize", updateProgressLineMetrics);
    return () => window.removeEventListener("resize", updateProgressLineMetrics);
  }, [updateProgressLineMetrics]);

  useEffect(() => () => {
    if (progressMeasureFrameRef.current != null) {
      window.cancelAnimationFrame(progressMeasureFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!canViewActivity || !resolvedElementId) {
      setActivityItems([]);
      setActivityTotalPages(1);
      return;
    }
    const run = async () => {
      setActivityLoading(true);
      try {
        const data = await apiClient.listElementActivity(resolvedElementId, activityPage);
        setActivityItems(data.items);
        setActivityTotalPages(data.totalPages);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to load activity");
      } finally {
        setActivityLoading(false);
      }
    };
    void run();
  }, [activityPage, canViewActivity, resolvedElementId]);

  // Scroll-tracking for sticky nav
  useEffect(() => {
    const trackedTabs = tabs.map((t) => t.key);
    const onScroll = () => {
      if (isManualScrollingRef.current) return;
      const headerOffset = 170;
      let current: Tab = trackedTabs[0] ?? "details";
      for (const tab of trackedTabs) {
        const el = sectionRefs.current[tab];
        if (!el) continue;
        if (el.getBoundingClientRect().top - headerOffset <= 0) current = tab;
        else break;
      }
      setActiveTab((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [canViewActivity]);

  if (!element) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fc]">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-brand-secondary" />
          </div>
          <h2 className="text-brand-primary text-xl font-bold mb-2">Element Not Found</h2>
          <NavLink to={projectPath} className="text-brand-secondary hover:underline text-sm">Back to Project</NavLink>
        </div>
      </div>
    );
  }

  const isDelivered = element.status === "Delivered";

  const visibleTestResults = useMemo(
    () => testResults.filter((doc) => !doc.isConfidential || canViewConfidential),
    [testResults, canViewConfidential],
  );
  const visiblePlanDocuments = useMemo(
    () => planDocuments.filter((doc) => !doc.isConfidential || canViewConfidential),
    [planDocuments, canViewConfidential],
  );

  const scrollToSection = (tab: Tab) => {
    isManualScrollingRef.current = true;
    setActiveTab(tab);
    const el = sectionRefs.current[tab];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top, behavior: "smooth" });
    }
    window.setTimeout(() => { isManualScrollingRef.current = false; }, 450);
  };

  const saveElement = async () => {
    if (!resolvedProjectId || !resolvedElementId) return;
    const batchValue = (form.batch ?? "").trim();
    const serialNumberValue = (form.serialNumber ?? "").trim();
    const hasBatch = batchValue.length > 0;
    const hasSerialNumber = serialNumberValue.length > 0;
    if (hasBatch !== hasSerialNumber) { setError("Batch and serial number must both be assigned."); return; }
    if (hasBatch && (!Number.isInteger(Number(batchValue)) || Number(batchValue) <= 0)) { setError("Batch must be a positive whole number."); return; }
    if (hasSerialNumber && !/^\d+(?:-\d+)*$/.test(serialNumberValue)) { setError("Serial number must contain digits separated by single hyphens."); return; }
    if ((element.batch != null || element.serialNumber != null) && !hasBatch) { setError("An assigned batch and serial number cannot be cleared."); return; }
    setSaving(true); setError(null);
    try {
      await apiClient.updateElement(resolvedProjectId, resolvedElementId, {
        ...(hasBatch ? { batch: Number(batchValue), serialNumber: serialNumberValue } : {}),
        name: form.name,
        location: form.location,
        status: form.status as "Casted" | "Delivered",
        castingDate: form.castingDate,
      });
      setElement(await apiClient.getElement(resolvedProjectId, resolvedElementId));
      setEditing(false);
      clearDraft(draftKey);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update element");
    } finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditing(false); setError(null); clearDraft(draftKey);
    setForm({
      batch: element.batch?.toString() ?? "",
      serialNumber: element.serialNumber ?? "",
      name: element.name,
      location: element.location,
      status: element.status,
      castingDate: element.castingDate,
    });
  };

  const handleDownload = async (documentId: string) => {
    try {
      const url = await apiClient.getDocumentDownloadUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) { window.alert("You do not have access to this confidential document."); return; }
      window.alert("Unable to download document right now.");
    }
  };

  const inferDocType = (fileName: string): "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF" | "OTHER" => {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF"> = { pdf: "PDF", doc: "DOCX", docx: "DOCX", xls: "XLSX", xlsx: "XLSX", dwg: "DWG", dxf: "DXF" };
    return map[ext] ?? "OTHER";
  };

  const handleUpload = async (file: File, category: "TEST_RESULT" | "PLAN") => {
    if (!resolvedElementId) return;
    setUploading(true); setUploadError(null);
    try {
      const upload = await apiClient.createElementDocumentUploadUrl(resolvedElementId, {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      await uploadToPresignedUrl(upload.uploadUrl, file);
      const doc = await apiClient.finalizeElementDocument(resolvedElementId, {
        name: file.name,
        category,
        docType: inferDocType(file.name),
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        s3Key: upload.s3Key,
        isConfidential: false,
      });
      if (category === "TEST_RESULT") setTestResults((prev) => [doc, ...prev]);
      else setPlanDocuments((prev) => [doc, ...prev]);
    } catch (err) {
      setUploadError(err instanceof ApiClientError ? err.message : "Upload failed");
    } finally { setUploading(false); }
  };

  const addProgressFiles = (files: FileList | File[]) => {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    const file = images[0];
    setProgressFiles((prev) => {
      prev.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      return [{ file, previewUrl: URL.createObjectURL(file) }];
    });
  };

  const removeProgressFile = (index: number) => {
    setProgressFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePostProgress = async () => {
    if (!resolvedElementId) return;
    if (progressLimitReached) {
      setProgressError(`This element already has the maximum of ${MAX_PROGRESS_TIMELINE_ITEMS} progress updates.`);
      return;
    }
    const note = progressNote.trim();
    if (note.length === 0 && progressFiles.length === 0) return;
    setPostingProgress(true); setProgressError(null);
    try {
      const images = [];
      for (const { file } of progressFiles) {
        const upload = await apiClient.createProgressUpdateUploadUrl(resolvedElementId, {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });
        await uploadToPresignedUrl(upload.uploadUrl, file);
        images.push({ name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, s3Key: upload.s3Key });
      }
      const update = await apiClient.createProgressUpdate(resolvedElementId, { note, images });
      setProgressLineFollowingToggle(true);
      flushSync(() => {
        setProgressUpdates((prev) => [update, ...prev]);
      });
      scheduleProgressLineMeasurements(700, () => {
        setProgressLineFollowingToggle(false);
      });
      progressFiles.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setProgressFiles([]);
      setProgressNote("");
    } catch (err) {
      setProgressError(err instanceof ApiClientError ? err.message : "Failed to post update");
    } finally { setPostingProgress(false); }
  };

  const handleDeleteProgress = async (update: ProgressUpdateDTO) => {
    if (!window.confirm("Delete this progress update and its photo?")) return;
    try {
      await apiClient.deleteProgressUpdate(update.id);
      setProgressLineFollowingToggle(true);
      flushSync(() => {
        setProgressUpdates((prev) => prev.filter((u) => u.id !== update.id));
      });
      scheduleProgressLineMeasurements(700, () => {
        setProgressLineFollowingToggle(false);
      });
    } catch (err) { setProgressError(err instanceof ApiClientError ? err.message : "Failed to delete update"); }
  };

  const handleToggleConfidential = async (document: ProjectDocumentDTO, category: "TEST_RESULT" | "PLAN") => {
    try {
      const updated = await apiClient.updateElementDocument(document.id, { isConfidential: !document.isConfidential });
      if (category === "TEST_RESULT") setTestResults((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      else setPlanDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Failed to update document"); }
  };

  const handleDeleteDocument = async (document: ProjectDocumentDTO, category: "TEST_RESULT" | "PLAN") => {
    if (!window.confirm(`Delete document "${document.name}"?`)) return;
    try {
      await apiClient.deleteElementDocument(document.id);
      if (category === "TEST_RESULT") setTestResults((prev) => prev.filter((d) => d.id !== document.id));
      else setPlanDocuments((prev) => prev.filter((d) => d.id !== document.id));
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Failed to delete document"); }
  };

  const handleDelete = async () => {
    if (!resolvedProjectId || !resolvedElementId) return;
    setDeleting(true); setError(null);
    try {
      await apiClient.deleteElement(resolvedProjectId, resolvedElementId);
      void navigate(projectPath);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete element");
      setShowDeleteConfirm(false);
    } finally { setDeleting(false); }
  };

  const DOC_PAGE_SIZE = 8;
  const visibleTestResultsPaged = visibleTestResults.slice((testResultDocPage - 1) * DOC_PAGE_SIZE, testResultDocPage * DOC_PAGE_SIZE);
  const visiblePlanDocsPaged = visiblePlanDocuments.slice((planDocPage - 1) * DOC_PAGE_SIZE, planDocPage * DOC_PAGE_SIZE);
  const testResultTotalPages = Math.ceil(visibleTestResults.length / DOC_PAGE_SIZE);
  const planDocTotalPages = Math.ceil(visiblePlanDocuments.length / DOC_PAGE_SIZE);
  const progressFillHeight = progressLineMetrics.height;
  const progressTrackTransition = shouldReduceMotion || progressLineFollowingToggle
    ? { duration: 0 }
    : { duration: 0.35, ease: EASE_STRUCTURAL };
  const progressFillTransition = shouldReduceMotion || progressLineFollowingToggle
    ? { duration: 0 }
    : {
        left: { duration: 0.35, ease: EASE_STRUCTURAL },
        top: { duration: 0.35, ease: EASE_STRUCTURAL },
        height: { duration: 0.65, ease: EASE_STRUCTURAL },
      };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f7fc]">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative h-[340px] sm:h-[400px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1046] via-[#1a237e]/90 to-[#10184c]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1550]/40 to-transparent" />
        <div
          className="absolute bottom-0 right-0 w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(circle, #29aae2 0%, transparent 70%)", opacity: 0.07, transform: "translate(30%, 30%)" }}
        />

        <div className="relative h-full max-w-[80rem] mx-auto px-4 sm:px-6 flex flex-col justify-between pt-5 sm:pt-8 pb-0 w-full">
          {/* Breadcrumb row */}
          <motion.div
            className="flex items-center gap-3"
            variants={shouldReduceMotion ? undefined : heroContainerVariants}
            initial="hidden"
            animate="animate"
          >
            <motion.div
              className="min-w-0 flex-1"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              <PageBreadcrumb
                variant="light"
                items={[
                  { label: "Projects", href: "/projects" },
                  { label: element.projectName, href: projectPath },
                  { label: element.name },
                ]}
              />
            </motion.div>

          </motion.div>

          {/* Hero content */}
          <motion.div
            className="pb-12 sm:pb-16"
            variants={shouldReduceMotion ? undefined : heroContainerVariants}
            initial="hidden"
            animate="animate"
          >
            <motion.div
              className="flex flex-wrap items-center gap-2 mb-3"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                isDelivered ? "bg-green-500/90 text-white" : "bg-brand-secondary/90 text-white"
              }`}>
                {isDelivered ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {element.status}
              </span>
              <span className="text-[11px] text-white/60 font-mono tracking-wider bg-white/10 px-2.5 py-1 rounded-full">
                {element.batch != null && element.serialNumber != null
                  ? `Batch ${element.batch} · Serial ${element.serialNumber}`
                  : "Unassigned"}
              </span>
            </motion.div>

            <motion.h1
              className="text-white font-extrabold leading-none mb-3"
              style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)" }}
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              {element.name}
            </motion.h1>

            <motion.div
              className="flex flex-col items-start gap-2 text-white/80 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:text-sm"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-secondary" />
                {element.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-secondary" />
                Cast: {new Date(element.castingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-secondary" />
                {element.projectName}
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="hidden sm:block max-w-[80rem] mx-auto px-6 relative z-10 -mt-10">
        <motion.div
          className="bg-white border border-brand-border/60 rounded-2xl shadow-[0_8px_40px_rgba(26,35,126,0.12)] grid grid-cols-2 md:grid-cols-4 overflow-hidden"
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_STRUCTURAL, delay: 0.3 }}
        >
          {[
            { label: "Status", value: element.status, icon: isDelivered ? CheckCircle2 : Clock, accent: isDelivered ? "text-green-700" : "text-brand-secondary" },
            { label: "Batch / Serial", value: element.batch != null && element.serialNumber != null ? `Batch ${element.batch} · ${element.serialNumber}` : "Unassigned", icon: FileText, accent: null },
            { label: "Casting Date", value: new Date(element.castingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), icon: Calendar, accent: null },
            { label: "Location", value: element.location, icon: MapPin, accent: null },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`min-w-0 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col gap-1 border-brand-border/40 ${i < 2 ? "border-b md:border-b-0" : ""} ${i === 0 || i === 2 ? "border-r" : ""} ${i === 1 ? "md:border-r" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-1.5 text-brand-muted text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.08em] sm:tracking-wider">
                <stat.icon className="w-3 h-3 shrink-0" />
                {stat.label}
              </div>
              <div className={`font-bold text-base sm:text-lg leading-tight break-words ${stat.accent ?? "text-brand-primary"}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Sticky section navigation ───────────────────────────────────── */}
      <div className="sticky top-[72px] sm:top-[80px] z-40 bg-[#f5f7fc]/95 backdrop-blur-md">
        <div className="max-w-[80rem] mx-auto border-b border-brand-border/40">
          <SlidingSectionTabs tabs={tabs} activeTab={activeTab} onTabChange={scrollToSection} back={{ label: "Project Details", href: projectPath }} />
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16 space-y-12 sm:space-y-16">

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Section: Element Details ─────────────────────────────────── */}
        <section ref={(el) => { sectionRefs.current.details = el; }}>
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <div className="flex items-center justify-between gap-3 mb-2">
                <SectionHeading icon={FileText} label="Element Details" />

                {canEdit && (
                  <div className="flex shrink-0 items-center gap-2">
                    {currentUser?.role === "admin" && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={deleting}
                        className="min-h-10 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{deleting ? "Deleting…" : "Delete"}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setEditing((v) => !v)}
                      className={`min-h-10 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                        editing
                          ? "bg-brand-primary text-white border-brand-primary hover:bg-brand-primary-hover"
                          : "bg-white text-brand-primary border-brand-border hover:bg-brand-soft"
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{editing ? "Editing…" : "Edit Details"}</span>
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div
                key="edit-form"
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={transitionFast}
                className="mt-4 sm:mt-6 bg-white border border-brand-border/60 rounded-2xl p-4 sm:p-6 shadow-sm"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <EditField label="Batch">
                    <input type="number" value={form.batch ?? ""} onChange={(e) => setForm((s) => ({ ...s, batch: e.target.value }))} className={inputCls} />
                  </EditField>
                  <EditField label="Serial Number">
                    <input type="text" value={form.serialNumber ?? ""} onChange={(e) => setForm((s) => ({ ...s, serialNumber: e.target.value }))} className={inputCls} />
                  </EditField>
                  <EditField label="Element Name">
                    <input type="text" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} />
                  </EditField>
                  <EditField label="Location">
                    <input type="text" value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} className={inputCls} />
                  </EditField>
                  <EditField label="Status">
                    <select className={inputCls} value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as "Casted" | "Delivered" }))}>
                      <option value="Casted">Casted</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </EditField>
                  <EditField label="Casting Date">
                    <input type="date" value={form.castingDate} onChange={(e) => setForm((s) => ({ ...s, castingDate: e.target.value }))} className={inputCls} />
                  </EditField>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-brand-border/40">
                  <button onClick={cancelEdit} className="min-h-11 px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm flex items-center gap-1.5 hover:bg-[#f5f7fc] transition-colors cursor-pointer">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button onClick={() => void saveElement()} disabled={saving} className="min-h-11 px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-brand-primary-hover transition-colors disabled:opacity-50 cursor-pointer">
                    <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
                  </motion.div>
                ) : (
                  <motion.div
                key="view-details"
                initial={shouldReduceMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={transitionFast}
                    className="mt-4 sm:mt-6"
              >
                {/* Metadata cards */}
                <motion.div
                  className="grid gap-3 sm:grid-cols-2"
                  variants={shouldReduceMotion ? undefined : staggerContainerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={VIEWPORT}
                >
                  {[
                    { label: "Batch", value: element.batch?.toString() ?? "Unassigned", icon: FileText },
                    { label: "Serial Number", value: element.serialNumber ?? "Unassigned", icon: FileText },
                    { label: "Element Name", value: element.name, icon: FileText },
                    { label: "Location", value: element.location, icon: MapPin },
                    {
                      label: "Status",
                      value: element.status,
                      icon: isDelivered ? CheckCircle2 : Clock,
                      badge: isDelivered ? "bg-green-100 text-green-700" : "bg-brand-highlight text-brand-secondary",
                    },
                    {
                      label: "Casting Date",
                      value: new Date(element.castingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
                      icon: Calendar,
                    },
                    ...(canEdit ? [
                      { label: "Created By", value: element.createdBy, icon: User },
                      { label: "Created Date", value: new Date(element.createdDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), icon: Calendar },
                      { label: "Last Updated", value: new Date(element.lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), icon: Clock },
                    ] : []),
                  ].map((item) => (
                    <motion.div
                      key={item.label}
                      className="min-w-0 bg-white border border-brand-border/50 rounded-xl p-3 sm:p-4 hover:shadow-sm hover:border-brand-secondary/30 transition-all"
                      variants={shouldReduceMotion ? undefined : staggerChildVariants}
                    >
                      <div className="flex min-w-0 items-center gap-1.5 text-brand-muted text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.06em] sm:tracking-wider mb-1.5">
                        <item.icon className="w-3 h-3 shrink-0" />
                        {item.label}
                      </div>
                      {"badge" in item && item.badge ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.badge}`}>{item.value}</span>
                      ) : (
                        <div className="text-brand-primary text-xs sm:text-sm font-semibold leading-snug break-words">{item.value}</div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* QR Code card — aligned with the section title on desktop */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white border border-brand-border/50 rounded-2xl p-5 sm:p-6 shadow-sm sticky top-36">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-4 h-4 text-brand-secondary" />
                  <span className="text-brand-primary text-sm font-semibold">Element QR Code</span>
                </div>
                <QRCodeDisplay value={elementUrl} batch={element.batch} serialNumber={element.serialNumber} fallbackName={element.name} size={200} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Progress Details ─────────────────────────────────── */}
        <motion.section
          ref={(el) => { sectionRefs.current.progress = el; }}
          variants={shouldReduceMotion ? undefined : fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <SectionHeading icon={Camera} label="Progress Details" />
          <p className="text-brand-muted text-sm mt-1 mb-4">Field photos and notes tracking how this element progressed.</p>

          {progressError && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" /> {progressError}
            </div>
          )}

          {canEdit && progressLimitReached && (
            <div className="mb-6 rounded-2xl border border-brand-border/60 bg-white px-4 py-4 shadow-sm sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  <CheckCircle2 className="h-4 w-4 text-brand-secondary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-primary">Progress update limit reached</p>
                  <p className="mt-0.5 text-xs text-brand-muted">This element can have up to {MAX_PROGRESS_TIMELINE_ITEMS} progress updates. Delete an update to post a new one.</p>
                </div>
              </div>
            </div>
          )}

          {canEdit && !progressLimitReached && (
            <div className="mb-6 bg-white border border-brand-border/60 rounded-2xl p-4 sm:p-6 shadow-sm">
              <textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                rows={3}
                placeholder="What changed? e.g. Stripped from mould, cured 7 days…"
                className={`${inputCls} resize-none`}
              />

              {progressFiles[0] && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-brand-border/60 bg-[#f5f7fc] p-2">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-brand-border/50 bg-white">
                    <img src={progressFiles[0].previewUrl} alt={progressFiles[0].file.name} className="absolute inset-0 h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeProgressFile(0)}
                      aria-label={`Remove ${progressFiles[0].file.name}`}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="truncate text-sm font-semibold text-brand-primary">{progressFiles[0].file.name}</p>
                    <p className="mt-1 text-xs text-brand-muted">One progress photo will be attached to this update.</p>
                  </div>
                </div>
              )}

              <div
                className={`mt-3 rounded-2xl border-2 border-dashed p-4 sm:p-5 text-center transition-colors ${
                  progressDragActive ? "border-brand-primary bg-brand-soft" : "border-brand-border hover:border-brand-secondary/60 bg-[#f5f7fc]"
                }`}
                onDragOver={(e) => { e.preventDefault(); setProgressDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setProgressDragActive(false); }}
                onDrop={(e) => { e.preventDefault(); setProgressDragActive(false); if (e.dataTransfer.files?.length) addProgressFiles(e.dataTransfer.files); }}
              >
                <div className="flex justify-center mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${progressDragActive ? "bg-brand-primary/10" : "bg-white"}`}>
                    <Upload className="w-4 h-4 text-brand-secondary" />
                  </div>
                </div>
                <p className="text-brand-primary text-sm font-semibold mb-0.5">
                  {progressDragActive ? "Drop photo here" : <><span className="sm:hidden">Add photo</span><span className="hidden sm:inline">Drag one photo here or browse</span></>}
                </p>
                <p className="text-brand-muted text-xs mb-3">JPG, PNG, HEIC — one image only</p>
                <button
                  type="button"
                  className="min-h-10 px-4 py-2 rounded-lg border border-brand-border text-brand-primary bg-white text-sm font-medium hover:bg-[#f5f7fc] transition-colors cursor-pointer"
                  onClick={() => progressInputRef.current?.click()}
                >
                  Browse Photo
                </button>
                <input
                  ref={progressInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) addProgressFiles(e.target.files); e.currentTarget.value = ""; }}
                />
              </div>

              <div className="flex justify-end mt-4 pt-4 border-t border-brand-border/40">
                <button
                  type="button"
                  onClick={() => void handlePostProgress()}
                  disabled={postingProgress || (progressNote.trim().length === 0 && progressFiles.length === 0)}
                  className="min-h-11 px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-brand-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> {postingProgress ? "Posting…" : "Post Update"}
                </button>
              </div>
            </div>
          )}

          {progressUpdates.length === 0 ? (
            <div className="bg-white border border-dashed border-brand-border rounded-2xl p-8 text-center">
              <Camera className="w-7 h-7 text-brand-muted mx-auto mb-2 opacity-40" />
              <p className="text-brand-muted text-sm">No progress updates yet.</p>
            </div>
          ) : (
            <div ref={progressTimelineRef} className="relative md:space-y-8">
              {progressLineMetrics.height > 0 && (
                <>
                  <motion.div
                    className="pointer-events-none absolute w-1 bg-brand-border/80 -translate-x-1/2 rounded-full z-20"
                    initial={false}
                    animate={{ left: progressLineMetrics.left, top: progressLineMetrics.top, height: progressLineMetrics.height }}
                    transition={progressTrackTransition}
                  />
                  <motion.div
                    className="pointer-events-none absolute w-0.5 bg-brand-primary -translate-x-1/2 rounded-full z-20"
                    initial={shouldReduceMotion ? false : { left: progressLineMetrics.left, top: progressLineMetrics.top, height: 0 }}
                    animate={{ left: progressLineMetrics.left, top: progressLineMetrics.top, height: progressFillHeight }}
                    transition={progressFillTransition}
                  />
                </>
              )}
              <div className="space-y-4 md:space-y-8">
                <AnimatePresence initial={false} mode="popLayout">
                  {visibleProgressUpdates.map((update, index) => (
                  <motion.div
                    key={update.id}
                    layout
                    className="relative z-30 w-full"
                    initial={shouldReduceMotion ? false : { opacity: 0, height: 0, y: -8 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, height: "auto", y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: EASE_STRUCTURAL }}
                  >
                    <motion.div
                      className="flex md:hidden"
                      variants={shouldReduceMotion ? undefined : slideFromLeftVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={VIEWPORT}
                    >
                      <div className="flex flex-col items-center mr-4 shrink-0">
                        <div className="w-px flex-1 bg-transparent" style={{ minHeight: "1rem" }} />
                        <div
                          ref={(el) => {
                            if (index === 0) progressFirstMobileMarkerRef.current = el;
                            if (!canToggleProgressUpdates && index === visibleProgressUpdates.length - 1) progressLastMobileMarkerRef.current = el;
                          }}
                          className="relative z-30 h-9 min-w-16 px-2.5 rounded-full flex items-center justify-center border-2 shrink-0 bg-white border-brand-primary text-brand-primary shadow-sm"
                        >
                          <span className="whitespace-nowrap text-center text-[0.62rem] font-bold uppercase leading-none">{update.time}</span>
                        </div>
                        <div className="w-px flex-1 bg-transparent" style={{ minHeight: "1rem" }} />
                      </div>
                      <div className="flex-1 py-2 min-w-0">
                        <div className="relative z-10 rounded-2xl p-4 border border-brand-border/60 bg-white shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-brand-primary text-sm font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                                <span>{formatProgressDate(update.date)}</span>
                              </div>
                              <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-brand-muted">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{update.author}</span>
                                <span className="text-brand-border">/</span>
                                <span className="shrink-0">{update.role}</span>
                              </span>
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteProgress(update)}
                                aria-label="Delete progress update"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {update.note && (
                            <p className="text-brand-body text-sm leading-relaxed whitespace-pre-line mt-2">{update.note}</p>
                          )}
                          {update.images[0] && (
                            <ProgressImageThumb
                              image={update.images[0]}
                              className="mt-3 h-40 w-full"
                              onOpen={() => setViewingProgressImage(progressImageToDoc(update.images[0], update.date))}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      className={`hidden md:flex md:flex-row items-center gap-6 ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                      variants={shouldReduceMotion ? undefined : (index % 2 === 0 ? slideFromLeftVariants : slideFromRightVariants)}
                      initial="hidden"
                      whileInView="visible"
                      viewport={VIEWPORT}
                    >
                      <div className="md:w-[calc(50%-2rem)] w-full">
                        <div className="relative z-10 rounded-2xl p-4 border border-brand-border/60 bg-white shadow-sm transition-shadow hover:shadow-md">
                          <div className="flex items-start gap-4">
                            {update.images[0] && (
                              <ProgressImageThumb
                                image={update.images[0]}
                                className="h-28 w-28 shrink-0"
                                onOpen={() => setViewingProgressImage(progressImageToDoc(update.images[0], update.date))}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-brand-primary text-sm font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                                <span>{formatProgressDate(update.date)}</span>
                              </div>
                              <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-brand-muted">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{update.author}</span>
                                <span className="text-brand-border">/</span>
                                <span className="shrink-0">{update.role}</span>
                              </span>
                              {update.note && (
                                <p className="text-brand-body text-sm leading-relaxed whitespace-pre-line mt-2">{update.note}</p>
                              )}
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteProgress(update)}
                                aria-label="Delete progress update"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="md:w-20 flex justify-center shrink-0">
                        <div
                          ref={(el) => {
                            if (index === 0) progressFirstDesktopMarkerRef.current = el;
                            if (!canToggleProgressUpdates && index === visibleProgressUpdates.length - 1) progressLastDesktopMarkerRef.current = el;
                          }}
                          className="relative z-30 h-10 min-w-20 px-3 rounded-full flex items-center justify-center border-2 shrink-0 bg-white border-brand-primary text-brand-primary shadow-sm"
                        >
                          <span className="whitespace-nowrap text-center text-[0.68rem] font-bold uppercase leading-none">{update.time}</span>
                        </div>
                      </div>
                      <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                    </motion.div>
                  </motion.div>
                  ))}
                </AnimatePresence>
                {canToggleProgressUpdates && (
                  <motion.div layout className="relative z-30 w-full">
                    <div className="flex md:hidden">
                      <div className="flex w-full items-center justify-center">
                        <motion.button
                          type="button"
                          layout
                          ref={(el) => { progressLastMobileMarkerRef.current = el; }}
                          onClick={handleToggleProgressExpanded}
                          aria-expanded={progressExpanded}
                          className="relative z-10 min-h-10 w-full whitespace-nowrap rounded-full border-2 border-brand-primary bg-brand-primary px-4 py-2 text-[0.68rem] font-bold uppercase leading-none text-white shadow-sm transition-colors hover:bg-brand-primary-hover hover:border-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 cursor-pointer"
                        >
                          <span className="relative z-30">{progressExpanded ? "View Less" : "View More"}</span>
                        </motion.button>
                      </div>
                    </div>
                    <div className="hidden md:flex md:flex-row items-center gap-6">
                      <div className="md:w-[calc(50%-2rem)]" />
                      <div className="md:w-20 flex justify-center shrink-0">
                        <motion.button
                          type="button"
                          layout
                          ref={(el) => { progressLastDesktopMarkerRef.current = el; }}
                          onClick={handleToggleProgressExpanded}
                          aria-expanded={progressExpanded}
                          className="relative z-10 min-h-10 whitespace-nowrap rounded-full border-2 border-brand-primary bg-brand-primary px-4 py-2 text-[0.68rem] font-bold uppercase leading-none text-white shadow-sm transition-colors hover:bg-brand-primary-hover hover:border-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 cursor-pointer"
                        >
                          <span className="relative z-30">{progressExpanded ? "View Less" : "View More"}</span>
                        </motion.button>
                      </div>
                      <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.section>

        {/* ── Section: Test Results ─────────────────────────────────────── */}
        <motion.section
          ref={(el) => { sectionRefs.current.testResults = el; }}
          variants={shouldReduceMotion ? undefined : fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <SectionHeading icon={FileText} label="Test Results" />
          <p className="text-brand-muted text-sm mt-1 mb-4">Compressive strength tests, slump tests, and quality assurance documents.</p>

          {uploadError && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" /> {uploadError}
            </div>
          )}

          {canEdit && (
            <div className="mb-4">
              <div
                className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition-colors ${
                  isTestResultDragActive ? "border-brand-primary bg-brand-soft" : "border-brand-border hover:border-brand-secondary/60 bg-white"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsTestResultDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsTestResultDragActive(false); }}
                onDrop={(e) => { e.preventDefault(); setIsTestResultDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) void handleUpload(file, "TEST_RESULT"); }}
              >
                <div className="flex justify-center mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTestResultDragActive ? "bg-brand-primary/10" : "bg-[#f5f7fc]"}`}>
                    <Upload className="w-5 h-5 text-brand-secondary" />
                  </div>
                </div>
                <p className="text-brand-primary text-sm font-semibold mb-1">
                  {isTestResultDragActive ? "Drop files here" : <><span className="sm:hidden">Choose files to upload</span><span className="hidden sm:inline">Drag files here or browse</span></>}
                </p>
                <p className="text-brand-muted text-xs mb-3">PDF, DOCX, XLSX, DWG, DXF — max 10 MB</p>
                <button
                  type="button"
                  disabled={uploading}
                  className="min-h-11 px-5 py-2 rounded-lg border border-brand-border text-brand-primary bg-white text-sm font-medium hover:bg-[#f5f7fc] transition-colors disabled:opacity-50 cursor-pointer"
                  onClick={() => testResultInputRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Browse Files"}
                </button>
                <input ref={testResultInputRef} type="file" className="hidden" disabled={uploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, "TEST_RESULT"); e.currentTarget.value = ""; }} />
              </div>
            </div>
          )}

          {visibleTestResults.length === 0 ? (
            <div className="bg-white border border-dashed border-brand-border rounded-2xl p-8 text-center">
              <FileText className="w-7 h-7 text-brand-muted mx-auto mb-2 opacity-40" />
              <p className="text-brand-muted text-sm">No test results uploaded yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {visibleTestResultsPaged.map((doc) => (
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewingDoc(doc)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setViewingDoc(doc); }}
                    className="bg-white rounded-xl border border-brand-border/60 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
                  >
                    <DocPreviewPanel doc={doc} onGetUrl={() => apiClient.getDocumentDownloadUrl(doc.id)} />
                    <div className="flex flex-col flex-1 p-2.5 sm:p-3 min-w-0">
                      <p className="text-brand-primary text-xs sm:text-sm font-semibold leading-snug line-clamp-2 mb-1.5 min-h-[2.4em]">{doc.name}</p>
                      <div className="flex items-center gap-1 flex-wrap mb-2.5">
                        <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-brand-muted/70">{doc.size}</span>
                        <span className="w-0.5 h-0.5 bg-brand-border rounded-full" />
                        <span className="text-[9px] sm:text-[10px] text-brand-muted/60">{doc.date}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-brand-border/40 pt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleDownload(doc.id); }}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-primary hover:bg-brand-soft transition-colors cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleToggleConfidential(doc, "TEST_RESULT"); }}
                              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${doc.isConfidential ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-brand-muted hover:text-brand-primary hover:bg-brand-soft"}`}
                              title={doc.isConfidential ? "Make Public" : "Make Confidential"}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleDeleteDocument(doc, "TEST_RESULT"); }}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {testResultTotalPages > 1 && (
                <Paginator page={testResultDocPage} totalPages={testResultTotalPages} onPageChange={setTestResultDocPage} />
              )}
            </>
          )}
        </motion.section>

        {/* ── Section: Plan Documents ───────────────────────────────────── */}
        <motion.section
          ref={(el) => { sectionRefs.current.planDocs = el; }}
          variants={shouldReduceMotion ? undefined : fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <SectionHeading icon={Layers} label="Plan Documents" />
          <p className="text-brand-muted text-sm mt-1 mb-4">Fabrication drawings, reinforcement plans, and stripping documents.</p>

          {canEdit && (
            <div className="mb-4">
              <div
                className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition-colors ${
                  isPlanDocDragActive ? "border-brand-primary bg-brand-soft" : "border-brand-border hover:border-brand-secondary/60 bg-white"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsPlanDocDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsPlanDocDragActive(false); }}
                onDrop={(e) => { e.preventDefault(); setIsPlanDocDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) void handleUpload(file, "PLAN"); }}
              >
                <div className="flex justify-center mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPlanDocDragActive ? "bg-brand-primary/10" : "bg-[#f5f7fc]"}`}>
                    <Upload className="w-5 h-5 text-brand-secondary" />
                  </div>
                </div>
                <p className="text-brand-primary text-sm font-semibold mb-1">
                  {isPlanDocDragActive ? "Drop files here" : <><span className="sm:hidden">Choose files to upload</span><span className="hidden sm:inline">Drag files here or browse</span></>}
                </p>
                <p className="text-brand-muted text-xs mb-3">PDF, DOCX, XLSX, DWG, DXF — max 10 MB</p>
                <button
                  type="button"
                  disabled={uploading}
                  className="min-h-11 px-5 py-2 rounded-lg border border-brand-border text-brand-primary bg-white text-sm font-medium hover:bg-[#f5f7fc] transition-colors disabled:opacity-50 cursor-pointer"
                  onClick={() => planDocInputRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Browse Files"}
                </button>
                <input ref={planDocInputRef} type="file" className="hidden" disabled={uploading}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleUpload(file, "PLAN"); e.currentTarget.value = ""; }} />
              </div>
            </div>
          )}

          {visiblePlanDocuments.length === 0 ? (
            <div className="bg-white border border-dashed border-brand-border rounded-2xl p-8 text-center">
              <Layers className="w-7 h-7 text-brand-muted mx-auto mb-2 opacity-40" />
              <p className="text-brand-muted text-sm">No plan documents uploaded yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {visiblePlanDocsPaged.map((doc) => (
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setViewingDoc(doc)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setViewingDoc(doc); }}
                    className="bg-white rounded-xl border border-brand-border/60 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
                  >
                    <DocPreviewPanel doc={doc} onGetUrl={() => apiClient.getDocumentDownloadUrl(doc.id)} />
                    <div className="flex flex-col flex-1 p-2.5 sm:p-3 min-w-0">
                      <p className="text-brand-primary text-xs sm:text-sm font-semibold leading-snug line-clamp-2 mb-1.5 min-h-[2.4em]">{doc.name}</p>
                      <div className="flex items-center gap-1 flex-wrap mb-2.5">
                        <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-brand-muted/70">{doc.size}</span>
                        <span className="w-0.5 h-0.5 bg-brand-border rounded-full" />
                        <span className="text-[9px] sm:text-[10px] text-brand-muted/60">{doc.date}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-brand-border/40 pt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleDownload(doc.id); }}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-primary hover:bg-brand-soft transition-colors cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleToggleConfidential(doc, "PLAN"); }}
                              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${doc.isConfidential ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-brand-muted hover:text-brand-primary hover:bg-brand-soft"}`}
                              title={doc.isConfidential ? "Make Public" : "Make Confidential"}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleDeleteDocument(doc, "PLAN"); }}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {planDocTotalPages > 1 && (
                <Paginator page={planDocPage} totalPages={planDocTotalPages} onPageChange={setPlanDocPage} />
              )}
            </>
          )}
        </motion.section>

        {/* ── Section: Activity History ─────────────────────────────────── */}
        {canViewActivity && (
          <motion.section
            ref={(el) => { sectionRefs.current.activity = el; }}
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <SectionHeading icon={History} label="Activity History" />
            <p className="text-brand-muted text-sm mt-1 mb-6">Complete log of all actions, updates, and status changes for this element.</p>

            {activityLoading ? (
              <div className="flex items-center gap-2 text-brand-muted text-sm">
                <div className="w-4 h-4 border-2 border-brand-border border-t-brand-secondary rounded-full animate-spin" />
                Loading activity…
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-1.5 sm:left-4 top-2 bottom-2 w-px bg-brand-border" />
                <div className="space-y-3 sm:space-y-4 pl-7 sm:pl-12">
                  {activityItems.map((act) => {
                    const style = activityIcons[act.type] ?? activityIcons.updated;
                    return (
                      <div key={act.id} className="relative">
                        <div className={`absolute -left-[25px] sm:-left-8 top-4 w-2.5 h-2.5 rounded-full border-2 border-[#f5f7fc] ${style.dot}`} />
                        <div className="bg-white border border-brand-border/50 rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${style.color}`}>{act.action}</span>
                            <span className="text-brand-muted text-xs">{act.date} · {act.time}</span>
                          </div>
                          <ActivityDescription description={act.description} />
                          <div className="flex items-center gap-1.5 text-brand-muted text-xs mt-3 pt-3 border-t border-brand-border/40">
                            <User className="w-3 h-3" /> {act.user} · {act.role}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Paginator page={activityPage} totalPages={activityTotalPages} onPageChange={setActivityPage} />
          </motion.section>
        )}

        <div
          className="h-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:hidden"
          aria-hidden="true"
        />
      </div>

      {/* ── Mobile field scanner dock ──────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        aria-label="Scan QR to open another element"
        className="group fixed left-4 right-4 z-[90] flex min-h-[68px] items-center gap-3 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-[#1a237e] to-[#10175d] p-2.5 pr-3 text-left text-white shadow-[0_14px_34px_rgba(10,16,70,0.38),0_2px_6px_rgba(10,16,70,0.24)] transition-[transform,box-shadow,background-color] active:translate-y-px active:scale-[0.985] active:shadow-[0_8px_20px_rgba(10,16,70,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2 md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#29aae2] to-transparent" />
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-secondary text-white shadow-[0_5px_14px_rgba(41,170,226,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]">
          <QrCode className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-tight text-white">Scan QR code</span>
          <span className="mt-1 block text-xs leading-tight text-white/70">View another element</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-transform group-active:translate-x-0.5">
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      {/* ── Delete confirm modal ─────────────────────────────────────────── */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Element"
        description={`"${element.name}" and all its documents and activity history will be permanently removed. This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete Element"
        onConfirm={handleDelete}
        loading={deleting}
        maxWidth="max-w-sm"
      />

      {/* ── Document viewer ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingDoc && (
          <React.Suspense fallback={null}>
            <DocumentViewer
              doc={viewingDoc}
              projectId={resolvedProjectId ?? ""}
              getDownloadUrl={(doc) => apiClient.getDocumentDownloadUrl(doc.id)}
              onClose={() => setViewingDoc(null)}
            />
          </React.Suspense>
        )}
      </AnimatePresence>

      {/* ── Progress image viewer ────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingProgressImage && (
          <React.Suspense fallback={null}>
            <DocumentViewer
              doc={viewingProgressImage}
              projectId={resolvedProjectId ?? ""}
              getDownloadUrl={(doc) => apiClient.getProgressImageDownloadUrl(doc.id)}
              onClose={() => setViewingProgressImage(null)}
            />
          </React.Suspense>
        )}
      </AnimatePresence>

      <MobileQrScanner
        open={scannerOpen}
        onClose={closeScanner}
        onElementPath={handleScannedElement}
        publicSiteOrigin={configuredSiteUrl}
      />
    </div>
  );
}
