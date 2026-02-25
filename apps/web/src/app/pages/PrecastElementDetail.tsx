import { useLoaderData, useParams, NavLink, useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PrecastElementDTO, ProjectActivityDTO, ProjectDocumentDTO } from "@icp/shared";
import {
  ChevronRight,
  FileText,
  User,
  Calendar,
  MapPin,
  History,
  QrCode,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  Pencil,
  Save,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";

const activityStyles: Record<string, { badge: string; dot: string }> = { created: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" }, updated: { badge: "bg-brand-soft text-brand-secondary", dot: "bg-brand-secondary" }, status: { badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" }, document: { badge: "bg-green-100 text-green-700", dot: "bg-green-500" }, comment: { badge: "bg-gray-100 text-brand-muted", dot: "bg-gray-400" }, delivered: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" } };

export function PrecastElementDetail() {
  const { projectId: projectIdParam, elementId: elementIdParam, projectCode } = useParams<{
    projectId?: string;
    elementId?: string;
    projectCode?: string;
    elementToken?: string;
  }>();
  const navigate = useNavigate();
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isTestResultDragActive, setIsTestResultDragActive] = useState(false);
  const [isPlanDocDragActive, setIsPlanDocDragActive] = useState(false);
  const testResultInputRef = useRef<HTMLInputElement | null>(null);
  const planDocInputRef = useRef<HTMLInputElement | null>(null);
  const draftKey = `form:element-edit:${projectIdParam ?? loaderElement?.projectId ?? ""}:${elementIdParam ?? loaderElement?.id ?? ""}`;
  const [form, setForm] = useState(() => getDraft(draftKey, {
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

  useEffect(() => {
    setElement(loaderElement);
    if (loaderElement) {
      setTestResults(loaderElement.testResults);
      setPlanDocuments(loaderElement.planDocuments);
      setForm(getDraft(draftKey, {
        name: loaderElement.name,
        location: loaderElement.location,
        status: loaderElement.status,
        castingDate: loaderElement.castingDate,
      }));
    }
    window.scrollTo({ top: 0 });
  }, [loaderElement, elementIdParam, draftKey]);

  useEffect(() => {
    if (editing) {
      setDraft(draftKey, form);
    }
  }, [editing, form, draftKey]);

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

  if (!element) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-brand-primary" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Element Not Found</h2><NavLink to={projectPath} className="text-brand-secondary mt-4 inline-block">Back to Project</NavLink></div></div>;
  }

  const isDelivered = element.status === "Delivered";

  const visibleTestResults = useMemo(() => testResults.filter((doc) => !doc.isConfidential || canViewConfidential), [testResults, canViewConfidential]);
  const visiblePlanDocuments = useMemo(() => planDocuments.filter((doc) => !doc.isConfidential || canViewConfidential), [planDocuments, canViewConfidential]);

  const saveElement = async () => {
    if (!resolvedProjectId || !resolvedElementId) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.updateElement(resolvedProjectId, resolvedElementId, {
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
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
    clearDraft(draftKey);
    setForm({
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
      if (err instanceof ApiClientError && err.status === 403) {
        window.alert("You do not have access to this confidential document.");
        return;
      }
      window.alert("Unable to download document right now.");
    }
  };

  const inferDocType = (fileName: string): "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF" | "OTHER" => {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF"> = {
      pdf: "PDF",
      doc: "DOCX",
      docx: "DOCX",
      xls: "XLSX",
      xlsx: "XLSX",
      dwg: "DWG",
      dxf: "DXF",
    };
    return map[ext] ?? "OTHER";
  };

  const handleUpload = async (file: File, category: "TEST_RESULT" | "PLAN") => {
    if (!resolvedElementId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const upload = await apiClient.createElementDocumentUploadUrl(resolvedElementId, {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const doc = await apiClient.finalizeElementDocument(resolvedElementId, {
        name: file.name,
        category,
        docType: inferDocType(file.name),
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        s3Key: upload.s3Key,
        isConfidential: false,
      });
      if (category === "TEST_RESULT") {
        setTestResults((prev) => [doc, ...prev]);
      } else {
        setPlanDocuments((prev) => [doc, ...prev]);
      }
    } catch (err) {
      setUploadError(err instanceof ApiClientError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleConfidential = async (document: ProjectDocumentDTO, category: "TEST_RESULT" | "PLAN") => {
    try {
      const updated = await apiClient.updateElementDocument(document.id, { isConfidential: !document.isConfidential });
      if (category === "TEST_RESULT") {
        setTestResults((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
      } else {
        setPlanDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update document");
    }
  };

  const handleDeleteDocument = async (document: ProjectDocumentDTO, category: "TEST_RESULT" | "PLAN") => {
    if (!window.confirm(`Delete document "${document.name}"?`)) return;
    try {
      await apiClient.deleteElementDocument(document.id);
      if (category === "TEST_RESULT") {
        setTestResults((prev) => prev.filter((doc) => doc.id !== document.id));
      } else {
        setPlanDocuments((prev) => prev.filter((doc) => doc.id !== document.id));
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete document");
    }
  };

  const handleDelete = async () => {
    if (!resolvedProjectId || !resolvedElementId) return;
    setDeleting(true);
    setError(null);
    try {
      await apiClient.deleteElement(resolvedProjectId, resolvedElementId);
      void navigate(projectPath);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete element");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-brand-card min-h-screen">
      <div className="bg-brand-primary py-10"><div className="max-w-[80rem] mx-auto px-6"><div className="flex items-center flex-wrap gap-1.5 text-white/75 text-sm mb-4"><NavLink to="/projects" className="hover:text-white transition">Projects</NavLink><ChevronRight className="w-3.5 h-3.5" /><NavLink to={projectPath} className="hover:text-white transition">{element.projectName}</NavLink><ChevronRight className="w-3.5 h-3.5" /><span className="text-white">{element.name}</span></div><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2 mb-2"><span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${isDelivered ? "bg-green-500/80 text-white" : "bg-brand-secondary/80 text-white"}`} style={{ fontWeight: 600 }}>{isDelivered ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{element.status}</span></div><h1 className="text-white" style={{ fontSize: "2rem", fontWeight: 800 }}>{element.name}</h1></div>{canEdit && <div className="flex items-center gap-2"><button onClick={() => setEditing((v) => !v)} className="px-4 py-2 rounded-lg bg-brand-surface/20 text-white border border-white/30 backdrop-blur-sm text-sm flex items-center gap-2"><Pencil className="w-4 h-4" />{editing ? "Editing" : "Edit Element"}</button>{currentUser?.role === "admin" && <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 rounded-lg bg-red-500/80 text-white border border-red-400/50 backdrop-blur-sm text-sm flex items-center gap-2 hover:bg-red-600/80 transition"><Trash2 className="w-4 h-4" />Delete</button>}</div>}</div></div></div>

      <div className="max-w-[80rem] mx-auto px-6 py-12 space-y-12">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        <section>
          <SectionHeading icon={FileText} label="Element Details" />
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              {editing ? (
                <>
                  <Input label="Element Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} />
                  <Input label="Location" value={form.location} onChange={(v) => setForm((s) => ({ ...s, location: v }))} />
                  <div><label className="text-xs text-brand-muted uppercase tracking-wider">Status</label><select className="mt-1 w-full border border-brand-border rounded-xl px-4 py-3 text-sm" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}><option value="Casted">Casted</option><option value="Delivered">Delivered</option></select></div>
                  <Input label="Casting Date" type="date" value={form.castingDate} onChange={(v) => setForm((s) => ({ ...s, castingDate: v }))} />
                  <div className="sm:col-span-2 flex justify-end gap-2"><button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm flex items-center gap-1"><X className="w-4 h-4" />Cancel</button><button onClick={saveElement} disabled={saving} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm flex items-center gap-1"><Save className="w-4 h-4" />{saving ? "Saving..." : "Save"}</button></div>
                </>
              ) : (
                [{ label: "Element Name", value: element.name, icon: FileText },{ label: "Location", value: element.location, icon: MapPin },{ label: "Status", value: element.status, icon: CheckCircle2, badge: isDelivered ? "bg-green-100 text-green-700" : "bg-brand-highlight text-brand-secondary" },{ label: "Casting Date", value: new Date(element.castingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), icon: Calendar },{ label: "Project", value: element.projectName, icon: ExternalLink, isLink: true, linkTo: projectPath },...(canEdit ? [{ label: "Created By", value: element.createdBy, icon: User },{ label: "Created Date", value: new Date(element.createdDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), icon: Calendar },{ label: "Last Updated", value: new Date(element.lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), icon: Clock }] : [])].map((item) => (
                  <div key={item.label} className="bg-brand-surface border border-brand-border rounded-xl p-4 shadow-sm"><div className="flex items-center gap-1.5 text-brand-muted text-xs mb-1.5"><item.icon className="w-3.5 h-3.5" />{item.label}</div>{"badge" in item && item.badge ? <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm ${item.badge}`} style={{ fontWeight: 600 }}>{item.value}</span> : "isLink" in item && item.isLink && "linkTo" in item ? <NavLink to={item.linkTo as string} className="text-brand-secondary hover:text-brand-primary flex items-center gap-1 text-sm" style={{ fontWeight: 600 }}>{item.value}<ExternalLink className="w-3 h-3" /></NavLink> : <div className="text-brand-primary text-sm" style={{ fontWeight: 600 }}>{item.value}</div>}</div>
                ))
              )}
            </div>

            <div className="lg:col-span-1"><div className="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-sm sticky top-36"><div className="flex items-center gap-2 mb-4"><QrCode className="w-5 h-5 text-brand-secondary" /><h3 className="text-brand-primary text-sm" style={{ fontWeight: 700 }}>Element QR Code</h3></div><QRCodeDisplay value={elementUrl} markNumber={element.name} size={200} /><div className="bg-brand-card rounded-lg p-3 mt-4"><div className="text-brand-muted text-xs mb-1">Element URL</div><div className="text-brand-body text-xs break-all leading-relaxed">{elementUrl}</div></div></div></div>
          </div>
        </section>

        <section>
          <SectionHeading icon={FileText} label="Test Results" />
          <p className="text-brand-muted text-sm mt-1 mb-4">All compressive strength tests, slump tests, and quality assurance documents for this element.</p>
          {uploadError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{uploadError}</div>}
          {canEdit && (
            <div className="mb-4">
              <div
                className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${isTestResultDragActive ? "border-brand-accent bg-brand-soft" : "border-gray-300 bg-brand-card"}`}
                onDragOver={(e) => { e.preventDefault(); setIsTestResultDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsTestResultDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsTestResultDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleUpload(file, "TEST_RESULT");
                }}
              >
                <div className="flex justify-center mb-2"><FileText className="w-8 h-8 text-brand-muted" /></div>
                <p className="text-sm text-brand-primary" style={{ fontWeight: 700 }}>Drag files here or browse</p>
                <button
                  type="button"
                  disabled={uploading}
                  className="mt-3 px-4 py-2 rounded-lg border border-brand-border text-brand-primary bg-brand-surface text-sm disabled:opacity-60"
                  onClick={() => testResultInputRef.current?.click()}
                >
                  {uploading ? "Uploading..." : "Browse files"}
                </button>
                <input
                  ref={testResultInputRef}
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file, "TEST_RESULT");
                    e.currentTarget.value = "";
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-brand-muted">Supported formats: pdf, docx, xlsx, dwg, dxf &middot; Max size: 10 MB</p>
            </div>
          )}
          <div className="space-y-3">
            {visibleTestResults.map((doc) => (
              <div key={doc.id} className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-brand-primary text-sm" style={{ fontWeight: 700 }}>{doc.name}</div>
                  <div className="text-xs text-brand-muted">{doc.type} &middot; {doc.size} &middot; {doc.date}</div>
                  {doc.isConfidential && (
                    <div className="mt-1"><span className="text-[10px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">Confidential</span></div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                  <button onClick={() => void handleDownload(doc.id)} className="px-3 py-1.5 rounded-md bg-brand-accent text-brand-primary text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" />Download</button>
                  {canEdit && (
                    <>
                      <button onClick={() => void handleToggleConfidential(doc, "TEST_RESULT")} className="px-3 py-1.5 rounded-md bg-brand-highlight text-brand-body text-xs">{doc.isConfidential ? "Make Public" : "Make Confidential"}</button>
                      <button onClick={() => void handleDeleteDocument(doc, "TEST_RESULT")} className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {visibleTestResults.length === 0 && <div className="text-sm text-brand-muted">No test results uploaded yet.</div>}
          </div>
        </section>

        <section>
          <SectionHeading icon={FileText} label="Plan Documents" />
          <p className="text-brand-muted text-sm mt-1 mb-4">Fabrication drawings, reinforcement plans, and stripping documents for this element.</p>
          {canEdit && (
            <div className="mb-4">
              <div
                className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${isPlanDocDragActive ? "border-brand-accent bg-brand-soft" : "border-gray-300 bg-brand-card"}`}
                onDragOver={(e) => { e.preventDefault(); setIsPlanDocDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsPlanDocDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsPlanDocDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleUpload(file, "PLAN");
                }}
              >
                <div className="flex justify-center mb-2"><FileText className="w-8 h-8 text-brand-muted" /></div>
                <p className="text-sm text-brand-primary" style={{ fontWeight: 700 }}>Drag files here or browse</p>
                <button
                  type="button"
                  disabled={uploading}
                  className="mt-3 px-4 py-2 rounded-lg border border-brand-border text-brand-primary bg-brand-surface text-sm disabled:opacity-60"
                  onClick={() => planDocInputRef.current?.click()}
                >
                  {uploading ? "Uploading..." : "Browse files"}
                </button>
                <input
                  ref={planDocInputRef}
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file, "PLAN");
                    e.currentTarget.value = "";
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-brand-muted">Supported formats: pdf, docx, xlsx, dwg, dxf &middot; Max size: 10 MB</p>
            </div>
          )}
          <div className="space-y-3">
            {visiblePlanDocuments.map((doc) => (
              <div key={doc.id} className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-brand-primary text-sm" style={{ fontWeight: 700 }}>{doc.name}</div>
                  <div className="text-xs text-brand-muted">{doc.type} &middot; {doc.size} &middot; {doc.date}</div>
                  {doc.isConfidential && (
                    <div className="mt-1"><span className="text-[10px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">Confidential</span></div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                  <button onClick={() => void handleDownload(doc.id)} className="px-3 py-1.5 rounded-md bg-brand-accent text-brand-primary text-xs flex items-center gap-1"><Download className="w-3.5 h-3.5" />Download</button>
                  {canEdit && (
                    <>
                      <button onClick={() => void handleToggleConfidential(doc, "PLAN")} className="px-3 py-1.5 rounded-md bg-brand-highlight text-brand-body text-xs">{doc.isConfidential ? "Make Public" : "Make Confidential"}</button>
                      <button onClick={() => void handleDeleteDocument(doc, "PLAN")} className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {visiblePlanDocuments.length === 0 && <div className="text-sm text-brand-muted">No plan documents uploaded yet.</div>}
          </div>
        </section>

        {canViewActivity && (
          <section><SectionHeading icon={History} label="Activity History" /><p className="text-brand-muted text-sm mt-1 mb-6">Complete log of all actions, updates, and status changes for this precast element.</p>{activityLoading ? <div className="text-sm text-brand-muted">Loading activity...</div> : <div className="relative"><div className="absolute left-5 top-0 bottom-0 w-px bg-brand-border" /><div className="space-y-5 pl-14">{activityItems.map((act) => { const style = activityStyles[act.type] ?? activityStyles.updated; return <div key={act.id} className="relative"><div className={`absolute -left-9 top-2 w-3 h-3 rounded-full border-2 border-white ${style.dot}`} /><div className="bg-brand-surface border border-brand-border rounded-xl p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 mb-2"><span className={`text-xs px-2.5 py-0.5 rounded-full ${style.badge}`} style={{ fontWeight: 600 }}>{act.action}</span><span className="text-brand-muted text-xs">{act.date} - {act.time}</span></div><p className="text-brand-muted text-sm">{act.description}</p><div className="flex items-center gap-1.5 text-brand-muted text-xs mt-2"><User className="w-3 h-3" />{act.user} - {act.role}</div></div></div>; })}</div></div>}<div className="mt-5 flex items-center justify-between"><button disabled={activityPage <= 1} onClick={() => setActivityPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-brand-border text-sm disabled:opacity-50">Previous</button><span className="text-xs text-brand-muted">Page {activityPage} of {activityTotalPages}</span><button disabled={activityPage >= activityTotalPages} onClick={() => setActivityPage((p) => Math.min(activityTotalPages, p + 1))} className="px-3 py-1.5 rounded-lg border border-brand-border text-sm disabled:opacity-50">Next</button></div></section>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 pt-6 pb-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-brand-primary" style={{ fontWeight: 700, fontSize: "1.1rem" }}>Delete Element</h3>
                <p className="text-brand-muted text-sm mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-brand-body text-sm">
                Are you sure you want to delete <span className="font-semibold text-brand-primary">{element.name}</span>?
                All associated documents and activity history will be permanently removed.
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-brand-border text-brand-muted text-sm hover:bg-brand-surface transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm flex items-center gap-2 hover:bg-red-700 transition disabled:opacity-60"
                style={{ fontWeight: 600 }}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete Element"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return <div className="flex items-center gap-3 pb-4 border-b border-brand-border"><div className="w-9 h-9 bg-brand-soft rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-brand-secondary" /></div><h2 className="text-brand-primary" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{label}</h2></div>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div><label className="text-xs text-brand-muted uppercase tracking-wider">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-3 text-sm" /></div>;
}
