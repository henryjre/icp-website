import { Fragment } from "react";
import { NavLink } from "react-router";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  /** Omit on the current (last) page. */
  href?: string;
};

type PageBreadcrumbProps = {
  items: BreadcrumbItem[];
  /** "light" for dark backgrounds (hero), "dark" for white surfaces. */
  variant?: "light" | "dark";
  className?: string;
};

const styles = {
  light: {
    link: "text-white/75 hover:text-white",
    current: "text-white",
    separator: "text-white/40",
  },
  dark: {
    link: "text-brand-muted hover:text-brand-primary",
    current: "text-brand-primary",
    separator: "text-brand-muted/60",
  },
} as const;

/**
 * Shared page breadcrumb. The root and current page stay whole; the only crumb
 * that ever truncates is an intermediate ancestor (e.g. a long project name),
 * which absorbs all the tight space. When the trail has no ancestor (root +
 * current only), the current page itself truncates instead. Current is bold.
 */
export function PageBreadcrumb({ items, variant = "dark", className = "" }: PageBreadcrumbProps) {
  const s = styles[variant];
  const hasAncestor = items.length > 2;

  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const isFirst = i === 0;
        // Make exactly the shrinkable crumb(s) the *only* ones that can give up
        // width, so flexbox routes 100% of the overflow there — never the leaf,
        // unless the leaf is all we have to shrink.
        const canShrink = isFirst ? false : isLast ? !hasAncestor : true;
        const fit = canShrink ? "min-w-0 truncate" : "shrink-0 whitespace-nowrap";

        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${s.separator}`} aria-hidden="true" />
            )}
            {isLast || !item.href ? (
              <span
                className={`${fit} font-semibold ${s.current}`}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            ) : (
              <NavLink to={item.href} className={`${fit} ${s.link} transition-colors`}>
                {item.label}
              </NavLink>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
