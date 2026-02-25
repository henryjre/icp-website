import { isRouteErrorResponse, useRouteError, NavLink } from "react-router";

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-brand-primary" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              Resource Not Found
            </h2>
            <p className="text-gray-500 mt-2">The requested resource could not be found.</p>
            <NavLink to="/projects" className="text-brand-secondary mt-4 inline-block">Back to Projects</NavLink>
          </div>
        </div>
      );
    }

    if (error.status === 403) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-brand-primary" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              Access Forbidden
            </h2>
            <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-brand-primary" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Request Failed ({error.status})
          </h2>
          <p className="text-gray-500 mt-2">{error.statusText || "Please try again."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center px-6">
        <h2 className="text-brand-primary" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          Something went wrong
        </h2>
        <p className="text-gray-500 mt-2">Please refresh and try again.</p>
      </div>
    </div>
  );
}




