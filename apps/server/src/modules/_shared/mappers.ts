import type {
  Activity,
  Document,
  Element,
  Project,
  ProgressUpdate,
  ProgressImage,
  User,
  ActivityType,
  DocumentCategory,
  DocumentScope,
} from "@prisma/client";
import { formatBytes, toDateLabelParts, toDateOnly } from "../../utils/date.js";

export type ActivityRecord = Activity & { actor: User };
export type DocumentRecord = Document & { uploadedBy: User };
export type ProgressUpdateRecord = ProgressUpdate & {
  author: User;
  images: ProgressImage[];
};
export type ElementRecord = Element & {
  createdBy: User;
  documents?: DocumentRecord[];
  progressUpdates?: ProgressUpdateRecord[];
  activities?: ActivityRecord[];
  project?: Project;
};
export type ProjectRecord = Project & {
  createdBy: User;
  elements?: ElementRecord[];
  documents?: DocumentRecord[];
  activities?: ActivityRecord[];
  _count?: {
    elements?: number;
  };
};

export type ProjectElementSummary = {
  total: number;
  delivered: number;
  casted: number;
};

function normalizeActivityType(type: ActivityType):
  | "created"
  | "updated"
  | "status"
  | "document"
  | "comment"
  | "delivered" {
  return type;
}

export function mapActivity(activity: ActivityRecord) {
  const { date, time } = toDateLabelParts(activity.occurredAt);
  return {
    id: activity.id,
    action: activity.action,
    user: activity.actor.email,
    role: activity.actor.role ?? "unassigned",
    date,
    time,
    description: activity.description,
    type: normalizeActivityType(activity.type),
  };
}

export function mapDocument(document: DocumentRecord) {
  return {
    id: document.id,
    name: document.name,
    mimeType: document.mimeType,
    category: document.category as DocumentCategory,
    scope: document.scope as DocumentScope,
    type: document.docType,
    size: formatBytes(document.sizeBytes),
    uploadedBy: document.uploadedBy.email,
    date: toDateOnly(document.createdAt),
    isConfidential: document.isConfidential,
  };
}

export function mapProgressUpdate(update: ProgressUpdateRecord) {
  const { date, time } = toDateLabelParts(update.createdAt);
  return {
    id: update.id,
    note: update.note,
    author: update.author.email,
    role: update.author.role ?? "unassigned",
    date,
    time,
    images: update.images.map((image) => ({
      id: image.id,
      name: image.name,
      mimeType: image.mimeType,
      size: formatBytes(image.sizeBytes),
    })),
  };
}

export function mapElementListItem(element: ElementRecord, projectName: string) {
  return {
    id: element.id,
    projectId: element.projectId,
    projectName,
    batch: element.batch,
    serialNumber: element.serialNumber,
    name: element.name,
    location: element.location,
    status: element.status,
    castingDate: toDateOnly(element.castingDate),
    createdBy: element.createdBy.email,
    createdDate: toDateOnly(element.createdAt),
    lastUpdated: toDateOnly(element.updatedAt),
    shortToken: element.shortToken,
  };
}

export function mapElementDetail(element: ElementRecord, projectName: string) {
  const docs = (element.documents ?? []).filter((d) => d.scope === "ELEMENT");
  const activities = element.activities ?? [];
  const progressUpdates = element.progressUpdates ?? [];
  const testResults = docs.filter((d) => d.category === "TEST_RESULT" as DocumentCategory).map(mapDocument);
  const planDocuments = docs.filter((d) => d.category === "PLAN" as DocumentCategory).map(mapDocument);

  return {
    ...mapElementListItem(element, projectName),
    testResults,
    planDocuments,
    progressUpdates: progressUpdates.map(mapProgressUpdate),
    activityHistory: activities.map(mapActivity),
  };
}

export function mapProjectListItem(project: ProjectRecord) {
  const elements = project.elements ?? [];
  const total = project._count?.elements ?? elements.length;
  return {
    id: project.id,
    projectCode: project.projectCode,
    name: project.name,
    location: project.location,
    dateStarted: toDateOnly(project.dateStarted),
    status: project.status,
    completionDate: project.completionDate ? toDateOnly(project.completionDate) : null,
    thumbnail: project.thumbnail,
    client: project.clientName,
    elementSummary: {
      total,
      delivered: elements.filter((element) => element.status === "Delivered").length,
      casted: elements.filter((element) => element.status === "Casted").length,
    },
    elements: elements.map((element) => mapElementListItem(element, project.name)),
  };
}

export function mapProjectDetail(project: ProjectRecord, elementSummary?: ProjectElementSummary) {
  const elements = project.elements ?? [];
  const docs = (project.documents ?? []).filter((doc) => doc.scope === "PROJECT");
  const activities = project.activities ?? [];
  const summary = elementSummary ?? {
    total: elements.length,
    delivered: elements.filter((element) => element.status === "Delivered").length,
    casted: elements.filter((element) => element.status === "Casted").length,
  };

  return {
    id: project.id,
    projectCode: project.projectCode,
    name: project.name,
    location: project.location,
    dateStarted: toDateOnly(project.dateStarted),
    status: project.status,
    completionDate: project.completionDate ? toDateOnly(project.completionDate) : null,
    thumbnail: project.thumbnail,
    client: project.clientName,
    elementSummary: summary,
    projectDocuments: docs.map(mapDocument),
    activityHistory: activities.map(mapActivity),
  };
}
