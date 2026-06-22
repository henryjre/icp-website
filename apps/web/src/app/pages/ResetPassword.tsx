import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { fadeUpVariants, shakeAnimation, transitionFast } from "../lib/animations";

const staggerFields = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
} as const;

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const shouldReduceMotion = useReducedMotion();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This password reset link is invalid or has expired.");
  const [submitting, setSubmitting] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || passwordMismatch) return;
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.resetPassword({ token, password });
      navigate("/login?reset=success", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiClientError && err.status === 400
          ? "This password reset link is invalid or has expired."
          : err instanceof ApiClientError
            ? err.message
            : "Unable to reset your password right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const passwordField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    visible: boolean,
    toggle: () => void,
  ) => (
    <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
      <label htmlFor={id} className="text-xs uppercase tracking-[0.14em] text-gray-400">{label}</label>
      <div className="relative mt-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          className={`w-full border-0 border-b-2 bg-transparent pb-2 pt-1 pr-8 text-sm text-gray-800 transition-colors placeholder:text-gray-300 focus:outline-none ${passwordMismatch && id === "confirm-new-password" ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-brand-primary"}`}
        />
        <button type="button" onClick={toggle} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute right-0 bottom-2 cursor-pointer text-gray-400 transition-colors hover:text-brand-primary">
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-full flex-1 flex-col justify-start px-6 pt-8 pb-6 lg:justify-center lg:px-14 lg:py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        <div className="mb-4 flex flex-col items-center text-center lg:hidden">
          <div id="mobile-auth-icon" className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary shadow-lg">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Choose a new password</h2>
          <p className="text-xs text-gray-500">Use at least eight characters</p>
        </div>

        <motion.div className="mb-10 hidden lg:block" variants={staggerFields} initial="hidden" animate="visible">
          <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Account Recovery</span>
            <h1 className="mt-2 leading-none text-brand-primary" style={{ fontSize: "2.5rem", fontWeight: 800 }}>New password</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">Choose a strong password you haven’t used for this account.</p>
          </motion.div>
        </motion.div>

        <form onSubmit={onSubmit}>
          <motion.div className="space-y-4 lg:space-y-7" variants={staggerFields} initial="hidden" animate="visible">
            {token && passwordField("new-password", "New password", password, setPassword, showPassword, () => setShowPassword((value) => !value))}
            {token && passwordField("confirm-new-password", "Confirm new password", confirmPassword, setConfirmPassword, showConfirmPassword, () => setShowConfirmPassword((value) => !value))}

            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <AnimatePresence>
                {passwordMismatch && <motion.p key="password-mismatch" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mb-3 text-xs text-red-500">Passwords do not match</motion.p>}
                {error && (
                  <motion.div role="alert" key={error} initial={{ opacity: 0 }} animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, ...shakeAnimation }} exit={{ opacity: 0 }} className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {token ? (
                <motion.button type="submit" disabled={submitting || passwordMismatch} className="w-full cursor-pointer rounded-xl bg-brand-primary py-3.5 text-sm font-bold text-white transition hover-bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60" animate={shouldReduceMotion ? {} : submitting ? { scale: [1, 0.97, 1] } : { scale: 1 }} transition={submitting && !shouldReduceMotion ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : transitionFast}>
                  {submitting ? "Resetting…" : "Reset password"}
                </motion.button>
              ) : (
                <Link to="/forgot-password" className="flex w-full items-center justify-center rounded-xl bg-brand-primary py-3.5 text-sm font-bold text-white transition hover-bg-brand-primary">Request a new link</Link>
              )}
            </motion.div>
          </motion.div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Remembered your password? <Link to="/login" className="font-medium text-brand-accent transition-colors hover:text-brand-primary">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
