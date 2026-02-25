const effectiveDate = "February 24, 2026";
const lastUpdated = "February 24, 2026";

type PolicySection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const sections: PolicySection[] = [
  {
    title: "1. Who We Are",
    paragraphs: [
      "ICP-FNET Engineering operates this website and related project information platform. We provide engineering, precast, and infrastructure project information and services.",
      "For privacy-related concerns, you may contact us at inquiry@icpfnetengineering.com.",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "We collect personal and technical information that is necessary to operate the platform, protect accounts, and deliver services.",
    ],
    bullets: [
      "Account and profile information such as full name, email address, role, and account status.",
      "Authentication data including password hashes, access tokens, refresh tokens, and session metadata.",
      "Project and document records, including uploads, metadata, and activity logs tied to authorized users.",
      "Contact form submissions and communications you send to us.",
      "Technical and operational logs (for example request logs, error traces, and security monitoring data).",
    ],
  },
  {
    title: "3. How We Use Information",
    paragraphs: [
      "We use collected information to provide platform features, enforce security and access controls, process project/document workflows, respond to inquiries, and comply with legal obligations.",
      "We also use data to maintain reliability, troubleshoot issues, and improve service quality.",
    ],
  },
  {
    title: "4. Legal Basis and Compliance",
    paragraphs: [
      "Our privacy practices are aligned with the Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules and regulations, as applicable to our operations in the Philippines.",
      "When required, we process personal data based on consent, contractual necessity, legal obligation, or legitimate business interests that do not override your fundamental rights.",
    ],
  },
  {
    title: "5. Sharing and Processors",
    paragraphs: [
      "We may share information only when necessary with trusted service providers that support our operations, such as hosting, storage, email delivery, and infrastructure services.",
      "These providers are required to process data only for authorized purposes and with appropriate safeguards.",
    ],
  },
  {
    title: "6. Data Retention",
    paragraphs: [
      "We retain personal data only for as long as necessary for the purposes described in this policy, to meet contractual or legal requirements, or to resolve disputes and enforce our agreements.",
      "Retention periods may vary by data type, account status, and applicable regulations.",
    ],
  },
  {
    title: "7. Security Measures",
    paragraphs: [
      "We implement technical and organizational safeguards, including role-based access controls, credential protection, and restricted handling of confidential project records.",
      "While we apply reasonable security controls, no method of transmission or storage is completely risk-free.",
    ],
  },
  {
    title: "8. Your Rights Under Philippine Privacy Law",
    paragraphs: [
      "Subject to applicable law, you may request access to your personal data, correction of inaccurate information, and deletion or restriction where appropriate.",
      "You may also raise privacy concerns and complaints with us. We will review and respond in accordance with legal requirements.",
    ],
  },
  {
    title: "9. Children's Privacy",
    paragraphs: [
      "This platform is not intended for children. We do not knowingly collect personal data from children without appropriate legal basis.",
    ],
  },
  {
    title: "10. International Data Transfers",
    paragraphs: [
      "Some service providers may process data outside the Philippines. Where this occurs, we apply reasonable safeguards and contractual protections consistent with applicable law.",
    ],
  },
  {
    title: "11. Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect legal, operational, or service changes. Updated versions will be posted on this page with the latest revision date.",
    ],
  },
  {
    title: "12. Contact Us",
    paragraphs: [
      "For privacy inquiries or requests, contact: inquiry@icpfnetengineering.com",
      "You may also write to us at Andres Bijasa Rd. Brgy. Gaya-Gaya, San Jose del Monte, Bulacan, 3023.",
    ],
  },
];

export function PrivacyPolicy() {
  return (
    <div>
      <section className="bg-brand-primary py-16">
        <div className="max-w-[80rem] mx-auto px-6">
          <span className="text-brand-accent text-sm tracking-widest uppercase">Legal</span>
          <h1 className="text-white mt-2" style={{ fontSize: "2.8rem", fontWeight: 800 }}>
            Privacy Policy
          </h1>
          <p className="text-white/70 mt-3 max-w-3xl">
            This policy explains how ICP-FNET Engineering collects, uses, protects, and manages
            personal data in connection with this website and platform services.
          </p>
        </div>
      </section>

      <section className="py-10 bg-brand-surface">
        <div className="max-w-[80rem] mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-brand-card border border-brand-border rounded-2xl px-6 py-4 text-sm text-brand-muted">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p>
                <span className="text-brand-body" style={{ fontWeight: 700 }}>Effective Date:</span> {effectiveDate}
              </p>
              <p>
                <span className="text-brand-body" style={{ fontWeight: 700 }}>Last Updated:</span> {lastUpdated}
              </p>
            </div>
          </div>

          <article className="max-w-4xl mx-auto mt-6 bg-brand-surface rounded-2xl px-6 py-2">
            {sections.map((section) => (
              <section
                key={section.title}
                className="py-5"
              >
                <h2 className="text-brand-primary" style={{ fontSize: "1.15rem", fontWeight: 800 }}>
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-brand-muted leading-relaxed">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets && (
                  <ul className="mt-3 list-disc pl-5 space-y-2 text-brand-muted leading-relaxed">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>
        </div>
      </section>
    </div>
  );
}
