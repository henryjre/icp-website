import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";
import {
  fadeUpVariants,
  scaleInVariants,
  shakeAnimation,
  transitionBase,
  transitionFast,
} from "../lib/animations";

const DRAFT_KEY = "form:register";

const staggerFields = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
} as const;

const cardStyle = { willChange: "opacity, transform" } as const;

export function Register() {
  const [params] = useSearchParams();
  const initialCode = useMemo(() => params.get("code") ?? "", [params]);
  const shouldReduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState(() => getDraft(`${DRAFT_KEY}:fullName`, ""));
  const [email, setEmail] = useState(() => getDraft(`${DRAFT_KEY}:email`, ""));
  const [password, setPassword] = useState(() => getDraft(`${DRAFT_KEY}:password`, ""));
  const [inviteCode, setInviteCode] = useState(() => getDraft(`${DRAFT_KEY}:inviteCode`, initialCode));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiClient.register({ fullName, email, password, inviteCode });
      setMessage(response.message);
      setFullName("");
      setEmail("");
      setPassword("");
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
    <section className="bg-gray-50 py-20 min-h-[calc(100vh-180px)]">
      <div className="max-w-[36rem] mx-auto px-6">
        <motion.div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitionBase}
          style={cardStyle}
        >
          <span className="text-brand-accent text-xs tracking-widest uppercase">Invite Registration</span>
          <h1 className="text-brand-primary mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>Register</h1>
          <p className="text-gray-500 mt-2 text-sm">Create your account with a valid invite code. Admin approval is required before login.</p>

          <form onSubmit={onSubmit} className="mt-8">
            <motion.div
              className="space-y-4"
              variants={staggerFields}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setDraft(`${DRAFT_KEY}:fullName`, e.target.value);
                  }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary"
                />
              </motion.div>

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
                <label className="text-xs text-gray-500 uppercase tracking-wider">Invite Code</label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setInviteCode(value);
                    setDraft(`${DRAFT_KEY}:inviteCode`, value);
                  }}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary uppercase"
                />
              </motion.div>

              <motion.div variants={shouldReduceMotion ? undefined : fadeUpVariants}>
                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      key="success"
                      variants={shouldReduceMotion ? undefined : scaleInVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3"
                    >
                      {message}
                    </motion.div>
                  )}
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
                  {submitting ? "Submitting..." : "Submit Registration"}
                </motion.button>
              </motion.div>
            </motion.div>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            Already approved? <Link to="/login" className="text-brand-accent hover:text-brand-primary">Go to login</Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
