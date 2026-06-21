import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useLocation, useOutlet } from "react-router";
import { AnimatePresence, motion, useAnimation } from "motion/react";

// ── Content renderer — swaps outlet at sweep midpoint ────────────────────────

function ContentRenderer() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const [display, setDisplay] = useState({ outlet: currentOutlet, pathname: location.pathname, visible: true });
  const lastPathname = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === lastPathname.current) return;
    lastPathname.current = location.pathname;
    const hide = setTimeout(() => setDisplay((d) => ({ ...d, visible: false })), 400);
    const show = setTimeout(() => setDisplay({ outlet: currentOutlet, pathname: location.pathname, visible: true }), 420);
    return () => { clearTimeout(hide); clearTimeout(show); };
  }, [location.pathname, currentOutlet]);

  const isReg = display.pathname === "/register";
  return (
    <div className={`absolute inset-y-0 flex flex-col w-full lg:w-[58vw] ${isReg ? "lg:right-0" : "lg:left-0"}`}>
      <AnimatePresence mode="wait">
        {display.visible && (
          <motion.div
            key={display.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25, ease: "easeOut", delay: 0.05 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex flex-col flex-1 h-full overflow-y-auto"
          >
            {display.outlet}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SVG decorations ───────────────────────────────────────────────────────────

function LoginDecoration() {
  return (
    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="420" cy="80"  r="220" fill="#29aae2" fillOpacity="0.09" />
      <circle cx="80"  cy="300" r="180" fill="#6cc24a" fillOpacity="0.07" />
      <circle cx="300" cy="200" r="140" fill="#ffffff"  fillOpacity="0.03" />
    </svg>
  );
}

function RegisterDecoration() {
  return (
    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="80"  cy="100" r="200" fill="#6cc24a" fillOpacity="0.08" />
      <circle cx="380" cy="250" r="220" fill="#29aae2" fillOpacity="0.09" />
      <circle cx="240" cy="180" r="130" fill="#ffffff"  fillOpacity="0.03" />
    </svg>
  );
}

// ── Panel text content ────────────────────────────────────────────────────────

function LoginPanelContent() {
  return (
    <div className="flex flex-col h-full p-10 relative z-10">
      <img src="/logo-icp.webp" alt="ICP" className="h-10 object-contain brightness-0 invert" />
      <div className="mt-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-3">
        User Portal</p>
        <h2 className="text-white font-extrabold leading-tight" style={{ fontSize: "2.25rem" }}>
          Your projects,<br />one place.
        </h2>
        <p className="text-white/50 text-sm mt-3 leading-relaxed max-w-xs">
          Access to ICP-fnet Engineering project tracking, documentation, and precast element details.
        </p>
        <div className="mt-8 space-y-2.5">
          {["Project tracking & documentation", "Team collaboration tools", "Secure member access"].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-sm text-white/45">
              <div className="w-1 h-1 rounded-full bg-[#6cc24a] flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegisterPanelContent() {
  return (
    <div className="flex flex-col h-full p-10 relative z-10">
      <img src="/logo-icp.webp" alt="ICP" className="h-10 object-contain brightness-0 invert" />
      <div className="mt-auto">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-3">New Member</p>
        <h2 className="text-white font-extrabold leading-tight" style={{ fontSize: "2.25rem" }}>
          Join the<br />ICP platform.
        </h2>
        <p className="text-white/50 text-sm mt-3 leading-relaxed max-w-xs">
          Register with your invite code. An admin will approve your account before you can sign in.
        </p>
        <div className="mt-8 space-y-2.5">
          {["Invite-only registration", "Admin approval required", "Secure member onboarding"].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-sm text-white/45">
              <div className="w-1 h-1 rounded-full bg-[#6cc24a] flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AuthLayout ────────────────────────────────────────────────────────────────

export function AuthLayout() {
  const [sweeping, setSweeping] = useState(false);
  const [entered, setEntered] = useState(false);
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  const prevIsRegister = useRef(isRegister);
  const sweepId = useRef(0);
  const mobileControls = useAnimation();

  // Mobile curtain reset on mount
  useEffect(() => {
    void mobileControls.set({ scale: 1, opacity: 0, borderRadius: "1rem", top: "80px", left: "calc(50% - 28px)" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture icon rect synchronously before React re-renders the new page
  useLayoutEffect(() => {
    if (prevIsRegister.current === isRegister) return;

    // DOM still shows old page here — grab the icon now
    const iconEl = document.getElementById("mobile-auth-icon");
    const rect = iconEl ? iconEl.getBoundingClientRect() : null;

    prevIsRegister.current = isRegister;

    const id = ++sweepId.current;
    setSweeping(true);

    if (rect) {
      void mobileControls.set({ top: rect.top, left: rect.left, opacity: 1 });
    } else {
      void mobileControls.set({ opacity: 1 });
    }
    void mobileControls.start({
      scale: [1, 1.01, 50, 1.01, 1],
      borderRadius: ["16px", "16px", "0.32px", "16px", "16px"],
      opacity: [1, 1, 1, 1, 0],
      transition: { duration: 0.8, times: [0, 0.01, 0.5, 0.99, 1], ease: "easeInOut" },
    });

    const t = setTimeout(() => { if (sweepId.current === id) setSweeping(false); }, 850);
    // No cleanup needed — timeout fires after unmount concern is moot here
  }, [isRegister, mobileControls]);

  const panelRestLeft = isRegister ? "0vw" : "58vw";
  const panelEntryLeft = isRegister ? "-42vw" : "100vw";

  const sweepAnimate = isRegister
    ? { width: ["42vw", "100vw", "42vw"], left: ["58vw", "0vw", "0vw"],  transition: { duration: 0.8, times: [0, 0.5, 1], ease: "easeInOut" } }
    : { width: ["42vw", "100vw", "42vw"], left: ["0vw",  "0vw", "58vw"], transition: { duration: 0.8, times: [0, 0.5, 1], ease: "easeInOut" } };

  return (
    <div className="relative bg-[#f5f7fc] overflow-hidden" style={{ height: "calc(100dvh - 118px)", minHeight: "600px" }}>

      {/* Mobile decorative background */}
      <div className="absolute inset-0 z-0 lg:hidden pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-[#e8edfc]/60 to-transparent" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#c8d5e8]/30 blur-3xl" />
        <div className="absolute top-64 -left-24 h-64 w-64 rounded-full bg-[#d6f0fb]/20 blur-3xl" />
      </div>

      {/* Form area */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        <ContentRenderer />
      </div>

      {/* Mobile radial curtain */}
      <motion.div
        animate={mobileControls}
        className="fixed lg:hidden z-[60] origin-center rounded-2xl overflow-hidden"
        style={{ width: 48, height: 48, backgroundColor: "#1a237e", pointerEvents: "none" }}
      />

      {/* Click guard during sweep */}
      {sweeping && <div className="fixed inset-0 z-[320] cursor-wait" aria-hidden="true" />}

      {/* Desktop navy panel */}
      <motion.aside
        className="absolute top-0 bottom-0 hidden lg:block z-40 overflow-hidden"
        style={{ backgroundColor: "#1a237e", width: "42vw" }}
        initial={{ left: panelEntryLeft }}
        animate={sweeping ? sweepAnimate : { left: panelRestLeft, transition: entered ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
        onAnimationComplete={() => setEntered(true)}
      >
        {/* Subtle top glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-30"
          style={{ background: "radial-gradient(ellipse at 70% 30%, #29aae2 0%, transparent 60%)", filter: "blur(60px)" }}
        />
        {/* Shimmer */}
        <motion.div
          animate={{ left: ["-50%", "150%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 12, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-y-0 w-64 -skew-x-[25deg] opacity-[0.07]"
          style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)" }}
        />
        {/* Bottom fade into footer */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{ background: "linear-gradient(to bottom, transparent, #1a237e)" }}
        />

        {/* Panel text */}
        <AnimatePresence mode="wait">
          {isRegister ? (
            <motion.div
              key="reg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.4 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="absolute inset-0 flex flex-col"
            >
              <RegisterDecoration />
              <RegisterPanelContent />
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.3, delay: 0.4 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="absolute inset-0 flex flex-col"
            >
              <LoginDecoration />
              <LoginPanelContent />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}
