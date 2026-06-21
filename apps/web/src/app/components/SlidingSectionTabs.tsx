import { useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_STRUCTURAL } from "../lib/animations";

export interface SlidingSectionTab<T extends string> {
  key: T;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
}

interface SlidingSectionTabsProps<T extends string> {
  tabs: SlidingSectionTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

type MobileIndicator = {
  x: number;
  y: number;
  width: number;
  height: number;
  underlineX: number;
  underlineWidth: number;
  visible: boolean;
};

const HIDDEN_MOBILE_INDICATOR: MobileIndicator = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  underlineX: 0,
  underlineWidth: 0,
  visible: false,
};

export function SlidingSectionTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: SlidingSectionTabsProps<T>) {
  const shouldReduceMotion = useReducedMotion();
  const mobileTabsRef = useRef<HTMLDivElement | null>(null);
  const mobileTabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const mobileIconRefs = useRef<Partial<Record<T, HTMLSpanElement | null>>>({});
  const desktopTabsRef = useRef<HTMLDivElement | null>(null);
  const desktopTabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const [mobileIndicator, setMobileIndicator] = useState<MobileIndicator>(HIDDEN_MOBILE_INDICATOR);
  const [desktopIndicator, setDesktopIndicator] = useState({ x: 0, width: 0, visible: false });

  useLayoutEffect(() => {
    const tabList = mobileTabsRef.current;
    const activeButton = mobileTabRefs.current[activeTab];
    const activeIcon = mobileIconRefs.current[activeTab];
    if (!tabList || !activeButton || !activeIcon) return;

    let frame = 0;
    const updateIndicator = () => {
      const listRect = tabList.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const iconRect = activeIcon.getBoundingClientRect();
      const next: MobileIndicator = {
        x: iconRect.left - listRect.left,
        y: iconRect.top - listRect.top,
        width: iconRect.width,
        height: iconRect.height,
        underlineX: buttonRect.left - listRect.left + 8,
        underlineWidth: Math.max(0, buttonRect.width - 16),
        visible: iconRect.width > 0,
      };

      setMobileIndicator((current) => (
        current.x === next.x
        && current.y === next.y
        && current.width === next.width
        && current.height === next.height
        && current.underlineX === next.underlineX
        && current.underlineWidth === next.underlineWidth
        && current.visible === next.visible
          ? current
          : next
      ));
    };

    frame = window.requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateIndicator);
    observer?.observe(tabList);
    observer?.observe(activeButton);
    observer?.observe(activeIcon);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateIndicator);
      observer?.disconnect();
    };
  }, [activeTab, tabs.length]);

  useLayoutEffect(() => {
    const tabList = desktopTabsRef.current;
    const activeButton = desktopTabRefs.current[activeTab];
    if (!tabList || !activeButton) return;

    let frame = 0;
    const updateIndicator = () => {
      const width = activeButton.offsetWidth;
      const x = activeButton.offsetLeft;
      setDesktopIndicator((current) => {
        const visible = width > 0;
        return current.x === x && current.width === width && current.visible === visible
          ? current
          : { x, width, visible };
      });
    };

    frame = window.requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateIndicator);
    observer?.observe(tabList);
    observer?.observe(activeButton);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateIndicator);
      observer?.disconnect();
    };
  }, [activeTab, tabs.length]);

  const indicatorTransition = {
    duration: shouldReduceMotion ? 0 : 0.28,
    ease: EASE_STRUCTURAL,
  };

  return (
    <>
      <div
        ref={mobileTabsRef}
        className="relative grid px-2 md:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-lg bg-brand-primary shadow-sm"
          initial={false}
          animate={{
            x: mobileIndicator.x,
            y: mobileIndicator.y,
            width: mobileIndicator.width,
            height: mobileIndicator.height,
            opacity: mobileIndicator.visible ? 1 : 0,
          }}
          transition={indicatorTransition}
        />
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-brand-primary"
          initial={false}
          animate={{
            x: mobileIndicator.underlineX,
            width: mobileIndicator.underlineWidth,
            opacity: mobileIndicator.visible ? 1 : 0,
          }}
          transition={indicatorTransition}
        />

        {tabs.map((tab) => (
          <button
            key={`mobile-${tab.key}`}
            ref={(node) => { mobileTabRefs.current[tab.key] = node; }}
            type="button"
            onClick={() => onTabChange(tab.key)}
            aria-current={activeTab === tab.key ? "page" : undefined}
            aria-label={`Go to ${tab.label}`}
            className={`relative z-10 flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              activeTab === tab.key ? "text-brand-primary" : "text-brand-muted hover:text-brand-primary"
            }`}
          >
            <span
              ref={(node) => { mobileIconRefs.current[tab.key] = node; }}
              className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors duration-75 ${
                activeTab === tab.key
                  ? `text-white ${shouldReduceMotion ? "delay-0" : "delay-[220ms]"}`
                  : "text-brand-muted delay-0"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
            </span>
            <span className="w-full truncate px-0.5 text-center">{tab.mobileLabel}</span>
          </button>
        ))}
      </div>

      <div ref={desktopTabsRef} className="relative hidden items-center justify-center gap-1.5 px-6 py-3 md:flex">
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-0 top-3 rounded-full bg-brand-primary shadow-sm"
          initial={false}
          animate={{
            x: desktopIndicator.x,
            width: desktopIndicator.width,
            opacity: desktopIndicator.visible ? 1 : 0,
          }}
          transition={indicatorTransition}
        />

        {tabs.map((tab) => (
          <button
            key={`desktop-${tab.key}`}
            ref={(node) => { desktopTabRefs.current[tab.key] = node; }}
            type="button"
            onClick={() => onTabChange(tab.key)}
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={`relative z-10 flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-75 cursor-pointer ${
              activeTab === tab.key
                ? `text-white ${shouldReduceMotion ? "delay-0" : "delay-[220ms]"}`
                : "text-brand-muted delay-0 hover:bg-brand-soft hover:text-brand-primary"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
