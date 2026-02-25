# ICP Website Workspace

Monorepo for the ICP-FNET Engineering website.

It includes:

- Public marketing site pages
- Auth onboarding (invite registration + approval flow)
- Admin user and invite management
- Project and precast element management
- Document upload/download with confidentiality controls

## Packages

- `apps/web` - React + Vite frontend
- `apps/server` - Express + TypeScript API, Prisma, Postgres, JWT, S3, SMTP
- `packages/shared` - shared TypeScript DTO/contracts (`@icp/shared`)

## Documentation

- Getting started and setup: `README.md`
- Technical project context: `docs/PROJECT_CONTEXT.md`

## Prerequisites

- Node.js (recent LTS recommended)
- npm
- PostgreSQL database (local container or remote)
- S3-compatible object storage (DigitalOcean Spaces compatible)
- SMTP credentials (for invite and contact email flows)

## Quick Start

1. Install dependencies:
   - `npm install`
2. Create env file from example:
   - copy `.env.example` to `.env`
3. Run migrations:
   - `npm run prisma:migrate --workspace @icp/server`
4. (Optional) seed an admin account:
   - PowerShell:
     - `$env:ADMIN_EMAIL="admin@example.com"`
     - `$env:ADMIN_PASSWORD="ChangeMe123!"`
   - Run:
     - `npm run seed:admin --workspace @icp/server`
5. Start the stack:
   - `npm run dev`

Default local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## Scripts

### Root

- `npm run dev` - run web + server together
- `npm run dev:web` - run frontend only
- `npm run dev:server` - run backend only
- `npm run build` - build web then server
- `npm run build:web` - build frontend only
- `npm run build:server` - build backend only

### Server workspace

- `npm run dev --workspace @icp/server`
- `npm run build --workspace @icp/server`
- `npm run start --workspace @icp/server`
- `npm run prisma:generate --workspace @icp/server`
- `npm run prisma:migrate --workspace @icp/server`
- `npm run seed:admin --workspace @icp/server`

### Web workspace

- `npm run dev --workspace @icp/web`
- `npm run build --workspace @icp/web`
- `npm run preview --workspace @icp/web`

## Environment Configuration

Create `.env` at repo root.

### Database

Preferred:

- `MASTER_DB_HOST`
- `MASTER_DB_PORT`
- `MASTER_DB_NAME`
- `MASTER_DB_USER`
- `MASTER_DB_PASSWORD`

Optional direct override:

- `DATABASE_URL`

If `DATABASE_URL` is set, it takes precedence over `MASTER_DB_*`.

### Auth

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL` (example: `15m`)
- `JWT_REFRESH_TTL` (example: `7d`)

### S3 / Spaces

- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_PUBLIC_BASE_URL`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PRESIGNED_EXPIRES_SECONDS`

### App URLs

- `PORT` (server port)
- `VITE_API_BASE_URL` (web -> API)
- `VITE_PUBLIC_SITE_URL` (frontend public origin)
- `PUBLIC_SITE_URL` (server redirect/link origin)

### SMTP

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `REGISTER_SMTP_FROM` (invite sender)
- `INQUIRY_SMTP_FROM` (contact form sender)
- `CONTACT_EMAIL` (contact form destination)

### Admin seed

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Prisma Notes

Run migrations:

- `npm run prisma:migrate --workspace @icp/server`

Reset dev database (drops schema data):

- Interactive:
  - `npm run prisma:migrate --workspace @icp/server -- reset`
- Non-interactive:
  - `npm run prisma:migrate --workspace @icp/server -- reset --force`

Why `--workspace @icp/server`?

- It tells npm to run the script defined in `apps/server/package.json`, not root scripts.

## Architecture Summary

### Backend

- Entry: `apps/server/src/index.ts`
- App bootstrap: `apps/server/src/app.ts`
- API mount: `/api` in `apps/server/src/routes.ts`
- Validation: Zod schemas per module
- Auth: JWT access + refresh token rotation with hashed refresh records
- RBAC roles: `admin`, `editor`, `client`
- ORM: Prisma/Postgres
- Storage: presigned S3 upload/download with confidentiality checks

### Frontend

- Entry/router: `apps/web/src/app/routes.tsx`
- Shell/navigation/footer: `apps/web/src/app/components/Layout.tsx`
- API boundary: `apps/web/src/app/lib/api/client.ts`
- Auth storage: localStorage in `apps/web/src/app/lib/auth/store.ts`
- Draft persistence: in-memory map in `apps/web/src/app/lib/drafts/store.ts`

### Shared contracts

- `packages/shared/src/index.ts`

## Key Product Behavior

- Invite-only registration creates `Pending` users
- Admin approves users and assigns roles before login is allowed
- Project reads are public
- Project documents are authenticated-only
- Confidential docs are visible/downloadable only by `admin` and `editor`
- Activity feeds are admin/editor-only and paginated (10 per page)
- Canonical project URLs use project codes (`PRJ0001` style)
- Element short links use tokens and support `/e/:token`

## Troubleshooting

### `seed:admin` says missing env

If you see:

- `Set ADMIN_EMAIL and ADMIN_PASSWORD to run seed:admin`

Set those env vars first in your shell, then rerun.

### Prisma migrate exits with code 130

That usually means the interactive reset prompt was cancelled. Use:

- `npm run prisma:migrate --workspace @icp/server -- reset --force`

### S3 upload CORS errors in browser

Check:

- Bucket CORS allows your frontend origin (`http://localhost:5173` in dev)
- Method `PUT` is allowed
- Endpoint/region/bucket settings match your presigned URL host

### CDN `AccessDenied` for uploaded files

Check:

- Object ACL/policy for public objects
- `S3_PUBLIC_BASE_URL` points to the right CDN/base path
- Uploaded key path and generated public URL match

## Development Guidelines

- Keep frontend design language consistent with existing app
- Maintain role guard behavior for new routes
- Update `packages/shared` whenever API response/request shapes change
- Prefer canonical code-based URLs in UI links
- Do not commit real secret values

## License / Ownership

Internal project repository for ICP-FNET Engineering platform development.
