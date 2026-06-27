# Batch Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each batch of precast elements its own dedicated page at `/projects/:projectId/batch/:batch`, replacing the current accordion folder UI with a Google Drive-style folder card grid on the Project Detail page.

**Architecture:** A new `ProjectBatchDetail` page component reads the already-loaded `ProjectDTO` from the existing `projectLoader` and filters `project.elements` client-side by the `:batch` URL param. The Project Detail page's elements section is simplified to a grid of clickable folder cards that navigate to the batch page. No new API calls needed.

**Tech Stack:** React 18, React Router v7, TypeScript, Tailwind CSS, Lucide React, motion/react

## Global Constraints

- Tailwind color tokens only — never raw hex for brand colors: `brand-primary`, `brand-secondary`, `brand-muted`, `brand-border`, `brand-soft`, `brand-card`, `brand-highlight`
- All interactive elements need `cursor-pointer`
- `min-h-10` or `min-h-11` on all buttons
- Background page color: `bg-[#f5f7fc]`
- Max content width: `max-w-[80rem] mx-auto px-4 sm:px-6`
- Element URLs (`/projects/:projectCode/e/:token`) must not change

---

### Task 1: Create the `ProjectBatchDetail` page

**Files:**
- Create: `apps/web/src/app/pages/ProjectBatchDetail.tsx`

**Interfaces:**
- Consumes: `useLoaderData()` returning `{ project: ProjectDTO | null }` (same shape as `ProjectDetail`)
- Consumes: `useParams()` returning `{ projectId: string; batch: string }` where `batch` is a numeric string or `"unassigned"`
- Produces: exported `ProjectBatchDetail` component imported by Task 2

- [ ] **Step 1: Create the file with the full component**

Create `apps/web/src/app/pages/ProjectBatchDetail.tsx`:

```tsx
import { useLoaderData, useParams, NavLink } from "react-router";
import type { ProjectDTO } from "@icp/shared";
import {
  Building2,
  Calendar,
  ChevronRight,
  MapPin,
  ArrowRight,
  Layers,
} from "lucide-react";

export function ProjectBatchDetail() {
  const { project } = useLoaderData() as { project: ProjectDTO | null };
  const { batch: batchParam } = useParams<{ batch: string }>();

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fc]">
        <div className="text-center">
          <Building2 className="w-8 h-8 text-brand-muted mx-auto mb-4 opacity-40" />
          <p className="text-brand-primary font-bold mb-2">Project not found</p>
          <NavLink to="/projects" className="text-brand-secondary text-sm hover:underline">
            Back to Projects
          </NavLink>
        </div>
      </div>
    );
  }

  const batchElements = project.elements.filter((el) =>
    batchParam === "unassigned" ? el.batch == null : String(el.batch) === batchParam
  );
  const batchLabel =
    batchParam === "unassigned" ? "Unassigned" : `Batch ${batchParam}`;

  if (batchElements.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fc]">
        <div className="text-center">
          <Layers className="w-8 h-8 text-brand-muted mx-auto mb-4 opacity-40" />
          <p className="text-brand-primary font-bold mb-1">Batch not found</p>
          <p className="text-brand-muted text-sm mb-4">
            No elements found for {batchLabel} in this project.
          </p>
          <NavLink
            to={`/projects/${project.projectCode}`}
            className="text-brand-secondary text-sm hover:underline"
          >
            Back to {project.name}
          </NavLink>
        </div>
      </div>
    );
  }

  const deliveredCount = batchElements.filter((e) => e.status === "Delivered").length;

  return (
    <div className="min-h-screen bg-[#f5f7fc]">
      {/* Breadcrumb header */}
      <div className="bg-white border-b border-brand-border/40">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center gap-2 text-sm text-brand-muted flex-wrap">
            <NavLink to="/projects" className="hover:text-brand-primary transition-colors">
              Projects
            </NavLink>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <NavLink
              to={`/projects/${project.projectCode}`}
              className="hover:text-brand-primary transition-colors truncate max-w-[200px]"
            >
              {project.name}
            </NavLink>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="text-brand-primary font-semibold">{batchLabel}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16">
        {/* Page title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-brand-primary font-extrabold text-2xl sm:text-3xl mb-1">
            {batchLabel}
          </h1>
          <p className="text-brand-muted text-sm">{project.name}</p>
        </div>

        {/* Stats strip */}
        <div className="bg-white border border-brand-border/60 rounded-2xl shadow-sm grid grid-cols-2 overflow-hidden mb-8">
          <div className="px-5 py-4 border-r border-brand-border/40">
            <div className="text-brand-muted text-[11px] font-medium uppercase tracking-wider mb-1">
              Elements
            </div>
            <div className="text-brand-primary font-bold text-xl">{batchElements.length}</div>
          </div>
          <div className="px-5 py-4">
            <div className="text-brand-muted text-[11px] font-medium uppercase tracking-wider mb-1">
              Delivered
            </div>
            <div className="text-brand-primary font-bold text-xl">{deliveredCount}</div>
          </div>
        </div>

        {/* Element grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {batchElements.map((el) => (
            <NavLink
              key={el.id}
              to={`/projects/${project.projectCode}/e/${el.shortToken}`}
              className="group block bg-white border border-brand-border/50 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:border-brand-secondary/40 hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`w-full h-0.5 rounded-full mb-4 ${
                  el.status === "Delivered" ? "bg-green-400" : "bg-brand-secondary"
                }`}
              />
              <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="text-brand-primary text-sm font-bold leading-snug">{el.name}</h4>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    el.status === "Delivered"
                      ? "bg-green-100 text-green-700"
                      : "bg-brand-highlight text-brand-secondary"
                  }`}
                >
                  {el.status}
                </span>
              </div>
              <div className="mb-3 inline-flex items-center rounded-lg border border-brand-border/50 bg-brand-card px-2.5 py-1 text-[11px] font-semibold text-brand-primary">
                {el.serialNumber != null ? `Serial ${el.serialNumber}` : "Unassigned serial"}
              </div>
              <div className="space-y-1.5 text-xs text-brand-muted mb-4">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-brand-secondary shrink-0" />
                  <span className="truncate">{el.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-brand-secondary shrink-0" />
                  Cast:{" "}
                  {new Date(el.castingDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 text-brand-secondary text-xs font-medium group-hover:gap-2 transition-all pt-3 border-t border-brand-border/40">
                View Details <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check the new file**

```bash
cd /home/phaeton/Projects/icp-website
pnpm --filter web exec tsc --noEmit 2>&1 | grep "ProjectBatchDetail"
```

Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/pages/ProjectBatchDetail.tsx
git commit -m "feat(web): add ProjectBatchDetail page for batch-scoped element view"
```

---

### Task 2: Wire up the batch route in `routes.tsx`

**Files:**
- Modify: `apps/web/src/app/routes.tsx`

**Interfaces:**
- Consumes: `ProjectBatchDetail` exported from Task 1
- Consumes: `projectLoader` already defined in this file (lines 35–66) — reads `params.projectId`, which handles both UUID and `PRJ\d+` projectCode patterns

**Note on param naming:** The batch route uses `:projectId` (not `:projectCode`) so the existing `projectLoader` can read `params.projectId` without modification. The value in that param will be the project code (e.g. `PRJ001`), which the loader already handles via the `isProjectCode` check.

- [ ] **Step 1: Add the import**

In `apps/web/src/app/routes.tsx`, add after line 9 (`import { PrecastElementDetail } ...`):

```ts
import { ProjectBatchDetail } from "./pages/ProjectBatchDetail";
```

- [ ] **Step 2: Add the route**

In the `children` array, add after line 157 (`{ path: "projects/:projectId", ... }`):

```ts
{
  path: "projects/:projectId/batch/:batch",
  Component: ProjectBatchDetail,
  loader: projectLoader,
},
```

The block around line 157 should now look like:

```ts
{ path: "projects/:projectId", Component: ProjectDetail, loader: projectLoader },
{
  path: "projects/:projectId/batch/:batch",
  Component: ProjectBatchDetail,
  loader: projectLoader,
},
{
  path: "projects/:projectId/elements/:elementId",
  Component: PrecastElementDetail,
  loader: elementLoader,
},
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter web exec tsc --noEmit 2>&1 | grep "routes"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/routes.tsx
git commit -m "feat(web): add batch route /projects/:projectId/batch/:batch"
```

---

### Task 3: Replace accordion folders with Drive-style folder cards in `ProjectDetail`

**Files:**
- Modify: `apps/web/src/app/pages/ProjectDetail.tsx`

**What to remove:**
- `const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());`
- The `toggleBatch` function (3 lines)
- The 4 lines added to the `loaderProject` useEffect that compute `batchKeys` and call `setOpenBatches`

**What to replace:**
- The entire non-empty branch of the elements section (currently an IIFE rendering accordion folders with `AnimatePresence`) → a folder card grid using `NavLink`

- [ ] **Step 1: Remove `openBatches` state**

Find and delete this line:

```ts
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: Remove `toggleBatch` function**

Find and delete:

```ts
  const toggleBatch = (key: string) =>
    setOpenBatches((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
```

- [ ] **Step 3: Remove auto-open logic from the `loaderProject` useEffect**

In the useEffect on `[loaderProject, projectId, draftKey]`, remove these lines:

```ts
      const batchKeys = [...new Set(loaderProject.elements.map((el) =>
        el.batch != null ? String(el.batch) : "__unassigned__"
      ))];
      setOpenBatches(batchKeys.length === 1 ? new Set(batchKeys) : new Set());
```

After removal the `if (loaderProject)` block should contain only:

```ts
      setEditForm(getDraft(draftKey, toEditForm(loaderProject)));
```

- [ ] **Step 4: Replace the elements section non-empty branch**

Find the non-empty branch — everything from `) : (() => {` through `})()}` in the elements section — and replace it entirely with:

```tsx
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
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            allDelivered ? "bg-green-100" : "bg-brand-soft"
                          }`}
                        >
                          <Layers
                            className={`w-5 h-5 ${
                              allDelivered ? "text-green-600" : "text-brand-secondary"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-brand-primary text-sm font-bold leading-snug">
                            {label}
                          </h4>
                          <p className="text-brand-muted text-xs">
                            {batchEls.length} element{batchEls.length !== 1 ? "s" : ""}
                          </p>
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
```

**Key difference from old code:** batch key is now `"unassigned"` (no double underscores) to match the URL param `/batch/unassigned`.

- [ ] **Step 5: Type-check**

```bash
pnpm --filter web exec tsc --noEmit 2>&1 | grep "ProjectDetail"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/pages/ProjectDetail.tsx
git commit -m "feat(web): replace batch accordion with Drive-style folder cards in ProjectDetail"
```

---

## Verification

After all tasks are complete:

1. Run `pnpm dev` from the monorepo root
2. Navigate to a project with multiple batches — Elements section shows folder cards (one per batch) with element count and delivered/casted badges
3. Click a batch card → navigates to `/projects/PRJ001/batch/2`
4. Batch page shows breadcrumb `Projects › Project Name › Batch 2`, stats strip (total/delivered), and element cards
5. Click an element card → navigates to `/projects/PRJ001/e/:token` (element URLs unchanged)
6. Browser back button returns to batch page, then back to project
7. Navigate to a project with `null`-batch elements → "Unassigned" folder card appears last; clicking goes to `/projects/PRJ001/batch/unassigned`
8. Manually visit a non-existent batch URL (e.g. `/projects/PRJ001/batch/999`) → "Batch not found" state with link back to project
