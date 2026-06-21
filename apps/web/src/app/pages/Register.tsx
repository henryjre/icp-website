import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import {
  fadeUpVariants,
  scaleInVariants,
  shakeAnimation,
  transitionFast,
} from "../lib/animations";

const DRAFT_KEY = "form:register";

const staggerFields = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
} as const;

export function Register() {
  const [params] = useSearchParams();
  const initialCode = useMemo(() => params.get("code") ?? "", [params]);
  const from = params.get("from") ?? "/";
  const shouldReduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState(() => getDraft(`${DRAFT_KEY}:fullName`, ""));
  const [email, setEmail] = useState(() => getDraft(`${DRAFT_KEY}:email`, ""));
  const [password, setPassword] = useState(() => getDraft(`${DRAFT_KEY}:password`, ""));
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(() => getDraft(`${DRAFT_KEY}:inviteCode`, initialCode));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (passwordMismatch) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiClient.register({ fullName, email, password, inviteCode });
      setMessage(response.message);
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      clearDraft(`${DRAFT_KEY}:fullName`);
      clearDraft(`${DRAFT_KEY}:email`);
      clearDraft(`${DRAFT_KEY}:password`);
      clearDraft(`${DRAFT_KEY}:inviteCode`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Unable to register right now.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-start lg:justify-center px-6 pt-8 pb-6 lg:px-14 lg:py-12 h-full">
      <div className="w-full max-w-[26rem] mx-auto">

        {/* Mobile logo + icon */}
        <div className="lg:hidden mb-4 flex flex-col items-center text-center">
          <div
            id="mobile-auth-icon"
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
            style={{ backgroundColor: "#1a237e" }}
          >
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.2 }}
          >
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Create Account</h2>
            <p className="text-xs text-gray-500">Register with your invite code</p>
          </motion.div>
        </div>

        {/* Desktop header */}
        <motion.div
          className="hidden lg:block mb-10"
          variants={staggerFields}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
            <span className="text-brand-accent text-xs tracking-[0.18em] uppercase font-semibold">
              Invite Registration
            </span>
            <h1 className="text-brand-primary mt-2 leading-none" style={{ fontSize: "2.5rem", fontWeight: 800 }}>
              Register
            </h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Create your account. Admin approval is required before login.
            </p>
          </motion.div>
        </motion.div>

        <form onSubmit={onSubmit}>
          <motion.div
            className="space-y-4 lg:space-y-7"
            variants={staggerFields}
            initial="hidden"
            animate="visible"
          >
            {/* Full Name */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <label className="text-xs text-gray-400 uppercase tracking-[0.14em]">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setDraft(`${DRAFT_KEY}:fullName`, e.target.value);
                }}
                placeholder="Jane Smith"
                className="mt-2 w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-brand-primary focus:outline-none pb-2 pt-1 text-sm text-gray-800 transition-colors placeholder:text-gray-300"
              />
            </motion.div>

            {/* Email */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <label className="text-xs text-gray-400 uppercase tracking-[0.14em]">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setDraft(`${DRAFT_KEY}:email`, e.target.value);
                }}
                placeholder="you@company.com"
                className="mt-2 w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-brand-primary focus:outline-none pb-2 pt-1 text-sm text-gray-800 transition-colors placeholder:text-gray-300"
              />
            </motion.div>

            {/* Password */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <label className="text-xs text-gray-400 uppercase tracking-[0.14em]">Password</label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setDraft(`${DRAFT_KEY}:password`, e.target.value);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-brand-primary focus:outline-none pb-2 pt-1 text-sm text-gray-800 transition-colors placeholder:text-gray-300 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-0 bottom-2 text-gray-400 hover:text-brand-primary transition-colors cursor-pointer"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showPassword ? "hide" : "show"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.12 }}
                      className="flex"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </motion.div>

            {/* Confirm Password */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <label className="text-xs text-gray-400 uppercase tracking-[0.14em]">Confirm Password</label>
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-transparent border-0 border-b-2 focus:outline-none pb-2 pt-1 text-sm text-gray-800 transition-colors placeholder:text-gray-300 pr-8 ${
                    passwordMismatch
                      ? "border-red-400 focus:border-red-500"
                      : "border-gray-200 focus:border-brand-primary"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-0 bottom-2 text-gray-400 hover:text-brand-primary transition-colors cursor-pointer"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={showConfirmPassword ? "hide" : "show"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.12 }}
                      className="flex"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
              <AnimatePresence>
                {passwordMismatch && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs text-red-500 mt-1.5"
                  >
                    Passwords do not match
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Invite Code */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <label className="text-xs text-gray-400 uppercase tracking-[0.14em]">Invite Code</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setInviteCode(value);
                  setDraft(`${DRAFT_KEY}:inviteCode`, value);
                }}
                placeholder="XXXX-XXXX"
                className="mt-2 w-full bg-transparent border-0 border-b-2 border-gray-200 focus:border-brand-primary focus:outline-none pb-2 pt-1 text-sm text-gray-800 transition-colors placeholder:text-gray-300 uppercase tracking-widest"
              />
            </motion.div>

            {/* Messages + Submit */}
            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <AnimatePresence mode="wait">
                {message && (
                  <motion.div
                    key="success"
                    variants={shouldReduceMotion ? undefined : scaleInVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4"
                  >
                    {message}
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    key={error}
                    className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4"
                    initial={{ opacity: 0 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, ...shakeAnimation }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={submitting || passwordMismatch}
                className="w-full bg-brand-primary hover-bg-brand-primary text-white rounded-xl py-3.5 text-sm font-bold transition disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                animate={shouldReduceMotion ? {} : submitting ? { scale: [1, 0.97, 1] } : { scale: 1 }}
                transition={submitting && !shouldReduceMotion ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : transitionFast}
              >
                {submitting ? "Submitting…" : "Submit Registration"}
              </motion.button>
            </motion.div>
          </motion.div>
        </form>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="text-sm text-gray-400 mt-8 text-center"
        >
          Already approved?{" "}
          <Link
            to={from !== "/" ? `/login?from=${encodeURIComponent(from)}` : "/login"}
            className="text-brand-accent hover:text-brand-primary font-medium transition-colors"
          >
            Go to login
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
