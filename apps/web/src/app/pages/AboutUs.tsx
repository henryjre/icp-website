import { useState } from "react";
import { CheckCircle2, Target, Eye, Lightbulb, HardHat, Cuboid, Trophy } from "lucide-react";

const engineerImg = "https://images.unsplash.com/photo-1759922378219-1d31edb644f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBlbmdpbmVlciUyMGhhcmQlMjBoYXQlMjBzYWZldHl8ZW58MXx8fHwxNzcxODQ3NDM3fDA&ixlib=rb-4.1.0&q=80&w=1080";
const concreteImg = "https://images.unsplash.com/photo-1621463677998-1a90bcbaca94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWFkeSUyMG1peCUyMGNvbmNyZXRlJTIwdHJ1Y2slMjBkZWxpdmVyeXxlbnwxfHx8fDE3NzE4NDc0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080";

type CompanyKey = "icp" | "excelcreet";

const companies: Record<CompanyKey, {
  logoText: string;
  logoSub: string;
  color: string;
  tagline: string;
  intro: string;
  highlights: string[];
  mission: string;
  vision: string;
  values: { icon: typeof Target; title: string; desc: string }[];
  image: string;
  founded: string;
  hq: string;
  employees: string;
  projects: string;
}> = {
  icp: {
    logoText: "ICP-FNET",
    logoSub: "ENGINEERING",
    color: "amber",
    tagline: "Building the Future on a Foundation of Excellence",
    intro:
      "ICP-FNET Engineering was established in August 2002 as ICP Construction and Supply, registered under the laws of the Philippines with the Department of Trade and Industry (DTI). Specializing in General Engineering, Pre-casting and Post-tensioning, on-site Girder Fabrication, and MSE Wall fabrication and installation in partnership with Reinforced Earth Company, the firm has built a strong reputation for quality and precision. With a dedicated team of skilled professionals and a proven track record in bridges, roads, drainage systems, and water supply infrastructure, ICP-FNET Engineering continues to strengthen the built environment of the nation.",
    highlights: [
      "DTI Registered & Compliant",
      "20+ years of industry experience",
      "Operations across multiple provinces",
      "Specialized in bridge & road construction",
      "Skilled & certified engineering workforce",
      "Trusted government project contractor",
    ],
    mission:
      "To deliver economical and high-quality engineering solutions by educating competent technical personnel, embracing precast and pre-stressed construction technologies, and contributing to sustainable nation building.",
    vision:
      "To upgrade construction workmanship by adopting new technologies and innovations, becoming a leading engineering firm recognized for excellence and quality infrastructure delivery.",
    values: [
      {
        icon: CheckCircle2,
        title: "Quality",
        desc: "We hold ourselves to the highest standards in materials, workmanship, and infrastructure delivery across every project we undertake.",
      },
      {
        icon: Lightbulb,
        title: "Innovation",
        desc: "We continuously embrace precast, pre-stressed, and modern construction technologies to shift from conventional methods and improve project outcomes.",
      },
      {
        icon: Trophy,
        title: "Excellence",
        desc: "We offer economical engineering solutions without compromising quality, ensuring every structure we build stands as a testament to our craftsmanship.",
      },
    ],
    image: engineerImg,
    founded: "2002",
    hq: "Bulacan",
    employees: "1,200+",
    projects: "500+",
  },
  excelcreet: {
    logoText: "EXELCRETE",
    logoSub: "REDIMIX",
    color: "blue",
    tagline: "Your Excellent Partner in Community-Building",
    intro:
      "Excelcrete Redimix was conceptualized in November 2016 and officially established on January 30, 2020, with a vision of delivering high-quality ready-mix concrete products to the construction industry. The name combines \"Excellent\" and \"Concrete,\" reflecting the company's core commitment to superior quality and reliability. Operating as a branch company of ICP-FNET Engineering under the ownership of Engr. Isidro C. Paredes, Excelcrete Redimix leverages decades of engineering expertise to uphold the same standards of excellence its parent company is known for. With a focus on dependable service, technical efficiency, and consistent product quality, Excelcrete Redimix continues to support diverse infrastructure and development projects across the communities it serves.",
    highlights: [
      "Ready-mix concrete specialist",
      "State-of-the-art batching plant",
      "Serving infrastructure & private developers",
      "Consistent and reliable product quality",
      "On-time delivery commitment",
      "Quality-driven production standards",
    ],
    mission:
      "To provide contractors, developers, and builders with consistently high-quality ready-mix concrete — delivered on time and supported by the technical expertise of our engineering team — ensuring every project is built on the strongest possible foundation.",
    vision:
      "To be one of the country's leading and most reliable ready-mix concrete suppliers, recognized for product quality, delivery efficiency, and environmental responsibility through continuous investment in technology and people.",
    values: [
      {
        icon: CheckCircle2,
        title: "Precision",
        desc: "Every batch is carefully proportioned and tested to meet exact engineering specifications.",
      },
      {
        icon: Target,
        title: "Reliability",
        desc: "On-time delivery and consistent quality you can count on for every pour, every project.",
      },
      {
        icon: Eye,
        title: "Sustainability",
        desc: "We adopt eco-friendly practices and responsibly source materials to minimize our environmental footprint.",
      },
    ],
    image: concreteImg,
    founded: "2020",
    hq: "Bulacan",
    employees: "400+",
    projects: "2,000+ deliveries/yr",
  },
};

const timeline = [
  {
    year: "2016",
    title: "Conceptualized",
    desc: "Excelcrete Redimix was conceptualized in November 2016 and initially constructed in Santa Quiteria, Caloocan City. However, the project did not proceed due to permit issues.",
    company: "excelcreet",
  },
  {
    year: "2018",
    title: "Relocation",
    desc: "In 2018, the company relocated its operations to Barangay Gaya-Gaya, City of San Jose del Monte, Bulacan.",
    company: "exelcreet",
  },
  {
    year: "2020",
    title: "Starting of Operations",
    desc: "After nearly three years of construction, Excelcrete Redimix Plant was finally completed and officially opened to the public on January 30, 2020.\n\nHowever, just two months after opening, the COVID-19 pandemic struck, leading to a nationwide lockdown that significantly affected operations.",
    company: "excelcreet",
  },
  {
    year: "2021",
    title: "Continuing",
    desc: "In 2021, Excelcrete Redimix continued to serve the community despite ongoing challenges.\n\nGradually, the company began gaining clients, particularly for roadworks and residential construction projects.",
    company: "excelcreet",
  },
  // {
  //   year: "2015",
  //   title: "Regional Expansion",
  //   desc: "Expanded operations to 12 provinces, establishing regional offices and on-site equipment depots.",
  //   company: "icp",
  // },
  // {
  //   year: "2018",
  //   title: "GPS Fleet Management System",
  //   desc: "Exelcrete Redimix deployed a fully integrated GPS tracking and dispatch system across all mixer trucks.",
  //   company: "excelcreet",
  // },
  // {
  //   year: "2021",
  //   title: "Digital Transformation Initiative",
  //   desc: "Launched the ICP-FNET Engineering Digital Platform — integrating BIM, project management, and client portals.",
  //   company: "icp",
  // },
  // {
  //   year: "2024",
  //   title: "Sustainability Roadmap Launched",
  //   desc: "Introduced the Green Build 2030 plan, committing to net-zero emissions across all operations by 2030.",
  //   company: "icp",
  // },
  // {
  //   year: "2025",
  //   title: "30th Anniversary Milestone",
  //   desc: "Celebrated three decades of construction excellence, 500+ completed projects, and 1,200+ strong team.",
  //   company: "icp",
  // },
];

export function AboutUs() {
  const [active, setActive] = useState<CompanyKey>("icp");
  const co = companies[active];

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-brand-primary py-16">
        <div className="max-w-[80rem] mx-auto px-6">
          <span className="text-brand-accent text-sm tracking-widest uppercase">Company Profile</span>
          <h1 className="text-white mt-2" style={{ fontSize: "2.8rem", fontWeight: 800 }}>
            About Us
          </h1>
          <p className="text-white/80 mt-3 max-w-xl">
            Get to know ICP-FNET Engineering and Exelcrete Redimix — our story, values, and vision.
          </p>
        </div>
      </section>

      {/* Company Toggle */}
      <section className="bg-white border-b border-gray-100 sticky top-[73px] z-40">
        <div className="max-w-[80rem] mx-auto px-6 py-4 flex gap-3 justify-center">
          {/* ICP-FNET Engineering Toggle */}
          <button
            onClick={() => setActive("icp")}
            className={`flex items-center justify-center flex-1 sm:flex-none gap-3 px-5 py-3 rounded-xl border-2 transition-all duration-200 ${active === "icp"
                ? "border-brand-primary bg-brand-soft shadow-sm"
                : "border-gray-200 bg-white hover:border-brand-secondary/50 hover:bg-brand-highlight/50"
              }`}
          >
            <div className="h-10 w-[148px] sm:w-[172px] flex items-center">
              <img
                src="/logo-icp.webp"
                alt="ICP-FNET Engineering logo"
                className={`h-full w-full object-contain transition ${active === "icp" ? "grayscale-0 opacity-100" : "grayscale opacity-70"}`}
                loading="lazy"
              />
            </div>
          </button>

          {/* Exelcrete Redimix Toggle */}
          <button
            onClick={() => setActive("excelcreet")}
            className={`flex items-center justify-center flex-1 sm:flex-none gap-3 px-5 py-3 rounded-xl border-2 transition-all duration-200 ${active === "excelcreet"
                ? "border-brand-accent bg-brand-highlight shadow-sm"
                : "border-gray-200 bg-white hover:border-brand-secondary hover:bg-brand-highlight/50"
              }`}
          >
            <div className="h-10 w-[148px] sm:w-[172px] flex items-center">
              <img
                src="/logo-exelcrete.webp"
                alt="Exelcrete Redimix logo"
                className={`h-full w-full object-contain transition ${active === "excelcreet" ? "grayscale-0 opacity-100" : "grayscale opacity-70"}`}
                loading="lazy"
              />
            </div>
          </button>
        </div>
      </section>

      {/* Company Content */}
      <section key={active} className="py-16 bg-white">
        <div className="max-w-[80rem] mx-auto px-6 grid md:grid-cols-2 gap-14 items-start">
          {/* Left: Image + Stats */}
          <div className="relative">
            <img
              src={co.image}
              alt={co.logoText}
              className="w-full h-[440px] object-cover rounded-xl shadow-lg"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { label: "Founded", value: co.founded },
                { label: "Headquarters", value: co.hq },
                { label: "Employees", value: co.employees },
                { label: "Projects", value: co.projects },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-lg p-4 text-center border ${active === "icp"
                      ? "bg-brand-soft border-brand-accent-light"
                      : "bg-brand-highlight border-brand-accent"
                    }`}
                >
                  <div
                    className={`text-xl ${active === "icp" ? "text-brand-primary" : "text-brand-secondary"}`}
                    style={{ fontWeight: 800 }}
                  >
                    {s.value}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Intro */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded flex items-center justify-center ${active === "icp" ? "bg-brand-primary" : "bg-brand-accent"
                  }`}
              >
                {active === "icp" ? (
                  <HardHat className="w-6 h-6 text-white" />
                ) : (
                  <Cuboid className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <div
                  className={active === "icp" ? "text-brand-primary" : "text-brand-accent-strong"}
                  style={{ fontWeight: 800 }}
                >
                  {co.logoText}
                </div>
                <div className="text-gray-400 tracking-widest" style={{ fontSize: "0.55rem", letterSpacing: "0.15em" }}>
                  {co.logoSub}
                </div>
              </div>
            </div>

            <p
              className={`text-sm mb-3 tracking-widest uppercase ${active === "icp" ? "text-brand-secondary" : "text-brand-secondary"
                }`}
            >
              {co.tagline}
            </p>
            <h2 className="text-brand-primary mb-5" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
              Company Introduction
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6 text-sm">{co.intro}</p>

            <h4 className="text-brand-primary mb-3" style={{ fontWeight: 700 }}>Company Highlights</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {co.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-gray-600 text-sm">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${active === "icp" ? "text-brand-secondary" : "text-brand-accent"
                      }`}
                  />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className={`py-16 ${active === "icp" ? "bg-brand-soft" : "bg-brand-highlight"}`}>
        <div className="max-w-[80rem] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Mission */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${active === "icp" ? "bg-brand-soft" : "bg-brand-highlight"
                  }`}
              >
                <Target
                  className={`w-6 h-6 ${active === "icp" ? "text-brand-primary" : "text-brand-secondary"}`}
                />
              </div>
              <h3 className="text-brand-primary mb-4" style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                Our Mission
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">{co.mission}</p>
            </div>

            {/* Vision */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${active === "icp" ? "bg-brand-soft" : "bg-brand-highlight"
                  }`}
              >
                <Eye
                  className={`w-6 h-6 ${active === "icp" ? "text-brand-primary" : "text-brand-secondary"}`}
                />
              </div>
              <h3 className="text-brand-primary mb-4" style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                Our Vision
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">{co.vision}</p>
            </div>
          </div>

          {/* Core Values */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {co.values.map((v) => (
              <div key={v.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${active === "icp" ? "bg-brand-soft" : "bg-brand-highlight"
                    }`}
                >
                  <v.icon
                    className={`w-5 h-5 ${active === "icp" ? "text-primary" : "text-brand-secondary"}`}
                  />
                </div>
                <div>
                  <h4 className="text-brand-primary mb-1" style={{ fontWeight: 700 }}>{v.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Development Timeline */}
      <section className="py-20 bg-brand-primary">
        <div className="max-w-[80rem] mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-brand-accent text-sm tracking-widest uppercase">Our Journey</span>
            <h2 className="text-white mt-2" style={{ fontSize: "2.2rem", fontWeight: 800 }}>
              Development Timeline
            </h2>
            <p className="text-white/60 mt-3 max-w-lg mx-auto text-sm">
              Three decades of milestones, growth, and achievements that define who we are today.
            </p>
          </div>

          <div>
            {/* Mobile: left-rail timeline; Desktop: alternating left/right */}
            <div className="relative md:space-y-10">
            {/* Center line — desktop only */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10 -translate-x-1/2 z-0" />
              {timeline.map((item, i) => (
                <div key={item.year} className="w-full">

                  {/* ── Mobile layout ── */}
                  <div className="flex md:hidden">
                    {/* Left rail: line + bubble */}
                    <div className="flex flex-col items-center mr-4 shrink-0">
                      {/* Top segment of line (hidden on first item) */}
                      <div className={`w-px flex-1 bg-white/20 ${i === 0 ? "invisible" : ""}`} style={{ minHeight: "1rem" }} />
                      {/* Year bubble */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center border-2 text-xs z-10 shrink-0 bg-brand-accent border-brand-accent text-white"
                        style={{ fontWeight: 800, fontSize: "0.65rem" }}
                      >
                        {item.year}
                      </div>
                      {/* Bottom segment of line (hidden on last item) */}
                      <div className={`w-px flex-1 bg-white/20 ${i === timeline.length - 1 ? "invisible" : ""}`} style={{ minHeight: "1rem" }} />
                    </div>

                    {/* Card — aligned to center of bubble */}
                    <div className="flex-1 py-2">
                      <div
                        className={`rounded-xl p-5 border ${item.company === "icp"
                            ? "bg-brand-primary/10 border-brand-primary/20"
                            : "bg-brand-highlight0/10 border-brand-accent/20"
                          }`}
                      >
                        <span className={`text-xs tracking-widest uppercase ${item.company === "icp" ? "text-brand-highlight" : "text-brand-accent"}`}>
                          {item.company === "icp" ? "ICP-FNET Engineering" : "Exelcrete Redimix"}
                        </span>
                        <h4 className="text-white mt-1 mb-2" style={{ fontWeight: 700 }}>{item.title}</h4>
                        <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{item.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Desktop layout (unchanged) ── */}
                  <div
                    className={`hidden md:flex md:flex-row items-center gap-6 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  >
                    {/* Content box */}
                    <div className="md:w-[calc(50%-2rem)] w-full">
                      <div
                        className={`rounded-xl p-6 border ${item.company === "icp"
                            ? "bg-brand-primary/10 border-brand-primary/20"
                            : "bg-brand-highlight0/10 border-brand-accent/20"
                          } ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}
                      >
                        <span className={`text-xs tracking-widest uppercase ${item.company === "icp" ? "text-brand-highlight" : "text-brand-accent"}`}>
                          {item.company === "icp" ? "ICP-FNET Engineering" : "Exelcrete Redimix"}
                        </span>
                        <h4 className="text-white mt-1 mb-2" style={{ fontWeight: 700 }}>{item.title}</h4>
                        <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{item.desc}</p>
                      </div>
                    </div>
                    {/* Year bubble */}
                    <div className="md:w-16 flex justify-center shrink-0">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center border-2 text-xs z-10 shrink-0 bg-brand-accent border-brand-accent text-white"
                        style={{ fontWeight: 800, fontSize: "0.7rem" }}
                      >
                        {item.year}
                      </div>
                    </div>
                    {/* Empty space for alternating layout */}
                    <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}






