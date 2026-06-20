import { Suspense, useState } from "react";
import { Await, NavLink, useLoaderData } from "react-router";
import { MapPin, Calendar, CheckCircle2, Clock, ArrowRight, Search, Layers } from "lucide-react";
import type { ProjectListItemDTO } from "@icp/shared";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Skeleton } from "../components/ui/skeleton";
import {
  heroContainerVariants,
  heroItemVariants,
  staggerChildVariants,
  transitionFast,
  VIEWPORT,
} from "../lib/animations";

function ProjectCardSkeleton() {
  return (
    <div className="bg-brand-surface rounded-xl overflow-hidden shadow-sm border border-brand-border">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-3 border-t border-brand-border flex justify-between">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
}

function ProjectsGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function Projects() {
  const data = useLoaderData() as { projects: Promise<ProjectListItemDTO[]> };
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-primary py-20">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            variants={shouldReduceMotion ? undefined : heroContainerVariants}
            initial="hidden"
            animate="animate"
          >
            <motion.span
              className="text-brand-accent text-sm tracking-widest uppercase"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              Our Portfolio
            </motion.span>
            <motion.h1
              className="text-white mt-2 mb-4"
              style={{ fontSize: "2.8rem", fontWeight: 800 }}
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              Projects
            </motion.h1>
            <motion.p
              className="text-white/60 max-w-2xl"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              From landmark bridges to roadworks - explore our portfolio of completed and ongoing infrastructure and building projects.
            </motion.p>
          </motion.div>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-[42rem] mx-auto sm:mx-0">
            <Suspense
              fallback={["Total Projects", "Completed", "Ongoing"].map((label) => (
                <div key={label} className="w-full flex flex-col sm:flex-row sm:items-center sm:gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <Skeleton className="h-7 w-10 mb-1 sm:mb-0 bg-white/20" />
                  <Skeleton className="h-3 w-20 bg-white/20" />
                </div>
              ))}
            >
              <Await resolve={data.projects}>
                {(projects: ProjectListItemDTO[]) => {
                  const completedCount = projects.filter((p) => p.status === "Completed").length;
                  const ongoingCount = projects.filter((p) => p.status === "Ongoing").length;
                  return (
                    <>
                      {[
                        { label: "Total Projects", value: projects.length },
                        { label: "Completed", value: completedCount, color: "text-green-400" },
                        { label: "Ongoing", value: ongoingCount, color: "text-brand-secondary" },
                      ].map((s) => (
                        <div key={s.label} className="w-full flex flex-col sm:flex-row sm:items-center sm:gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                          <div className="text-white/60 text-xs sm:text-sm text-center sm:text-left order-1 sm:order-2">
                            {s.label}
                          </div>
                          <div
                            className={`text-2xl text-center sm:text-left ${s.color ?? "text-white"} order-2 sm:order-1`}
                            style={{ fontWeight: 800 }}
                          >
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                }}
              </Await>
            </Suspense>
          </div>
        </div>
      </section>

      {/* Filter bar — one-time entrance */}
      <motion.section
        className="bg-white border-b border-gray-100 py-5 sticky top-[73px] z-40"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitionFast}
      >
        <div className="max-w-[80rem] mx-auto px-6 flex flex-col sm:flex-row gap-4 flex-wrap items-center sm:items-center">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-brand-border rounded-xl text-sm focus:outline-none focus:border-brand-primary transition bg-brand-surface"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex">
            {["All", "Completed", "Ongoing"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`w-full px-3.5 py-2 rounded-lg text-xs border transition ${statusFilter === s
                    ? s === "Completed"
                      ? "bg-green-500 text-white border-green-500"
                      : s === "Ongoing"
                        ? "bg-brand-secondary text-white border-brand-secondary"
                        : "bg-brand-primary text-white border-brand-primary"
                    : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-secondary/50"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Projects grid */}
      <section className="py-14 bg-brand-card">
        <div className="max-w-[80rem] mx-auto px-6">
          <Suspense fallback={<ProjectsGridSkeleton />}>
            <Await resolve={data.projects}>
              {(projects: ProjectListItemDTO[]) => {
                const filtered = projects.filter((p) => {
                  const matchSearch =
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    p.location.toLowerCase().includes(search.toLowerCase()) ||
                    p.client.toLowerCase().includes(search.toLowerCase());
                  const matchStatus = statusFilter === "All" || p.status === statusFilter;
                  return matchSearch && matchStatus;
                });

                return filtered.length === 0 ? (
                  <motion.div
                    className="text-center py-20 text-gray-400"
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    viewport={VIEWPORT}
                  >
                    No projects found.
                  </motion.div>
                ) : (
                  <motion.div
                    layout
                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7"
                  >
                    <AnimatePresence mode="popLayout">
                      {filtered.map((project) => (
                        <motion.div
                          key={project.id}
                          layout
                          variants={shouldReduceMotion ? undefined : staggerChildVariants}
                          initial="hidden"
                          animate="visible"
                          exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                        >
                          <NavLink
                            to={`/projects/${project.projectCode}`}
                            className="group bg-brand-surface rounded-xl overflow-hidden shadow-sm border border-brand-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block"
                          >
                            <div className="relative h-52 overflow-hidden">
                              <img
                                src={project.thumbnail}
                                alt={project.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute top-3 right-3">
                                <span
                                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${project.status === "Completed"
                                      ? "bg-green-500/90 text-white"
                                      : "bg-brand-secondary/90 text-white"
                                    }`}
                                  style={{ fontWeight: 600 }}
                                >
                                  {project.status === "Completed" ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {project.status}
                                </span>
                              </div>
                              <div className="absolute bottom-3 left-4 right-4">
                                <h3 className="text-white" style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.3 }}>
                                  {project.name}
                                </h3>
                              </div>
                            </div>

                            <div className="p-5">
                              <div className="flex items-start gap-1.5 text-gray-500 text-sm mb-2">
                                <MapPin className="w-3.5 h-3.5 text-brand-secondary shrink-0 mt-0.5" />
                                {project.location}
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-4">
                                <Calendar className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                                Started: {new Date(project.dateStarted).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                {project.completionDate && (
                                  <span className="text-gray-400 ml-1">
                                    Done: {new Date(project.completionDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                  <Layers className="w-3.5 h-3.5 text-brand-secondary" />
                                  {project.elements.length} Precast Elements
                                </div>
                                <span className="flex items-center gap-1 text-brand-secondary text-xs group-hover:gap-2 transition-all">
                                  View Details <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </NavLink>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                );
              }}
            </Await>
          </Suspense>
        </div>
      </section>
    </div>
  );
}
