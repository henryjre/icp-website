import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CreateProjectRequestDTO } from "@icp/shared";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, FileText, ImageUp, Upload, X } from "lucide-react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { Modal } from "../components/Modal";
import { toast } from "../components/Toast";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import { GENERAL_PLAN_ACCEPT, inferDocumentType, isSupportedGeneralPlanFile } from "../lib/documents";
import { uploadToPresignedUrl } from "../lib/uploads";
import {
  heroContainerVariants,
  heroItemVariants,
  staggerContainerVariants,
  staggerChildVariants,
  transitionFast,
  EASE_STRUCTURAL,
} from "../lib/animations";

const DRAFT_KEY = "form:create-project";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type CreateProjectDraft = CreateProjectRequestDTO & {
  generalPlanName: string;
  projectDocumentNames: string[];
};

type CreateResult = {
  projectId: string;
  projectCode: string;
  uploadFailures: string[];
};

type Step = 0 | 1 | 2;

const STEPS: Array<{ label: string; hint: string }> = [
  { label: "Details", hint: "Project information & thumbnail" },
  { label: "Documents", hint: "General plan & attachments" },
  { label: "Review", hint: "Confirm & create" },
];

const initialForm: CreateProjectDraft = {
  name: "",
  location: "",
  dateStarted: "",
  status: "Ongoing",
  completionDate: null,
  thumbnail: "",
  client: "",
  generalPlanName: "",
  projectDocumentNames: [],
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function CreateProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(() => getDraft(`${DRAFT_KEY}:step`, 0 as Step));
  const [form, setForm] = useState<CreateProjectDraft>(() => getDraft(DRAFT_KEY, initialForm));
  const [submitting, setSubmitting] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [generalPlanFile, setGeneralPlanFile] = useState<File | null>(null);
  const [projectDocumentFiles, setProjectDocumentFiles] = useState<File[]>([]);
  const [successResult, setSuccessResult] = useState<CreateResult | null>(null);
  const [planDragActive, setPlanDragActive] = useState(false);
  const [docsDragActive, setDocsDragActive] = useState(false);
  const docsInputRef = useRef<HTMLInputElement | null>(null);
  const pageTopRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setDraft(DRAFT_KEY, {
      ...form,
      generalPlanName: generalPlanFile?.name ?? "",
      projectDocumentNames: projectDocumentFiles.map((f) => f.name),
    });
  }, [form, generalPlanFile, projectDocumentFiles]);

  useEffect(() => {
    setDraft(`${DRAFT_KEY}:step`, step);
  }, [step]);

  useEffect(() => {
    const draft = getDraft(DRAFT_KEY, initialForm);
    if (draft.generalPlanName || draft.projectDocumentNames.length > 0) {
      toast.error("File selections reset after route changes. Please reselect files before submitting.");
    }
  }, []);

  useEffect(() => {
    if (successResult && pageTopRef.current) {
      pageTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [successResult]);

  // ── Derived summary / validation ───────────────────────────────────────────
  const requiredTextFields = useMemo(
    () => [form.name, form.client, form.location, form.dateStarted],
    [form.name, form.client, form.location, form.dateStarted],
  );
  const detailsFilled = useMemo(
    () => requiredTextFields.filter((v) => v.trim().length > 0).length + (form.thumbnail ? 1 : 0),
    [requiredTextFields, form.thumbnail],
  );
  const detailsComplete = detailsFilled === 5;

  // ── Thumbnail upload ─────────────────────────────────────────────────────────
  const uploadThumbnail = async (file: File) => {
    if (!file.type || !file.type.startsWith("image/")) {
      toast.error("Thumbnail must be a JPG, PNG, WebP, or GIF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large: ${file.name}. Max size is 10 MB.`);
      return;
    }
    setUploadingThumbnail(true);
    try {
      const payload = await apiClient.createProjectThumbnailUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      await uploadToPresignedUrl(payload.uploadUrl, file, { acl: "public-read", contentType: file.type });

      setForm((prev) => ({ ...prev, thumbnail: payload.publicUrl }));
      toast.success("Thumbnail uploaded");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const addProjectDocuments = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    const tooLarge = incoming.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      toast.error(`File too large: ${tooLarge.name}. Max size is 10 MB.`);
      return;
    }
    setProjectDocumentFiles((prev) => [...prev, ...incoming]);
  };

  const uploadAndFinalizeProjectDocument = async (
    projectId: string,
    file: File,
    category: "PROJECT_PLAN" | "PROJECT_GENERAL",
  ) => {
    const upload = await apiClient.createProjectDocumentUploadUrl(projectId, {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });

    await uploadToPresignedUrl(upload.uploadUrl, file);

    await apiClient.finalizeProjectDocument(projectId, {
      name: file.name,
      category,
      docType: inferDocumentType(file),
      sizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      s3Key: upload.s3Key,
      isConfidential: false,
    });
  };

  // ── Drag & drop handlers ──────────────────────────────────────────────────────
  const selectGeneralPlanFile = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedGeneralPlanFile(file)) {
      toast.error("General plans must be a PDF, JPG, PNG, WebP, or GIF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large: ${file.name}. Max size is 10 MB.`);
      return;
    }
    setGeneralPlanFile(file);
  };

  const handlePlanDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPlanDragActive(false);
    selectGeneralPlanFile(e.dataTransfer.files?.[0]);
  };

  const handleDocsDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDocsDragActive(false);
    if (e.dataTransfer.files?.length) addProjectDocuments(e.dataTransfer.files);
  };

  // ── Step navigation ───────────────────────────────────────────────────────────
  const goNextFromDetails = () => {
    if (!form.name.trim()) return toast.error("Project Name is required.");
    if (!form.client.trim()) return toast.error("Client is required.");
    if (!form.location.trim()) return toast.error("Location is required.");
    if (!form.dateStarted.trim()) return toast.error("Date Started is required.");
    if (!form.thumbnail) return toast.error("Please upload a project thumbnail.");
    setStep(1);
  };

  const goNextFromDocuments = () => {
    if (!generalPlanFile) return toast.error("General Plan is required before continuing.");
    setStep(2);
  };

  const resetForm = () => {
    clearDraft(DRAFT_KEY);
    clearDraft(`${DRAFT_KEY}:step`);
    setGeneralPlanFile(null);
    setProjectDocumentFiles([]);
    setForm(initialForm);
    setStep(0);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSuccessResult(null);

    if (!generalPlanFile) {
      setSubmitting(false);
      toast.error("General Plan is required before creating a project.");
      return;
    }

    try {
      const payload = await apiClient.createProject({
        name: form.name,
        location: form.location,
        dateStarted: form.dateStarted,
        status: form.status,
        completionDate: form.completionDate,
        thumbnail: form.thumbnail,
        client: form.client,
      });
      const failedUploads: string[] = [];

      if (generalPlanFile) {
        try {
          await uploadAndFinalizeProjectDocument(payload.id, generalPlanFile, "PROJECT_PLAN");
        } catch {
          failedUploads.push(generalPlanFile.name);
        }
      }

      for (const file of projectDocumentFiles) {
        try {
          await uploadAndFinalizeProjectDocument(payload.id, file, "PROJECT_GENERAL");
        } catch {
          failedUploads.push(file.name);
        }
      }

      resetForm();
      setSuccessResult({ projectId: payload.id, projectCode: payload.projectCode, uploadFailures: failedUploads });

      if (failedUploads.length > 0) {
        toast.error(`Project created, but some uploads failed: ${failedUploads.join(", ")}`);
      } else {
        toast.success("Project created successfully");
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const cardClass = "bg-white border border-gray-200 rounded-xl";

  return (
    <div className="min-h-screen bg-[#f5f7fc]">
      {/* ── Hero ── */}
      <section ref={pageTopRef} className="bg-brand-primary">
        <motion.div
          className="max-w-[80rem] mx-auto px-4 sm:px-6 py-10 sm:py-14"
          variants={heroContainerVariants}
          initial="hidden"
          animate="animate"
        >
          <motion.span variants={heroItemVariants} className="text-brand-accent text-xs tracking-[0.2em] uppercase font-semibold">
            Administration
          </motion.span>
          <motion.h1 variants={heroItemVariants} className="text-white mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Create Project
          </motion.h1>
          <motion.p variants={heroItemVariants} className="text-blue-200 mt-2 text-sm max-w-xl">
            Structured setup with thumbnail, details, general plan, and project documents.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Summary strip ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
            {[
              { label: "Details Completed", value: `${detailsFilled} / 5`, color: detailsComplete ? "text-green-600" : "text-brand-primary" },
              { label: "General Plan", value: generalPlanFile ? "Selected" : "Missing", color: generalPlanFile ? "text-green-600" : "text-gray-400" },
              { label: "Documents", value: String(projectDocumentFiles.length), color: "text-brand-secondary" },
              { label: "Thumbnail", value: form.thumbnail ? "Uploaded" : "—", color: form.thumbnail ? "text-green-600" : "text-gray-400" },
            ].map((stat) => (
              <div key={stat.label} className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-xl sm:text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
                <span className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[80rem] mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">

        {/* ── Step indicator ── */}
        <ol className="flex items-center gap-2 sm:gap-4">
          {STEPS.map((s, i) => {
            const state: "done" | "active" | "pending" = i < step ? "done" : i === step ? "active" : "pending";
            return (
              <li key={s.label} className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => { if (i < step) setStep(i as Step); }}
                  disabled={i > step}
                  className={`flex items-center gap-2.5 min-w-0 text-left ${i < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span
                    className={`relative shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      state === "active"
                        ? "bg-brand-primary text-white"
                        : state === "done"
                        ? "bg-brand-accent text-brand-primary"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {state === "done" ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </span>
                  <span className="min-w-0 hidden sm:block">
                    <span className={`block text-sm font-semibold leading-tight ${state === "pending" ? "text-gray-400" : "text-brand-primary"}`}>
                      {s.label}
                    </span>
                    <span className="block text-[11px] text-gray-400 truncate">{s.hint}</span>
                  </span>
                  <span className={`sm:hidden text-sm font-semibold ${state === "pending" ? "text-gray-400" : "text-brand-primary"}`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="flex-1 h-0.5 rounded-full bg-gray-200 overflow-hidden">
                    <motion.span
                      className="block h-full bg-brand-accent"
                      initial={false}
                      animate={{ width: i < step ? "100%" : "0%" }}
                      transition={{ duration: 0.3, ease: EASE_STRUCTURAL }}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* ── Step body ── */}
        <form onSubmit={onSubmit}>
          <AnimatePresence mode="wait" initial={false}>
            {/* ══════════ STEP 0 — DETAILS ══════════ */}
            {step === 0 && (
              <motion.div
                key="step-details"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transitionFast}
                className={`${cardClass} p-4 sm:p-6`}
              >
                <div className="grid lg:grid-cols-[280px_1fr] gap-5">
                  {/* Thumbnail */}
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col items-center justify-center gap-3 min-h-[240px]">
                    {form.thumbnail ? (
                      <img src={form.thumbnail} alt="Project thumbnail" className="w-full h-44 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center text-gray-400">
                        <ImageUp className="w-9 h-9" />
                        <span className="text-sm font-medium">Project Thumbnail</span>
                        <span className="text-xs text-gray-400">JPG, PNG, WEBP or GIF</span>
                      </div>
                    )}
                    <label className="inline-flex min-h-10 items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold cursor-pointer hover:bg-brand-primary-hover transition-colors disabled:opacity-60">
                      {uploadingThumbnail ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ImageUp className="w-4 h-4" />
                      )}
                      {uploadingThumbnail ? "Uploading…" : form.thumbnail ? "Replace" : "Upload Thumbnail"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploadingThumbnail}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadThumbnail(file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {/* Fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Project Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
                    <Input label="Client" value={form.client} onChange={(v) => setForm((s) => ({ ...s, client: v }))} required />
                    <Input label="Location" value={form.location} onChange={(v) => setForm((s) => ({ ...s, location: v }))} required />
                    <Input label="Date Started" type="date" value={form.dateStarted} onChange={(v) => setForm((s) => ({ ...s, dateStarted: v }))} required />
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as "Completed" | "Ongoing", completionDate: e.target.value === "Completed" ? s.completionDate : null }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-[#f5f7fc] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
                      >
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <Input
                      label="Completion Date"
                      type="date"
                      value={form.completionDate ?? ""}
                      onChange={(v) => setForm((s) => ({ ...s, completionDate: v || null }))}
                      disabled={form.status !== "Completed"}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button type="button" onClick={goNextFromDetails} className="inline-flex min-h-11 items-center justify-center px-6 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors cursor-pointer">
                    Next: Documents
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══════════ STEP 1 — DOCUMENTS ══════════ */}
            {step === 1 && (
              <motion.div
                key="step-documents"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transitionFast}
                className="space-y-5"
              >
                {/* General Plan */}
                <div className={`${cardClass} p-4 sm:p-6`}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-brand-primary">General Plan</h3>
                    <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wide">Required</span>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    {generalPlanFile ? (
                      <motion.div
                        key="plan-preview"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={transitionFast}
                        className="flex gap-4 items-start bg-[#f5f7fc] border border-brand-surface-mid rounded-xl p-3"
                      >
                        {/* Wide preview */}
                        <div className="shrink-0 w-32 h-24 rounded-lg border border-gray-200 overflow-hidden bg-white">
                          <FilePreviewCard file={generalPlanFile} compact />
                        </div>
                        {/* Meta + actions */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between h-24">
                          <div className="min-w-0">
                            <span className="inline-block mb-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-brand-soft text-brand-primary border border-brand-surface-mid">General Plan</span>
                            <p className="text-sm font-medium text-gray-800 truncate">{generalPlanFile.name}</p>
                            <p className="text-xs text-gray-400 tabular-nums">{formatBytes(generalPlanFile.size)}</p>
                          </div>
                          <label className="self-start inline-flex items-center gap-1.5 text-xs text-brand-primary font-medium cursor-pointer hover:underline">
                            <Upload className="w-3.5 h-3.5" /> Replace
                            <input type="file" accept={GENERAL_PLAN_ACCEPT} className="hidden" onChange={(e) => { selectGeneralPlanFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                          </label>
                        </div>
                        <button type="button" onClick={() => setGeneralPlanFile(null)} aria-label="Remove general plan" className="shrink-0 text-gray-400 hover:text-red-600 transition-colors cursor-pointer mt-0.5">
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="plan-dropzone"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={transitionFast}
                        onDragOver={(e) => { e.preventDefault(); setPlanDragActive(true); }}
                        onDragLeave={() => setPlanDragActive(false)}
                        onDrop={handlePlanDrop}
                        className={`rounded-xl border border-dashed p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          planDragActive ? "border-brand-primary bg-brand-soft" : "border-gray-300 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
                          <Upload className="w-4 h-4 shrink-0 text-gray-400" />
                          <span>Drag your plan here, or browse</span>
                        </div>
                        <label className="inline-flex min-h-10 shrink-0 items-center gap-2 px-4 py-2 rounded-lg border border-brand-primary/30 text-brand-primary bg-white text-sm font-medium cursor-pointer hover:bg-brand-soft transition-colors">
                          <Upload className="w-4 h-4" /> Browse plan
                          <input type="file" accept={GENERAL_PLAN_ACCEPT} className="hidden" onChange={(e) => { selectGeneralPlanFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="mt-2 text-xs text-gray-500">Supported plan formats: PDF, JPG, PNG, WebP, GIF • Max size: 10 MB</p>
                </div>

                {/* Additional Documents */}
                <div className={`${cardClass} p-4 sm:p-6`}>
                  <h3 className="text-sm font-semibold text-brand-primary mb-3">Additional Project Documents</h3>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDocsDragActive(true); }}
                    onDragLeave={() => setDocsDragActive(false)}
                    onDrop={handleDocsDrop}
                    className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
                      docsDragActive ? "border-brand-primary bg-brand-soft" : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-center mb-2"><FileText className="w-10 h-10 text-gray-400" /></div>
                    <p className="text-sm font-semibold text-brand-primary">Drag files here or browse</p>
                    <button
                      type="button"
                      className="mt-3 inline-flex min-h-10 items-center justify-center px-4 py-2 rounded-lg border border-brand-primary/30 text-brand-primary bg-white text-sm font-medium hover:bg-brand-soft transition-colors cursor-pointer"
                      onClick={() => docsInputRef.current?.click()}
                    >
                      Browse files
                    </button>
                    <input
                      ref={docsInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) addProjectDocuments(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Supported formats: pdf, docx, xlsx, dwg, dxf, jpg, png • Max size: 10 MB</p>

                  {/* Additional docs preview grid */}
                  {projectDocumentFiles.length > 0 && (
                    <motion.div
                      variants={staggerContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                    >
                      {projectDocumentFiles.map((file, index) => (
                        <motion.div key={`${file.name}-${index}`} variants={staggerChildVariants}>
                          <FilePreviewCard file={file} onRemove={() => setProjectDocumentFiles((prev) => prev.filter((_, i) => i !== index))} />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-between gap-3">
                  <button type="button" onClick={() => setStep(0)} className="inline-flex min-h-11 items-center justify-center px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                    Back
                  </button>
                  <button type="button" onClick={goNextFromDocuments} className="inline-flex min-h-11 items-center justify-center px-6 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors cursor-pointer">
                    Next: Review
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══════════ STEP 2 — REVIEW ══════════ */}
            {step === 2 && (
              <motion.div
                key="step-review"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={transitionFast}
                className="space-y-5"
              >
                <div className={`${cardClass} p-4 sm:p-6`}>
                  <div className="grid lg:grid-cols-[280px_1fr] gap-5">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                      {form.thumbnail
                        ? <img src={form.thumbnail} alt="Project thumbnail" className="w-full h-44 object-cover" />
                        : <div className="h-44 flex items-center justify-center text-sm text-gray-400">No thumbnail</div>}
                    </div>
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                      <ReviewItem label="Project Name" value={form.name} />
                      <ReviewItem label="Client" value={form.client} />
                      <ReviewItem label="Location" value={form.location} />
                      <ReviewItem label="Date Started" value={form.dateStarted} />
                      <ReviewItem label="Status" value={form.status} />
                      <ReviewItem label="Completion Date" value={form.status === "Completed" ? (form.completionDate ?? "—") : "—"} />
                    </dl>
                  </div>
                </div>

                <div className={`${cardClass} p-4 sm:p-6`}>
                  <h3 className="text-sm font-semibold text-brand-primary mb-3">Documents</h3>

                  {/* General Plan preview row */}
                  {generalPlanFile ? (
                    <div className="flex gap-4 items-start bg-[#f5f7fc] border border-brand-surface-mid rounded-xl p-3 mb-4">
                      <div className="shrink-0 w-32 h-24 rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <FilePreviewCard file={generalPlanFile} compact />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-24 gap-1">
                        <span className="inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-brand-soft text-brand-primary border border-brand-surface-mid">General Plan</span>
                        <p className="text-sm font-medium text-gray-800 truncate">{generalPlanFile.name}</p>
                        <p className="text-xs text-gray-400 tabular-nums">{formatBytes(generalPlanFile.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-500 mb-4">General Plan missing — required.</p>
                  )}

                  {/* Additional docs grid */}
                  {projectDocumentFiles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {projectDocumentFiles.map((file, index) => (
                        <FilePreviewCard key={`${file.name}-${index}`} file={file} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No additional documents.</p>
                  )}
                </div>

                <div className="flex justify-between gap-3">
                  <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-11 items-center justify-center px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium bg-white hover:bg-gray-50 transition-colors cursor-pointer">
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingThumbnail || !form.thumbnail || !generalPlanFile}
                    className="inline-flex min-h-11 items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hover transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {submitting ? "Creating…" : "Create Project"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* ── Success modal ── */}
      <Modal
        open={!!successResult}
        onClose={() => setSuccessResult(null)}
        title="Project created"
        confirmLabel="View Project"
        onConfirm={() => { if (successResult) navigate(`/projects/${successResult.projectCode}`); }}
        cancelLabel="Create Another"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Your project is ready.
          </div>
          {successResult && (
            <p className="text-sm text-gray-600">
              Project code:{" "}
              <span className="font-mono font-bold tracking-widest bg-brand-soft text-brand-primary px-2 py-0.5 rounded-md border border-brand-surface-mid">
                {successResult.projectCode}
              </span>
            </p>
          )}
          {successResult && successResult.uploadFailures.length > 0 && (
            <p className="text-sm text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
              Some uploads failed: {successResult.uploadFailures.join(", ")}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-[#f5f7fc] focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-800 truncate">{value || "—"}</dd>
    </div>
  );
}

function FilePreviewCard({ file, badge, onRemove, compact }: { file: File; badge?: string; onRemove?: () => void; compact?: boolean }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  if (compact) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
        {isImage && <img src={url} alt={file.name} className="w-full h-full object-cover" />}
        {isPdf && <iframe src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} title={file.name} className="w-full h-full border-0 pointer-events-none" />}
        {!isImage && !isPdf && <FileText className="w-8 h-8 text-gray-300" />}
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-[#f5f7fc] overflow-hidden">
      {/* Preview area */}
      <div className="relative h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
        {isImage && <img src={url} alt={file.name} className="w-full h-full object-cover" />}
        {isPdf && <iframe src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} title={file.name} className="w-full h-full border-0 pointer-events-none" />}
        {!isImage && !isPdf && <FileText className="w-10 h-10 text-gray-300" />}

        {/* Remove button */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${file.name}`}
            className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Badge */}
        {badge && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-brand-soft text-brand-primary border border-brand-surface-mid">
            {badge}
          </span>
        )}
      </div>

      {/* File info */}
      <div className="px-2.5 py-2 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
        <p className="text-[11px] text-gray-400 tabular-nums">{formatBytes(file.size)}</p>
      </div>
    </div>
  );
}
