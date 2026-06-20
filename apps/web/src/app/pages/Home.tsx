import { Suspense, useEffect, useRef, useState } from "react";
import { Await, NavLink, useLoaderData } from "react-router";
import { motion, useReducedMotion, useMotionValue, useTransform, animate, useInView } from "motion/react";
import useEmblaCarousel from "embla-carousel-react";
import type { ProjectListItemDTO } from "@icp/shared";
import {
  ArrowRight,
  CheckCircle2,
  Building2,
  BrickWall,
  Cuboid,
  HardHat,
  Award,
  Users,
  Clock,
  Dam,
  Factory,
} from "lucide-react";
import {
  fadeUpVariants,
  fadeInVariants,
  heroContainerVariants,
  heroItemVariants,
  imageRevealVariants,
  slideFromLeftVariants,
  slideFromRightVariants,
  staggerContainerVariants,
  staggerChildVariants,
  ctaButtonVariants,
  pulseBadgeAnimation,
  transitionHover,
  VIEWPORT,
  parseStatValue,
  transitionBase,
} from "../lib/animations";

const heroImg =
  "https://images.unsplash.com/photo-1763665814710-b0067b823603?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwYnVpbGRpbmclMjBwcm9qZWN0fGVufDF8fHx8MTc3MTc1MDM2M3ww&ixlib=rb-4.1.0&q=80&w=1080";
const engineerImg =
  "https://images.unsplash.com/photo-1759922378219-1d31edb644f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBlbmdpbmVlciUyMGhhcmQlMjBoYXQlMjBzYWZldHl8ZW58MXx8fHwxNzcxODQ3NDM3fDA&ixlib=rb-4.1.0&q=80&w=1080";

const stats = [
  { value: "20+", label: "Years of Excellence", icon: Award },
  { value: "500+", label: "Projects Completed", icon: Building2 },
  { value: "1,200+", label: "Skilled Professionals", icon: Users },
  { value: "24/7", label: "Service Availability", icon: Clock },
];

const services = [
  {
    icon: HardHat,
    title: "General Engineering & Infrastructure Construction",
    desc: "We provide comprehensive construction solutions for bridges, roads, drainage systems, and water supply projects with a focus on durability and structural integrity.",
  },
  {
    icon: BrickWall,
    title: "Pre-Casting & Post-Tensioning Works",
    desc: "We deliver engineered precast components and post-tensioning systems designed to enhance structural strength, efficiency, and performance.",
  },
  {
    icon: Cuboid,
    title: "On-Site Girder Fabrication",
    desc: "We specialize in precision on-site girder fabrication to support bridge and large-scale structural projects.",
  },
  {
    icon: Dam,
    title: "MSE Wall Systems",
    desc: "In partnership with Reinforced Earth Company, we fabricate and install MSE wall systems for reliable and cost-effective earth-retention solutions.",
  },
  {
    icon: Factory,
    title: "Ready-Mix Concrete Supply",
    desc: "Through Excelcrete Redimix, we produce and supply high-quality ready-mix concrete to support residential, commercial, and infrastructure developments.",
  },
];

const FEATURED_COUNT = 10;
const AUTOPLAY_INTERVAL = 3000;

function pickRandom(projects: ProjectListItemDTO[], count: number): ProjectListItemDTO[] {
  if (projects.length === 0) return [];
  const shuffled = [...projects].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function CountUpStat({
  value,
  label,
  icon: Icon,
  shouldReduceMotion,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  shouldReduceMotion: boolean | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const parsed = parseStatValue(value);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (!inView || !parsed || shouldReduceMotion) return;
    const controls = animate(motionValue, parsed.number, {
      duration: 1.5,
      type: "spring",
      stiffness: 60,
      damping: 15,
    });
    return controls.stop;
  }, [inView, parsed, motionValue, shouldReduceMotion]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <Icon className="w-7 h-7 text-background/80 mb-2" />
      <div className="text-background" style={{ fontSize: "2rem", fontWeight: 800 }}>
        {parsed && !shouldReduceMotion ? (
          <>
            <motion.span>{rounded}</motion.span>{parsed.suffix}
          </>
        ) : (
          value
        )}
      </div>
      <motion.div
        className="text-background text-sm"
        variants={fadeUpVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
      >
        {label}
      </motion.div>
    </div>
  );
}

function FeaturedProjectsSkeleton() {
  return (
    <div className="overflow-hidden -ml-3">
      <div className="flex">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="shrink-0 w-full sm:w-1/2 lg:w-1/3 px-3 flex">
            <div className="rounded-xl overflow-hidden border border-brand-border h-full w-full flex flex-col animate-pulse bg-brand-card">
              <div className="h-52 bg-brand-highlight/60" />
              <div className="p-6 flex-1 space-y-3">
                <div className="h-5 w-20 rounded bg-brand-highlight/70" />
                <div className="h-6 w-4/5 rounded bg-brand-highlight/70" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedProjectsCarousel({ projects }: { projects: ProjectListItemDTO[] }) {
  const [featuredProjects] = useState<ProjectListItemDTO[]>(() =>
    pickRandom(projects, FEATURED_COUNT),
  );
  const isHoveringCarouselRef = useRef(false);
  const isDraggingCarouselRef = useRef(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
    dragFree: false,
  });

  useEffect(() => {
    if (!emblaApi) return;
    const timer = setInterval(() => {
      if (!isHoveringCarouselRef.current && !isDraggingCarouselRef.current) {
        emblaApi.scrollNext();
      }
    }, AUTOPLAY_INTERVAL);

    const onPointerDown = () => { isDraggingCarouselRef.current = true; };
    const onPointerUp = () => { isDraggingCarouselRef.current = false; };

    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);
    emblaApi.on("settle", onPointerUp);

    const rootNode = emblaApi.rootNode();
    const onMouseEnter = () => { isHoveringCarouselRef.current = true; };
    const onMouseLeave = () => { isHoveringCarouselRef.current = false; };

    rootNode.addEventListener("mouseenter", onMouseEnter);
    rootNode.addEventListener("mouseleave", onMouseLeave);

    const onPointerCancel = () => { isDraggingCarouselRef.current = false; };
    rootNode.addEventListener("pointercancel", onPointerCancel);

    return () => {
      clearInterval(timer);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
      emblaApi.off("settle", onPointerUp);
      rootNode.removeEventListener("mouseenter", onMouseEnter);
      rootNode.removeEventListener("mouseleave", onMouseLeave);
      rootNode.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [emblaApi]);

  if (featuredProjects.length === 0) {
    return <div className="text-center text-brand-muted py-12">No projects yet.</div>;
  }

  return (
    <div className="overflow-hidden -ml-3" ref={emblaRef}>
      <div className="flex">
        {featuredProjects.map((project) => (
          <div key={project.id} className="shrink-0 w-full sm:w-1/2 lg:w-1/3 px-3 flex">
            <NavLink
              to={`/projects/${project.projectCode}`}
              className="group block rounded-xl overflow-hidden shadow-sm border border-brand-border hover:shadow-lg transition h-full w-full flex flex-col"
            >
              <div className="overflow-hidden h-52">
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs bg-brand-highlight text-brand-secondary px-2.5 py-1 rounded-full">
                    {project.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(project.dateStarted).getFullYear()}
                  </span>
                </div>
                <h4 className="text-brand-primary" style={{ fontWeight: 700 }}>
                  {project.name}
                </h4>
              </div>
            </NavLink>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  const data = useLoaderData() as { projects: Promise<ProjectListItemDTO[]> };
  const shouldReduceMotion = useReducedMotion();

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <motion.img
          src={heroImg}
          alt="Construction site"
          className="absolute inset-0 w-full h-full object-cover"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#01083A]/95 via-[#01083A]/78 to-transparent" />
        <div className="relative max-w-[80rem] mx-auto px-6 py-24 w-full">
          <motion.div
            className="max-w-3xl"
            variants={shouldReduceMotion ? undefined : heroContainerVariants}
            initial="hidden"
            animate="animate"
          >
            <motion.div
              className="inline-flex items-center gap-2 bg-[#7fd428]/20 border border-[#7fd428]/30 text-[#7fd428] px-4 py-1.5 rounded-full text-sm mb-6"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              <motion.span
                className="w-2 h-2 bg-[#7fd428] rounded-full"
                animate={shouldReduceMotion ? {} : pulseBadgeAnimation}
              />
              Trusted Since 2002
            </motion.div>

            <motion.h1
              className="text-white mb-6"
              style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1.1 }}
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              Building the Future on a
              <br />
              <span className="text-brand-accent">Foundation</span>{" "}
              of Excellence
            </motion.h1>

            <motion.p
              className="text-gray-300 text-lg mb-10 leading-relaxed"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              ICP-FNET Engineering delivers reliable concrete solutions spanning ready-mix concrete supply and pre-casted and pre-stressed structural elements, built for precision, quality, and lasting performance.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              <NavLink
                to="/products"
                className="flex items-center gap-2 bg-brand-accent hover-bg-brand-accent text-brand-primary px-7 py-3.5 rounded transition"
              >
                Our Products <ArrowRight className="w-4 h-4" />
              </NavLink>
              <NavLink
                to="/contact"
                className="flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 px-7 py-3.5 rounded transition"
              >
                Get In Touch
              </NavLink>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[var(--brand-accent-strong)]">
        <div className="max-w-[80rem] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <CountUpStat
              key={s.label}
              value={s.value}
              label={s.label}
              icon={s.icon}
              shouldReduceMotion={shouldReduceMotion}
            />
          ))}
        </div>
      </section>

      {/* About Snippet */}
      <section className="py-20 bg-brand-surface">
        <div className="max-w-[80rem] mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
          <motion.div
            variants={shouldReduceMotion ? undefined : slideFromLeftVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-accent text-sm tracking-widest uppercase">Who We Are</span>
            <h2
              className="text-brand-primary mt-2 mb-5"
              style={{ fontSize: "2.2rem", fontWeight: 800 }}
            >
              Committed to Quality Engineering Since 2002
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Founded in August 2002, ICP-FNET Engineering is a single proprietorship
              construction company duly registered with the Department of Trade and
              Industry (DTI) of the Philippines. Originally established as ICP Construction
              and Supply, the company has built a strong reputation in General Engineering,
              Pre-casting and Post-tensioning works, and on-site girder fabrication.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Backed by Over Two Decades of Engineering Experience",
                "Experienced Engineering and Project Management Team",
                "Committed to Structural Integrity and Quality Standards",
                "Serving Developers and Contractors Across Bulacan and Nearby Regions",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <NavLink
              to="/about"
              className="inline-flex items-center gap-2 text-brand-accent hover-text-brand-accent-strong transition"
            >
              Learn More About Us <ArrowRight className="w-4 h-4" />
            </NavLink>
          </motion.div>

          <motion.div
            className="relative"
            variants={shouldReduceMotion ? undefined : slideFromRightVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <motion.img
              src={engineerImg}
              alt="Engineer on site"
              className="w-full h-[420px] object-cover rounded-lg shadow-xl"
              variants={shouldReduceMotion ? undefined : imageRevealVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
            />
            <div className="absolute -bottom-6 -left-6 bg-brand-primary text-white p-5 rounded-lg shadow-xl hidden md:block">
              <div className="text-brand-highlight" style={{ fontSize: "2rem", fontWeight: 800 }}>20+</div>
              <div className="text-sm text-gray-300">Years of Expertise</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-brand-card">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            className="text-center mb-14"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-secondary text-sm tracking-widest uppercase">What We Offer</span>
            <h2 className="text-brand-primary mt-2" style={{ fontSize: "2.2rem", fontWeight: 800 }}>
              Our Core Services
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-8">
            {services.map((svc, i) => (
              <motion.div
                key={svc.title}
                className="w-full md:w-[calc((100%-2rem)/2)] lg:w-[calc((100%-4rem)/3)]"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="h-full bg-brand-surface rounded-xl p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-[transform,box-shadow] duration-200 group border border-brand-border">
                  <div className="w-14 h-14 bg-brand-highlight rounded-xl flex items-center justify-center mb-5 transition">
                    <svc.icon className="w-7 h-7 text-brand-secondary group-hover:text-brand-primary transition" />
                  </div>
                  <h3 className="text-brand-primary mb-3" style={{ fontWeight: 700 }}>{svc.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{svc.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 bg-brand-surface">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            className="flex flex-wrap items-end justify-between gap-4 mb-14"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <div>
              <span className="text-brand-secondary text-sm tracking-widest uppercase">Our Work</span>
              <h2 className="text-brand-primary mt-2" style={{ fontSize: "2.2rem", fontWeight: 800 }}>
                Featured Projects
              </h2>
            </div>
            <NavLink
              to="/projects"
              className="text-brand-secondary hover:text-brand-primary flex items-center gap-1 text-sm"
            >
              View All <ArrowRight className="w-4 h-4" />
            </NavLink>
          </motion.div>

          <motion.div
            variants={shouldReduceMotion ? undefined : fadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <Suspense fallback={<FeaturedProjectsSkeleton />}>
              <Await resolve={data.projects}>
                {(projects: ProjectListItemDTO[]) => <FeaturedProjectsCarousel projects={projects} />}
              </Await>
            </Suspense>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-primary py-20">
        <div className="max-w-[80rem] mx-auto px-6 text-center">
          <motion.h2
            className="text-white mb-4"
            style={{ fontSize: "2.2rem", fontWeight: 800 }}
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            Ready to Start Your Project?
          </motion.h2>
          <motion.p
            className="text-white/70 mb-8 max-w-xl mx-auto"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
            transition={{ ...transitionBase, delay: 0.1 }}
          >
            Get in touch with our team today for a consultation,
            project quote, or to learn more about our ready-mix
            concrete services.
          </motion.p>
          <motion.div
            variants={shouldReduceMotion ? undefined : ctaButtonVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <NavLink
              to="/contact"
              className="inline-flex items-center gap-2 bg-brand-accent hover-bg-brand-accent text-brand-primary px-8 py-4 rounded transition"
            >
              Contact Us Today <ArrowRight className="w-4 h-4" />
            </NavLink>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
