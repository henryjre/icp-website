export type Role = "admin" | "editor" | "client";
export type UserStatus = "Pending" | "Active" | "Rejected" | "Archived";
export type InviteStatus = "Active" | "Archived" | "Expired";
export type DocumentScope = "PROJECT" | "ELEMENT";

export type ProjectStatus = "Completed" | "Ongoing";

export type ElementStatus = "Casted" | "Delivered";

export type ActivityType =
  | "created"
  | "updated"
  | "status"
  | "document"
  | "comment"
  | "delivered";

export type DocumentCategory = "TEST_RESULT" | "PLAN" | "PROJECT_GENERAL" | "PROJECT_PLAN";

export type DocumentType = "PDF" | "DOCX" | "XLSX" | "DWG" | "DXF" | "OTHER";

export interface ProjectActivityDTO {
  id: string;
  action: string;
  user: string;
  role: string;
  date: string;
  time: string;
  description: string;
  type: ActivityType;
}

export interface ProjectDocumentDTO {
  id: string;
  name: string;
  mimeType: string;
  category: DocumentCategory;
  scope: DocumentScope;
  type: DocumentType;
  size: string;
  uploadedBy: string;
  date: string;
  isConfidential: boolean;
}

export interface ProgressImageDTO {
  id: string;
  name: string;
  mimeType: string;
  size: string;
}

export interface ProgressUpdateDTO {
  id: string;
  note: string;
  author: string;
  role: string;
  date: string;
  time: string;
  images: ProgressImageDTO[];
}

export interface PrecastElementListItemDTO {
  id: string;
  projectId: string;
  projectName: string;
  batch: number | null;
  serialNumber: string | null;
  name: string;
  location: string;
  status: ElementStatus;
  castingDate: string;
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
  shortToken: string;
}

export interface PrecastElementDTO extends PrecastElementListItemDTO {
  testResults: ProjectDocumentDTO[];
  planDocuments: ProjectDocumentDTO[];
  progressUpdates: ProgressUpdateDTO[];
  activityHistory: ProjectActivityDTO[];
}

export interface ProjectListItemDTO {
  id: string;
  projectCode: string;
  name: string;
  location: string;
  dateStarted: string;
  status: ProjectStatus;
  completionDate: string | null;
  thumbnail: string;
  client: string;
  elementSummary: ProjectElementSummaryDTO;
  elements: PrecastElementListItemDTO[];
}

export interface ProjectElementSummaryDTO {
  total: number;
  delivered: number;
  casted: number;
}

export interface ProjectElementBatchSummaryDTO {
  key: string;
  batch: number | null;
  label: string;
  total: number;
  delivered: number;
  casted: number;
}

export interface ProjectDTO extends Omit<ProjectListItemDTO, "elements"> {
  activityHistory: ProjectActivityDTO[];
  elementSummary: ProjectElementSummaryDTO;
  projectDocuments: ProjectDocumentDTO[];
}

export interface UserDTO {
  id: string;
  fullName: string;
  email: string;
  role: Role | null;
  status: UserStatus;
  rejectedReason: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
}

export interface ApiErrorDTO {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface PageResponse<T> extends PaginatedResponse<T> {
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityPageDTO extends PaginatedResponse<ProjectActivityDTO> {
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadUrlResponseDTO {
  uploadUrl: string;
  s3Key: string;
  expiresInSeconds: number;
}

export interface DownloadUrlResponseDTO {
  downloadUrl: string;
  expiresInSeconds: number;
}

export interface RegisterRequestDTO {
  fullName: string;
  email: string;
  password: string;
  inviteCode: string;
}

export interface ForgotPasswordRequestDTO {
  email: string;
}

export interface ResetPasswordRequestDTO {
  token: string;
  password: string;
}

export interface PasswordRecoveryResponseDTO {
  message: string;
}

export interface UserManagementDTO extends UserDTO {}

export interface ApproveUserRequestDTO {
  role: Role;
}

export interface RejectUserRequestDTO {
  reason?: string;
}

export interface InviteCodeDTO {
  id: string;
  code: string;
  label: string | null;
  status: InviteStatus;
  expiresAt: string | null;
  useCount: number;
  maxUses: number | null;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
}

export interface CreateInviteRequestDTO {
  label?: string;
  expiresAt?: string | null;
  maxUses?: number | null;
}

export interface SendInviteEmailRequestDTO {
  toEmail: string;
  message?: string;
}

export interface CreateProjectRequestDTO {
  name: string;
  location: string;
  dateStarted: string;
  status: ProjectStatus;
  completionDate: string | null;
  thumbnail: string;
  client: string;
}

export interface UpdateProjectRequestDTO extends Partial<CreateProjectRequestDTO> {}

export interface CreateProjectThumbnailUploadUrlRequestDTO {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ProjectThumbnailUploadUrlResponseDTO extends UploadUrlResponseDTO {
  publicUrl: string;
}

export interface UpdateElementRequestDTO {
  batch?: number;
  serialNumber?: string;
  name?: string;
  location?: string;
  status?: ElementStatus;
  castingDate?: string;
}

export interface CreateElementRequestDTO {
  batch: number;
  serialNumber: string;
  name: string;
  location: string;
  status: ElementStatus;
  castingDate: string;
}

export interface FinalizeElementDocumentRequestDTO {
  name: string;
  category: "TEST_RESULT" | "PLAN";
  docType: DocumentType;
  sizeBytes: number;
  mimeType: string;
  s3Key: string;
  isConfidential: boolean;
}

export interface CreateProgressUpdateRequestDTO {
  note: string;
  images: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
  }[];
}
