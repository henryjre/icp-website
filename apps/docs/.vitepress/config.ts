import { defineConfig } from "vitepress";

const base = process.env.DOCS_BASE ?? "/";

export default defineConfig({
  title: "ICP-FNET User Guides",
  description: "Simple tutorials for using the ICP-FNET Engineering platform.",
  base,
  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&display=swap",
      },
    ],
  ],
  lastUpdated: true,
  themeConfig: {
    logo: "/logo-mark.svg",
    siteTitle: "ICP-FNET Guides",
    search: {
      provider: "local",
    },
    nav: [
      { text: "Start Here", link: "/start/what-this-platform-is-for" },
      { text: "Onboarding", link: "/onboarding/register-with-invite-code" },
      { text: "Projects", link: "/projects/view-projects" },
      { text: "Elements", link: "/precast-elements/view-element-details" },
    ],
    sidebar: [
      {
        text: "Start Here",
        items: [
          { text: "What this platform is for", link: "/start/what-this-platform-is-for" },
        ],
      },
      {
        text: "Onboarding",
        items: [
          { text: "Register with an invite code", link: "/onboarding/register-with-invite-code" },
          { text: "Login and reset password", link: "/onboarding/login-and-reset-password" },
          { text: "Admin: approve users", link: "/onboarding/admin-approve-users" },
          { text: "Roles and permissions", link: "/onboarding/roles-and-permissions" },
          { text: "Manage invite codes", link: "/onboarding/manage-invite-codes" },
        ],
      },
      {
        text: "Projects",
        items: [
          { text: "View projects", link: "/projects/view-projects" },
          { text: "Create a project", link: "/projects/create-a-project" },
          { text: "Edit project details", link: "/projects/edit-project-details" },
          { text: "Upload or replace the general plan", link: "/projects/upload-or-replace-general-plan" },
          { text: "Manage project documents", link: "/projects/manage-project-documents" },
        ],
      },
      {
        text: "Precast Elements",
        items: [
          { text: "View element details", link: "/precast-elements/view-element-details" },
          { text: "Create a precast element", link: "/precast-elements/create-precast-element" },
          { text: "Edit a precast element", link: "/precast-elements/edit-precast-element" },
          { text: "Scan or share QR links", link: "/precast-elements/scan-or-share-qr-link" },
          { text: "Upload test results and plans", link: "/precast-elements/upload-test-results-and-plan-documents" },
        ],
      },
      {
        text: "Documents and Plans",
        items: [
          { text: "Confidential documents", link: "/documents/confidential-documents" },
          { text: "Download and preview documents", link: "/documents/download-and-preview-documents" },
        ],
      },
      {
        text: "Account and Access",
        items: [
          { text: "View change history", link: "/activity/view-change-history" },
        ],
      },
    ],
    footer: {
      message: "Client guides for the ICP-FNET Engineering platform.",
      copyright: "ICP-FNET Engineering",
    },
  },
});
