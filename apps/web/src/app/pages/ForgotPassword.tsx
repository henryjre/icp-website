import { FormEvent, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mail, ArrowLeft } from "lucide-react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { fadeUpVariants, scaleInVariants, shakeAnimation, transitionFast } from "../lib/animations";

const staggerFields = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
} as const;

export function ForgotPassword() {
  const shouldReduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiClient.forgotPassword({ email });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to request a password reset right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col justify-start px-6 pt-8 pb-6 lg:justify-center lg:px-14 lg:py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        <div className="mb-4 flex flex-col items-center text-center lg:hidden">
          <div id="mobile-auth-icon" className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary shadow-lg">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Reset your password</h2>
          <p className="text-xs text-gray-500">We’ll email you a secure reset link</p>
        </div>

        <motion.div className="mb-10 hidden lg:block" variants={staggerFields} initial="hidden" animate="visible">
          <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Account Recovery</span>
            <h1 className="mt-2 leading-none text-brand-primary" style={{ fontSize: "2.5rem", fontWeight: 800 }}>Forgot password?</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">Enter your email and we’ll send a secure link to reset your password.</p>
          </motion.div>
        </motion.div>

        <form onSubmit={onSubmit}>
          <motion.div className="space-y-6 lg:space-y-8" variants={staggerFields} initial="hidden" animate="visible">
            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <label htmlFor="recovery-email" className="text-xs uppercase tracking-[0.14em] text-gray-400">Email address</label>
              <input
                id="recovery-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="mt-2 w-full border-0 border-b-2 border-gray-200 bg-transparent pb-2 pt-1 text-sm text-gray-800 transition-colors placeholder:text-gray-300 focus:border-brand-primary focus:outline-none"
              />
            </motion.div>

            <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
              <AnimatePresence mode="wait">
                {message && (
                  <motion.div role="status" key="success" variants={shouldReduceMotion ? undefined : scaleInVariants} initial="hidden" animate="visible" exit="hidden" className="mb-4 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm leading-relaxed text-green-700">
                    {message}
                  </motion.div>
                )}
                {error && (
                  <motion.div role="alert" key={error} initial={{ opacity: 0 }} animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, ...shakeAnimation }} exit={{ opacity: 0 }} className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={submitting}
                className="w-full cursor-pointer rounded-xl bg-brand-primary py-3.5 text-sm font-bold text-white transition hover-bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                animate={shouldReduceMotion ? {} : submitting ? { scale: [1, 0.97, 1] } : { scale: 1 }}
                transition={submitting && !shouldReduceMotion ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : transitionFast}
              >
                {submitting ? "Sending…" : "Send reset link"}
              </motion.button>
            </motion.div>
          </motion.div>
        </form>

        <Link to="/login" className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-brand-accent transition-colors hover:text-brand-primary">
          <ArrowLeft size={15} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
