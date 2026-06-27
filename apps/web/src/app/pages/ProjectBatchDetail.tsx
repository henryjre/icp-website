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
