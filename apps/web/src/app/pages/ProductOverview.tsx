import { useState } from "react";
import { Clock, CheckCircle2, Construction, Fence, ArrowDownToLine, BrickWall } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  fadeUpVariants,
  heroContainerVariants,
  heroItemVariants,
  imageRevealVariants,
  slideFromLeftVariants,
  slideFromRightVariants,
  staggerContainerVariants,
  staggerChildVariants,
  transitionBase,
  transitionHover,
  VIEWPORT,
} from "../lib/animations";

const concreteHeroImg = "https://images.unsplash.com/photo-1764856601179-dfeca7b37e4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jcmV0ZSUyMHBvdXJpbmclMjBjb25zdHJ1Y3Rpb24lMjB3b3JrZXJzfGVufDF8fHx8MTc3MTg0NzQzNHww&ixlib=rb-4.1.0&q=80&w=1080";
const truckImg = "https://images.unsplash.com/photo-1621463677998-1a90bcbaca94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWFkeSUyMG1peCUyMGNvbmNyZXRlJTIwdHJ1Y2slMjBkZWxpdmVyeXxlbnwxfHx8fDE3NzE4NDc0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080";
const rawMaterialsImg = "https://images.unsplash.com/photo-1645567849531-40dc40ecb2b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjZW1lbnQlMjByYXclMjBtYXRlcmlhbHMlMjBhZ2dyZWdhdGUlMjBzYW5kJTIwZ3JhdmVsfGVufDF8fHx8MTc3MTg0NzQzNXww&ixlib=rb-4.1.0&q=80&w=1080";

const designMixes = [
  {
    grade: "C10",
    strength: "10 MPa",
    slump: "75–100 mm",
    waterCement: "0.65",
    use: "Non-structural fill, blinding layers",
    color: "bg-gray-100 border-gray-300",
    badge: "bg-gray-200 text-gray-700",
  },
  {
    grade: "C20",
    strength: "20 MPa",
    slump: "75–125 mm",
    waterCement: "0.55",
    use: "Residential slabs, light footings",
    color: "bg-brand-highlight border-brand-secondary",
    badge: "bg-brand-highlight text-brand-secondary",
  },
  {
    grade: "C25",
    strength: "25 MPa",
    slump: "100–150 mm",
    waterCement: "0.50",
    use: "Beams, columns, slabs — general use",
    color: "bg-brand-soft border-brand-accent-light",
    badge: "bg-brand-soft text-brand-secondary",
  },
  {
    grade: "C30",
    strength: "30 MPa",
    slump: "100–150 mm",
    waterCement: "0.45",
    use: "High-load commercial structures",
    color: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  {
    grade: "C35",
    strength: "35 MPa",
    slump: "125–175 mm",
    waterCement: "0.42",
    use: "Bridges, elevated roads, industrial",
    color: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  {
    grade: "C40",
    strength: "40 MPa",
    slump: "150–200 mm",
    waterCement: "0.38",
    use: "High-rise structural elements",
    color: "bg-purple-50 border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
];

const curingStages = [
  {
    time: "1–2 hrs",
    label: "Initial Set",
    desc: "Concrete begins to stiffen. Surface finishing must be completed. Avoid disturbance.",
    icon: "🕐",
  },
  {
    time: "6–10 hrs",
    label: "Final Set",
    desc: "Concrete reaches its initial hardness. No loading or traffic permitted.",
    icon: "🕙",
  },
  {
    time: "24 hrs",
    label: "Formwork Removal",
    desc: "Vertical formwork may be removed. Concrete has achieved approximately 10–15% of final strength.",
    icon: "📦",
  },
  {
    time: "3 Days",
    label: "Early Strength",
    desc: "Achieves ~40% of design strength. Light loading may begin for non-structural areas.",
    icon: "🔩",
  },
  {
    time: "7 Days",
    label: "Intermediate Strength",
    desc: "Approximately 70% of 28-day strength. Moderate loading permitted for slabs and pavements.",
    icon: "🏗️",
  },
  {
    time: "28 Days",
    label: "Full Design Strength",
    desc: "Concrete reaches its design compressive strength. Full structural loads may be applied.",
    icon: "✅",
  },
];

const otherProducts = [
  {
    icon: Construction,
    name: "AASHTO Girder",
    desc: "Pre-stressed concrete girders conforming to AASHTO standards, engineered for long-span bridge construction. Designed to carry heavy traffic loads with superior durability and minimal maintenance over decades of service.",
  },
  {
    icon: Fence,
    name: "Precast Fences",
    desc: "Factory-cast concrete fence panels and posts offering fast installation, consistent quality, and long-term security. Ideal for subdivisions, industrial perimeters, and infrastructure projects requiring a robust boundary solution.",
  },
  {
    icon: ArrowDownToLine,
    name: "Piles",
    desc: "Pre-stressed and precast concrete piles for deep foundation systems, engineered to transfer structural loads through weak upper soils to competent bearing strata. Available in various cross-sections to suit soil conditions and design requirements.",
  },
  {
    icon: BrickWall,
    name: "Wall Panels",
    desc: "Precast concrete wall panels precision-cast under controlled plant conditions, delivering uniform strength, smooth finishes, and rapid on-site erection. Suitable for retaining walls, building facades, and modular structural applications.",
  },
];

const rawMaterials: { name: string; origin: string; standard: string; role: string; color: string }[] = [];

const expandVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.25 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
} as const;

export function ProductOverview() {
  const [activeMix, setActiveMix] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[420px] flex items-end overflow-hidden">
        <img src={concreteHeroImg} alt="Concrete pouring" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#02126B] via-[#02126B]/65 to-transparent" />
        <div className="relative max-w-[80rem] mx-auto px-6 pb-14 w-full">
          <motion.div
            variants={shouldReduceMotion ? undefined : heroContainerVariants}
            initial="hidden"
            animate="animate"
          >
            <motion.span
              className="text-brand-highlight text-sm tracking-widest uppercase"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              Product Overview
            </motion.span>
            <motion.h1
              className="text-white mt-2"
              style={{ fontSize: "2.8rem", fontWeight: 800 }}
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              Excelcrete Redimix
            </motion.h1>
            <motion.p
              className="text-gray-300 mt-2 max-w-xl"
              variants={shouldReduceMotion ? undefined : heroItemVariants}
            >
              Quality ready-mix concrete — batched to specification, delivered fresh to your site.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Product Description — two-column split */}
      <section className="py-20 bg-white">
        <div className="max-w-[80rem] mx-auto px-6 grid md:grid-cols-2 gap-14 items-center">
          <motion.div
            variants={shouldReduceMotion ? undefined : slideFromLeftVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-accent text-sm tracking-widest uppercase">What Is RMC?</span>
            <h2 className="text-brand-primary mt-2 mb-5" style={{ fontSize: "2rem", fontWeight: 800 }}>
              Ready Mix Concrete
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4 text-sm">
              Ready Mix Concrete (RMC) refers to concrete that is specifically batched or manufactured for customers' construction projects according to a set engineered design mix. It is a mixture of cement, water fine and coarse aggregates and admixtures. It is delivered at site by means of transit mixers and unloaded in different methods such as Crane and Bucket, Pump Crete, direct pouring etc.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4 text-sm">
              Our design mix starts at 1500 psi–8000 psi, Ordinary or PCD from 7–28 days curing time.
            </p>
            <p className="text-gray-600 leading-relaxed mb-5 text-sm">
              In ready mix concrete one of the most important ingredients in high performance, long lasting, durable and beautiful concrete produced today are concrete admixture. Concrete admixtures are natural and manufactured chemicals or additives added during concrete mixing to enhance specific properties of the fresh or hardened concrete, such as workability, durability, or early and final strength.
            </p>
            <ul className="space-y-2">
              {[
                "Reduces the cost of construction",
                "Modifies properties of hardened concrete",
                "Ensures quality of concrete during mixing, transporting, placing, curing and finishing",
                "Overcomes certain emergencies during concrete operations",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={shouldReduceMotion ? undefined : imageRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <img src={truckImg} alt="Ready mix truck" className="w-full h-[380px] object-cover rounded-xl shadow-lg" />
          </motion.div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-accent text-sm tracking-widest uppercase">About The Product</span>
            <h2 className="text-brand-primary mt-2 mb-6" style={{ fontSize: "2rem", fontWeight: 800 }}>
              Why Choose Ready Mix Concrete
            </h2>
          </motion.div>

          <motion.div
            className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6"
            variants={shouldReduceMotion ? undefined : staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            {[
              {
                label: "What It Is",
                text: "Readymix concrete is a versatile and efficient building material, pre-mixed to precise specifications at a batching plant and delivered to construction sites in ready-to-use form. This product offers a blend of cement, water, aggregates, and additives tailored to meet specific construction requirements.",
              },
              {
                label: "Why It Stands Out",
                text: "Its primary advantage lies in its consistency, quality, and time efficiency, as it eliminates the need for on-site concrete mixing, reducing labor costs and project timelines. Readymix concrete is ideal for a variety of applications, including residential housing, commercial buildings, roads, and infrastructure projects.",
              },
              {
                label: "Our Plant",
                text: "Our plant is strategically located in the heart of San Jose Del Monte to cater within a radius of 30km. We value our client's interest to serve them promptly and on time with quality concrete. It offers enhanced durability and strength, ensuring long-lasting structural integrity.",
              },
            ].map((s) => (
              <motion.div
                key={s.label}
                className="bg-white rounded-xl p-7 shadow-sm border border-gray-100"
                variants={shouldReduceMotion ? undefined : staggerChildVariants}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={transitionHover}
              >
                <div className="text-brand-accent text-xs tracking-widest uppercase mb-2">{s.label}</div>
                <p className="text-gray-600 text-sm leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Design Mix */}
      <section className="py-20 bg-white">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-accent text-sm tracking-widest uppercase">Specifications</span>
            <h2 className="text-brand-primary mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>
              Product Design Mix
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">
              Excelcrete Redimix offers a full range of concrete grades to meet the demands of residential, commercial, and heavy infrastructure projects.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={shouldReduceMotion ? undefined : staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            {designMixes.map((mix) => (
              <motion.div
                key={mix.grade}
                onClick={() => setActiveMix(activeMix === mix.grade ? null : mix.grade)}
                className={`rounded-xl border-2 p-6 cursor-pointer transition-colors duration-200 ${mix.color} ${activeMix === mix.grade ? "shadow-lg" : "hover:shadow-md"}`}
                variants={shouldReduceMotion ? undefined : staggerChildVariants}
                animate={shouldReduceMotion ? {} : { scale: activeMix === mix.grade ? 1.02 : 1 }}
                transition={transitionBase}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${mix.badge}`} style={{ fontWeight: 700 }}>
                      Grade {mix.grade}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-brand-primary" style={{ fontWeight: 800, fontSize: "1.4rem" }}>{mix.strength}</div>
                    <div className="text-gray-400 text-xs">Design Strength</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Slump Range</span>
                    <span style={{ fontWeight: 600 }}>{mix.slump}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>W/C Ratio</span>
                    <span style={{ fontWeight: 600 }}>{mix.waterCement}</span>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {activeMix === mix.grade ? (
                    <motion.div
                      key="expanded"
                      variants={shouldReduceMotion ? undefined : expandVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-current/10">
                        <p className="text-gray-600 text-sm">
                          <span style={{ fontWeight: 600 }}>Application:</span> {mix.use}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="collapsed"
                      variants={shouldReduceMotion ? undefined : expandVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="mt-3 text-xs text-gray-400 overflow-hidden"
                    >
                      {mix.use}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Curing Time — sequential delay */}
      <section className="py-20 bg-brand-primary">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            className="text-center mb-14"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-accent text-sm tracking-widest uppercase">Technical Guide</span>
            <h2 className="text-white mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>
              Curing Time
            </h2>
            <p className="text-white/60 mt-3 max-w-xl mx-auto text-sm">
              Proper curing is critical to achieving design strength. The timeline below represents typical behavior under standard conditions (20°C, moderate humidity).
            </p>
          </motion.div>

          <div className="relative">
            <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-white/10" />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {curingStages.map((stage, i) => (
                <motion.div
                  key={stage.time}
                  className="flex flex-col items-center text-center"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4, delay: i * 0.08 }}
                >
                  <div className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center mb-4 z-10 ${i === curingStages.length - 1 ? "bg-brand-accent" : "bg-white/10 border border-white/20"}`}>
                    <span className="text-xl">{stage.icon}</span>
                  </div>
                  <div className={`text-sm mb-1 ${i === curingStages.length - 1 ? "text-brand-highlight" : "text-white"}`} style={{ fontWeight: 700 }}>
                    {stage.time}
                  </div>
                  <div className="text-brand-secondary opacity-70 text-xs mb-2">{stage.label}</div>
                  <p className="text-white/60 text-xs leading-relaxed">{stage.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className="mt-12 bg-white/5 border border-white/10 rounded-xl p-6"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <h4 className="text-white mb-3" style={{ fontWeight: 700 }}>Important Curing Notes</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Maintain moisture on concrete surface for a minimum of 7 days after placement.",
                "Avoid exposure to direct sunlight or wind immediately after pouring to prevent rapid evaporation.",
                "Low temperatures significantly slow hydration — protect from frost during the first 48 hours.",
                "High-strength mixes (C35+) may require extended curing periods for full strength development.",
              ].map((note) => (
                <div key={note} className="flex items-start gap-2 text-white/60 text-sm">
                  <Clock className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                  {note}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Other Products */}
      <section className="py-20 bg-white">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-accent text-sm tracking-widest uppercase">More Solutions</span>
            <h2 className="text-brand-primary mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>
              Other Products
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm leading-relaxed">
              Aside from ready-mix concrete, Excelcrete Redimix — together with its mother company,{" "}
              <strong className="text-brand-primary">ICP-FNET Engineering</strong> — will produce, supply, and deliver
              pre-casted and pre-stressed concrete products to meet a wide range of infrastructure needs.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={shouldReduceMotion ? undefined : staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            {otherProducts.map((p) => (
              <motion.div
                key={p.name}
                className="border border-gray-100 rounded-xl p-6 group"
                variants={shouldReduceMotion ? undefined : staggerChildVariants}
                whileHover={shouldReduceMotion ? undefined : { y: -4, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                transition={transitionHover}
              >
                <div className="w-11 h-11 bg-brand-soft rounded-xl flex items-center justify-center mb-4 group-hover-bg-brand-primary transition">
                  <p.icon className="w-5 h-5 text-brand-accent group-hover:text-brand-primary transition" />
                </div>
                <h4 className="text-brand-primary mb-2" style={{ fontWeight: 700 }}>{p.name}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Raw Materials — two-column with image */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[80rem] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <motion.div
              variants={shouldReduceMotion ? undefined : slideFromLeftVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
            >
              <span className="text-brand-accent text-sm tracking-widest uppercase">Ingredients</span>
              <h2 className="text-brand-primary mt-2 mb-4" style={{ fontSize: "2rem", fontWeight: 800 }}>
                Raw Materials
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                We source our aggregates from <strong className="text-brand-primary">Porac, Pampanga</strong>; <strong className="text-brand-primary">Montalban, Rizal</strong>; and <strong className="text-brand-primary">Angono, Rizal</strong> to maintain consistent quality and ensure a dependable supply for our ready-mix concrete operations.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mb-8">
                As for cement, we offer three options based on project or client specifications. We use <strong className="text-brand-primary">Eagle Cement exclusively for SMC projects</strong>, <strong className="text-brand-primary">Union Cement for selected applications</strong>, and <strong className="text-brand-primary">Republic Cement as our standard choice for most productions</strong>.
              </p>
              <div className="space-y-4">
                {rawMaterials.map((mat) => (
                  <div key={mat.name} className={`bg-white rounded-xl p-5 border-l-4 ${mat.color} shadow-sm`}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h4 className="text-brand-primary text-sm" style={{ fontWeight: 700 }}>{mat.name}</h4>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{mat.standard}</span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed">{mat.role}</p>
                    <p className="text-gray-400 text-xs mt-1">Source: {mat.origin}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={shouldReduceMotion ? undefined : slideFromRightVariants}
              initial="hidden"
              whileInView="visible"
              viewport={VIEWPORT}
            >
              <img
                src={rawMaterialsImg}
                alt="Raw materials"
                className="w-full h-[560px] object-cover rounded-xl shadow-lg"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Suppliers */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-[80rem] mx-auto px-6">
          <motion.div
            className="text-center mb-10"
            variants={shouldReduceMotion ? undefined : fadeUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <span className="text-brand-accent text-sm tracking-widest uppercase">Trusted Partners</span>
            <h2 className="text-brand-primary mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>
              Our Suppliers
            </h2>
          </motion.div>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-8"
            variants={shouldReduceMotion ? undefined : staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            {[
              { src: "/suppliers/logo-eagle.webp", alt: "Eagle Cement" },
              { src: "/suppliers/logo-union.webp", alt: "Union Cement" },
              { src: "/suppliers/logo-republic.webp", alt: "Republic Cement" },
              { src: "/suppliers/logo-koinonia.webp", alt: "Koinonia" },
            ].map((s) => (
              <motion.div
                key={s.alt}
                className="flex items-center justify-center p-6 rounded-xl border border-gray-100 hover:border-brand-secondary/30 hover:shadow-sm transition bg-white"
                style={{ width: 220, height: 120 }}
                variants={shouldReduceMotion ? undefined : staggerChildVariants}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                transition={transitionHover}
              >
                <img src={s.src} alt={s.alt} className="max-h-full max-w-full object-contain" loading="lazy" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
