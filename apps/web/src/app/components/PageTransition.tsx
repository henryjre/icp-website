import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

interface PageTransitionProps { children: React.ReactNode; }

export function PageTransition({ children }: PageTransitionProps) {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname, search, navigationType]);

  return <>{children}</>;
}
