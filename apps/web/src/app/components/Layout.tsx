import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate, useNavigation } from "react-router";
import { Menu, X, Phone, Mail, MapPin, ChevronUp, LogOut, Shield } from "lucide-react";
import type { UserDTO } from "@icp/shared";
import { apiClient } from "../lib/api/client";

const publicNavItems = [
  { label: "Home", path: "/" },
  { label: "About Us", path: "/about" },
  { label: "Product Overview", path: "/products" },
  { label: "Projects", path: "/projects" },

  { label: "Contact Us", path: "/contact" },
];

const footerQuickLinks = [
  ...publicNavItems,
  { label: "Privacy Policy", path: "/privacy-policy" },
  { label: "Terms and Conditions", path: "/terms-and-conditions" },
];

const footerServices = [
  "General Engineering & Infrastructure Construction",
  "Pre-Casting & Post-Tensioning Works",
  "On-Site Girder Fabrication",
  "MSE Wall Systems",
  "Ready-Mix Concrete Supply",
];

const adminNavItems = [
  { label: "Users", path: "/users" },
  { label: "Create Project", path: "/admin/projects/new" },
];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [activeLogoIndex, setActiveLogoIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(apiClient.getStoredUser());
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const isAdmin = currentUser?.role === "admin";
  const logos = ["/logo-icp.webp", "/logo-exelcrete.webp"];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncUser = () => setCurrentUser(apiClient.getStoredUser());
    syncUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  useEffect(() => {
    void apiClient.me().then((user) => {
      setCurrentUser(user);
    }).catch(() => {
      setCurrentUser(apiClient.getStoredUser());
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updatePreference);
      return () => media.removeEventListener("change", updatePreference);
    }

    media.addListener(updatePreference);
    return () => media.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveLogoIndex((current) => (current + 1) % logos.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [logos.length]);

  useEffect(() => {
    setMenuOpen(false);
    setAdminOpen(false);
    setCurrentUser(apiClient.getStoredUser());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const handleLogout = async () => {
    await apiClient.logout();
    setCurrentUser(null);
    navigate("/login");
  };

  const handleQuickLinkClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-surface text-brand-body">
      <div className="bg-brand-primary text-white/80 text-sm hidden md:block">
        <div className="max-w-[80rem] mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-brand-accent" />
              <a href="tel:044-797-7554" className="hover:text-white transition">044-797-7554</a>
              &bull;
              <a href="tel:044-712-2055" className="hover:text-white transition">044-712-2055</a>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-accent" />
              <a href="mailto:inquiry@icpfnetengineering.com" className="hover:text-white transition">inquiry@icpfnetengineering.com</a>
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-accent" />
            Andres Bijasa Rd. Brgy. Gaya-Gaya, San Jose del Monte, Bulacan, 3023
          </span>
        </div>
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "shadow-lg bg-brand-surface" : "bg-brand-surface"}`}>
        <div className="max-w-[80rem] mx-auto px-6 py-4 flex items-center justify-between">
          <NavLink to="/" className="flex items-center">
            <div className="relative w-[132px] h-10 sm:w-[168px] sm:h-12">
              {logos.map((src, index) => {
                const isActive = index === activeLogoIndex;
                return (
                  <img
                    key={src}
                    src={src}
                    alt="Company logo"
                    loading="eager"
                    className={`absolute inset-0 h-full w-full object-contain select-none pointer-events-none ${
                      prefersReducedMotion
                        ? `${isActive ? "opacity-100" : "opacity-0"} transition-opacity duration-500 ease-out`
                        : `${isActive ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"} transition-[opacity,transform] duration-700 ease-out`
                    }`}
                  />
                );
              })}
            </div>
          </NavLink>

          <nav className="hidden md:flex items-center gap-1 relative">
            {publicNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `px-4 py-2 rounded transition-all duration-200 text-sm tracking-wide ${isActive ? "text-brand-primary bg-brand-card" : "text-brand-body hover-text-brand-secondary"}`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {isAdmin && (
              <>
                <span className="mx-2 h-6 w-px bg-brand-border" />
                <div className="relative">
                  <button
                    onClick={() => setAdminOpen((v) => !v)}
                    className="px-4 py-2 rounded text-sm tracking-wide text-brand-body hover-text-brand-primary hover-bg-brand-card transition flex items-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    Admin
                  </button>
                  {adminOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-brand-surface border border-brand-border rounded-xl shadow-lg p-2 z-50">
                      {adminNavItems.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            `block px-3 py-2 rounded-lg text-sm ${isActive ? "bg-brand-highlight text-brand-primary" : "text-brand-body hover-bg-brand-card"}`
                          }
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {currentUser ? (
              <button onClick={handleLogout} className="ml-2 px-4 py-2 rounded text-sm tracking-wide text-brand-body hover-text-brand-primary hover-bg-brand-card transition flex items-center gap-1.5">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <NavLink to="/login" className="ml-2 px-4 py-2 rounded text-sm tracking-wide text-brand-body hover-text-brand-primary hover-bg-brand-card transition">Login</NavLink>
            )}
          </nav>

          <button className="md:hidden p-2 text-brand-body hover-text-brand-primary transition" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-brand-surface border-t border-brand-border px-6 py-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 px-4 pb-2">Public</div>
            {publicNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded mb-1 text-sm tracking-wide ${isActive ? "text-brand-primary bg-brand-card" : "text-brand-body hover-text-brand-primary"}`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {isAdmin && (
              <>
                <div className="my-3 h-px bg-brand-border" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 px-4 pb-2">Admin</div>
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded mb-1 text-sm tracking-wide ${isActive ? "text-brand-primary bg-brand-highlight" : "text-brand-body hover-text-brand-primary hover-bg-brand-card"}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </>
            )}

            {currentUser ? (
              <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded mb-1 text-sm tracking-wide text-brand-body hover-text-brand-primary hover-bg-brand-card transition">Logout</button>
            ) : (
              <NavLink to="/login" className="block px-4 py-3 rounded mb-1 text-sm tracking-wide text-brand-body hover-text-brand-primary hover-bg-brand-card transition">Login</NavLink>
            )}
          </div>
        )}
        <div className={`h-0.5 bg-brand-primary transition-opacity duration-200 ${isNavigating ? "opacity-100" : "opacity-0"}`} />
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-brand-primary text-white/85">
        <div className="max-w-[80rem] mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo-icp.webp"
                alt="ICP logo"
                className="h-12 w-auto object-contain bg-white rounded-md p-1 shadow-sm"
                loading="eager"
              />
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              Delivering reliable engineering, precasting, and infrastructure solutions
              with quality, safety, and long-term performance.
            </p>
          </div>

          <div>
            <h4 className="text-white mb-4" style={{ fontWeight: 700 }}>Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {footerQuickLinks.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={handleQuickLinkClick}
                    className="text-white/70 hover:text-brand-highlight transition"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white mb-4" style={{ fontWeight: 700 }}>Our Services</h4>
            <ul className="space-y-2 text-sm text-white/70">
              {footerServices.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white mb-4" style={{ fontWeight: 700 }}>Contact</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex gap-2"><MapPin className="w-4 h-4 text-brand-highlight shrink-0 mt-0.5" />Andres Bijasa Rd. Brgy. Gaya-Gaya, San Jose del Monte, Bulacan, 3023</li>
              <li className="flex gap-2"><Phone className="w-4 h-4 text-brand-highlight shrink-0" /><a href="tel:044-797-7554" className="hover:text-white transition">044-797-7554</a></li>
              <li className="flex gap-2"><Mail className="w-4 h-4 text-brand-highlight shrink-0" /><a href="mailto:inquiry@icpfnetengineering.com" className="hover:text-white transition break-all">inquiry@icpfnetengineering.com</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-[80rem] mx-auto px-6 py-4 flex items-center justify-center text-xs text-white/60 text-center">
            <span>© 2026 ICP-FNET Engineering. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-brand-primary hover-bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg transition">
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

