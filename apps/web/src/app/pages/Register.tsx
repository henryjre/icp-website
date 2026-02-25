import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiClient, ApiClientError } from "../lib/api/client";
import { clearDraft, getDraft, setDraft } from "../lib/drafts/store";

const DRAFT_KEY = "form:register";

export function Register() {
  const [params] = useSearchParams();
  const initialCode = useMemo(() => params.get("code") ?? "", [params]);

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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <span className="text-brand-accent text-xs tracking-widest uppercase">Invite Registration</span>
          <h1 className="text-brand-primary mt-2" style={{ fontSize: "2rem", fontWeight: 800 }}>Register</h1>
          <p className="text-gray-500 mt-2 text-sm">Create your account with a valid invite code. Admin approval is required before login.</p>

          <form onSubmit={onSubmit} className="space-y-4 mt-8">
            <div>
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
            </div>
            <div>
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
            </div>
            <div>
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
            </div>
            <div>
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
            </div>

            {message && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{message}</div>}
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-primary hover-bg-brand-primary text-white rounded-xl py-3 text-sm transition disabled:opacity-60"
              style={{ fontWeight: 700 }}
            >
              {submitting ? "Submitting..." : "Submit Registration"}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            Already approved? <Link to="/login" className="text-brand-accent hover:text-brand-primary">Go to login</Link>
          </p>
        </div>
      </div>
    </section>
  );
}




