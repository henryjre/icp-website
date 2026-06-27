import { useLoaderData, useParams, NavLink, useNavigate, Await } from "react-router";
import React, { Suspense, useState, useEffect, useRef } from "react";
import type { CreateElementRequestDTO, PrecastElementListItemDTO, ProjectActivityDTO, ProjectDTO, ProjectDocumentDTO } from "@icp/shared";
import {
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  User,
  History,
  ArrowRight,
  Building2,
  Pencil,
  Save,
  X,
  Upload,
  Download,
  Trash2,
  ImageUp,
  Lock,
  ExternalLink,
  Plus,
  QrCode,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { PlanViewer } from "../components/PlanViewer";
import { Modal } from "../components/Modal";
import { Paginator } from "../components/Paginator";
import { DocumentViewer } from "../components/DocumentViewer";
import { SlidingSectionTabs } from "../components/SlidingSectionTabs";
import { PageBreadcrumb } from "../components/PageBreadcrumb";
import { GENERAL_PLAN_ACCEPT, inferDocumentType, isSupportedGeneralPlanFile } from "../lib/documents";
import {
  EASE_STRUCTURAL,
  heroContainerVariants,
  heroItemVariants,
  staggerContainerVariants,
  staggerChildVariants,
  fadeUpVariants,
  VIEWPORT,
  transitionFast,
} from "../lib/animations";

// ─── Helpers ────────────────────────────────────────────────────────────────

const activityIcons: Record<string, { color: string; dot: string }> = {
  created: { color: "bg-blue-100 text-blue-600", dot: "bg-blue-500" },
  updated: { color: "bg-brand-soft text-brand-primary", dot: "bg-brand-secondary" },
  status: { color: "bg-purple-100 text-purple-600", dot: "bg-purple-500" },
  document: { color: "bg-green-100 text-green-600", dot: "bg-green-500" },
  comment: { color: "bg-gray-100 text-brand-muted", dot: "bg-gray-400" },
  delivered: { color: "bg-orange-100 text-orange-600", dot: "bg-orange-500" },
};

type Tab = "details" | "plan" | "elements" | "documents" | "activity";

type ProjectEditForm = {
  name: string;
  location: string;
  dateStarted: string;
  status: "Completed" | "Ongoing";
  completionDate: string;
  thumbnail: string;
  client: string;
};

function toEditForm(project: ProjectDTO): ProjectEditForm {
  return {
    name: project.name,
    location: project.location,
    dateStarted: project.dateStarted,
    status: project.status,
    completionDate: project.completionDate ?? "",
    thumbnail: project.thumbnail,
    client: project.client,
  };
}

const EMPTY_CREATE_FORM: CreateElementRequestDTO = {
  batch: 1,
  serialNumber: "",
  name: "",
  location: "",
  status: "Casted",
  castingDate: new Date().toISOString().slice(0, 10),
};

function docTypeIcon(type: string) {
  if (type === "PDF") return <FileText className="w-4 h-4 text-red-500" />;
  if (type === "DOCX") return <FileText className="w-4 h-4 text-brand-secondary" />;
  if (type === "XLSX") return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  if (type === "DWG" || type === "DXF") return <FileImage className="w-4 h-4 text-orange-500" />;
  if (type === "OTHER") return <FileArchive className="w-4 h-4 text-brand-muted" />;
  return <File className="w-4 h-4 text-brand-muted" />;
}

type DocPreviewPanelProps = {
  doc: { id: string; type: string; mimeType: string; name: string; isConfidential: boolean };
  projectId: string;
};

function DocPreviewPanel({ doc, projectId }: DocPreviewPanelProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const isImage = doc.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    apiClient.getProjectDocumentDownloadUrl(projectId, doc.id)
      .then((url) => { if (!cancelled) setImgSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [doc.id, projectId, isImage]);

  const panelGraphic = () => {
    if (isImage) {
      return imgSrc ? (
        <img src={imgSrc} alt={doc.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      );
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
        {[0,1,2,3].flatMap(col => [0,1,2,3,4].map(row => (
          <rect key={`${col}-${row}`} x={`${10 + col * 21}%`} y={`${14 + row * 16}%`} width="16%" height="11%" rx="1" fill="white" />
        )))}
      </svg>
    );
    if (doc.type === "DWG" || doc.type === "DXF") return (
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 75">
        {[15,30,45,60].map(y => <line key={`h${y}`} x1="8" y1={y} x2="92" y2={y} stroke="white" strokeWidth="0.5" />)}
        {[20,40,60,80].map(x => <line key={`v${x}`} x1={x} y1="8" x2={x} y2="67" stroke="white" strokeWidth="0.5" />)}
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
    PDF:  "bg-gradient-to-br from-red-700 to-red-900",
    DOCX: "bg-gradient-to-br from-blue-700 to-blue-900",
    XLSX: "bg-gradient-to-br from-green-700 to-green-900",
    DWG:  "bg-gradient-to-br from-[#0d2b5e] to-[#0a1e42]",
    DXF:  "bg-gradient-to-br from-[#0d2b5e] to-[#0a1e42]",
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

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative h-[430px] sm:h-[500px] bg-brand-primary/80">
        <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-brand-primary/50 to-transparent" />
      </div>
      <div className="hidden sm:block max-w-[80rem] mx-auto px-6 -mt-10 relative z-10">
        <div className="bg-white border border-brand-border rounded-2xl p-4 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 shadow-xl mb-10 sm:mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 w-16 bg-brand-border rounded mb-2" />
              <div className="h-5 w-24 bg-brand-border rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Entry ──────────────────────────────────────────────────────────────────

export function ProjectDetail() {
  const loaderData = useLoaderData() as { project: Promise<ProjectDTO | null> };
  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <Await resolve={loaderData.project}>
        {(resolvedProject: ProjectDTO | null) => (
          <ProjectDetailInner loaderProject={resolvedProject} />
        )}
      </Await>
    </Suspense>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

function ProjectDetailInner({ loaderProject }: { loaderProject: ProjectDTO | null }) {
  const { projectId: projectIdParam } = useParams<{ projectId?: string; projectCode?: string }>();
  const projectId = loaderProject?.id ?? projectIdParam;
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [project, setProject] = useState<ProjectDTO | null>(loaderProject);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [docPage, setDocPage] = useState(1);
  const [viewingDoc, setViewingDoc] = useState<ProjectDocumentDTO | null>(null);
  const [activityItems, setActivityItems] = useState<ProjectActivityDTO[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityRevision, setActivityRevision] = useState(0);
  const [planPreviewUrl, setPlanPreviewUrl] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [replacingPlan, setReplacingPlan] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ title: string; description: string; onConfirm: () => Promise<void> } | null>(null);
  const [isDocDragActive, setIsDocDragActive] = useState(false);
  const docsInputRef = useRef<HTMLInputElement | null>(null);
  const replacePlanInputRef = useRef<HTMLInputElement | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const [editForm, setEditForm] = useState<ProjectEditForm>(() =>
    loaderProject ? toEditForm(loaderProject) : {
      name: "", location: "", dateStarted: "", status: "Ongoing", completionDate: "", thumbnail: "", client: "",
    },
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateElementRequestDTO>(() =>
    getDraft(`form:element-create:${projectId ?? ""}`, EMPTY_CREATE_FORM),
  );
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdElement, setCreatedElement] = useState<PrecastElementListItemDTO | null>(null);

  const currentUser = apiClient.getStoredUser();
  const isSignedIn = Boolean(currentUser);
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "editor";
  const isAdmin = currentUser?.role === "admin";
  const canViewActivity = canEdit;
  const draftKey = projectId ? `form:project-edit:${projectId}` : "form:project-edit";
  const createDraftKey = `form:element-create:${projectId ?? ""}`;

  const sectionRefs = useRef<Record<Tab, HTMLElement | null>>({
    details: null, plan: null, elements: null, documents: null, activity: null,
  });
  const isManualScrollingRef = useRef(false);

  useEffect(() => {
    setProject(loaderProject);
    if (loaderProject) {
      setEditForm(getDraft(draftKey, toEditForm(loaderProject)));
    }
    window.scrollTo({ top: 0 });
  }, [loaderProject, projectId, draftKey]);

  useEffect(() => {
    if (editing) setDraft(draftKey, editForm);
  }, [editing, editForm, draftKey]);

  useEffect(() => {
    if (showCreateDialog && !createdElement) setDraft(createDraftKey, createForm);
  }, [showCreateDialog, createdElement, createForm, createDraftKey]);

  useEffect(() => {
    if (!canViewActivity || !projectId) { setActivityItems([]); setActivityTotalPages(1); return; }
    const run = async () => {
      setActivityLoading(true);
      try {
        const pageData = await apiClient.listProjectActivity(projectId, activityPage);
        setActivityItems(pageData.items);
        setActivityTotalPages(pageData.totalPages);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to load activity");
      } finally { setActivityLoading(false); }
    };
    void run();
  }, [activityPage, canViewActivity, projectId, activityRevision]);

  const generalPlanDocument = project?.projectDocuments.find((doc) => doc.category === "PROJECT_PLAN");
  const additionalProjectDocuments = project?.projectDocuments.filter((doc) => doc.category !== "PROJECT_PLAN") ?? [];

  useEffect(() => {
    if (!projectId || !isSignedIn || !generalPlanDocument) { setPlanPreviewUrl(null); return; }
    const run = async () => {
      setPlanLoading(true);
      try {
        const url = await apiClient.getProjectDocumentDownloadUrl(projectId, generalPlanDocument.id);
        setPlanPreviewUrl(url);
      } catch (err) {
        setPlanPreviewUrl(null);
        setError(err instanceof ApiClientError ? err.message : "Failed to load general plan preview");
      } finally { setPlanLoading(false); }
    };
    void run();
  }, [projectId, isSignedIn, generalPlanDocument?.id]);

  const tabs: { key: Tab; label: string; mobileLabel: string; icon: typeof FileText }[] = [
    { key: "details", label: "Details", mobileLabel: "Details", icon: FileText },
    { key: "plan", label: "General Plan", mobileLabel: "Plan", icon: Layers },
    { key: "elements", label: "Elements", mobileLabel: "Elements", icon: Building2 },
    { key: "documents", label: "Documents", mobileLabel: "Files", icon: FileArchive },
    ...(canViewActivity ? [{ key: "activity" as Tab, label: "Activity", mobileLabel: "Activity", icon: History }] : []),
  ];

  useEffect(() => {
    const trackedTabs = tabs.map((tab) => tab.key);
    const onScroll = () => {
      if (isManualScrollingRef.current) return;
      const headerOffset = 170;
      let currentTab: Tab = trackedTabs[0] ?? "details";
      for (const tab of trackedTabs) {
        const el = sectionRefs.current[tab];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - headerOffset <= 0) { currentTab = tab; } else { break; }
      }
      setActiveTab((prev) => (prev === currentTab ? prev : currentTab));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [canViewActivity]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fc]">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-soft rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-brand-secondary" />
          </div>
          <h2 className="text-brand-primary text-xl font-bold mb-2">Project Not Found</h2>
          <NavLink to="/projects" className="text-brand-secondary hover:underline text-sm">Back to Projects</NavLink>
        </div>
      </div>
    );
  }

  const scrollToSection = (tab: Tab) => {
    isManualScrollingRef.current = true;
    setActiveTab(tab);
    const el = sectionRefs.current[tab];
    if (el) {
      const offset = 140;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    window.setTimeout(() => { isManualScrollingRef.current = false; }, 450);
  };

  const bumpActivityRevision = () => setActivityRevision((v) => v + 1);

  const saveProject = async () => {
    if (!projectId) return;
    setSaving(true); setError(null);
    try {
      await apiClient.updateProject(projectId, {
        name: editForm.name, location: editForm.location, dateStarted: editForm.dateStarted,
        status: editForm.status,
        completionDate: editForm.status === "Completed" ? (editForm.completionDate || null) : null,
        thumbnail: editForm.thumbnail, client: editForm.client,
      });
      const updated = await apiClient.getProject(projectId);
      setProject(updated); setEditing(false); clearDraft(draftKey); bumpActivityRevision();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update project");
    } finally { setSaving(false); }
  };

  const cancelEdit = () => { setEditing(false); setError(null); clearDraft(draftKey); setEditForm(toEditForm(project)); };

  const uploadProjectThumbnail = async (file: File) => {
    setUploadingThumbnail(true); setError(null);
    try {
      const upload = await apiClient.createProjectThumbnailUploadUrl({ fileName: file.name, mimeType: file.type, sizeBytes: file.size });
      await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type, "x-amz-acl": "public-read" }, body: file });
      setEditForm((prev) => ({ ...prev, thumbnail: upload.publicUrl }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to upload thumbnail");
    } finally { setUploadingThumbnail(false); }
  };

  const uploadProjectDocuments = async (files: File[]) => {
    if (!projectId) return;
    setUploading(true); setError(null);
    const failedFiles: string[] = [];
    let succeeded = 0;
    for (const file of files) {
      try {
        const upload = await apiClient.createProjectDocumentUploadUrl(projectId, { fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
        await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        await apiClient.finalizeProjectDocument(projectId, { name: file.name, category: "PROJECT_GENERAL", docType: inferDocumentType(file), sizeBytes: file.size, mimeType: file.type || "application/octet-stream", s3Key: upload.s3Key, isConfidential: false });
        succeeded += 1;
      } catch { failedFiles.push(file.name); }
    }
    try {
      const updated = await apiClient.getProject(projectId);
      setProject(updated);
      if (succeeded > 0) bumpActivityRevision();
      if (failedFiles.length > 0) setError(`Some files failed to upload: ${failedFiles.join(", ")}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to refresh project documents");
    } finally { setUploading(false); }
  };

  const downloadProjectDocument = async (documentId: string) => {
    if (!projectId) return;
    try {
      const url = await apiClient.getProjectDocumentDownloadUrl(projectId, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Failed to download document"); }
  };

  const deleteProjectDocument = async (documentId: string) => {
    if (!projectId) return;
    setDeleteConfirm({
      title: "Delete document",
      description: "This document will be permanently removed. This cannot be undone.",
      onConfirm: async () => {
        await apiClient.deleteProjectDocument(projectId, documentId);
        setProject(await apiClient.getProject(projectId));
        bumpActivityRevision();
      },
    });
  };

  const toggleProjectDocConfidential = async (documentId: string, current: boolean) => {
    if (!projectId) return;
    try {
      await apiClient.updateProjectDocument(projectId, documentId, { isConfidential: !current });
      setProject(await apiClient.getProject(projectId));
      bumpActivityRevision();
    } catch (err) { setError(err instanceof ApiClientError ? err.message : "Failed to update document"); }
  };

  const replaceGeneralPlan = async (file: File) => {
    if (!projectId) return;
    if (!isSupportedGeneralPlanFile(file)) {
      setError("General plans must be a PDF, JPG, PNG, WebP, or GIF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(`File too large: ${file.name}. Max size is 10 MB.`);
      return;
    }
    setReplacingPlan(true); setError(null);
    try {
      const upload = await apiClient.createProjectDocumentUploadUrl(projectId, { fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
      await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      await apiClient.finalizeProjectDocument(projectId, { name: file.name, category: "PROJECT_PLAN", docType: inferDocumentType(file), sizeBytes: file.size, mimeType: file.type || "application/octet-stream", s3Key: upload.s3Key, isConfidential: false });
      const updated = await apiClient.getProject(projectId);
      setProject(updated); bumpActivityRevision();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to replace general plan");
    } finally { setReplacingPlan(false); }
  };

  const onEditProjectToggle = () => {
    if (editing) { setEditing(false); return; }
    setEditing(true); scrollToSection("details");
    window.setTimeout(() => { projectNameInputRef.current?.focus(); }, 420);
  };

  const deleteProject = async () => {
    if (!projectId) return;
    setDeleteConfirm({
      title: "Delete this project?",
      description: `"${project.name}" and all its elements, documents, and activity history will be permanently removed. This cannot be undone.`,
      onConfirm: async () => {
        setDeletingProject(true);
        try {
          await apiClient.deleteProject(projectId);
          navigate("/projects");
        } finally { setDeletingProject(false); }
      },
    });
  };

  const isCompleted = project.status === "Completed";

  return (
    <div className="min-h-screen bg-[#f5f7fc]">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative h-[430px] sm:h-[500px] overflow-hidden">
        <img
          src={editing ? editForm.thumbnail : project.thumbnail}
          alt={project.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1046] via-[#1a237e]/75 to-[#10184c]/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1550]/40 to-transparent" />
        <div
          className="absolute bottom-0 right-0 w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] opacity-[0.06] pointer-events-none"
          style={{ background: "radial-gradient(circle, #29aae2 0%, transparent 70%)", transform: "translate(30%, 30%)" }}
        />

        <div className="relative h-full max-w-[80rem] mx-auto px-4 sm:px-6 flex flex-col justify-between pt-5 sm:pt-8 pb-0 w-full">
          <motion.div
            className="flex items-center justify-between gap-3"
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
                  { label: project.name },
                ]}
              />
            </motion.div>

          </motion.div>

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
                isCompleted ? "bg-green-500/90 text-white" : "bg-brand-secondary/90 text-white"
              }`}>
                {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {project.status}
              </span>
              {project.projectCode && (
                <span className="text-[11px] text-white/50 font-mono tracking-wider">{project.projectCode}</span>
              )}
            </motion.div>

            <motion.h1
              className="text-white font-extrabold leading-none mb-3"
              style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              {project.name}
            </motion.h1>

            <motion.div
              className="flex flex-col items-start gap-2 text-white/80 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:text-sm"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-secondary" />
                {project.location}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-secondary" />
                {project.client}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-secondary" />
                {new Date(project.dateStarted).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
            { label: "Elements", value: project.elements.length.toString(), icon: Building2 },
            { label: "Documents", value: project.projectDocuments.length.toString(), icon: FileText },
            {
              label: "Date Started",
              value: new Date(project.dateStarted).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              icon: Calendar,
            },
            {
              label: project.completionDate ? "Completed" : "Est. Completion",
              value: project.completionDate
                ? new Date(project.completionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "To Be Determined",
              icon: isCompleted ? CheckCircle2 : Clock,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={`min-w-0 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col gap-1 border-brand-border/40 ${
                i < 2 ? "border-b md:border-b-0" : ""
              } ${i === 0 || i === 2 ? "border-r" : ""} ${i === 1 ? "md:border-r" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-1.5 text-brand-muted text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.08em] sm:tracking-wider">
                <stat.icon className="w-3 h-3 shrink-0" />
                {stat.label}
              </div>
              <div className="text-brand-primary font-bold text-base sm:text-lg leading-tight break-words">{stat.value}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Sticky section navigation ───────────────────────────────────── */}
      <div className="sticky top-[72px] sm:top-[80px] z-40 bg-[#f5f7fc]/95 backdrop-blur-md">
        <div className="max-w-[80rem] mx-auto border-b border-brand-border/40">
          <SlidingSectionTabs tabs={tabs} activeTab={activeTab} onTabChange={scrollToSection} back={{ label: "Projects", href: "/projects" }} />
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16 space-y-12 sm:space-y-16">

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Section: Project Details ─────────────────────────────────── */}
        <section ref={(el) => { sectionRefs.current.details = el; }}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <SectionHeading icon={FileText} label="Project Details" />
            {canEdit && (
              <div className="flex shrink-0 items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => void deleteProject()}
                    disabled={deletingProject}
                    className="min-h-10 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{deletingProject ? "Deleting…" : "Delete"}</span>
                  </button>
                )}
                <button
                  onClick={onEditProjectToggle}
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
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <div className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-brand-card border border-brand-border">
                      <img src={editForm.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                      <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand-primary/55 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer">
                        <ImageUp className="w-6 h-6 text-white" />
                        <span className="text-white text-xs font-semibold">{uploadingThumbnail ? "Uploading…" : "Change Thumbnail"}</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingThumbnail}
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadProjectThumbnail(file); e.currentTarget.value = ""; }} />
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <EditField label="Project Name">
                      <input ref={projectNameInputRef} className={inputCls} value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
                    </EditField>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <EditField label="Client">
                        <input className={inputCls} value={editForm.client} onChange={(e) => setEditForm((s) => ({ ...s, client: e.target.value }))} />
                      </EditField>
                      <EditField label="Location">
                        <input className={inputCls} value={editForm.location} onChange={(e) => setEditForm((s) => ({ ...s, location: e.target.value }))} />
                      </EditField>
                      <EditField label="Date Started">
                        <input type="date" className={inputCls} value={editForm.dateStarted} onChange={(e) => setEditForm((s) => ({ ...s, dateStarted: e.target.value }))} />
                      </EditField>
                      <EditField label="Status">
                        <select className={inputCls} value={editForm.status} onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value as "Completed" | "Ongoing" }))}>
                          <option value="Ongoing">Ongoing</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </EditField>
                      <EditField label="Completion Date">
                        <input type="date" className={inputCls} disabled={editForm.status !== "Completed"} value={editForm.completionDate} onChange={(e) => setEditForm((s) => ({ ...s, completionDate: e.target.value }))} />
                      </EditField>
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2 sm:justify-end pt-2">
                      <button onClick={cancelEdit} className="min-h-11 px-3 sm:px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm flex items-center justify-center gap-1.5 hover:bg-brand-card transition-colors cursor-pointer">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button onClick={() => void saveProject()} disabled={saving || uploadingThumbnail || !editForm.thumbnail} className="min-h-11 px-3 sm:px-5 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-brand-primary-hover transition-colors disabled:opacity-50 cursor-pointer">
                        <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="view-details"
                initial={shouldReduceMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={transitionFast}
                className="mt-4 sm:mt-6 grid md:grid-cols-3 gap-4 sm:gap-6"
              >
                <div className="md:col-span-1">
                  <div className="rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[4/3] shadow-md border border-brand-border/40">
                    <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <motion.div
                    className="grid grid-cols-2 gap-2.5 sm:gap-3"
                    variants={shouldReduceMotion ? undefined : staggerContainerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT}
                  >
                    {[
                      { label: "Client", value: project.client, icon: User },
                      { label: "Location", value: project.location, icon: MapPin },
                      { label: "Date Started", value: new Date(project.dateStarted).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), icon: Calendar },
                      {
                        label: isCompleted ? "Completion Date" : "Est. Completion",
                        value: project.completionDate ? new Date(project.completionDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "To Be Determined",
                        icon: isCompleted ? CheckCircle2 : Clock,
                      },
                      { label: "Precast Elements", value: `${project.elements.length} element${project.elements.length !== 1 ? "s" : ""}`, icon: Layers },
                      { label: "Project Documents", value: `${project.projectDocuments.length} file${project.projectDocuments.length !== 1 ? "s" : ""}`, icon: FileText },
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
                        <div className="text-brand-primary text-xs sm:text-sm font-semibold leading-snug break-words">{item.value}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Section: General Plan ─────────────────────────────────────── */}
        <motion.section
          ref={(el) => { sectionRefs.current.plan = el; }}
          variants={shouldReduceMotion ? undefined : fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <div className="flex items-center justify-between gap-4">
            <SectionHeading icon={Layers} label="General Plan" />
            {isSignedIn && generalPlanDocument && (
              <div className="hidden md:flex items-center gap-2 mb-2">
                <button
                  onClick={() => void downloadProjectDocument(generalPlanDocument.id)}
                  className="min-h-10 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-brand-primary-hover transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open General Plan
                </button>
                {canEdit && (
                  <button
                    type="button"
                    disabled={replacingPlan}
                    onClick={() => replacePlanInputRef.current?.click()}
                    className="min-h-10 px-4 py-2 rounded-lg border border-brand-border bg-white text-brand-muted text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-brand-card transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> {replacingPlan ? "Replacing…" : "Replace Plan"}
                  </button>
                )}
                <input ref={replacePlanInputRef} type="file" accept={GENERAL_PLAN_ACCEPT} className="hidden" disabled={replacingPlan}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void replaceGeneralPlan(file); e.currentTarget.value = ""; }} />
              </div>
            )}
          </div>

          {!isSignedIn ? (
            <div className="mt-4 bg-white border border-brand-border/50 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 bg-brand-soft rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-brand-secondary" />
              </div>
              <div>
                <p className="text-brand-primary font-semibold text-sm">Sign in to view the general plan</p>
                <p className="text-brand-muted text-xs mt-1">Project plans are available to authorized users only.</p>
              </div>
              <NavLink to="/login" className="mt-1 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors">
                Sign In
              </NavLink>
            </div>
          ) : !generalPlanDocument ? (
            <div className="mt-4 bg-white border border-dashed border-brand-border rounded-2xl p-8 text-center">
              <Layers className="w-8 h-8 text-brand-muted mx-auto mb-2 opacity-40" />
              <p className="text-brand-muted text-sm">No general plan uploaded for this project yet.</p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="h-[65svh] min-h-[420px] max-h-[640px] rounded-2xl overflow-hidden border border-brand-border/50 shadow-sm">
                {planLoading ? (
                  <div className="h-full bg-brand-primary/5 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                      <span className="text-brand-muted text-sm">Loading plan preview…</span>
                    </div>
                  </div>
                ) : planPreviewUrl ? (
                  <PlanViewer document={generalPlanDocument} url={planPreviewUrl} />
                ) : (
                  <div className="h-full bg-brand-card flex items-center justify-center text-brand-muted text-sm">Unable to preview this file.</div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:hidden">
                <button
                  onClick={() => void downloadProjectDocument(generalPlanDocument.id)}
                  className="min-h-11 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-brand-primary-hover transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open General Plan
                </button>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      disabled={replacingPlan}
                      onClick={() => replacePlanInputRef.current?.click()}
                      className="min-h-11 px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-brand-card transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> {replacingPlan ? "Replacing…" : "Replace Plan"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.section>

        {/* ── Section: Precast Elements ─────────────────────────────────── */}
        <motion.section
          ref={(el) => { sectionRefs.current.elements = el; }}
          variants={shouldReduceMotion ? undefined : fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3 sm:gap-4">
            <SectionHeading icon={Building2} label="Precast Elements" />
            {isAdmin && (
              <button
                onClick={() => { setCreatedElement(null); setCreateError(null); setShowCreateDialog(true); }}
                className="shrink-0 min-h-11 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl sm:rounded-lg bg-brand-primary text-white text-xs sm:text-sm font-semibold hover:bg-brand-primary-hover transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Element
              </button>
            )}
          </div>

          {project.elements.length === 0 ? (
            <div className="bg-white border border-dashed border-brand-border rounded-2xl p-8 sm:p-10 text-center">
              <Building2 className="w-8 h-8 text-brand-muted mx-auto mb-2 opacity-40" />
              <p className="text-brand-muted text-sm">No precast elements registered yet.</p>
            </div>
          ) : (() => {
            const batchGroups = Object.entries(
              project.elements.reduce((acc, el) => {
                const key = el.batch != null ? String(el.batch) : "unassigned";
                (acc[key] ??= []).push(el);
                return acc;
              }, {} as Record<string, typeof project.elements>)
            )
              .sort(([a], [b]) => {
                if (a === "unassigned") return 1;
                if (b === "unassigned") return -1;
                return Number(a) - Number(b);
              })
              .map(([key, els]) => ({
                key,
                label: key === "unassigned" ? "Unassigned" : `Batch ${key}`,
                elements: els,
              }));

            return (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {batchGroups.map(({ key, label, elements: batchEls }) => {
                  const deliveredCount = batchEls.filter((e) => e.status === "Delivered").length;
                  const castedCount = batchEls.length - deliveredCount;
                  const allDelivered = castedCount === 0;
                  return (
                    <NavLink
                      key={key}
                      to={`/projects/${project.projectCode}/batch/${key}`}
                      className="group block bg-white border border-brand-border/50 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:border-brand-secondary/40 hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${allDelivered ? "bg-green-100" : "bg-brand-soft"}`}>
                          <Layers className={`w-5 h-5 ${allDelivered ? "text-green-600" : "text-brand-secondary"}`} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-brand-primary text-sm font-bold leading-snug">{label}</h4>
                          <p className="text-brand-muted text-xs">{batchEls.length} element{batchEls.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {deliveredCount > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                            {deliveredCount} delivered
                          </span>
                        )}
                        {castedCount > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-brand-highlight text-brand-secondary">
                            {castedCount} casted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-brand-secondary text-xs font-medium group-hover:gap-2 transition-all pt-3 border-t border-brand-border/40">
                        View Elements <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            );
          })()}
        </motion.section>

        {/* Create Element Dialog */}
        {showCreateDialog && (
          <CreateElementDialog
            projectId={project.id}
            createForm={createForm}
            setCreateForm={setCreateForm}
            createSaving={createSaving}
            createError={createError}
            createdElement={createdElement}
            createDraftKey={createDraftKey}
            projectCode={project.projectCode}
            onClose={(didCreate) => {
              setShowCreateDialog(false);
              if (didCreate) { clearDraft(createDraftKey); void navigate(0); }
            }}
            onCreate={async () => {
              if (!projectId) return;
              if (!Number.isInteger(createForm.batch) || createForm.batch <= 0) {
                setCreateError("Batch must be a positive whole number.");
                return;
              }
              if (!/^\d+(?:-\d+)*$/.test(createForm.serialNumber.trim())) {
                setCreateError("Serial number must contain digits separated by single hyphens.");
                return;
              }
              setCreateSaving(true); setCreateError(null);
              try {
                const el = await apiClient.createElement(projectId, createForm);
                setCreatedElement(el); setCreateForm(EMPTY_CREATE_FORM); clearDraft(createDraftKey);
              } catch (err) {
                setCreateError(err instanceof ApiClientError ? err.message : "Failed to create element");
              } finally { setCreateSaving(false); }
            }}
            onCreateAnother={() => { setCreatedElement(null); setCreateError(null); setCreateForm(getDraft(createDraftKey, EMPTY_CREATE_FORM)); }}
          />
        )}

        {/* ── Section: Project Documents ────────────────────────────────── */}
        <motion.section
          ref={(el) => { sectionRefs.current.documents = el; }}
          variants={shouldReduceMotion ? undefined : fadeUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <SectionHeading icon={FileArchive} label="Project Documents" />

          {!isSignedIn ? (
            <div className="mt-4 bg-white border border-brand-border/50 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 bg-brand-soft rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-brand-secondary" />
              </div>
              <p className="text-brand-primary font-semibold text-sm">Sign in to view project documents</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {canEdit && (
                <div
                  className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition-colors ${
                    isDocDragActive ? "border-brand-primary bg-brand-soft" : "border-brand-border hover:border-brand-secondary/60 bg-white"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDocDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDocDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); setIsDocDragActive(false);
                    const files = Array.from(e.dataTransfer.files ?? []);
                    if (files.length > 0) void uploadProjectDocuments(files);
                  }}
                >
                  <div className="flex justify-center mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDocDragActive ? "bg-brand-primary/10" : "bg-brand-card"}`}>
                      <Upload className="w-5 h-5 text-brand-secondary" />
                    </div>
                  </div>
                  <p className="text-brand-primary text-sm font-semibold mb-1">
                    {isDocDragActive ? "Drop files here" : <><span className="sm:hidden">Choose files to upload</span><span className="hidden sm:inline">Drag files here or browse</span></>}
                  </p>
                  <p className="text-brand-muted text-xs mb-3">PDF, DOCX, XLSX, DWG, DXF, JPG, PNG — max 10 MB</p>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => docsInputRef.current?.click()}
                    className="min-h-11 px-5 py-2 rounded-lg border border-brand-border text-brand-primary bg-white text-sm font-medium hover:bg-brand-card transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? "Uploading…" : "Browse Files"}
                  </button>
                  <input ref={docsInputRef} type="file" multiple className="hidden" disabled={uploading}
                    onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length > 0) void uploadProjectDocuments(files); e.currentTarget.value = ""; }} />
                </div>
              )}

              {additionalProjectDocuments.length === 0 ? (
                <div className="bg-white border border-dashed border-brand-border rounded-2xl p-8 text-center">
                  <FileText className="w-7 h-7 text-brand-muted mx-auto mb-2 opacity-40" />
                  <p className="text-brand-muted text-sm">No additional project documents yet.</p>
                </div>
              ) : (() => {
                const DOC_PAGE_SIZE = 8;
                const docTotalPages = Math.ceil(additionalProjectDocuments.length / DOC_PAGE_SIZE);
                const pagedDocs = additionalProjectDocuments.slice((docPage - 1) * DOC_PAGE_SIZE, docPage * DOC_PAGE_SIZE);
                return (
                <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {pagedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewingDoc(doc)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setViewingDoc(doc); }}
                      className="bg-white rounded-xl border border-brand-border/60 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
                    >
                      <DocPreviewPanel doc={doc} projectId={projectId ?? ""} />

                      <div className="flex flex-col flex-1 p-2.5 sm:p-3 min-w-0">
                        <p className="text-brand-primary text-xs sm:text-sm font-semibold leading-snug line-clamp-2 mb-1.5 min-h-[2.4em]">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-1 flex-wrap mb-2.5">
                          <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-brand-muted/70">
                            {doc.size}
                          </span>
                          <span className="w-0.5 h-0.5 bg-brand-border rounded-full" />
                          <span className="text-[9px] sm:text-[10px] text-brand-muted/60">{doc.date}</span>
                        </div>
                        <div className="mt-auto flex items-center justify-between border-t border-brand-border/40 pt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); void downloadProjectDocument(doc.id); }}
                            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-primary hover:bg-brand-soft transition-colors cursor-pointer"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); void toggleProjectDocConfidential(doc.id, doc.isConfidential); }}
                                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${doc.isConfidential ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-brand-muted hover:text-brand-primary hover:bg-brand-soft"}`}
                                title={doc.isConfidential ? "Make Public" : "Make Confidential"}
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); void deleteProjectDocument(doc.id); }}
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
                <Paginator page={docPage} totalPages={docTotalPages} onPageChange={setDocPage} />
                </>
                );
              })()}
            </div>
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
            <p className="text-brand-muted text-sm mt-1 mb-6">All recorded activities and changes made to this project.</p>

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
      </div>

      <Modal
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title={deleteConfirm?.title ?? ""}
        description={deleteConfirm?.description}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          try {
            await deleteConfirm?.onConfirm();
          } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Delete failed");
          } finally {
            setDeleteConfirm(null);
          }
        }}
        loading={deletingProject}
        maxWidth="max-w-sm"
      />

      <AnimatePresence>
        {viewingDoc && (
          <DocumentViewer
            doc={viewingDoc}
            projectId={projectId ?? ""}
            onClose={() => setViewingDoc(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────

const inputCls = "mt-1 min-h-11 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm bg-[#f5f7fc] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition";

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-brand-muted uppercase tracking-wider font-medium">{label}</label>
      {children}
    </div>
  );
}

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

// ─── Create Element Dialog ──────────────────────────────────────────────────

function CreateElementDialog({
  projectId,
  projectCode,
  createForm,
  setCreateForm,
  createSaving,
  createError,
  createdElement,
  createDraftKey,
  onClose,
  onCreate,
  onCreateAnother,
}: {
  projectId: string;
  projectCode: string;
  createForm: CreateElementRequestDTO;
  setCreateForm: React.Dispatch<React.SetStateAction<CreateElementRequestDTO>>;
  createSaving: boolean;
  createError: string | null;
  createdElement: PrecastElementListItemDTO | null;
  createDraftKey: string;
  onClose: (didCreate: boolean) => void;
  onCreate: () => Promise<void>;
  onCreateAnother: () => void;
}) {
  const configuredSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim().replace(/\/+$/, "");
  const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const siteOrigin = configuredSiteUrl && configuredSiteUrl.length > 0 ? configuredSiteUrl : runtimeOrigin;

  const field = (label: string, key: keyof CreateElementRequestDTO, type = "text") => (
    <div>
      <label className="text-xs text-brand-muted uppercase tracking-wider font-medium">{label}</label>
      <input
        type={type}
        value={createForm[key] as string}
        onChange={(e) => setCreateForm((s) => ({ ...s, [key]: e.target.value }))}
        className={inputCls}
      />
    </div>
  );

  return (
    <Modal
      open
      onClose={() => onClose(Boolean(createdElement))}
      title={createdElement ? "Element Created" : "Add Precast Element"}
      titleIcon={(
        <span className="w-8 h-8 bg-brand-soft rounded-lg flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-brand-secondary" />
        </span>
      )}
      maxWidth="max-w-xl"
      cancelLabel={createdElement ? "" : "Cancel"}
      confirmLabel={createdElement ? undefined : "Create Element"}
      onConfirm={createdElement ? undefined : onCreate}
      loading={createSaving}
    >
      {createdElement ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <div className="text-green-800 text-sm font-semibold">Element successfully created</div>
                  <div className="text-green-700 text-xs mt-0.5">{createdElement.name}</div>
                  <div className="text-green-700 text-xs mt-0.5">Batch {createdElement.batch} · Serial {createdElement.serialNumber}</div>
                </div>
              </div>
              <div className="bg-brand-card border border-brand-border/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-4 h-4 text-brand-secondary" />
                  <span className="text-brand-primary text-sm font-semibold">Element QR Code</span>
                </div>
                <QRCodeDisplay
                  value={`${siteOrigin}/e/${createdElement.shortToken}`}
                  batch={createdElement.batch}
                  serialNumber={createdElement.serialNumber}
                  fallbackName={createdElement.name}
                  size={180}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <NavLink
                  to={`/projects/${projectCode}/e/${createdElement.shortToken}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-secondary text-brand-secondary text-sm font-semibold hover:bg-brand-highlight transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> View Element
                </NavLink>
                <button
                  onClick={onCreateAnother}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border text-brand-muted text-sm font-semibold hover:bg-brand-card transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Another
                </button>
                <button
                  onClick={() => onClose(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
      ) : (
            <div className="space-y-4">
              {createError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" /> {createError}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-brand-muted uppercase tracking-wider font-medium">Batch</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={createForm.batch}
                    onChange={(e) => setCreateForm((s) => ({ ...s, batch: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-brand-muted uppercase tracking-wider font-medium">Serial Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0001 or 0001-0020"
                    value={createForm.serialNumber}
                    onChange={(e) => setCreateForm((s) => ({ ...s, serialNumber: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                {field("Element Name", "name")}
                {field("Location", "location")}
                <div>
                  <label className="text-xs text-brand-muted uppercase tracking-wider font-medium">Status</label>
                  <select
                    className={inputCls}
                    value={createForm.status}
                    onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value as "Casted" | "Delivered" }))}
                  >
                    <option value="Casted">Casted</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                {field("Casting Date", "castingDate", "date")}
              </div>
            </div>
      )}
    </Modal>
  );
}

// ─── Activity description renderer ──────────────────────────────────────────

function ActivityDescription({ description }: { description: string }) {
  const lines = description.split("\n").filter((line) => line.trim().length > 0);
  const diffPattern = /^\s*-?\s*([^:]+):\s*(.+?)\s*->\s*(.+)\s*$/;
  return (
    <div className="text-brand-muted text-sm mt-1 space-y-1">
      {lines.map((line, index) => {
        const match = line.match(diffPattern);
        if (!match) return <p key={`${line}-${index}`} className="leading-relaxed">{line}</p>;
        const [, field, before, after] = match;
        return (
          <p key={`${line}-${index}`} className="leading-relaxed">
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
