const effectiveDate = "February 24, 2026";
const lastUpdated = "February 24, 2026";

type TermsSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const sections: TermsSection[] = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      "By accessing or using this website and platform, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the services.",
    ],
  },
  {
    title: "2. Service Scope",
    paragraphs: [
      "ICP-FNET Engineering provides public website content and authenticated platform features for project, element, and document management.",
      "Certain features are available only to approved users based on role and permissions.",
    ],
  },
  {
    title: "3. Account Registration and Access",
    paragraphs: [
      "Account registration is invite-based and may require administrative approval before activation.",
      "You are responsible for maintaining account confidentiality and for all activity under your credentials.",
    ],
  },
  {
    title: "4. Roles and Permission Boundaries",
    paragraphs: [
      "The platform enforces role-based access controls (for example admin, editor, and client roles). You must not attempt to bypass or abuse authorization controls.",
    ],
    bullets: [
      "Admins may manage users and privileged workflows.",
      "Editors may update allowed project and document records.",
      "Clients have limited access based on approved permissions.",
    ],
  },
  {
    title: "5. Acceptable Use",
    paragraphs: [
      "You agree to use the platform only for lawful business purposes and in a manner that does not harm the service, users, or data integrity.",
    ],
    bullets: [
      "No unauthorized access attempts, scraping, or security testing without written approval.",
      "No upload of unlawful, malicious, infringing, or deceptive content.",
      "No misuse of document confidentiality controls or sharing restricted files without authority.",
    ],
  },
  {
    title: "6. Confidential Documents",
    paragraphs: [
      "Documents marked confidential are restricted and may only be viewed or accessed by users with authorized roles.",
      "You must handle confidential materials in accordance with your role, internal policy, and applicable law.",
    ],
  },
  {
    title: "7. Intellectual Property",
    paragraphs: [
      "All platform design, software, and site content are owned by or licensed to ICP-FNET Engineering unless otherwise stated.",
      "You retain ownership of materials you are authorized to upload, but you grant us the right to store, process, and display such materials as needed to provide services.",
    ],
  },
  {
    title: "8. Service Availability and Changes",
    paragraphs: [
      "We may modify, suspend, or discontinue parts of the service at any time for maintenance, security, operational, or business reasons.",
      "We may update these terms by publishing a revised version on this page.",
    ],
  },
  {
    title: "9. Disclaimer of Warranties",
    paragraphs: [
      "The platform is provided on an \"as available\" and \"as is\" basis. To the extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by law, ICP-FNET Engineering will not be liable for indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or business interruption.",
    ],
  },
  {
    title: "11. Indemnity",
    paragraphs: [
      "You agree to indemnify and hold harmless ICP-FNET Engineering and its personnel from claims, liabilities, damages, and expenses resulting from your misuse of the platform or violation of these terms.",
    ],
  },
  {
    title: "12. Termination or Suspension",
    paragraphs: [
      "We may suspend, restrict, or terminate access to any account that violates these terms, creates security risk, or is required by law or policy.",
    ],
  },
  {
    title: "13. Governing Law and Venue",
    paragraphs: [
      "These terms are governed by the laws of the Republic of the Philippines. Any disputes shall be subject to the appropriate courts or forums in the Philippines, unless otherwise required by law.",
    ],
  },
  {
    title: "14. Contact Details",
    paragraphs: [
      "For questions regarding these Terms and Conditions, contact inquiry@icpfnetengineering.com.",
      "Address: Andres Bijasa Rd. Brgy. Gaya-Gaya, San Jose del Monte, Bulacan, 3023.",
    ],
  },
];

export function TermsAndConditions() {
  return (
    <div>
      <section className="bg-brand-primary py-16">
        <div className="max-w-[80rem] mx-auto px-6">
          <span className="text-brand-accent text-sm tracking-widest uppercase">Legal</span>
          <h1 className="text-white mt-2" style={{ fontSize: "2.8rem", fontWeight: 800 }}>
            Terms and Conditions
          </h1>
          <p className="text-white/70 mt-3 max-w-3xl">
            These terms govern your access to and use of the ICP-FNET Engineering website and
            platform services.
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
