# Batch Pages Design

**Date:** 2026-06-27  
**Status:** Approved

## Context

Precast elements are grouped by batch number. Currently the Project Detail page shows elements in collapsible accordion folders per batch. The goal is to give each batch its own dedicated page (like Google Drive folders), so users can navigate into a batch and see its elements without the context of the full project page.

## URL Structure

| Page | URL |
|---|---|
| Project detail | `/projects/:projectCode` (unchanged) |
| Batch page | `/projects/:projectCode/batch/:batch` |
| Element detail | `/projects/:projectCode/e/:elementToken` (unchanged) |

Element URLs are kept flat and stable. Batch number is not part of element URLs — an element's link stays valid even if it is reassigned to a different batch.

## ProjectDetail — Elements Section

The current accordion folder UI is replaced with a **Google Drive-style folder card grid**.

- Layout: `grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4`
- Each batch is a card showing:
  - Folder icon + batch label ("Batch 2" or "Unassigned")
  - Element count
  - Delivered / Casted breakdown (e.g. "3 delivered · 5 casted")
  - Status color accent (green bar if all delivered, brand-secondary otherwise)
- Clicking a card navigates to `/projects/:projectCode/batch/:batch`
- Unassigned elements use key `"unassigned"` in the URL (e.g. `/projects/ABC-001/batch/unassigned`)
- Batches sorted numerically ascending; "Unassigned" last
- Empty state (0 elements) unchanged

## ProjectBatchDetail Page

A new full page component at `apps/web/src/app/pages/ProjectBatchDetail.tsx`.

### Header

Compact breadcrumb at the top:
```
Projects  ›  {project.name}  ›  Batch {batch}
```
Each segment is a link. No hero image — keep it lightweight.

### Stats strip

Two stats: total elements in batch, count delivered. Same card style as ProjectDetail stats strip.

### Element grid

Same element card design as today (name, status badge, serial, location, casting date, "View Details" link). Grid: `sm:grid-cols-2 lg:grid-cols-3`.

Empty state: "No elements in this batch."

### Not-found state

If the batch number doesn't match any elements in the project, show a "Batch not found" message with a link back to the project.

## Routing & Data

New route added to `routes.tsx`:
```
{ path: "projects/:projectCode/batch/:batch", Component: ProjectBatchDetail, loader: projectLoader }
```

The loader is the **existing `projectLoader`** — it already fetches the full `ProjectDTO` including all elements. `ProjectBatchDetail` filters `project.elements` client-side by the `:batch` param.

- `:batch` param is a string; compare against `String(el.batch)` or `"unassigned"` for null-batch elements
- No new API endpoints needed

## What Changes

| File | Change |
|---|---|
| `apps/web/src/app/routes.tsx` | Add batch route using existing `projectLoader` |
| `apps/web/src/app/pages/ProjectDetail.tsx` | Replace accordion folders with folder-card grid in elements section |
| `apps/web/src/app/pages/ProjectBatchDetail.tsx` | New page component |

## What Stays the Same

- All other ProjectDetail tabs (Details, Plan, Documents, Activity)
- Element detail page and its URLs
- Element card design (reused in batch page)
- `projectLoader` and all API calls
