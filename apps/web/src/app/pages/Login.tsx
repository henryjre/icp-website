import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import {
  fadeUpVariants,
  shakeAnimation,
  transitionBase,
  transitionFast,
} from "../lib/animations";

const DRAFT_KEY = "form:login";

const staggerFields = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
} as const;

const cardStyle = { willChange: "opacity, transform" } as const;

export function Login() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [email, setEmail] = useState(() => getDraft(`${DRAFT_KEY}:email`, ""));
  const [password, setPassword] = useState(() => getDraft(`${DRAFT_KEY}:password`, ""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const session = await apiClient.login(email, password);
      clearDraft(`${DRAFT_KEY}:email`);
      clearDraft(`${DRAFT_KEY}:password`);
      if (session.user.role === "admin") {
        navigate("/users");
        return;
      }
      navigate("/projects");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Unable to login right now.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-gray-50 py-20 min-h-[calc(100vh-180px)]">
      <div className="max-w-[32rem] mx-auto px-6">
        <motion.div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitionBase}
          style={cardStyle}
        >
          <span className="text-brand-accent text-xs tracking-widest uppercase">Account Access</span>
          <h1 className="text-brand-primary mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>Login</h1>
          <p className="text-gray-500 mt-2 text-sm">Use your approved account credentials to continue.</p>

          <form onSubmit={onSubmit} className="mt-8">
            <motion.div
              className="space-y-4"
              variants={staggerFields}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setDraft(`${DRAFT_KEY}:email`, e.target.value);
                  }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary"
                />
              </motion.div>

              <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setDraft(`${DRAFT_KEY}:password`, e.target.value);
                  }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary"
                />
              </motion.div>

              <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key={error}
                      className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3"
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
                  disabled={submitting}
                  className="w-full bg-brand-primary hover-bg-brand-primary text-white rounded-xl py-3 text-sm transition disabled:opacity-60"
                  style={{ fontWeight: 700 }}
                  animate={
                    shouldReduceMotion
                      ? {}
                      : submitting
                        ? { scale: [1, 0.97, 1] }
                        : { scale: 1 }
                  }
                  transition={
                    submitting && !shouldReduceMotion
                      ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
                      : transitionFast
                  }
                >
                  {submitting ? "Logging In..." : "Login"}
                </motion.button>
              </motion.div>
            </motion.div>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            Have an invite code? <Link to="/register" className="text-brand-accent hover:text-brand-primary">Register here</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
