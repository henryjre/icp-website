import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CreateProjectRequestDTO } from "@icp/shared";
import { CheckCircle2, FileText, ImageUp, Upload, X } from "lucide-react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";

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
  const [form, setForm] = useState<CreateProjectDraft>(() => getDraft(DRAFT_KEY, initialForm));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [generalPlanFile, setGeneralPlanFile] = useState<File | null>(null);
  const [projectDocumentFiles, setProjectDocumentFiles] = useState<File[]>([]);
  const [successResult, setSuccessResult] = useState<CreateResult | null>(null);
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
    const draft = getDraft(DRAFT_KEY, initialForm);
    if (draft.generalPlanName || draft.projectDocumentNames.length > 0) {
      setError("File selections reset after route changes. Please reselect files before submitting.");
    }
  }, []);

  useEffect(() => {
    if (successResult && pageTopRef.current) {
      pageTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [successResult]);

  const uploadThumbnail = async (file: File) => {
    setUploadingThumbnail(true);
    setError(null);

    try {
      const payload = await apiClient.createProjectThumbnailUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      await fetch(payload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "x-amz-acl": "public-read",
        },
        body: file,
      });

      setForm((prev) => ({ ...prev, thumbnail: payload.publicUrl }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to upload thumbnail");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const addProjectDocuments = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    const tooLarge = incoming.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      setError(`File too large: ${tooLarge.name}. Max size is 10 MB.`);
      return;
    }
    setProjectDocumentFiles((prev) => [...prev, ...incoming]);
    setError(null);
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

    await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    await apiClient.finalizeProjectDocument(projectId, {
      name: file.name,
      category,
      docType: "PDF",
      sizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      s3Key: upload.s3Key,
      isConfidential: false,
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessResult(null);

    if (!generalPlanFile) {
      setSubmitting(false);
      setError("General Plan is required before creating a project.");
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

      clearDraft(DRAFT_KEY);
      setGeneralPlanFile(null);
      setProjectDocumentFiles([]);
      setForm(initialForm);
      setSuccessResult({ projectId: payload.id, projectCode: payload.projectCode, uploadFailures: failedUploads });

      if (failedUploads.length > 0) {
        setError(`Project created, but some uploads failed: ${failedUploads.join(", ")}`);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <section ref={pageTopRef} className="bg-brand-primary py-16">
        <div className="max-w-[80rem] mx-auto px-6">
          <span className="text-brand-accent text-sm tracking-widest uppercase">Admin</span>
          <h1 className="text-white mt-2" style={{ fontSize: "2.2rem", fontWeight: 800 }}>Create Project</h1>
          <p className="text-gray-400 mt-2">Structured setup with thumbnail, details, general plan, and project documents.</p>
        </div>
      </section>

      <section className="max-w-[80rem] mx-auto px-6 py-10">
        {successResult && (
          <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-green-700" style={{ fontWeight: 700 }}>
              <CheckCircle2 className="w-5 h-5" /> Project created successfully.
            </div>
            {successResult.uploadFailures.length > 0 && (
              <p className="text-sm text-brand-secondary mt-2">Some uploads failed: {successResult.uploadFailures.join(", ")}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <button onClick={() => navigate(`/projects/${successResult.projectCode}`)} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm">View Project</button>
              <button onClick={() => setSuccessResult(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm">Create Another</button>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-7 space-y-5">
          <div>
            <div className="grid lg:grid-cols-[260px_1fr] gap-5">
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col items-center justify-center gap-3 min-h-[220px]">
                {form.thumbnail ? (
                  <img src={form.thumbnail} alt="Thumbnail" className="w-full h-40 object-cover rounded-lg border border-gray-200" />
                ) : (
                  <div className="text-center text-gray-500 text-sm">Project Thumbnail</div>
                )}
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
                      if (file) void uploadThumbnail(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Project Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
                <Input label="Client" value={form.client} onChange={(v) => setForm((s) => ({ ...s, client: v }))} required />
                <Input label="Location" value={form.location} onChange={(v) => setForm((s) => ({ ...s, location: v }))} required />
                <Input label="Date Started" type="date" value={form.dateStarted} onChange={(v) => setForm((s) => ({ ...s, dateStarted: v }))} required />
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as "Completed" | "Ongoing", completionDate: e.target.value === "Completed" ? s.completionDate : null }))}
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary"
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
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider">General Plan</h3>
            <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm text-gray-600">{generalPlanFile ? generalPlanFile.name : "No general plan selected"}</div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-accent-light text-brand-secondary bg-white text-sm cursor-pointer">
                <Upload className="w-4 h-4" /> Browse plan
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setGeneralPlanFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 sm:p-5">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider">Additional Project Documents</h3>
            <div className="mt-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <div className="flex justify-center mb-2"><FileText className="w-10 h-10 text-gray-400" /></div>
              <p className="text-sm text-brand-primary" style={{ fontWeight: 700 }}>Drag files here or browse</p>
              <button
                type="button"
                className="mt-3 px-4 py-2 rounded-lg border border-brand-accent-light text-brand-secondary bg-white text-sm"
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
            <p className="mt-2 text-xs text-gray-500">Supported formats: pdf, docx, xlsx, dwg, dxf, jpg, png � Max size: 10 MB</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Uploaded Files</p>
            <div className="space-y-2">
              {generalPlanFile && (
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="text-sm text-brand-primary">General Plan: {generalPlanFile.name} ({formatBytes(generalPlanFile.size)})</div>
                  <button type="button" className="text-gray-500 hover:text-red-600" onClick={() => setGeneralPlanFile(null)}><X className="w-4 h-4" /></button>
                </div>
              )}
              {projectDocumentFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="text-sm text-brand-primary">{file.name} ({formatBytes(file.size)})</div>
                  <button type="button" className="text-gray-500 hover:text-red-600" onClick={() => setProjectDocumentFiles((prev) => prev.filter((_, i) => i !== index))}><X className="w-4 h-4" /></button>
                </div>
              ))}
              {!generalPlanFile && projectDocumentFiles.length === 0 && <p className="text-sm text-gray-500">No files selected yet.</p>}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setGeneralPlanFile(null);
                setProjectDocumentFiles([]);
              }}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm"
            >
              Clear Files
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingThumbnail || !form.thumbnail || !generalPlanFile}
              className="bg-brand-primary hover-bg-brand-primary text-white rounded-xl px-6 py-3 text-sm transition disabled:opacity-60"
              style={{ fontWeight: 700 }}
            >
              {submitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </section>
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
      <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary disabled:bg-gray-100"
      />
    </div>
  );
}




