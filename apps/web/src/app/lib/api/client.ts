import type {
  ApproveUserRequestDTO,
  CreateInviteRequestDTO,
  CreateProjectRequestDTO,
  CreateProjectThumbnailUploadUrlRequestDTO,
  ForgotPasswordRequestDTO,
  InviteCodeDTO,
  LoginResponseDTO,
  PasswordRecoveryResponseDTO,
  PaginatedResponse,
  PrecastElementDTO,
  ProjectDTO,
  ProjectDocumentDTO,
  ProjectListItemDTO,
  ProjectThumbnailUploadUrlResponseDTO,
  ProjectActivityDTO,
  RegisterRequestDTO,
  RejectUserRequestDTO,
  ResetPasswordRequestDTO,
  SendInviteEmailRequestDTO,
  CreateElementRequestDTO,
  CreateProgressUpdateRequestDTO,
  FinalizeElementDocumentRequestDTO,
  PrecastElementListItemDTO,
  ProgressUpdateDTO,
  UpdateElementRequestDTO,
  UpdateProjectRequestDTO,
  UploadUrlResponseDTO,
  UserDTO,
  UserManagementDTO,
  UserStatus,
} from "@icp/shared";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAccessToken,
  setSession,
  setStoredUser,
} from "../auth/store";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: { withAuth?: boolean; retryOn401?: boolean },
): Promise<T> {
  const withAuth = options?.withAuth ?? true;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const accessToken = getAccessToken();
  if (withAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && withAuth && options?.retryOn401 !== false) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, init, { ...options, retryOn401: false });
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiClientError(response.status, body?.message ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

let refreshSessionPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return false;
  }

  const payload = (await response.json()) as LoginResponseDTO;
  setSession(payload);
  return true;
}

function tryRefreshToken(): Promise<boolean> {
  if (!refreshSessionPromise) {
    refreshSessionPromise = refreshSession().finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
}

export const apiClient = {
  async login(email: string, password: string): Promise<LoginResponseDTO> {
    const session = await request<LoginResponseDTO>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      { withAuth: false },
    );
    setSession(session);
    return session;
  },

  async register(input: RegisterRequestDTO): Promise<{ message: string; user: UserDTO }> {
    return request<{ message: string; user: UserDTO }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      { withAuth: false },
    );
  },

  async forgotPassword(input: ForgotPasswordRequestDTO): Promise<PasswordRecoveryResponseDTO> {
    return request<PasswordRecoveryResponseDTO>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      { withAuth: false },
    );
  },

  async resetPassword(input: ResetPasswordRequestDTO): Promise<PasswordRecoveryResponseDTO> {
    const response = await request<PasswordRecoveryResponseDTO>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      { withAuth: false },
    );
    clearSession();
    return response;
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
    clearSession();
  },

  async me(): Promise<UserDTO | null> {
    try {
      const payload = await request<{ user: UserDTO }>("/auth/me", { method: "GET" });
      setStoredUser(payload.user);
      return payload.user;
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 404)) {
        clearSession();
        return null;
      }
      throw error;
    }
  },

  getStoredUser,

  async listProjects(): Promise<ProjectListItemDTO[]> {
    const payload = await request<PaginatedResponse<ProjectListItemDTO>>(
      "/projects",
      { method: "GET" },
      { withAuth: false },
    );
    return payload.items;
  },

  async resolveProjectByCode(projectCode: string): Promise<{ projectId: string; projectCode: string }> {
    return request<{ projectId: string; projectCode: string }>(`/short/projects/${projectCode}`, {
      method: "GET",
    }, { withAuth: false });
  },

  async resolveElementByShortLink(
    projectCode: string,
    elementToken: string,
  ): Promise<{ projectId: string; elementId: string; elementToken: string; projectCode: string }> {
    return request<{ projectId: string; elementId: string; elementToken: string; projectCode: string }>(
      `/short/projects/${projectCode}/elements/${elementToken}`,
      { method: "GET" },
      { withAuth: false },
    );
  },

  async resolveElementToken(
    elementToken: string,
  ): Promise<{ projectId: string; elementId: string; elementToken: string; projectCode: string }> {
    return request<{ projectId: string; elementId: string; elementToken: string; projectCode: string }>(
      `/short/elements/${elementToken}`,
      { method: "GET" },
      { withAuth: false },
    );
  },

  async getProject(projectId: string): Promise<ProjectDTO> {
    const payload = await request<{ project: ProjectDTO }>(`/projects/${projectId}`, { method: "GET" });
    return payload.project;
  },

  async createProject(input: CreateProjectRequestDTO): Promise<ProjectListItemDTO> {
    const payload = await request<{ project: ProjectListItemDTO }>("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return payload.project;
  },

  async updateProject(projectId: string, input: UpdateProjectRequestDTO): Promise<ProjectListItemDTO> {
    const payload = await request<{ project: ProjectListItemDTO }>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return payload.project;
  },

  async deleteProject(projectId: string): Promise<void> {
    await request<void>(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },

  async createProjectThumbnailUploadUrl(
    input: CreateProjectThumbnailUploadUrlRequestDTO,
  ): Promise<ProjectThumbnailUploadUrlResponseDTO> {
    return request<ProjectThumbnailUploadUrlResponseDTO>("/projects/thumbnail/upload-url", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getElement(projectId: string, elementId: string): Promise<PrecastElementDTO> {
    const payload = await request<{ element: PrecastElementDTO }>(
      `/projects/${projectId}/elements/${elementId}`,
      { method: "GET" },
    );
    return payload.element;
  },

  async createElement(projectId: string, input: CreateElementRequestDTO): Promise<PrecastElementListItemDTO> {
    const payload = await request<{ element: PrecastElementListItemDTO }>(
      `/projects/${projectId}/elements`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return payload.element;
  },

  async updateElement(projectId: string, elementId: string, input: UpdateElementRequestDTO) {
    const payload = await request<{ element: PrecastElementDTO }>(`/projects/${projectId}/elements/${elementId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return payload.element;
  },

  async deleteElement(projectId: string, elementId: string): Promise<void> {
    await request<void>(`/projects/${projectId}/elements/${elementId}`, { method: "DELETE" });
  },

  async listProjectDocuments(projectId: string): Promise<ProjectDocumentDTO[]> {
    const payload = await request<PaginatedResponse<ProjectDocumentDTO>>(`/projects/${projectId}/documents`, {
      method: "GET",
    });
    return payload.items;
  },

  async createProjectDocumentUploadUrl(projectId: string, input: { fileName: string; mimeType: string; sizeBytes: number }): Promise<UploadUrlResponseDTO> {
    return request<UploadUrlResponseDTO>(`/projects/${projectId}/documents/upload-url`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async finalizeProjectDocument(projectId: string, input: {
    name: string;
    category: "PROJECT_GENERAL" | "PROJECT_PLAN";
    docType: "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF" | "OTHER";
    sizeBytes: number;
    mimeType: string;
    s3Key: string;
    isConfidential: boolean;
  }) {
    const payload = await request<{ document: ProjectDocumentDTO }>(`/projects/${projectId}/documents`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return payload.document;
  },

  async updateProjectDocument(projectId: string, documentId: string, input: Partial<{
    name: string;
    category: "PROJECT_GENERAL" | "PROJECT_PLAN";
    docType: "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF" | "OTHER";
    isConfidential: boolean;
  }>) {
    const payload = await request<{ document: ProjectDocumentDTO }>(`/projects/${projectId}/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return payload.document;
  },

  async deleteProjectDocument(projectId: string, documentId: string) {
    return request<void>(`/projects/${projectId}/documents/${documentId}`, { method: "DELETE" });
  },

  async getProjectDocumentDownloadUrl(projectId: string, documentId: string): Promise<string> {
    const payload = await request<{ downloadUrl: string }>(`/projects/${projectId}/documents/${documentId}/download-url`, { method: "GET" });
    return payload.downloadUrl;
  },

  async listProjectActivity(projectId: string, page = 1): Promise<{ items: ProjectActivityDTO[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const payload = await request<{ items: ProjectActivityDTO[]; total: number; page: number; pageSize: number; totalPages: number }>(
      `/projects/${projectId}/activity?page=${page}`,
      { method: "GET" },
    );
    return payload;
  },

  async listElementActivity(elementId: string, page = 1): Promise<{ items: ProjectActivityDTO[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const payload = await request<{ items: ProjectActivityDTO[]; total: number; page: number; pageSize: number; totalPages: number }>(
      `/elements/${elementId}/activity?page=${page}`,
      { method: "GET" },
    );
    return payload;
  },

  async listElementDocuments(elementId: string): Promise<ProjectDocumentDTO[]> {
    const payload = await request<PaginatedResponse<ProjectDocumentDTO>>(
      `/elements/${elementId}/documents`,
      { method: "GET" },
      { withAuth: false },
    );
    return payload.items;
  },

  async getDocumentDownloadUrl(documentId: string): Promise<string> {
    const payload = await request<{ downloadUrl: string }>(
      `/documents/${documentId}/download-url`,
      { method: "GET" },
      { withAuth: false },
    );
    return payload.downloadUrl;
  },

  async createElementDocumentUploadUrl(
    elementId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number },
  ): Promise<UploadUrlResponseDTO> {
    return request<UploadUrlResponseDTO>(`/elements/${elementId}/documents/upload-url`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async finalizeElementDocument(
    elementId: string,
    input: FinalizeElementDocumentRequestDTO,
  ): Promise<ProjectDocumentDTO> {
    const payload = await request<{ document: ProjectDocumentDTO }>(
      `/elements/${elementId}/documents`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return payload.document;
  },

  async updateElementDocument(
    documentId: string,
    input: { isConfidential?: boolean; name?: string },
  ): Promise<ProjectDocumentDTO> {
    const payload = await request<{ document: ProjectDocumentDTO }>(
      `/documents/${documentId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
    return payload.document;
  },

  async deleteElementDocument(documentId: string): Promise<void> {
    await request<void>(`/documents/${documentId}`, { method: "DELETE" });
  },

  async listElementProgress(elementId: string): Promise<ProgressUpdateDTO[]> {
    const payload = await request<PaginatedResponse<ProgressUpdateDTO>>(
      `/elements/${elementId}/progress`,
      { method: "GET" },
      { withAuth: false },
    );
    return payload.items;
  },

  async createProgressUpdateUploadUrl(
    elementId: string,
    input: { fileName: string; mimeType: string; sizeBytes: number },
  ): Promise<UploadUrlResponseDTO> {
    return request<UploadUrlResponseDTO>(`/elements/${elementId}/progress/upload-url`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async createProgressUpdate(
    elementId: string,
    input: CreateProgressUpdateRequestDTO,
  ): Promise<ProgressUpdateDTO> {
    const payload = await request<{ progressUpdate: ProgressUpdateDTO }>(
      `/elements/${elementId}/progress`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return payload.progressUpdate;
  },

  async deleteProgressUpdate(progressUpdateId: string): Promise<void> {
    await request<void>(`/elements/progress/${progressUpdateId}`, { method: "DELETE" });
  },

  async getProgressImageDownloadUrl(imageId: string): Promise<string> {
    const payload = await request<{ downloadUrl: string }>(
      `/progress/images/${imageId}/download-url`,
      { method: "GET" },
      { withAuth: false },
    );
    return payload.downloadUrl;
  },

  async listUsers(status: UserStatus | "All", search?: string): Promise<UserManagementDTO[]> {
    const query = new URLSearchParams();
    query.set("status", status);
    if (search?.trim()) query.set("search", search.trim());
    const payload = await request<PaginatedResponse<UserManagementDTO>>(`/users?${query.toString()}`, {
      method: "GET",
    });
    return payload.items;
  },

  async createUser(input: { fullName: string; email: string; password: string; role: "admin" | "editor" | "client" }) {
    return request<{ user: UserManagementDTO }>("/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async approveUser(userId: string, input: ApproveUserRequestDTO) {
    return request<{ user: UserManagementDTO }>(`/users/${userId}/approve`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async rejectUser(userId: string, input: RejectUserRequestDTO) {
    return request<{ user: UserManagementDTO }>(`/users/${userId}/reject`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async archiveUser(userId: string) {
    return request<{ user: UserManagementDTO }>(`/users/${userId}/archive`, {
      method: "PATCH",
    });
  },

  async unarchiveUser(userId: string) {
    return request<{ user: UserManagementDTO }>(`/users/${userId}/unarchive`, {
      method: "PATCH",
    });
  },

  async updateUserRole(userId: string, role: "admin" | "editor" | "client") {
    return request<{ user: UserManagementDTO }>(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  async deleteUser(userId: string) {
    return request<void>(`/users/${userId}`, { method: "DELETE" });
  },

  async listInvites(status: "Active" | "Archived" | "Expired" | "All"): Promise<InviteCodeDTO[]> {
    const query = new URLSearchParams({ status });
    const payload = await request<PaginatedResponse<InviteCodeDTO>>(`/invites?${query.toString()}`, {
      method: "GET",
    });
    return payload.items;
  },

  async createInvite(input: CreateInviteRequestDTO): Promise<{ invite: InviteCodeDTO; inviteLink: string }> {
    return request<{ invite: InviteCodeDTO; inviteLink: string }>("/invites", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async archiveInvite(inviteId: string) {
    return request<{ invite: InviteCodeDTO }>(`/invites/${inviteId}/archive`, {
      method: "PATCH",
    });
  },

  async unarchiveInvite(inviteId: string) {
    return request<{ invite: InviteCodeDTO }>(`/invites/${inviteId}/unarchive`, {
      method: "PATCH",
    });
  },

  async deleteInvite(inviteId: string) {
    return request<void>(`/invites/${inviteId}`, { method: "DELETE" });
  },

  async sendInviteEmail(inviteId: string, payload: SendInviteEmailRequestDTO) {
    return request<void>(`/invites/${inviteId}/send-email`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  setAccessToken,
  clearSession,
};
