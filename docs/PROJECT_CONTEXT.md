# Project Context (AI Handoff)

This document is the canonical AI handoff context for the `icp-website` monorepo. It is written for implementation work, not marketing. It captures the current behavior of the codebase as of last review and highlights historical context where prior plans differ from current code.

## 1. Repository Overview

### Monorepo shape

This repository is an npm workspace with 3 main packages:

| Path | Purpose |
|---|---|
| `apps/web` | React + Vite frontend application (public site + authenticated admin/editor/client UI) |
| `apps/server` | Express + TypeScript backend API with Prisma/Postgres, auth, RBAC, documents, short links |
| `packages/shared` | Shared TypeScript contracts used by both web and server (`@icp/shared`) |

Root workspace files:

- `package.json` defines workspace scripts and dev/build orchestration.
- `.env.example` defines all expected env keys.
- `README.md` provides setup and bootstrap commands.
- `.plans/*.md` contains planning history and rationale for major refactors.

### Current behavior

- Workspace is active and integrated; frontend consumes backend API.
- Project and element data are DB-driven (no static seed dataset in app code).
- Auth, registration approval workflow, role guards, and S3 document flows are implemented.

### Historical note

- `.plans` contains earlier plans that may mention older fields or older route patterns. Always trust actual source files first.

### High-value file map for orientation

Use this quick map before making changes:

| Area | Files |
|---|---|
| Workspace orchestration | `package.json`, `README.md`, `.env.example` |
| Backend bootstrap | `apps/server/src/index.ts`, `apps/server/src/app.ts`, `apps/server/src/routes.ts` |
| Backend config | `apps/server/src/config/env.ts`, `apps/server/src/config/database.ts` |
| Backend infra libs | `apps/server/src/lib/prisma.ts`, `apps/server/src/lib/jwt.ts`, `apps/server/src/lib/s3.ts`, `apps/server/src/lib/mail.ts` |
| Domain modules | `apps/server/src/modules/**/routes.ts` + `schemas.ts` |
| Shared response mapping | `apps/server/src/modules/_shared/mappers.ts` |
| Prisma schema/migrations | `apps/server/prisma/schema.prisma`, `apps/server/prisma/migrations/*` |
| Frontend router/shell | `apps/web/src/app/routes.tsx`, `apps/web/src/app/components/Layout.tsx` |
| Frontend API boundary | `apps/web/src/app/lib/api/client.ts` |
| Frontend auth/draft storage | `apps/web/src/app/lib/auth/store.ts`, `apps/web/src/app/lib/drafts/store.ts` |
| Core product pages | `apps/web/src/app/pages/*` |
| Theme system | `apps/web/src/styles/theme.css` |
| Shared contracts | `packages/shared/src/index.ts` |

## 2. Tech Stack

### Frontend (`apps/web`)

- React 18
- React Router 7 (`createBrowserRouter`, route loaders, redirects)
- Vite 6
- Tailwind CSS 4 + tokenized CSS variables in `apps/web/src/styles/theme.css`
- UI/icon libs: Radix UI, Lucide, MUI (partially), Embla carousel, `react-pdf`, `qrcode.react`

### Backend (`apps/server`)

- Node + Express 4
- TypeScript + tsx
- Prisma ORM 6 with PostgreSQL
- Zod validation
- JWT access/refresh auth
- RBAC middleware
- S3-compatible storage via AWS SDK v3 (DigitalOcean Spaces compatible)
- SMTP mail via Nodemailer (invite + inquiry emails)

### Shared contracts (`packages/shared`)

- DTO and enum-like union types for auth/users/projects/elements/documents/activity/invites.
- Imported via `@icp/shared`.

### Runtime topology

Local development runtime has two long-lived processes:

1. Web dev server (`@icp/web`) on `http://localhost:5173` by default.
2. API server (`@icp/server`) on `http://localhost:4000` by default.

Frontend talks to backend through `VITE_API_BASE_URL`. Default fallback in client code is `http://localhost:4000/api`.

Request path example:

1. Browser route: `/projects/PRJ0001`
2. Router loader resolves code via `/api/short/projects/PRJ0001`
3. Loader fetches full project by internal ID via `/api/projects/:projectId`
4. Component renders project and may issue more scoped API calls for docs/activity.

Document upload path example:

1. Browser asks backend for upload URL.
2. Backend signs URL for S3-compatible storage.
3. Browser uploads directly to S3 (backend not proxying file bytes).
4. Browser calls finalize endpoint to create document DB row.

Storage and DB are external dependencies:

- PostgreSQL (local docker or remote service).
- S3-compatible object storage (DigitalOcean Spaces).
- Optional SMTP provider for invite and contact emails.

Frontend build output is static assets from Vite; backend is a Node process with Prisma client.

There is no SSR layer and no BFF separate from the Express API.

## 3. Workspace Commands

### Root commands (`package.json`)

| Command | Purpose |
|---|---|
| `npm run dev` | Run web + server concurrently |
| `npm run dev:web` | Run frontend only |
| `npm run dev:server` | Run backend only |
| `npm run build` | Build web then server |
| `npm run build:web` | Build frontend only |
| `npm run build:server` | Build backend only |

### Server commands (`apps/server/package.json`)

| Command | Purpose |
|---|---|
| `npm run dev --workspace @icp/server` | Start server in watch mode |
| `npm run build --workspace @icp/server` | Compile TypeScript to `dist` |
| `npm run start --workspace @icp/server` | Run compiled server |
| `npm run prisma:generate --workspace @icp/server` | Generate Prisma client |
| `npm run prisma:migrate --workspace @icp/server` | Runs `prisma migrate dev` through `src/scripts/prisma.ts` |
| `npm run seed:admin --workspace @icp/server` | Upsert admin from `ADMIN_EMAIL` + `ADMIN_PASSWORD` |

### Web commands (`apps/web/package.json`)

| Command | Purpose |
|---|---|
| `npm run dev --workspace @icp/web` | Vite dev server |
| `npm run build --workspace @icp/web` | Production build |
| `npm run preview --workspace @icp/web` | Preview build |

### Prisma reset examples

- Interactive reset:
  - `npm run prisma:migrate --workspace @icp/server -- reset`
- Non-interactive reset:
  - `npm run prisma:migrate --workspace @icp/server -- reset --force`

If the reset command exits with code 130, it usually means Prisma prompt was cancelled.

### Workspace flag usage (`--workspace @icp/server`)

This repo is a multi-package workspace. The `--workspace` flag tells npm which package script to execute.

Example:

- `npm run prisma:migrate --workspace @icp/server`

means:

1. Find script `prisma:migrate` in `apps/server/package.json`.
2. Run it with `apps/server` as package context.
3. Use dependencies and config for that workspace package.

Without `--workspace`, npm attempts to run the script from root `package.json` where server-specific scripts are not defined.

The same pattern applies to web commands:

- `npm run build --workspace @icp/web`

When passing extra args to the workspace script, use `--` separator:

- `npm run prisma:migrate --workspace @icp/server -- reset --force`

This appends `reset --force` to the underlying Prisma command in `src/scripts/prisma.ts`.

## 4. Environment and Configuration

### Where env lives

- Primary developer env file: repo root `.env`
- Server loads:
  - local cwd `.env`
  - then root `../../.env` (see `apps/server/src/config/env.ts`)

### Database resolution precedence

In `apps/server/src/config/database.ts`:

1. If `DATABASE_URL` is set and non-empty, it is used as-is.
2. Else server requires all `MASTER_DB_*` keys:
   - `MASTER_DB_HOST`
   - `MASTER_DB_PORT`
   - `MASTER_DB_NAME`
   - `MASTER_DB_USER`
   - `MASTER_DB_PASSWORD`

It then composes:

`postgresql://<user>:<password>@<host>:<port>/<name>?schema=public`

### Env matrix

| Variable | Used by | Purpose |
|---|---|---|
| `NODE_ENV` | server | Environment mode; also drives S3 key root (`production` vs `development`) |
| `PORT` | server | API port |
| `DATABASE_URL` | server/prisma | Optional direct DB URL override |
| `MASTER_DB_HOST/PORT/NAME/USER/PASSWORD` | server/prisma | Structured DB config fallback |
| `JWT_ACCESS_SECRET` | server auth | Access token signing secret |
| `JWT_REFRESH_SECRET` | server auth | Refresh token signing secret |
| `JWT_ACCESS_TTL` | server auth | Access token lifetime (ex: `15m`) |
| `JWT_REFRESH_TTL` | server auth | Refresh token lifetime (ex: `7d`) |
| `S3_ENDPOINT` | server s3 | S3-compatible endpoint |
| `S3_REGION` | server s3 | Region used by AWS SDK |
| `S3_BUCKET` | server s3 | Bucket/space name |
| `S3_PUBLIC_BASE_URL` | server s3/projects | Public base URL for public objects (thumbnail URL composition) |
| `S3_ACCESS_KEY_ID` | server s3 | Access key |
| `S3_SECRET_ACCESS_KEY` | server s3 | Secret key |
| `S3_PRESIGNED_EXPIRES_SECONDS` | server s3 | Expiration for presigned upload/download URLs |
| `PUBLIC_SITE_URL` | server links | Base URL for short-link redirects and invite links |
| `VITE_PUBLIC_SITE_URL` | server links/web | Fallback site URL in some flows |
| `VITE_API_BASE_URL` | web | API base URL for frontend requests |
| `SMTP_HOST/PORT/USER/PASS` | server mail | SMTP transport |
| `REGISTER_SMTP_FROM` | server invites | Invite sender address |
| `INQUIRY_SMTP_FROM` | server contact | Inquiry sender address |
| `CONTACT_EMAIL` | server contact | Inquiry destination mailbox |
| `ADMIN_EMAIL` | seed script | Admin bootstrap email |
| `ADMIN_PASSWORD` | seed script | Admin bootstrap password |

### Current behavior

- Server startup fails fast if required env validation fails (zod parse + process exit).
- Server sets `process.env.DATABASE_URL` after resolving master DB config.

### Historical note

- DB connection logic was migrated from simple `DATABASE_URL` usage to `MASTER_DB_*` support.

## 5. Backend Architecture

### Express bootstrap

File: `apps/server/src/app.ts`

Flow:

1. `cors()` (currently permissive/default)
2. `express.json({ limit: "10mb" })`
3. request logging via morgan (`requestLogger`)
4. health route: `GET /health`
5. public short links mounted at `/e`
6. API routes mounted at `/api`
7. 404 JSON fallback
8. centralized `errorHandler`

### Module map

Mounted in `apps/server/src/routes.ts`:

- `/auth` -> auth module
- `/users` -> users module
- `/projects` -> projects module
- `/projects` -> elements module (nested project element routes)
- `/projects` -> project documents module
- `/elements` -> element documents module
- `/documents` -> generic document routes
- `/invites` -> invite management
- `/contact` -> contact form email handler
- `/p` -> short links router
- `/e` -> short links router
- `/short` -> short lookup router
- `/` -> activity routes (`/projects/:id/activity`, `/elements/:id/activity`)

### Backend responsibility map (module-by-module)

| Module | Primary files | Responsibilities |
|---|---|---|
| Auth | `apps/server/src/modules/auth/routes.ts`, `apps/server/src/modules/auth/schemas.ts` | Register/login/refresh/logout/me, status gating, refresh token rotation |
| Users | `apps/server/src/modules/users/routes.ts`, `apps/server/src/modules/users/schemas.ts` | Admin user lifecycle (create/list/approve/reject/archive/delete/role) |
| Invites | `apps/server/src/modules/invites/routes.ts`, `apps/server/src/modules/invites/schemas.ts` | Invite code CRUD-lite, invite link generation, SMTP invite sending |
| Projects | `apps/server/src/modules/projects/routes.ts`, `apps/server/src/modules/projects/schemas.ts` | Project CRUD, project code generation, thumbnail presign, project diff activity |
| Elements | `apps/server/src/modules/elements/routes.ts`, `apps/server/src/modules/elements/schemas.ts` | Element CRUD, short token generation, element activity |
| Documents | `apps/server/src/modules/documents/routes.ts`, `apps/server/src/modules/documents/schemas.ts` | Presign/finalize/list/download/toggle/delete for project and element docs |
| Activity | `apps/server/src/modules/activity/routes.ts`, `apps/server/src/modules/activity/schemas.ts` | Paginated activity feeds with role restrictions |
| Short links | `apps/server/src/modules/elements/shortLinks.ts` | Redirects and lookup endpoints for projectCode + elementToken |
| Contact | `apps/server/src/modules/contact/routes.ts` | Public inquiry endpoint and email dispatch |

### Middleware and request lifecycle details

| Middleware | File | Behavior |
|---|---|---|
| Request logger | `apps/server/src/middleware/requestLogger.ts` | Morgan `dev` logging |
| Body parser | `apps/server/src/app.ts` | JSON only, 10MB limit |
| Validation | `apps/server/src/middleware/validate.ts` | Zod parse for body/params/query, mutates `req` with parsed values |
| Auth required | `apps/server/src/middleware/authGuard.ts` | Validates bearer access token and sets `req.user` |
| Auth optional | `apps/server/src/middleware/optionalAuthGuard.ts` | Best-effort parse bearer token; silently continues on failure |
| Role authorization | `apps/server/src/middleware/roleGuard.ts` | Requires authenticated user with role in allowed list |
| Error handler | `apps/server/src/middleware/errorHandler.ts` | Handles Zod, custom `HttpError`, Prisma known errors, fallback 500 |

### Error/response conventions

- Success envelopes are typically object-based (`{ project }`, `{ items, total }`, `{ user }`).
- 204 is used for successful no-body actions (logout, delete in many routes).
- Validation errors return status 400 with:
  - `message: "Validation failed"`
  - `details: zod.flatten()`
- Domain-level route errors use `HttpError` and return `message` plus optional `details`.
- Prisma `P2025` maps to 404 in `errorHandler`.

### Auth/token lifecycle

Files:

- `apps/server/src/modules/auth/routes.ts`
- `apps/server/src/lib/jwt.ts`
- `apps/server/src/lib/hash.ts`

Flow:

1. Login validates credentials + status gate.
2. Access token issued (JWT, short TTL).
3. Refresh token issued (JWT, longer TTL) and hashed in DB (`RefreshToken.tokenHash`).
4. Refresh endpoint validates token signature and DB record, revokes old record, rotates tokens.
5. Logout revokes matching refresh token (if provided).

### RBAC and user status model

Auth middleware:

- `authGuard` -> requires `Bearer` token.
- `optionalAuthGuard` -> attaches `req.user` if valid token exists.
- `roleGuard(...roles)` -> role-based authorization.

Roles:

- `admin`
- `editor`
- `client`

User status lifecycle:

- `Pending`
- `Active`
- `Rejected`
- `Archived`

Login allowed only when:

- status is `Active`
- `isActive` is true
- role is non-null

### Current behavior

- Public reads still exist for projects/elements, but project documents now require auth.
- Activity endpoints are restricted to admin/editor and paginated.
- User delete is hard delete, blocked on domain dependencies with 409.

### Historical note

- Earlier behavior had broader public activity/doc visibility; current code enforces tighter access.

## 6. Data Model Snapshot (Prisma)

File: `apps/server/prisma/schema.prisma`

### Core models

| Model | Key fields |
|---|---|
| `User` | `id`, `fullName`, `email`(unique), `passwordHash`, `role?`, `status`, `rejectedReason?`, `isActive`, timestamps |
| `RefreshToken` | hashed refresh token records with expiry + revocation |
| `InviteCode` | `code`(unique), status, expiry, usage counters, created/archived by |
| `InviteUse` | invite usage audit trail (`email`, `usedAt`, optional linked user) |
| `Project` | `id`, `seq`(autoincrement unique), `projectCode`(unique), name/location/date/status/completion/thumbnail/clientName, creator |
| `Element` | `id`, `seq`(autoincrement unique), `shortToken`(unique), project relation, name/location/status/castingDate, creator |
| `Document` | scope (`PROJECT`/`ELEMENT`), category, metadata, `s3Key`(unique), confidentiality flag, uploader, optional `elementId` |
| `Activity` | action/description/type, optional `projectId` and `elementId`, actor, occurredAt |

### Enums

- `Role`: `admin | editor | client`
- `UserStatus`: `Pending | Active | Rejected | Archived`
- `InviteStatus`: `Active | Archived | Expired`
- `ProjectStatus`: `Completed | Ongoing`
- `ElementStatus`: `Casted | Delivered`
- `ActivityType`: `created | updated | status | document | comment | delivered`
- `DocumentCategory`: `TEST_RESULT | PLAN | PROJECT_GENERAL | PROJECT_PLAN`
- `DocumentScope`: `PROJECT | ELEMENT`
- `DocumentType`: `PDF | DOCX | XLSX | DWG | DXF | OTHER`

### Notable identifiers

- Canonical project code: `projectCode` in `PRJ####` format.
- Element short token: `shortToken` generated from base62 of element sequence.

### Relational and deletion behavior

- `Project -> Element` is cascade delete.
- `Project -> Document` is cascade delete.
- `Element -> Document` is cascade delete for element-scoped docs.
- `User` is referenced by many entities (creator/uploader/actor), which is why user hard-delete is guarded at app layer.
- `Activity` can be project-only, element-only, both, or neither project-null for future flexibility (current code mostly ties activity to project and/or element).

### Query/index notes

- `Document.s3Key` is unique.
- `Document` has indexes on `scope`, `elementId`, `projectId`, and `(projectId, scope)`.
- `Element` has unique `shortToken` and unique autoincrement `seq`.
- `Project` has unique `projectCode` and unique autoincrement `seq`.

### Current behavior

- Project description/category/contract value fields are removed from schema.
- Element engineering detail fields (`markNumber`, `type`, `dimensions`, `weight`, `concreteGrade`) are removed from schema.

### Historical note

- Earlier plans and older migrations included those removed fields; do not reintroduce unless product requirements explicitly return.

### Migration lineage (high-level)

`apps/server/prisma/migrations` includes:

- `0001_init`
- `0002_auth_onboarding`
- `0003_project_documents_scope`
- `0004_project_simplify`
- `0005_project_plan_category`
- `0006_remove_project_description`
- `20260224114545_add_element_short_token`
- `20260224122114_add_project_and_elemet_codes`
- `20260224143657_element_refactor`

## 7. API Surface (Practical)

Base URL: `http://<server>/api`

### Auth

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Invite-only; creates Pending user with null role |
| POST | `/auth/login` | Public | Blocks Pending/Rejected/Archived; returns access+refresh |
| POST | `/auth/refresh` | Public (token-based) | Refresh rotation with DB hash check |
| POST | `/auth/logout` | Public/Auth | Revokes refresh token if provided |
| GET | `/auth/me` | Auth | Returns current active user |

### Users (admin management)

| Method | Path | Access |
|---|---|---|
| GET | `/users/me` | Auth |
| POST | `/users` | Admin |
| GET | `/users?status=&search=` | Admin |
| PATCH | `/users/:userId/approve` | Admin |
| PATCH | `/users/:userId/reject` | Admin |
| PATCH | `/users/:userId/archive` | Admin |
| PATCH | `/users/:userId/role` | Admin |
| DELETE | `/users/:userId` | Admin |

Delete guard:

- self-delete blocked
- delete blocked when related project/element/document/activity/invite records exist

### Invites

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/invites?status=Active|Archived|Expired|All` | Admin | Status includes computed expiry |
| POST | `/invites` | Admin | Returns invite + inviteLink |
| PATCH | `/invites/:inviteId/archive` | Admin | Archive invite |
| PATCH | `/invites/:inviteId/unarchive` | Admin | Unarchive invite |
| POST | `/invites/:inviteId/send-email` | Admin | SMTP send |

### Projects

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/projects` | Public | Includes elements/docs in backend include; mapped list response |
| GET | `/projects/:projectId` | Public/Optional auth | Returns empty activity for non admin/editor; hides confidential docs |
| POST | `/projects/thumbnail/upload-url` | Admin/Editor | Presigned upload + public URL |
| POST | `/projects` | Admin | Creates project + projectCode (`PRJ####`) |
| PATCH | `/projects/:projectId` | Admin/Editor | Field-level diff activity if changed |
| DELETE | `/projects/:projectId` | Admin | Deletes project and attempts S3 cleanup |

### Elements (nested under projects)

| Method | Path | Access |
|---|---|---|
| GET | `/projects/:projectId/elements` | Public |
| GET | `/projects/:projectId/elements/:elementId` | Public/Optional auth |
| POST | `/projects/:projectId/elements` | Admin |
| PATCH | `/projects/:projectId/elements/:elementId` | Admin/Editor |
| DELETE | `/projects/:projectId/elements/:elementId` | Admin |

### Documents

Element document routes:

| Method | Path | Access |
|---|---|---|
| GET | `/elements/:elementId/documents` | Public/Optional auth (confidential filtered) |
| POST | `/elements/:elementId/documents/upload-url` | Admin/Editor |
| POST | `/elements/:elementId/documents` | Admin/Editor |

Project document routes:

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/projects/:projectId/documents` | Auth | Non-confidential for client; all for admin/editor |
| POST | `/projects/:projectId/documents/upload-url` | Admin/Editor | Prefixed key, scoped path |
| POST | `/projects/:projectId/documents` | Admin/Editor | `PROJECT_PLAN` replacement semantics |
| GET | `/projects/:projectId/documents/:documentId/download-url` | Auth | Confidential restricted to admin/editor |
| PATCH | `/projects/:projectId/documents/:documentId` | Admin/Editor | Category constrained to `PROJECT_GENERAL/PROJECT_PLAN` |
| DELETE | `/projects/:projectId/documents/:documentId` | Admin/Editor | Logs `Project Document Deleted` activity |

Generic document routes:

| Method | Path | Access |
|---|---|---|
| GET | `/documents/:documentId/download-url` | Optional auth |
| PATCH | `/documents/:documentId` | Admin/Editor |
| DELETE | `/documents/:documentId` | Admin/Editor |

### Activity

| Method | Path | Access | Pagination |
|---|---|---|---|
| GET | `/projects/:projectId/activity?page=1` | Admin/Editor | fixed `pageSize=10` |
| GET | `/elements/:elementId/activity?page=1` | Admin/Editor | fixed `pageSize=10` |

Project activity endpoint excludes element-scoped `updated` and `document` entries.

### Contact

| Method | Path | Access |
|---|---|---|
| POST | `/contact` | Public |

### Short links and lookups

Redirect routes:

| Method | Path | Mounted at | Behavior |
|---|---|---|---|
| GET | `/:projectCode` | `/p` | 302 to frontend `/projects/:projectCode` |
| GET | `/:projectCode/e/:elementToken` | `/p` | 302 to frontend `/projects/:projectCode/e/:elementToken` |
| GET | `/:token` | `/e` | 302 to frontend `/projects/:projectCode/e/:token` |

Lookup routes (`/short`):

| Method | Path | Response |
|---|---|---|
| GET | `/short/projects/:projectCode` | `{ projectId, projectCode }` |
| GET | `/short/projects/:projectCode/elements/:elementToken` | `{ projectId, elementId, elementToken, projectCode }` |
| GET | `/short/elements/:token` | `{ projectId, elementId, elementToken, projectCode }` |

### Role permission matrix (effective behavior)

This matrix reflects current route guards and route logic.

| Capability | Public | Client | Editor | Admin |
|---|---|---|---|---|
| View projects list/detail | Yes | Yes | Yes | Yes |
| View elements list/detail | Yes | Yes | Yes | Yes |
| View project documents list | No | Yes (non-confidential) | Yes (all) | Yes (all) |
| View element documents list | Yes (non-confidential) | Yes (non-confidential) | Yes (all) | Yes (all) |
| Download confidential docs | No | No | Yes | Yes |
| Upload/finalize project docs | No | No | Yes | Yes |
| Upload/finalize element docs | No | No | Yes | Yes |
| Create project | No | No | No | Yes |
| Update project metadata | No | No | Yes | Yes |
| Delete project | No | No | No | Yes |
| Create element | No | No | No | Yes |
| Update element | No | No | Yes | Yes |
| Delete element | No | No | No | Yes |
| View activity feeds | No | No | Yes | Yes |
| User management | No | No | No | Yes |
| Invite management | No | No | No | Yes |

### Response envelope patterns

Common response patterns used by frontend:

| Pattern | Example endpoints |
|---|---|
| Single resource envelope | `{ project }`, `{ element }`, `{ user }`, `{ document }` |
| List envelope | `{ items, total }` |
| Paginated list envelope | `{ items, total, page, pageSize, totalPages }` |
| Download URL | `{ downloadUrl, expiresInSeconds }` |
| Upload URL | `{ uploadUrl, s3Key, expiresInSeconds }` (+ `publicUrl` for thumbnail uploads) |

Frontend contract assumptions:

- `apiClient` unwraps envelopes and returns typed payloads for pages.
- 204 responses are represented as `void` in client methods.
- 401 triggers one refresh attempt for authenticated requests.

## 8. S3/File Handling

### Key helper behavior

File: `apps/server/src/lib/s3.ts`

- `getS3EnvironmentRoot()`:
  - `production` if `NODE_ENV=production`
  - `development` for all other envs (`development`, `test`, etc.)
- `withS3EnvironmentRoot(key)` prepends environment root.

### Current key patterns

| Feature | Key pattern |
|---|---|
| Project thumbnail | `ENV/projects/thumbnails/<timestamp>-<safeName>` |
| Project documents | `ENV/projects/<projectCodeOrId>/project-docs/<timestamp>-<safeName>` |
| Element documents | `ENV/projects/<projectId>/elements/<shortToken>/<timestamp>-<safeName>` |

### Upload flow

1. Client requests upload URL endpoint.
2. Server returns `{ uploadUrl, s3Key, expiresInSeconds }` (+ `publicUrl` for thumbnails).
3. Client uploads directly via `PUT` to signed URL.
4. Client finalizes metadata via document create endpoint.

### Download flow

1. Client requests signed download URL from backend.
2. Backend checks confidentiality + role.
3. Backend returns short-lived `downloadUrl`.

### Confidentiality rules

- `isConfidential=true` documents are readable only by `admin` and `editor`.
- Project documents are hidden from unauthenticated users entirely (auth required to list).
- Element documents list endpoint is public but confidential docs are filtered out for non-privileged users.

### General plan replacement

- Finalizing a `PROJECT_PLAN` document deletes previous plan DB row and attempts old S3 object removal.
- Activity is logged as `Project Edited` with before/after plan file names.

## 9. Frontend Architecture

### Router and loaders

File: `apps/web/src/app/routes.tsx`

- Root layout wrapper with `RouteErrorBoundary`.
- Loader-driven routes:
  - `homeLoader` (`listProjects`)
  - `projectsLoader` (`listProjects`)
  - `projectLoader` (project code resolve + canonical redirect)
  - `elementLoader` (code/token resolve + canonical redirect)
  - `shortElementEntryLoader` for `/e/:elementToken` -> redirect to canonical element URL
- Guard loaders:
  - `guestOnlyLoader` (redirect authenticated users away from login/register)
  - `adminLoader` (requires logged-in admin for `/users` and `/admin/projects/new`)

### Auth persistence

File: `apps/web/src/app/lib/auth/store.ts`

- Tokens and user are stored in `localStorage`:
  - `icp_access_token`
  - `icp_refresh_token`
  - `icp_user`
- API client auto-refreshes on 401 once and retries.

### In-memory draft persistence

File: `apps/web/src/app/lib/drafts/store.ts`

- `Map<string, unknown>` module-level draft store.
- Persists across route changes in same SPA session.
- Clears automatically on full browser refresh (no local/session storage for drafts).

### API client architecture

File: `apps/web/src/app/lib/api/client.ts`

- Centralized fetch wrapper with typed methods.
- Adds `Authorization` header when token exists.
- Throws `ApiClientError` with HTTP status for page-level error handling.

### Layout/navigation

File: `apps/web/src/app/components/Layout.tsx`

- Sticky header with animated dual logo (`/logo-icp.webp` and `/logo-exelcrete.webp`).
- Public nav and admin dropdown split; admin items visible only to admin.
- Footer contains quick links (including legal pages), services list, contact info.
- Footer quick-link click triggers scroll-to-top.

### Route-to-page ownership map

| Route | Page component | Loader | Notes |
|---|---|---|---|
| `/` | `Home` | `homeLoader` | Featured projects carousel + skeleton |
| `/about` | `AboutUs` | None | ICP/Exelcrete tab toggle and long-form company profile |
| `/products` | `ProductOverview` | None | Public product/services content |
| `/projects` | `Projects` | `projectsLoader` | Search + status filters + project cards |
| `/projects/:projectId` | `ProjectDetail` | `projectLoader` | Resolves/canonicalizes to project code route |
| `/projects/:projectId/elements/:elementId` | `PrecastElementDetail` | `elementLoader` | Legacy id route, canonical redirect when possible |
| `/projects/:projectCode/e/:elementToken` | `PrecastElementDetail` | `elementLoader` | Canonical element route |
| `/e/:elementToken` | `EmptyRoute` | `shortElementEntryLoader` | Frontend short-entry redirect |
| `/contact` | `ContactUs` | None | Public inquiry form |
| `/login` | `Login` | `guestOnlyLoader` | Redirects authenticated users away |
| `/register` | `Register` | `guestOnlyLoader` | Invite registration |
| `/users` | `UsersAdmin` | `adminLoader` | Admin-only user/invite operations |
| `/admin/projects/new` | `CreateProject` | `adminLoader` | Admin-only project creation |
| `/privacy-policy` | `PrivacyPolicy` | None | Legal static content |
| `/terms-and-conditions` | `TermsAndConditions` | None | Legal static content |

### Frontend state and data patterns

- Data loading pattern:
  - Loader resolves core page data.
  - Component local state allows optimistic refresh/reload after mutations.
- Mutation pattern:
  - Page calls `apiClient` method.
  - On success, page re-fetches affected resource (often via `apiClient.getProject/getElement`).
  - On failure, page sets inline error state from `ApiClientError.message`.
- Draft pattern:
  - Most forms bind values into draft store keys.
  - Drafts are cleared on successful submit or cancel actions.
- Role gating pattern:
  - UI gates on `apiClient.getStoredUser()` role checks.
  - Route-level gating is enforced for admin pages via loader.

## 10. Major UI/Domain Workflows

### Project creation workflow

File: `apps/web/src/app/pages/CreateProject.tsx`

1. Admin opens `/admin/projects/new`.
2. Required inputs:
   - core project fields
   - thumbnail (uploaded first to S3, stores public URL)
   - General Plan file (required before submit)
3. Additional project documents are optional.
4. Submit sequence:
   - create project via API
   - upload/finalize general plan (`PROJECT_PLAN`)
   - upload/finalize additional docs (`PROJECT_GENERAL`)
5. Result:
   - success panel at page top
   - action buttons (`View Project`, `Create Another`)
   - partial upload failures shown without losing created project.

### Project detail workflow

File: `apps/web/src/app/pages/ProjectDetail.tsx`

- Canonical URL usage with `projectCode` + element short token links.
- Section tab menu (`details`, `plan`, `elements`, `documents`, `activity`) is centered and scroll-synced.
- Admin/editor can:
  - toggle inline project edit
  - upload/replace thumbnail
  - replace general plan
  - upload/delete/toggle confidentiality for additional project docs
  - add elements (admin only), including QR generation in creation dialog
- Activity:
  - admin/editor only
  - paginated 10/page
  - auto refresh when related mutating actions complete
  - field diff rendering supports `old -> new` visualization.

### Element detail workflow

File: `apps/web/src/app/pages/PrecastElementDetail.tsx`

- Displays element metadata and QR code.
- Admin/editor can inline edit basic element fields.
- Admin can delete element.
- Test Results and Plan Documents sections support drag-drop upload + browse.
- Per-document actions:
  - download
  - make confidential/public
  - delete
- Activity section visible only to admin/editor, paginated 10/page.

### User and invite onboarding workflow

Files:

- `apps/web/src/app/pages/Register.tsx`
- `apps/web/src/app/pages/Login.tsx`
- `apps/web/src/app/pages/UsersAdmin.tsx`
- server auth/users/invites modules

Flow:

1. Admin creates invite code (optional expiry).
2. Invitee registers with invite code -> `Pending`.
3. Admin accepts user and assigns role.
4. Accepted user can login and access role-appropriate pages.
5. Admin can reject/archive/delete users.

### Activity logging triggers (current)

Project-level examples:

- `Project Created`
- `Project Edited` (includes multiline field diffs for metadata updates)
- `Project Document Uploaded`
- `Project Document Deleted`
- `Project Edited` for general plan replacement

Element-level examples:

- `Element Created`
- `Element Updated`
- `Element Deleted`
- `Document Uploaded` (element docs)
- `Document Deleted` (element docs)

### Workflow failure modes and expected UI behavior

Project creation:

- Thumbnail upload fails:
  - UI error shown, submit remains blocked if thumbnail URL absent.
- General plan not selected:
  - submit blocked with explicit required error.
- Project create succeeds but some document uploads fail:
  - success panel still appears;
  - failed file names shown in warning/error message;
  - user can still navigate to created project.

Project detail:

- Missing/invalid project:
  - route boundary or page-level "Project Not Found" fallback.
- Download URL forbidden (confidential doc for insufficient role):
  - request fails with 403 and UI error.
- Edit save with no actual value changes:
  - backend updates may still run, but no new diff activity entry is created.

Element detail:

- Document upload fails:
  - inline upload error shown;
  - no local list update until finalize succeeds.
- Confidential toggle fails:
  - inline page error shown; local state remains previous value.
- Delete element fails:
  - error shown and delete dialog closes or stays depending on error path.

Admin user/invite:

- Accept without role selection:
  - UI enforces role selection and/or backend returns validation error.
- Delete user with related domain records:
  - backend returns 409 with archive guidance message.
- Invite send failure:
  - backend error shown in admin page alert area.

## 11. URL and Short-Link Scheme

### Canonical frontend URLs

- Project detail: `/projects/:projectCode` (ex: `/projects/PRJ0001`)
- Element detail: `/projects/:projectCode/e/:elementToken` (ex: `/projects/PRJ0001/e/2`)

### Short entry URL

- `/e/:elementToken` exists in frontend router and resolves via API `/short/elements/:token`.
- Redirect target is canonical project code + element token route.

### Backend redirect helpers

- `/api/p/:projectCode` and `/api/p/:projectCode/e/:token` redirect to frontend canonical routes.
- `/api/e/:token` redirects to canonical element route.

### Current behavior

- Loaders canonicalize ID-based routes to code-based routes when possible.
- UI links are code-first.

### Historical note

- Earlier iterations used long CUID IDs in URLs and `/p/*` canonical frontend paths; current canonical UI path is `/projects/*` and `/e/*` token entry.

## 12. Theming and Design System Notes

### Token source

- Primary token file: `apps/web/src/styles/theme.css`
- Uses CSS variables plus utility classes (`bg-brand-*`, `text-brand-*`, etc.).

### Current palette (as implemented)

- Primary blue family anchored on `--brand-primary: #1a237e`
- Secondary cyan `--brand-secondary: #29aae2`
- Accent green `--brand-accent: #6cc24a`
- Supporting highlight/surface variables for cards, borders, and muted text.

### Status semantics in UI

- Completed states generally shown in green.
- Ongoing states generally shown in brand-secondary blue.
- Destructive actions remain red.

### Design language constraints

- Existing app uses rounded cards, subtle shadows, hero banners, and responsive layout.
- Admin pages preserve the same visual language as public pages.

## 13. Known Issues / Operational Gotchas

### 1) CORS and Spaces/CDN pitfalls

- Presigned upload failures often come from bucket CORS mismatch, wrong endpoint/region pairing, or key/path mismatch.
- CDN `AccessDenied` usually indicates object ACL/policy/cdn permissions are not aligned with public URL assumptions.

### 2) Prisma reset confusion

- `npm run prisma:migrate --workspace @icp/server -- reset` may prompt and exit if cancelled.
- Use `--force` when scripting resets in development.

### 3) Route mismatch pitfalls

- `/e/:token` must exist in frontend router to avoid "No routes matched location" when QR links are opened directly.
- Short-link resolution requires backend availability and correct `PUBLIC_SITE_URL`.

### 4) Encoding/mojibake artifacts

- Some static strings contain mojibake artifacts (for example broken UTF-8 glyphs) in frontend and email template text.
- Clean these if editing those files to avoid broken typography.

### 5) UI class typos

- There are class names like `bg-brand-highlight0` in some components (ex: users/admin and about timeline blocks) that do not map to defined utilities, causing style inconsistencies.

### 6) Contact page API bypass

- `ContactUs` currently uses direct `fetch` instead of `apiClient`, so it does not reuse common retry/error handling.

### 7) Duplicate short-link mount paths

- `shortLinksRouter` is mounted both at app root (`/e`) and under `/api` (`/api/e`) via `apiRouter`. This is intentional compatibility but can confuse debugging.

### Quick debugging playbooks

#### API returns 401 unexpectedly

1. Confirm `Authorization: Bearer <token>` header is present (frontend request wrapper).
2. Check access token expiry and refresh-token validity in DB.
3. Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` match runtime env.
4. Confirm user status is `Active`, `isActive=true`, and role is non-null.

#### Project detail opens by ID but not by project code

1. Check `projectCode` exists in DB for that project.
2. Test lookup endpoint: `GET /api/short/projects/:projectCode`.
3. Confirm frontend route loader can resolve and redirect.
4. Verify no stale link still points to legacy ID route.

#### QR `/e/:token` opens not-found

1. Confirm element has `shortToken`.
2. Test backend lookup:
   - `GET /api/short/elements/:token`
3. Confirm frontend has `/e/:elementToken` route and loader.
4. Ensure `PUBLIC_SITE_URL` and `VITE_PUBLIC_SITE_URL` are set correctly for generated links.

#### Upload URL works but upload PUT fails

1. Verify Spaces bucket CORS allows your frontend origin and `PUT`.
2. Verify signed URL host matches configured bucket/region endpoint.
3. Confirm content type sent in `PUT` matches signed request assumptions.
4. Confirm object key prefix (`development/` or `production/`) is expected.

#### Uploaded object exists but public thumbnail is not visible

1. Check `S3_PUBLIC_BASE_URL` matches actual CDN/base path.
2. Confirm object ACL/policy permits read (thumbnail upload requests public-read ACL).
3. Check if CDN path includes additional prefix segments.
4. Verify generated key and stored `project.thumbnail` URL point to same object.

## 14. Current Legal/Static Content

### Routes

- Privacy Policy: `/privacy-policy`
- Terms and Conditions: `/terms-and-conditions`

### Footer behavior

- Legal links appear in footer Quick Links only (not in header navbar).
- Footer copyright line is centered.

### Legal content metadata

- Both legal pages display:
  - Effective Date: February 24, 2026
  - Last Updated: February 24, 2026
- Privacy contact email in legal pages: `inquiry@icpfnetengineering.com`.

### Current behavior

- Legal sections intentionally use cleaner non-card section layout (date card retained, section cards removed).

## 15. AI Working Guidelines for This Repo

### Safe defaults for changes

1. Preserve existing design language and responsive behavior.
2. Preserve role-based access rules when adding/modifying endpoints.
3. Preserve project code and element short-token URL conventions.
4. Prefer shared DTO updates in `packages/shared` when API shapes change.
5. Keep docs confidentiality constraints intact.

### If you need to change X, edit Y files

| Change target | Primary files |
|---|---|
| Add/modify API route | `apps/server/src/modules/*/routes.ts`, `apps/server/src/routes.ts` |
| Update request validation | `apps/server/src/modules/*/schemas.ts` |
| Change auth/JWT behavior | `apps/server/src/modules/auth/routes.ts`, `apps/server/src/lib/jwt.ts`, auth middleware |
| Change RBAC logic | `apps/server/src/middleware/roleGuard.ts`, per-route guards |
| Change DB schema | `apps/server/prisma/schema.prisma`, create migration |
| Change S3 keying or signed URL behavior | `apps/server/src/lib/s3.ts`, document/project routes |
| Change short-link behavior | `apps/server/src/modules/elements/shortLinks.ts`, `apps/web/src/app/routes.tsx` loaders |
| Change frontend API integration | `apps/web/src/app/lib/api/client.ts` |
| Change session storage behavior | `apps/web/src/app/lib/auth/store.ts` |
| Change in-memory form drafts | `apps/web/src/app/lib/drafts/store.ts` and page usage |
| Change header/footer/global nav | `apps/web/src/app/components/Layout.tsx` |
| Change project creation UX | `apps/web/src/app/pages/CreateProject.tsx` |
| Change project detail UX | `apps/web/src/app/pages/ProjectDetail.tsx` |
| Change element detail UX | `apps/web/src/app/pages/PrecastElementDetail.tsx` |
| Change theme/colors/utilities | `apps/web/src/styles/theme.css` |
| Change shared DTO contracts | `packages/shared/src/index.ts` |

### Build and smoke-check sequence

1. `npm run build --workspace @icp/server`
2. `npm run build --workspace @icp/web`
3. Spot check routes:
   - `/`
   - `/projects`
   - `/projects/:projectCode`
   - `/projects/:projectCode/e/:elementToken`
   - `/login`
   - `/register`
   - `/users`
   - `/admin/projects/new`
   - `/privacy-policy`
   - `/terms-and-conditions`

### Common implementation recipes

#### Recipe: add a new protected server endpoint

1. Add zod schema in `apps/server/src/modules/<module>/schemas.ts`.
2. Add route handler in `<module>/routes.ts` with:
   - `validate(...)`
   - `authGuard` and optional `roleGuard(...)` as needed
   - typed DB query/update
3. Map response shape via existing mapper or inline minimal envelope.
4. If route belongs to a new module, mount router in `apps/server/src/routes.ts`.
5. Add matching client method in `apps/web/src/app/lib/api/client.ts`.
6. Add/update shared DTOs in `packages/shared/src/index.ts`.
7. Update this context doc Section 7 API table.

#### Recipe: add a new project/element document type

1. Add enum value to Prisma if required.
2. Create migration and apply.
3. Update document schemas (`documents/schemas.ts`) to allow value.
4. Update frontend select/unions and display labels.
5. Verify confidentiality filtering still works.
6. Confirm activity behavior for create/update/delete still makes sense.

#### Recipe: change canonical URL format

1. Update frontend route patterns and loaders in `apps/web/src/app/routes.tsx`.
2. Update server short-link redirects + lookup payloads in `shortLinks.ts`.
3. Update all frontend link generators:
   - project cards
   - detail page links
   - QR generation
4. Test direct navigation and redirected navigation.
5. Update Section 11 of this document.

#### Recipe: change project create form fields

1. Update Prisma schema and migration if field is persisted.
2. Update server project schemas + route create/patch handlers.
3. Update shared DTOs.
4. Update `CreateProject.tsx` form and `ProjectDetail.tsx` edit/view.
5. Confirm activity diff logic in backend includes/removes relevant fields.
6. Re-run smoke checks for admin/editor/client roles.

## 16. Maintenance Checklist

Use this checklist whenever major feature work lands.

1. Re-scan route files:
   - `apps/server/src/routes.ts`
   - `apps/web/src/app/routes.tsx`
2. Re-scan Prisma schema and new migrations:
   - `apps/server/prisma/schema.prisma`
   - `apps/server/prisma/migrations/*`
3. Update API table in Section 7 for added/removed endpoints and access level changes.
4. Update env matrix in Section 4 if env keys changed.
5. Update URL scheme section if canonical paths or short-link flow changed.
6. Update workflow sections for create/edit/upload/auth changes.
7. Reconfirm known gotchas and remove resolved items.
8. Keep "current behavior" and "historical note" markers accurate.
9. Keep this document free of real secret values.
10. Update timestamp below.

Last reviewed: `2026-02-25`  
Next review: `<YYYY-MM-DD>`
