import type { Variants, Transition } from "motion/react";

export const EASE_STRUCTURAL: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export const transitionBase: Transition = { duration: 0.4, ease: EASE_STRUCTURAL };
export const transitionFast: Transition = { duration: 0.25, ease: EASE_STRUCTURAL };
export const transitionHover: Transition = { duration: 0.2, ease: EASE_STRUCTURAL };
export const transitionSpring = { type: "spring" as const, stiffness: 60, damping: 15 };

export const VIEWPORT = { once: true, margin: "-50px" } as const;
export const STAGGER_CHILDREN = 0.08;

// ─── Page transition ────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_STRUCTURAL } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.20, ease: EASE_STRUCTURAL } },
};

export const instantVariants: Variants = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0, transition: { duration: 0 } },
  exit:    { opacity: 1, y: 0, transition: { duration: 0 } },
};

// ─── Scroll-reveal ──────────────────────────────────────────────────────────

export const fadeUpVariants: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
};

export const fadeInVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: transitionBase },
};

export const imageRevealVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { ...transitionBase, duration: 0.5 } },
};

export const slideFromLeftVariants: Variants = {
  hidden:  { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: transitionBase },
};

export const slideFromRightVariants: Variants = {
  hidden:  { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: transitionBase },
};

// ─── Stagger ────────────────────────────────────────────────────────────────

export const staggerContainerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: STAGGER_CHILDREN, delayChildren: 0.05 } },
};

export const staggerChildVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
};

// ─── Hero (mount-time) ──────────────────────────────────────────────────────

export const heroContainerVariants: Variants = {
  hidden:  {},
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

export const heroItemVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { ...transitionBase, duration: 0.4 } },
};

// ─── Misc ────────────────────────────────────────────────────────────────────

export const scaleInVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { ...transitionBase, duration: 0.3 } },
};

export const ctaButtonVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitionBase },
};

export const shakeAnimation = {
  x: [0, -8, 8, -8, 8, 0] as number[],
  transition: { duration: 0.4, ease: "easeInOut" as const },
};

export const pulseBadgeAnimation = {
  scale: [1, 1.06, 1] as number[],
  transition: { duration: 2, ease: "easeInOut" as const, repeat: Infinity },
};

// ─── Utility: parse stat string for count-up ────────────────────────────────

export function parseStatValue(raw: string): { number: number; suffix: string } | null {
  const match = raw.match(/^([\d,]+)(.*)$/);
  if (!match) return null;
  return { number: parseInt(match[1].replace(/,/g, ""), 10), suffix: match[2] };
}
