import { createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router";
import { Layout } from "./components/Layout";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { Home } from "./pages/Home";
import { AboutUs } from "./pages/AboutUs";
import { ProductOverview } from "./pages/ProductOverview";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { PrecastElementDetail } from "./pages/PrecastElementDetail";

import { ContactUs } from "./pages/ContactUs";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AuthLayout } from "./components/AuthLayout";
import { UsersAdmin } from "./pages/UsersAdmin";
import { CreateProject } from "./pages/CreateProject";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsAndConditions } from "./pages/TermsAndConditions";
import { ApiClientError, apiClient } from "./lib/api/client";

function homeLoader() {
  return { projects: apiClient.listProjects() };
}

function projectsLoader() {
  return { projects: apiClient.listProjects() };
}

function EmptyRoute() {
  return null;
}

async function projectLoader({ params, request }: LoaderFunctionArgs) {
  if (!apiClient.getStoredUser()) {
    const from = new URL(request.url).pathname;
    return redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  const routeParam = params.projectId;
  if (!routeParam) {
    return redirect("/projects");
  }

  const isProjectCode = /^PRJ\d+$/.test(routeParam);

  try {
    if (isProjectCode) {
      const resolved = await apiClient.resolveProjectByCode(routeParam);
      const project = await apiClient.getProject(resolved.projectId);
      return { project };
    }

    const project = await apiClient.getProject(routeParam);
    if (project.projectCode) {
      return redirect(`/projects/${project.projectCode}`);
    }
    return { project };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return { project: null };
    }
    throw error;
  }
}

async function elementLoader({ params, request }: LoaderFunctionArgs) {
  if (!apiClient.getStoredUser()) {
    const from = new URL(request.url).pathname;
    return redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  const projectId = params.projectId;
  const elementId = params.elementId;
  const projectCode = params.projectCode;
  const elementToken = params.elementToken;

  if ((!projectId || !elementId) && (!projectCode || !elementToken)) {
    return redirect("/projects");
  }

  try {
    if (projectCode && elementToken) {
      const resolved = await apiClient.resolveElementByShortLink(projectCode, elementToken);
      return await apiClient.getElement(resolved.projectId, resolved.elementId);
    }
    const element = await apiClient.getElement(projectId!, elementId!);
    if (element.shortToken) {
      const project = await apiClient.getProject(projectId!);
      if (project.projectCode) {
        return redirect(`/projects/${project.projectCode}/e/${element.shortToken}`);
      }
    }
    return element;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function shortElementEntryLoader({ params, request }: LoaderFunctionArgs) {
  if (!apiClient.getStoredUser()) {
    const from = new URL(request.url).pathname;
    return redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  if (!params.elementToken) {
    return redirect("/projects");
  }

  try {
    const resolved = await apiClient.resolveElementToken(params.elementToken);
    return redirect(`/projects/${resolved.projectCode}/e/${resolved.elementToken}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return redirect("/projects");
    }
    throw error;
  }
}

async function guestOnlyLoader() {
  const user = apiClient.getStoredUser();
  if (user) {
    return redirect("/");
  }
  return null;
}

async function adminLoader() {
  const user = await apiClient.me();

  if (!user) {
    return redirect("/login");
  }

  if (user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }

  return null;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, Component: Home, loader: homeLoader },
      { path: "about", Component: AboutUs },
      { path: "products", Component: ProductOverview },
      { path: "projects", Component: Projects, loader: projectsLoader },
      { path: "projects/:projectId", Component: ProjectDetail, loader: projectLoader },
      {
        path: "projects/:projectId/elements/:elementId",
        Component: PrecastElementDetail,
        loader: elementLoader,
      },
      {
        path: "projects/:projectCode/e/:elementToken",
        Component: PrecastElementDetail,
        loader: elementLoader,
      },
      {
        path: "e/:elementToken",
        Component: EmptyRoute,
        loader: shortElementEntryLoader,
      },

      { path: "contact", Component: ContactUs },
      { path: "privacy-policy", Component: PrivacyPolicy },
      { path: "terms-and-conditions", Component: TermsAndConditions },
      {
        Component: AuthLayout,
        children: [
          { path: "login", Component: Login, loader: guestOnlyLoader },
          { path: "register", Component: Register, loader: guestOnlyLoader },
        ],
      },
      { path: "users", Component: UsersAdmin, loader: adminLoader },
      { path: "admin/projects/new", Component: CreateProject, loader: adminLoader },
    ],
  },
]);
