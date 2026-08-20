import { useEffect, useState } from "react";
import { useLoaderData, useParams, NavLink, useSearchParams } from "react-router";
import type { PrecastElementListItemDTO, ProjectDTO, ProjectElementBatchSummaryDTO } from "@icp/shared";
import { Building2, Calendar, MapPin, ArrowRight, Layers, Search } from "lucide-react";
import { PageBreadcrumb } from "../components/PageBreadcrumb";
import { Paginator } from "../components/Paginator";
import { apiClient, ApiClientError } from "../lib/api/client";

const PAGE_SIZE = 50;

export function ProjectBatchDetail() {
  const { project } = useLoaderData() as { project: ProjectDTO | null };
  const { batch: batchParam } = useParams<{ batch: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<PrecastElementListItemDTO[]>([]);
  const [summary, setSummary] = useState<ProjectElementBatchSummaryDTO | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const statusParam = searchParams.get("status");
  const status = statusParam === "Casted" || statusParam === "Delivered" ? statusParam : undefined;
  const search = searchParams.get("search") ?? "";
  const batchFilter = batchParam === "unassigned" ? "unassigned" : Number(batchParam);
  const invalidBatch = batchParam !== "unassigned" && Number.isNaN(batchFilter as number);
  const batchLabel = batchParam === "unassigned" ? "Unassigned" : `Batch ${batchParam}`;

  useEffect(() => {
    if (!project || !batchParam || invalidBatch) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [pageData, batches] = await Promise.all([
          apiClient.listProjectElements(project.id, {
            page,
            pageSize: PAGE_SIZE,
            batch: batchFilter,
            status,
            search,
          }),
          apiClient.listProjectElementBatches(project.id),
        ]);
        setItems(pageData.items);
        setTotal(pageData.total);
        setTotalPages(pageData.totalPages);
        setSummary(batches.find((batch) => batch.key === batchParam) ?? null);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Failed to load batch elements");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [project, batchParam, batchFilter, invalidBatch, page, status, search]);

  const updateFilters = (next: { page?: number; status?: "Casted" | "Delivered" | ""; search?: string }) => {
    const params = new URLSearchParams(searchParams);
    if (next.page !== undefined) {
      if (next.page <= 1) params.delete("page");
      else params.set("page", String(next.page));
    }
    if (next.status !== undefined) {
      if (!next.status) params.delete("status");
      else params.set("status", next.status);
      params.delete("page");
    }
    if (next.search !== undefined) {
      const trimmed = next.search.trim();
      if (!trimmed) params.delete("search");
      else params.set("search", trimmed);
      params.delete("page");
    }
    setSearchParams(params);
  };

  if (!project || !batchParam || invalidBatch) {
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

  const deliveredCount = summary?.delivered ?? items.filter((item) => item.status === "Delivered").length;
  const displayedTotal = summary?.total ?? total;

  return (
    <div className="min-h-screen bg-[#f5f7fc]">
      <div className="bg-white border-b border-brand-border/40">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 py-4">
          <PageBreadcrumb
            variant="dark"
            items={[
              { label: "Projects", href: "/projects" },
              { label: project.name, href: `/projects/${project.projectCode}` },
              { label: batchLabel },
            ]}
          />
        </div>
      </div>

      <div className="max-w-[80rem] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-16">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-brand-primary font-extrabold text-2xl sm:text-3xl mb-1">{batchLabel}</h1>
          <p className="text-brand-muted text-sm">{project.name}</p>
        </div>

        <div className="bg-white border border-brand-border/60 rounded-2xl shadow-sm grid grid-cols-2 overflow-hidden mb-5">
          <div className="px-5 py-4 border-r border-brand-border/40">
            <div className="text-brand-muted text-[11px] font-medium uppercase tracking-wider mb-1">Elements</div>
            <div className="text-brand-primary font-bold text-xl">{displayedTotal}</div>
          </div>
          <div className="px-5 py-4">
            <div className="text-brand-muted text-[11px] font-medium uppercase tracking-wider mb-1">Delivered</div>
            <div className="text-brand-primary font-bold text-xl">{deliveredCount}</div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
            <input
              defaultValue={search}
              onBlur={(event) => updateFilters({ search: event.currentTarget.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") updateFilters({ search: event.currentTarget.value });
              }}
              placeholder="Search elements"
              className="min-h-11 w-full rounded-xl border border-brand-border bg-white pl-9 pr-4 text-sm text-brand-primary outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </label>
          <select
            value={status ?? ""}
            onChange={(event) => updateFilters({ status: event.target.value as "Casted" | "Delivered" | "" })}
            className="min-h-11 rounded-xl border border-brand-border bg-white px-4 text-sm text-brand-primary outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">All statuses</option>
            <option value="Casted">Casted</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-brand-muted text-sm">
            <div className="w-4 h-4 border-2 border-brand-border border-t-brand-secondary rounded-full animate-spin" />
            Loading elements…
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-dashed border-brand-border rounded-2xl p-8 sm:p-10 text-center">
            <Layers className="w-8 h-8 text-brand-muted mx-auto mb-2 opacity-40" />
            <p className="text-brand-muted text-sm">No elements match this view.</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {items.map((el) => (
                <NavLink
                  key={el.id}
                  to={`/projects/${project.projectCode}/e/${el.shortToken}`}
                  className="group block bg-white border border-brand-border/50 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:border-brand-secondary/40 hover:-translate-y-0.5 transition-all"
                >
                  <div className={`w-full h-0.5 rounded-full mb-4 ${el.status === "Delivered" ? "bg-green-400" : "bg-brand-secondary"}`} />
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="text-brand-primary text-sm font-bold leading-snug">{el.name}</h4>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${el.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-brand-highlight text-brand-secondary"}`}>
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
            <Paginator page={page} totalPages={totalPages} onPageChange={(nextPage) => updateFilters({ page: nextPage })} />
          </>
        )}
      </div>
    </div>
  );
}
