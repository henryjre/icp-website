import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { EASE_STRUCTURAL } from "../lib/animations";

export type ModalVariant = "default" | "danger";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleIcon?: ReactNode;
  description?: string;
  variant?: ModalVariant;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  loading?: boolean;
  cancelLabel?: string;
  maxWidth?: string;
  children?: ReactNode;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: EASE_STRUCTURAL } },
  exit:   { opacity: 0, transition: { duration: 0.15, ease: EASE_STRUCTURAL } },
};

const dialogVariants = {
  hidden:  { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.2,  ease: EASE_STRUCTURAL } },
  exit:    { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15, ease: EASE_STRUCTURAL } },
};

export function Modal({
  open,
  onClose,
  title,
  titleIcon,
  description,
  variant = "default",
  confirmLabel,
  onConfirm,
  loading = false,
  cancelLabel = "Cancel",
  maxWidth = "max-w-md",
  children,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  const isDanger = variant === "danger";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="modal-panel"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? "modal-description" : undefined}
            className={`relative w-full ${maxWidth} max-h-[92dvh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-4 sm:px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3 ${isDanger ? "bg-red-50/60" : "bg-white"}`}>
              <div className="min-w-0">
                <h2
                  id="modal-title"
                  className={`text-base font-semibold leading-tight flex items-center gap-1.5 ${isDanger ? "text-red-700" : "text-brand-primary"}`}
                >
                  {titleIcon}
                  {isDanger && (
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {title}
                </h2>
                {description && (
                  <p id="modal-description" className="text-sm text-gray-500 mt-1 leading-snug">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                aria-label="Close"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            {children && (
              <div className="px-4 sm:px-6 py-5 text-sm text-gray-700 leading-relaxed">
                {children}
              </div>
            )}

            {/* Footer */}
            {(confirmLabel || cancelLabel) && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex min-h-10 items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {cancelLabel}
                </button>
                {confirmLabel && onConfirm && (
                  <button
                    onClick={() => void onConfirm()}
                    disabled={loading}
                    className={`w-full sm:w-auto inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isDanger
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                    }`}
                  >
                    {loading && (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {confirmLabel}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
