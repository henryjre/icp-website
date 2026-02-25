import { useState } from "react";
import { MapPin, Clock, Briefcase, ChevronDown, ChevronUp, Search, Users, TrendingUp, Heart, Shield } from "lucide-react";

const jobListings = [
  {
    id: 1,
    title: "Senior Civil Engineer",
    department: "Engineering",
    location: "Metro City HQ",
    type: "Full-Time",
    experience: "5–8 years",
    description:
      "Lead the design, review, and supervision of civil and structural engineering works for large-scale infrastructure and building projects. Collaborate with project managers, architects, and contractors to ensure technical compliance and quality standards.",
    responsibilities: [
      "Prepare and review structural design calculations and drawings",
      "Oversee construction supervision and quality control activities",
      "Coordinate with government agencies for permits and inspections",
      "Mentor junior engineers and technical staff",
      "Ensure compliance with NSCP, ASTM, and client specifications",
    ],
    qualifications: [
      "Licensed Civil Engineer (PRC)",
      "BS Civil Engineering",
      "5+ years in structural or infrastructure projects",
      "Proficient in AutoCAD, STAAD.Pro, or ETABS",
      "Strong knowledge of local building codes",
    ],
    category: "Engineering",
  },
  {
    id: 2,
    title: "Concrete Batch Plant Operator",
    department: "Operations",
    location: "North Batching Plant",
    type: "Full-Time",
    experience: "2–4 years",
    description:
      "Operate and monitor the automated concrete batching plant to produce consistent, high-quality ready-mix concrete. Maintain equipment, perform daily calibrations, and ensure batch records meet design specifications.",
    responsibilities: [
      "Operate computerized batching control systems",
      "Perform daily plant and equipment inspections",
      "Monitor aggregate moisture content and adjust mix designs",
      "Maintain accurate batch production records",
      "Coordinate with dispatch for delivery scheduling",
    ],
    qualifications: [
      "TESDA NC II in Construction Trades (preferred)",
      "2+ years batch plant operations experience",
      "Knowledge of concrete mix design principles",
      "Mechanical aptitude and safety awareness",
      "Willing to work shifts",
    ],
    category: "Operations",
  },
  {
    id: 3,
    title: "Project Manager – Infrastructure",
    department: "Project Management",
    location: "Metro City HQ",
    type: "Full-Time",
    experience: "7–10 years",
    description:
      "Manage end-to-end delivery of infrastructure construction projects from mobilization through completion and handover. Responsible for schedule, budget, quality, and safety performance across assigned projects.",
    responsibilities: [
      "Develop and manage detailed project schedules and budgets",
      "Lead cross-functional project teams of 20–100+ staff",
      "Manage client relationships and stakeholder communications",
      "Identify and mitigate project risks proactively",
      "Ensure compliance with safety, environmental, and quality standards",
    ],
    qualifications: [
      "Licensed Civil or Structural Engineer",
      "PMP Certification (preferred)",
      "7+ years managing construction projects above PHP 50M",
      "Strong leadership and contract management skills",
      "Proficient in MS Project or Primavera P6",
    ],
    category: "Management",
  },
  {
    id: 4,
    title: "Quality Control Technician",
    department: "Quality Assurance",
    location: "Multiple Sites",
    type: "Full-Time",
    experience: "1–3 years",
    description:
      "Conduct sampling, testing, and documentation of concrete and aggregate materials to ensure compliance with mix design specifications and project quality requirements.",
    responsibilities: [
      "Perform slump, air content, and temperature tests on fresh concrete",
      "Prepare, cure, and test concrete cylinder specimens",
      "Aggregate sieve analysis and moisture content testing",
      "Document and report test results in QC records",
      "Assist in resolving non-conformance issues",
    ],
    qualifications: [
      "BS Civil Engineering or Materials Engineering",
      "ACI Concrete Field Testing Technician Grade I (preferred)",
      "1+ year laboratory or field testing experience",
      "Knowledge of ASTM and PNS test methods",
      "Detail-oriented with strong documentation skills",
    ],
    category: "Quality",
  },
  {
    id: 5,
    title: "Mixer Truck Driver",
    department: "Logistics",
    location: "All Plants",
    type: "Full-Time",
    experience: "2+ years",
    description:
      "Safely operate ready-mix concrete mixer trucks to deliver batched concrete from plant to customer job sites within specified time windows. Maintain truck cleanliness and perform pre-/post-trip inspections.",
    responsibilities: [
      "Safely drive and operate drum mixer truck (8–12 m³ capacity)",
      "Deliver concrete within 90-minute window from batch time",
      "Perform pre-/post-trip vehicle inspections",
      "Coordinate with dispatch via mobile communication",
      "Maintain delivery receipts and batch tickets",
    ],
    qualifications: [
      "Professional Driver's License (PDL) – Restriction Code 3",
      "2+ years heavy vehicle driving experience",
      "Clean driving record",
      "Physical fitness required for outdoor work",
      "Willingness to work early mornings and weekends",
    ],
    category: "Logistics",
  },
  {
    id: 6,
    title: "Sales Engineer",
    department: "Business Development",
    location: "Metro City HQ",
    type: "Full-Time",
    experience: "3–5 years",
    description:
      "Drive revenue growth by identifying, nurturing, and closing ready-mix concrete supply contracts with contractors, developers, and government agencies. Provide technical product consultation to prospective clients.",
    responsibilities: [
      "Develop and maintain a pipeline of ready-mix concrete clients",
      "Prepare technical proposals and bid submissions",
      "Coordinate product trials and sample testing for new clients",
      "Monitor market trends and competitor pricing",
      "Achieve monthly and quarterly volume sales targets",
    ],
    qualifications: [
      "BS Civil Engineering or related field",
      "3+ years B2B sales or technical sales experience",
      "Knowledge of concrete products and construction industry",
      "Excellent communication and negotiation skills",
      "Proficient in CRM tools and MS Office",
    ],
    category: "Business",
  },
];

const categories = ["All", "Engineering", "Operations", "Management", "Quality", "Logistics", "Business"];

const benefits = [
  { icon: Heart, title: "Health & Wellness", desc: "Comprehensive HMO coverage for employees and dependents" },
  { icon: TrendingUp, title: "Career Growth", desc: "Training programs, mentorship, and promotion pathways" },
  { icon: Shield, title: "Safety First", desc: "Industry-leading safety culture with PPE and training provided" },
  { icon: Users, title: "Strong Team Culture", desc: "Collaborative environment of 1,200+ passionate professionals" },
];

export function Careers() {
  const [openJob, setOpenJob] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = jobListings.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase()) ||
      j.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "All" || j.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-primary py-20">
        <div className="max-w-[80rem] mx-auto px-6">
          <span className="text-brand-accent text-sm tracking-widest uppercase">Join Our Team</span>
          <h1 className="text-white mt-2 mb-4" style={{ fontSize: "2.8rem", fontWeight: 800 }}>
            Build Your Career with ICP-FNET Engineering
          </h1>
          <p className="text-white/60 max-w-2xl leading-relaxed">
            We are always looking for talented, driven individuals who want to make a real impact in the construction industry. Explore our open positions and take the next step in your career.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-brand-accent py-12">
        <div className="max-w-[80rem] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {benefits.map((b) => (
            <div key={b.title} className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                <b.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white text-sm" style={{ fontWeight: 700 }}>{b.title}</div>
                <div className="text-brand-highlight text-xs mt-0.5">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-[80rem] mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-brand-accent text-sm tracking-widest uppercase">Opportunities</span>
            <h2 className="text-brand-primary mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>
              Open Positions
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search positions, departments, or locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-brand-primary transition"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-4 py-2.5 rounded-xl text-sm border transition ${
                    activeCategory === c
                      ? "bg-brand-accent text-brand-primary border-brand-accent"
                      : "bg-white border-gray-200 text-gray-600 hover:border-brand-secondary/50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Job Cards */}
          <div className="space-y-4">
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                No positions found matching your search.
              </div>
            )}
            {filtered.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <button
                  className="w-full text-left p-6 flex flex-wrap items-start justify-between gap-4"
                  onClick={() => setOpenJob(openJob === job.id ? null : job.id)}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs bg-brand-soft text-brand-accent-strong px-2.5 py-1 rounded-full" style={{ fontWeight: 600 }}>
                        {job.department}
                      </span>
                    </div>
                    <h3 className="text-brand-primary" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{job.title}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-gray-500 text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {job.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" /> {job.experience}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline text-sm text-brand-accent" style={{ fontWeight: 600 }}>
                      {openJob === job.id ? "Hide Details" : "View Details"}
                    </span>
                    {openJob === job.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded */}
                {openJob === job.id && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="pt-5 grid md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-gray-600 text-sm leading-relaxed mb-5">{job.description}</p>
                        <h4 className="text-brand-primary mb-3 text-sm" style={{ fontWeight: 700 }}>Key Responsibilities</h4>
                        <ul className="space-y-2">
                          {job.responsibilities.map((r) => (
                            <li key={r} className="flex items-start gap-2 text-gray-600 text-sm">
                              <span className="w-1.5 h-1.5 bg-brand-accent rounded-full mt-2 shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-brand-primary mb-3 text-sm" style={{ fontWeight: 700 }}>Qualifications</h4>
                        <ul className="space-y-2 mb-6">
                          {job.qualifications.map((q) => (
                            <li key={q} className="flex items-start gap-2 text-gray-600 text-sm">
                              <span className="w-1.5 h-1.5 bg-brand-highlight0 rounded-full mt-2 shrink-0" />
                              {q}
                            </li>
                          ))}
                        </ul>
                        <a
                          href="mailto:inquiry@icpfnetengineering.com"
                          className="inline-block bg-brand-accent hover-bg-brand-primary text-white px-6 py-3 rounded-lg text-sm transition"
                          style={{ fontWeight: 600 }}
                        >
                          Apply for This Position
                        </a>
                        <p className="text-gray-400 text-xs mt-3">
                          Send your CV to inquiry@icpfnetengineering.com with subject: <em>{job.title} Application</em>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-brand-primary">
        <div className="max-w-[80rem] mx-auto px-6 text-center">
          <h2 className="text-white mb-3" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
            Don't See a Fit?
          </h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto text-sm">
            We're always open to exceptional talent. Send us your resume and let us know how you can contribute to the ICP-FNET Engineering team.
          </p>
          <a
            href="mailto:inquiry@icpfnetengineering.com"
            className="inline-block border border-brand-accent text-brand-highlight hover-bg-brand-primary hover:text-white px-8 py-3 rounded-lg transition text-sm"
            style={{ fontWeight: 600 }}
          >
            Send a General Application
          </a>
        </div>
      </section>
    </div>
  );
}




