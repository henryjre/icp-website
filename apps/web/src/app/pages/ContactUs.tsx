import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, HardHat, Box } from "lucide-react";

const offices = [
  {
    name: "ICP-FNET Engineering — Head Office",
    address: "Andres Bijasa Rd. Brgy. Gaya-Gaya, San Jose del Monte, Bulacan, 3023",
    phone: "044-797-7554",
    email: "inquiry@icpfnetengineering.com",
    hours: "Mon–Fri: 7:00 AM – 5:00 PM",
    type: "icp",
  },
  {
    name: "Exelcrete Redimix — Main Plant",
    address: "Andres Bijasa Rd. Brgy. Gaya-Gaya, San Jose del Monte, Bulacan, 3023",
    phone: "044-712-2055",
    email: "inquiry@icpfnetengineering.com",
    hours: "Mon–Sat: 7:00 AM – 5:00 PM",
    type: "excelcreet",
  }
];

type FormData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export function ContactUs() {
  const [form, setForm] = useState<FormData>({
    name: "",
    company: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api"}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to send message. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-[#041D9D]/30 transition placeholder:text-gray-300";

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-primary py-20">
        <div className="max-w-[80rem] mx-auto px-6">
          <span className="text-brand-accent text-sm tracking-widest uppercase">Get In Touch</span>
          <h1 className="text-white mt-2 mb-4" style={{ fontSize: "2.8rem", fontWeight: 800 }}>
            Contact Us
          </h1>
          <p className="text-white/60 max-w-xl">
            Have a project inquiry, need a concrete delivery quote, or want to speak with our team? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-[80rem] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:flex-wrap md:justify-center gap-6">
            {offices.map((office) => {
              const isIcp = office.type === "icp";
              const iconColor = isIcp ? "text-brand-primary" : "text-brand-accent";
              return (
                <div key={office.name} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 w-full md:w-auto md:min-w-[20rem] md:max-w-sm flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded flex items-center justify-center ${isIcp ? "bg-brand-primary" : "bg-brand-accent"}`}>
                      {isIcp
                        ? <HardHat className="w-5 h-5 text-white" />
                        : <Box className="w-5 h-5 text-white" />
                      }
                    </div>
                    <h3 className="text-brand-primary text-sm leading-tight" style={{ fontWeight: 700 }}>{office.name}</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-gray-500">
                    <li className="flex items-start gap-2">
                      <MapPin className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
                      {office.address}
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className={`w-4 h-4 ${iconColor} shrink-0`} />
                      <a href={`tel:${office.phone}`} className="hover:text-brand-primary transition">{office.phone}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className={`w-4 h-4 ${iconColor} shrink-0`} />
                      <a href={`mailto:${office.email}`} className="hover:text-brand-primary transition break-all">{office.email}</a>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
                      {office.hours}
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form + Map */}
      <section className="py-16 bg-white">
        <div className="max-w-[80rem] mx-auto px-6 grid md:grid-cols-2 gap-14">
          {/* Form */}
          <div>
            <span className="text-brand-accent text-sm tracking-widest uppercase">Send a Message</span>
            <h2 className="text-brand-primary mt-2 mb-6" style={{ fontSize: "1.8rem", fontWeight: 800 }}>
              We'll Get Back to You
            </h2>

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-brand-soft rounded-2xl border border-brand-accent-light">
                <CheckCircle2 className="w-14 h-14 text-brand-accent mb-4" />
                <h3 className="text-brand-primary mb-2" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                  Message Sent!
                </h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Thank you for reaching out. A member of our team will contact you within 1–2 business days.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", company: "", email: "", phone: "", subject: "General Inquiry", message: "" }); }}
                  className="mt-6 text-brand-accent hover:text-brand-primary text-sm underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Juan dela Cruz"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Company / Organization</label>
                    <input
                      type="text"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="XYZ Builders Inc."
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="juan@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+63 917 000 0000"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Subject *</label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option>General Inquiry</option>
                    <option>Ready Mix Concrete Quote</option>
                    <option>Construction Project Inquiry</option>
                    <option>Partnership / Supplier</option>

                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Message *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us about your project, volume requirements, or inquiry..."
                    className={inputClass + " resize-none"}
                  />
                </div>
                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-brand-accent hover-bg-brand-primary text-white py-3.5 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ fontWeight: 600 }}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>

          {/* Map Placeholder + Info */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm h-72">
              <iframe
                title="Excelcrete Redimix Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3857.578354239519!2d121.05109311167485!3d14.792763885657173!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397af77b2d3ef79%3A0x9d348f358e03f780!2sExcelcrete%20Redimix!5e0!3m2!1sen!2sph!4v1771994493632!5m2!1sen!2sph"
                className="w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Quick Contact Info */}
            <div className="bg-brand-primary rounded-xl p-7 text-white">
              <h4 className="mb-5" style={{ fontWeight: 700 }}>Quick Contact</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-brand-highlight" />
                  </div>
                  <div>
                    <div className="text-white/60 text-xs mb-0.5">Mobile Numbers</div>
                    <div className="text-white text-sm">
                      <a href="tel:09175287199" className="hover:text-brand-highlight transition">09175287199</a> <br />
                      <a href="tel:09285205007" className="hover:text-brand-highlight transition">09285205007</a> <br />
                      <a href="tel:09175700880" className="hover:text-brand-highlight transition">09175700880</a> <br />
                      <a href="tel:09228022611" className="hover:text-brand-highlight transition">09228022611</a>
                    </div>
                  </div>
                </div>
                {/* <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-brand-highlight" />
                  </div>
                  <div>
                    <div className="text-white/60 text-xs mb-0.5">Ready Mix Dispatch (24/7)</div>
                    <div className="text-white text-sm">09175700880 &bull; 09228022611</div>
                  </div>
                </div> */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-brand-highlight" />
                  </div>
                  <div>
                    <div className="text-white/60 text-xs mb-0.5">General Inquiries</div>
                    <div className="text-white text-sm">
                      <a href="mailto:inquiry@icpfnetengineering.com" className="hover:text-brand-highlight transition break-all">inquiry@icpfnetengineering.com</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}




