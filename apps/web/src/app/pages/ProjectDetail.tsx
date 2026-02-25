import { useLoaderData, useParams, NavLink, useNavigate, Await } from "react-router";
import React, { Suspense, useState, useEffect, useRef } from "react";
import type { CreateElementRequestDTO, PrecastElementListItemDTO, ProjectActivityDTO, ProjectDTO } from "@icp/shared";
import {
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
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
} from "lucide-react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { PdfViewer } from "../components/PdfViewer";

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
  name: "",
  location: "",
  status: "Casted",
  castingDate: new Date().toISOString().slice(0, 10),
};

function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="relative h-[380px] bg-brand-primary/80">
        <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-brand-primary/60 to-transparent" />
        <div className="relative max-w-[80rem] mx-auto px-6 h-full flex flex-col justify-end pb-10 w-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-16 bg-white/20 rounded" />
            <div className="h-4 w-4 bg-white/10 rounded" />
            <div className="h-4 w-32 bg-white/20 rounded" />
          </div>
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div>
              <div className="h-6 w-24 bg-white/20 rounded-full mb-3" />
              <div className="h-10 w-72 bg-white/20 rounded mb-2" />
              <div className="h-4 w-48 bg-white/15 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="bg-brand-surface border-b border-brand-border sticky top-[73px] z-40 shadow-sm">
        <div className="max-w-[80rem] mx-auto px-6">
          <div className="flex justify-center gap-1 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 w-28 bg-brand-border rounded mx-2" />
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-[80rem] mx-auto px-6 py-12 space-y-20">
        {/* Details section */}
        <div>
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border mb-6">
            <div className="w-9 h-9 bg-brand-soft rounded-lg" />
            <div className="h-7 w-40 bg-brand-border rounded" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="bg-brand-card border border-brand-border rounded-xl p-4">
                <div className="h-3 w-20 bg-brand-border rounded mb-2" />
                <div className="h-5 w-36 bg-brand-border rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* General Plan section */}
        <div>
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border mb-6">
            <div className="w-9 h-9 bg-brand-soft rounded-lg" />
            <div className="h-7 w-32 bg-brand-border rounded" />
          </div>
          <div className="h-[640px] bg-brand-card border border-brand-border rounded-xl" />
        </div>

        {/* Elements section */}
        <div>
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border mb-6">
            <div className="w-9 h-9 bg-brand-soft rounded-lg" />
            <div className="h-7 w-44 bg-brand-border rounded" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-brand-surface border border-brand-border rounded-xl p-5">
                <div className="h-5 w-32 bg-brand-border rounded mb-3" />
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-40 bg-brand-border rounded" />
                  <div className="h-3 w-36 bg-brand-border rounded" />
                </div>
                <div className="h-4 w-28 bg-brand-border rounded pt-3 border-t border-brand-border" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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

function ProjectDetailInner({ loaderProject }: { loaderProject: ProjectDTO | null }) {
  const { projectId: projectIdParam } = useParams<{ projectId?: string; projectCode?: string }>();
  const projectId = loaderProject?.id ?? projectIdParam;
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDTO | null>(loaderProject);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [activityItems, setActivityItems] = useState<ProjectActivityDTO[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityRevision, setActivityRevision] = useState(0);
  const [planPreviewUrl, setPlanPreviewUrl] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [replacingPlan, setReplacingPlan] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [isDocDragActive, setIsDocDragActive] = useState(false);
  const docsInputRef = useRef<HTMLInputElement | null>(null);
  const replacePlanInputRef = useRef<HTMLInputElement | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const [editForm, setEditForm] = useState<ProjectEditForm>(() =>
    loaderProject ? toEditForm(loaderProject) : {
      name: "",
      location: "",
      dateStarted: "",
      status: "Ongoing",
      completionDate: "",
      thumbnail: "",
      client: "",
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
    details: null,
    plan: null,
    elements: null,
    documents: null,
    activity: null,
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
    if (editing) {
      setDraft(draftKey, editForm);
    }
  }, [editing, editForm, draftKey]);

  useEffect(() => {
    if (showCreateDialog && !createdElement) {
      setDraft(createDraftKey, createForm);
    }
  }, [showCreateDialog, createdElement, createForm, createDraftKey]);

  useEffect(() => {
    if (!canViewActivity || !projectId) {
      setActivityItems([]);
      setActivityTotalPages(1);
      return;
    }

    const run = async () => {
      setActivityLoading(true);
      try {
        const pageData = await apiClient.listProjectActivity(projectId, activityPage);
        setActivityItems(pageData.items);
        setActivityTotalPages(pageData.totalPages);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to load activity");
      } finally {
        setActivityLoading(false);
      }
    };

    void run();
  }, [activityPage, canViewActivity, projectId, activityRevision]);

  const generalPlanDocument = project?.projectDocuments.find((doc) => doc.category === "PROJECT_PLAN");
  const additionalProjectDocuments = project?.projectDocuments.filter((doc) => doc.category !== "PROJECT_PLAN") ?? [];

  useEffect(() => {
    if (!projectId || !isSignedIn || !generalPlanDocument) {
      setPlanPreviewUrl(null);
      return;
    }

    const run = async () => {
      setPlanLoading(true);
      try {
        const url = await apiClient.getProjectDocumentDownloadUrl(projectId, generalPlanDocument.id);
        setPlanPreviewUrl(url);
      } catch (err) {
        setPlanPreviewUrl(null);
        setError(err instanceof ApiClientError ? err.message : "Failed to load general plan preview");
      } finally {
        setPlanLoading(false);
      }
    };

    void run();
  }, [projectId, isSignedIn, generalPlanDocument?.id]);

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
        if (top - headerOffset <= 0) {
          currentTab = tab;
        } else {
          break;
        }
      }

      setActiveTab((prev) => (prev === currentTab ? prev : currentTab));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [canViewActivity]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-brand-primary" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Project Not Found</h2>
          <NavLink to="/projects" className="text-brand-secondary mt-4 inline-block">Back to Projects</NavLink>
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
    window.setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 450);
  };

  const bumpActivityRevision = () => {
    setActivityRevision((value) => value + 1);
  };

  const getDocumentType = (file: File): "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF" | "OTHER" => {
    const fileName = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    if (mime.includes("pdf") || fileName.endsWith(".pdf")) return "PDF";
    if (mime.includes("word") || fileName.endsWith(".docx")) return "DOCX";
    if (mime.includes("sheet") || fileName.endsWith(".xlsx")) return "XLSX";
    if (fileName.endsWith(".dwg")) return "DWG";
    if (fileName.endsWith(".dxf")) return "DXF";
    return "OTHER";
  };

  const saveProject = async () => {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateProject(projectId, {
        name: editForm.name,
        location: editForm.location,
        dateStarted: editForm.dateStarted,
        status: editForm.status,
        completionDate: editForm.status === "Completed" ? (editForm.completionDate || null) : null,
        thumbnail: editForm.thumbnail,
        client: editForm.client,
      });

      const updated = await apiClient.getProject(projectId);
      setProject(updated);
      setEditing(false);
      clearDraft(draftKey);
      bumpActivityRevision();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
    clearDraft(draftKey);
    setEditForm(toEditForm(project));
  };

  const uploadProjectThumbnail = async (file: File) => {
    setUploadingThumbnail(true);
    setError(null);
    try {
      const upload = await apiClient.createProjectThumbnailUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-amz-acl": "public-read" },
        body: file,
      });

      setEditForm((prev) => ({ ...prev, thumbnail: upload.publicUrl }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const uploadProjectDocuments = async (files: File[]) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    const failedFiles: string[] = [];
    let succeeded = 0;
    for (const file of files) {
      try {
        const upload = await apiClient.createProjectDocumentUploadUrl(projectId, {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        });

        await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        await apiClient.finalizeProjectDocument(projectId, {
          name: file.name,
          category: "PROJECT_GENERAL",
          docType: getDocumentType(file),
          sizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          s3Key: upload.s3Key,
          isConfidential: false,
        });
        succeeded += 1;
      } catch {
        failedFiles.push(file.name);
      }
    }
    try {
      const updated = await apiClient.getProject(projectId);
      setProject(updated);
      if (succeeded > 0) {
        bumpActivityRevision();
      }
      if (failedFiles.length > 0) {
        setError(`Some files failed to upload: ${failedFiles.join(", ")}`);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to refresh project documents");
    } finally {
      setUploading(false);
    }
  };

  const downloadProjectDocument = async (documentId: string) => {
    if (!projectId) return;
    try {
      const url = await apiClient.getProjectDocumentDownloadUrl(projectId, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to download document");
    }
  };

  const deleteProjectDocument = async (documentId: string) => {
    if (!projectId) return;
    if (!window.confirm("Delete this project document?")) return;
    try {
      await apiClient.deleteProjectDocument(projectId, documentId);
      setProject(await apiClient.getProject(projectId));
      bumpActivityRevision();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete document");
    }
  };

  const toggleProjectDocConfidential = async (documentId: string, current: boolean) => {
    if (!projectId) return;
    try {
      await apiClient.updateProjectDocument(projectId, documentId, { isConfidential: !current });
      setProject(await apiClient.getProject(projectId));
      bumpActivityRevision();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update document");
    }
  };

  const replaceGeneralPlan = async (file: File) => {
    if (!projectId) return;
    setReplacingPlan(true);
    setError(null);
    try {
      const upload = await apiClient.createProjectDocumentUploadUrl(projectId, {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      await apiClient.finalizeProjectDocument(projectId, {
        name: file.name,
        category: "PROJECT_PLAN",
        docType: getDocumentType(file),
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        s3Key: upload.s3Key,
        isConfidential: false,
      });

      const updated = await apiClient.getProject(projectId);
      setProject(updated);
      bumpActivityRevision();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to replace general plan");
    } finally {
      setReplacingPlan(false);
    }
  };

  const onEditProjectToggle = () => {
    if (editing) {
      setEditing(false);
      return;
    }
    setEditing(true);
    scrollToSection("details");
    window.setTimeout(() => {
      projectNameInputRef.current?.focus();
    }, 420);
  };

  const deleteProject = async () => {
    if (!projectId) return;
    const shouldDelete = window.confirm(
      `Delete project "${project.name}"? This permanently deletes all related elements, documents, and activity history.`,
    );
    if (!shouldDelete) return;

    setDeletingProject(true);
    setError(null);
    try {
      await apiClient.deleteProject(projectId);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete project");
    } finally {
      setDeletingProject(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "details", label: "Project Details", icon: FileText },
    { key: "plan", label: "General Plan", icon: Layers },
    { key: "elements", label: "Precast Elements", icon: Building2 },
    { key: "documents", label: "Project Documents", icon: FileText },
    ...(canViewActivity ? [{ key: "activity" as Tab, label: "Activity History", icon: History }] : []),
  ];

  const elementStatusColor = (s: string) => (s === "Delivered" ? "bg-green-100 text-green-700" : "bg-brand-highlight text-brand-secondary");

  return (
    <div>
      <section className="relative h-[380px] overflow-hidden">
        <img src={editing ? editForm.thumbnail : project.thumbnail} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-primary via-brand-primary/60 to-transparent" />
        <div className="relative max-w-[80rem] mx-auto px-6 h-full flex flex-col justify-end pb-10 w-full">
          <div className="flex items-center gap-2 text-white/75 text-sm mb-4"><NavLink to="/projects" className="hover:text-white transition">Projects</NavLink><ChevronRight className="w-3.5 h-3.5" /><span className="text-white">{project.name}</span></div>
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${project.status === "Completed" ? "bg-green-500/80 text-white" : "bg-brand-secondary/80 text-white"}`} style={{ fontWeight: 600 }}>{project.status === "Completed" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{project.status}</span>
              </div>
              <h1 className="text-white" style={{ fontSize: "2.4rem", fontWeight: 800 }}>{project.name}</h1>
              <div className="flex items-center gap-1.5 text-white/75 text-sm mt-1"><MapPin className="w-3.5 h-3.5 text-brand-highlight" />{project.location}</div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => void deleteProject()}
                    disabled={deletingProject}
                    className="px-4 py-2 rounded-lg bg-red-500/90 text-white border border-red-300/70 backdrop-blur-sm text-sm flex items-center gap-2 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" /> {deletingProject ? "Deleting..." : "Delete Project"}
                  </button>
                )}
                <button onClick={onEditProjectToggle} className="px-4 py-2 rounded-lg bg-brand-surface/20 text-white border border-white/30 backdrop-blur-sm text-sm flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> {editing ? "Editing" : "Edit Project"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="bg-brand-surface border-b border-brand-border sticky top-[73px] z-40 shadow-sm"><div className="max-w-[80rem] mx-auto px-6"><div className="flex justify-center gap-1 overflow-x-auto">{tabs.map((t) => <button key={t.key} onClick={() => scrollToSection(t.key)} className={`flex items-center gap-2 px-5 py-4 text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === t.key ? "border-brand-primary text-brand-primary" : "border-transparent text-brand-muted hover:text-brand-body hover:border-brand-border"}`}><t.icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span></button>)}</div></div></div>

      <div className="max-w-[80rem] mx-auto px-6 py-12 space-y-20">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        <section ref={(el) => { sectionRefs.current.details = el; }}>
          <SectionHeading icon={FileText} label="Project Details" />
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="md:col-span-1">
              <img src={editing ? editForm.thumbnail : project.thumbnail} alt={project.name} className="w-full h-52 object-cover rounded-xl shadow mb-4" />
              {editing && (
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm cursor-pointer">
                  <ImageUp className="w-4 h-4" />
                  {uploadingThumbnail ? "Uploading..." : "Upload Thumbnail"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadingThumbnail}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadProjectThumbnail(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="text-xs text-brand-muted uppercase tracking-wider">Project Name</label>
                    <input ref={projectNameInputRef} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-3 text-sm" value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-brand-muted uppercase tracking-wider">Client</label>
                      <input className="mt-1 border border-brand-border rounded-xl px-4 py-3 text-sm w-full" value={editForm.client} onChange={(e) => setEditForm((s) => ({ ...s, client: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-brand-muted uppercase tracking-wider">Location</label>
                      <input className="mt-1 border border-brand-border rounded-xl px-4 py-3 text-sm w-full" value={editForm.location} onChange={(e) => setEditForm((s) => ({ ...s, location: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-brand-muted uppercase tracking-wider">Date Started</label>
                      <input type="date" className="mt-1 border border-brand-border rounded-xl px-4 py-3 text-sm w-full" value={editForm.dateStarted} onChange={(e) => setEditForm((s) => ({ ...s, dateStarted: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-brand-muted uppercase tracking-wider">Status</label>
                      <select className="mt-1 border border-brand-border rounded-xl px-4 py-3 text-sm w-full" value={editForm.status} onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value as "Completed" | "Ongoing" }))}><option value="Ongoing">Ongoing</option><option value="Completed">Completed</option></select>
                    </div>
                    <div>
                      <label className="text-xs text-brand-muted uppercase tracking-wider">Completion Date</label>
                      <input type="date" className="mt-1 border border-brand-border rounded-xl px-4 py-3 text-sm w-full" disabled={editForm.status !== "Completed"} value={editForm.completionDate} onChange={(e) => setEditForm((s) => ({ ...s, completionDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end"><button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm flex items-center gap-1"><X className="w-4 h-4" />Cancel</button><button onClick={saveProject} disabled={saving || uploadingThumbnail || !editForm.thumbnail} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm flex items-center gap-1"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}</button></div>
                </>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[{ label: "Project Name", value: project.name, icon: FileText },{ label: "Client", value: project.client, icon: User },{ label: "Location", value: project.location, icon: MapPin },{ label: "Date Started", value: new Date(project.dateStarted).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), icon: Calendar },{ label: project.status === "Completed" ? "Completion Date" : "Est. Completion", value: project.completionDate ? new Date(project.completionDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "To Be Determined", icon: CheckCircle2 },{ label: "Status", value: project.status, icon: Clock, badge: project.status === "Completed" ? "bg-green-100 text-green-700" : "bg-brand-highlight text-brand-secondary" },{ label: "Precast Elements", value: `${project.elements.length} elements`, icon: Layers }].map((item) => (
                      <div key={item.label} className="bg-brand-card border border-brand-border rounded-xl p-4"><div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1"><item.icon className="w-3.5 h-3.5" />{item.label}</div>{"badge" in item && item.badge ? <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm ${item.badge}`} style={{ fontWeight: 600 }}>{item.value}</span> : <div className="text-brand-primary text-sm" style={{ fontWeight: 600 }}>{item.value}</div>}</div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section ref={(el) => { sectionRefs.current.plan = el; }}>
          <SectionHeading icon={Layers} label="General Plan" />
          {!isSignedIn ? (
            <div className="mt-4 bg-brand-card border border-brand-border rounded-xl p-4 text-sm text-brand-muted flex items-center gap-2"><Lock className="w-4 h-4 text-brand-secondary" />Sign in to view the general plan.</div>
          ) : !generalPlanDocument ? (
            <div className="mt-4 bg-brand-card border border-brand-border rounded-xl p-4 text-sm text-brand-muted">No general plan uploaded for this project yet.</div>
          ) : (
            <>
              <p className="text-brand-muted text-sm mt-1 mb-4">Preview of the uploaded general plan document.</p>
              <div className="h-[640px]">
                {planLoading ? (
                  <div className="h-full bg-brand-primary-hover rounded-xl border border-white/10 flex items-center justify-center text-white/70 text-sm">Loading general plan preview...</div>
                ) : planPreviewUrl ? (
                  <PdfViewer url={planPreviewUrl} />
                ) : (
                  <div className="h-full bg-brand-primary-hover rounded-xl border border-white/10 flex items-center justify-center text-white/70 text-sm">Unable to preview this file.</div>
                )}
              </div>
              <div className="mt-3 flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => void downloadProjectDocument(generalPlanDocument.id)}
                  className="px-3 py-1.5 rounded-md bg-brand-accent text-brand-primary text-xs inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open General Plan
                </button>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      disabled={replacingPlan}
                      className="px-3 py-1.5 rounded-md bg-brand-primary text-white text-xs inline-flex items-center gap-1 disabled:opacity-60"
                      onClick={() => replacePlanInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {replacingPlan ? "Replacing..." : "Replace General Plan"}
                    </button>
                    <input
                      ref={replacePlanInputRef}
                      type="file"
                      className="hidden"
                      disabled={replacingPlan}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void replaceGeneralPlan(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </section>

        <section ref={(el) => { sectionRefs.current.elements = el; }}>
          <div className="flex items-center justify-between pb-4 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-soft rounded-lg flex items-center justify-center"><Building2 className="w-5 h-5 text-brand-secondary" /></div>
              <h2 className="text-brand-primary" style={{ fontSize: "1.4rem", fontWeight: 800 }}>Precast Elements</h2>
            </div>
            {isAdmin && (
              <button
                onClick={() => { setCreatedElement(null); setCreateError(null); setShowCreateDialog(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm hover:bg-brand-primary-hover transition"
                style={{ fontWeight: 600 }}
              >
                <Plus className="w-4 h-4" /> Add Element
              </button>
            )}
          </div>
          <p className="text-brand-muted text-sm mt-3 mb-6">{project.elements.length} element{project.elements.length !== 1 ? "s" : ""} registered for this project. Click any element to view its full details.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{project.elements.map((el) => <NavLink key={el.id} to={`/projects/${project.projectCode}/e/${el.shortToken}`} className="group bg-brand-surface border border-brand-border rounded-xl p-5 hover:shadow-md hover:border-brand-secondary/50 transition-all"><div className="flex items-start justify-between gap-2 mb-3"><div className="flex-1"><h4 className="text-brand-primary text-sm leading-tight" style={{ fontWeight: 700 }}>{el.name}</h4></div><span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${elementStatusColor(el.status)}`} style={{ fontWeight: 600 }}>{el.status}</span></div><div className="space-y-1.5 text-xs text-brand-muted mb-4"><div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-brand-secondary rounded-full" /> Location: {el.location}</div><div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-brand-secondary rounded-full" /> Cast: {new Date(el.castingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div></div><div className="flex items-center gap-1 text-brand-secondary text-xs group-hover:gap-2 transition-all pt-3 border-t border-brand-border">View Element Details <ArrowRight className="w-3.5 h-3.5" /></div></NavLink>)}</div>
        </section>

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
              if (didCreate) {
                clearDraft(createDraftKey);
                void navigate(0);
              }
            }}
            onCreate={async () => {
              if (!projectId) return;
              setCreateSaving(true);
              setCreateError(null);
              try {
                const el = await apiClient.createElement(projectId, createForm);
                setCreatedElement(el);
                setCreateForm(EMPTY_CREATE_FORM);
                clearDraft(createDraftKey);
              } catch (err) {
                setCreateError(err instanceof ApiClientError ? err.message : "Failed to create element");
              } finally {
                setCreateSaving(false);
              }
            }}
            onCreateAnother={() => {
              setCreatedElement(null);
              setCreateError(null);
              setCreateForm(getDraft(createDraftKey, EMPTY_CREATE_FORM));
            }}
          />
        )}

        <section ref={(el) => { sectionRefs.current.documents = el; }}>
          <SectionHeading icon={FileText} label="Project Documents" />
          {!isSignedIn ? (
            <div className="mt-4 bg-brand-card border border-brand-border rounded-xl p-4 text-sm text-brand-muted flex items-center gap-2"><Lock className="w-4 h-4 text-brand-secondary" />Sign in to view project documents.</div>
          ) : (
            <>
              <p className="text-brand-muted text-sm mt-1 mb-4">General project-level documents uploaded for this project.</p>
              {canEdit && (
                <div className="mb-4">
                  <div className="text-xs text-brand-muted uppercase tracking-wider">Additional Project Documents</div>
                  <div
                    className={`mt-2 rounded-2xl border-2 border-dashed p-5 text-center transition ${isDocDragActive ? "border-brand-accent bg-brand-soft" : "border-gray-300 bg-brand-card"}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDocDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDocDragActive(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDocDragActive(false);
                      const files = Array.from(e.dataTransfer.files ?? []);
                      if (files.length > 0) void uploadProjectDocuments(files);
                    }}
                  >
                    <div className="flex justify-center mb-2"><FileText className="w-8 h-8 text-brand-muted" /></div>
                    <p className="text-sm text-brand-primary" style={{ fontWeight: 700 }}>Drag files here or browse</p>
                    <button
                      type="button"
                      disabled={uploading}
                      className="mt-3 px-4 py-2 rounded-lg border border-brand-border text-brand-primary bg-brand-surface text-sm disabled:opacity-60"
                      onClick={() => docsInputRef.current?.click()}
                    >
                      {uploading ? "Uploading..." : "Browse files"}
                    </button>
                    <input
                      ref={docsInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length > 0) void uploadProjectDocuments(files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-brand-muted">Supported formats: pdf, docx, xlsx, dwg, dxf, jpg, png � Max size: 10 MB</p>
                </div>
              )}
              <div className="space-y-3">
                {additionalProjectDocuments.map((doc) => (
                  <div key={doc.id} className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-brand-primary text-sm" style={{ fontWeight: 700 }}>{doc.name}</div>
                      <div className="text-xs text-brand-muted">{doc.type} � {doc.size} � {doc.date}</div>
                      {doc.isConfidential && (
                        <div className="mt-1">
                          <span className="text-[10px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">Confidential</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                      <button onClick={() => void downloadProjectDocument(doc.id)} className="px-3 py-1.5 rounded-md bg-brand-accent text-brand-primary text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" />Download</button>
                      {canEdit && (
                        <>
                          <button onClick={() => void toggleProjectDocConfidential(doc.id, doc.isConfidential)} className="px-3 py-1.5 rounded-md bg-brand-highlight text-brand-body text-xs">{doc.isConfidential ? "Make Public" : "Make Confidential"}</button>
                          <button onClick={() => void deleteProjectDocument(doc.id)} className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {additionalProjectDocuments.length === 0 && <div className="text-sm text-brand-muted">No additional project documents yet.</div>}
              </div>
            </>
          )}
        </section>

        {canViewActivity && (
          <section ref={(el) => { sectionRefs.current.activity = el; }}>
            <SectionHeading icon={History} label="Activity History" />
            <p className="text-brand-muted text-sm mt-1 mb-6">All recorded activities and changes made to this project.</p>
            {activityLoading ? <div className="text-sm text-brand-muted">Loading activity...</div> : (
              <div className="relative"><div className="absolute left-5 top-0 bottom-0 w-px bg-brand-border" /><div className="space-y-6 pl-14">{activityItems.map((act) => { const style = activityIcons[act.type] ?? activityIcons.updated; return <div key={act.id} className="relative"><div className={`absolute -left-9 top-1 w-3 h-3 rounded-full border-2 border-white ${style.dot}`} /><div className="bg-brand-surface border border-brand-border rounded-xl p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 mb-1"><span className={`text-xs px-2.5 py-0.5 rounded-full ${style.color}`} style={{ fontWeight: 600 }}>{act.action}</span><span className="text-brand-muted text-xs">{act.date} - {act.time}</span></div><ActivityDescription description={act.description} /><div className="flex items-center gap-1.5 text-brand-muted text-xs mt-2"><User className="w-3 h-3" />{act.user} - {act.role}</div></div></div>; })}</div></div>
            )}
            <div className="mt-5 flex items-center justify-between">
              <button disabled={activityPage <= 1} onClick={() => setActivityPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-brand-border text-sm disabled:opacity-50">Previous</button>
              <span className="text-xs text-brand-muted">Page {activityPage} of {activityTotalPages}</span>
              <button disabled={activityPage >= activityTotalPages} onClick={() => setActivityPage((p) => Math.min(activityTotalPages, p + 1))} className="px-3 py-1.5 rounded-lg border border-brand-border text-sm disabled:opacity-50">Next</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-brand-border"><div className="w-9 h-9 bg-brand-soft rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-brand-secondary" /></div><h2 className="text-brand-primary" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{label}</h2></div>
  );
}

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
      <label className="text-xs text-brand-muted uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={createForm[key] as string}
        onChange={(e) => setCreateForm((s) => ({ ...s, [key]: e.target.value }))}
        className="mt-1 w-full border border-brand-border rounded-xl px-4 py-3 text-sm bg-brand-surface focus:outline-none focus:border-brand-primary transition"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-soft rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-brand-secondary" />
            </div>
            <h3 className="text-brand-primary" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {createdElement ? "Element Created" : "Add Precast Element"}
            </h3>
          </div>
          <button
            onClick={() => onClose(Boolean(createdElement))}
            className="text-brand-muted hover:text-brand-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          {createdElement ? (
            /* Success view */
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <div className="text-green-800 text-sm" style={{ fontWeight: 600 }}>Element successfully created</div>
                  <div className="text-green-700 text-xs mt-0.5">{createdElement.name}</div>
                </div>
              </div>

              <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-4 h-4 text-brand-secondary" />
                  <span className="text-brand-primary text-sm" style={{ fontWeight: 700 }}>Element QR Code</span>
                </div>
                <QRCodeDisplay
                  value={`${siteOrigin}/e/${createdElement.shortToken}`}
                  markNumber={createdElement.name}
                  size={180}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <NavLink
                  to={`/projects/${projectCode}/e/${createdElement.shortToken}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-secondary text-brand-secondary text-sm hover:bg-brand-highlight transition"
                  style={{ fontWeight: 600 }}
                >
                  <ExternalLink className="w-4 h-4" /> View Element
                </NavLink>
                <button
                  onClick={onCreateAnother}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border text-brand-primary text-sm hover:bg-brand-card transition"
                  style={{ fontWeight: 600 }}
                >
                  <Plus className="w-4 h-4" /> Create Another
                </button>
                <button
                  onClick={() => onClose(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm hover:bg-brand-primary-hover transition"
                  style={{ fontWeight: 600 }}
                >
                  Close & Refresh
                </button>
              </div>
            </div>
          ) : (
            /* Form view */
            <div className="space-y-4">
              {createError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createError}</div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                {field("Element Name", "name")}
                {field("Location", "location")}
                <div>
                  <label className="text-xs text-brand-muted uppercase tracking-wider">Status</label>
                  <select
                    className="mt-1 w-full border border-brand-border rounded-xl px-4 py-3 text-sm bg-brand-surface focus:outline-none focus:border-brand-primary transition"
                    value={createForm.status}
                    onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value as "Casted" | "Delivered" }))}
                  >
                    <option value="Casted">Casted</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                {field("Casting Date", "castingDate", "date")}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => onClose(false)}
                  className="px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm flex items-center gap-1 hover:bg-brand-card transition"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={() => void onCreate()}
                  disabled={createSaving}
                  className="px-5 py-2 rounded-lg bg-brand-primary text-white text-sm flex items-center gap-1.5 hover:bg-brand-primary-hover transition disabled:opacity-60"
                  style={{ fontWeight: 600 }}
                >
                  <Plus className="w-4 h-4" />
                  {createSaving ? "Creating..." : "Create Element"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityDescription({ description }: { description: string }) {
  const lines = description.split("\n").filter((line) => line.trim().length > 0);
  const diffPattern = /^\s*-?\s*([^:]+):\s*(.+?)\s*->\s*(.+)\s*$/;

  return (
    <div className="text-brand-muted text-sm mt-2 space-y-1.5">
      {lines.map((line, index) => {
        const match = line.match(diffPattern);
        if (!match) {
          return (
            <p key={`${line}-${index}`} className="leading-relaxed">
              {line}
            </p>
          );
        }

        const field = match[1];
        const before = match[2];
        const after = match[3];
        return (
          <p key={`${line}-${index}`} className="leading-relaxed">
            <span className="text-brand-muted">{field}: </span>
            <span className="line-through text-brand-muted">{before}</span>
            <span className="mx-1 text-brand-primary" style={{ fontWeight: 700 }}>{"->"}</span>
            <span className="text-brand-primary" style={{ fontWeight: 600 }}>{after}</span>
          </p>
        );
      })}
    </div>
  );
}

