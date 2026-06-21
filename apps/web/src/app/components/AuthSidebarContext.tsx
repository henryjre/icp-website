import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import { useLocation } from "react-router";

export interface AuthSidebarContextType {
  setSidebar: (key: string, node: ReactNode) => void;
}

export const AuthSidebarContext = createContext<AuthSidebarContextType>({
  setSidebar: () => {},
});

export function useAuthSidebar(content: ReactNode, deps: unknown[] = []) {
  const { setSidebar } = useContext(AuthSidebarContext);
  const location = useLocation();
  useLayoutEffect(() => {
    setSidebar(location.pathname, content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, ...deps]);
}
