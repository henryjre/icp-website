import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { AlertCircle, Camera, CheckCircle2, QrCode, RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Modal } from "./Modal";

type ScannerState = "initializing" | "scanning" | "invalid" | "success" | "error";

interface MobileQrScannerProps {
  open: boolean;
  onClose: () => void;
  onElementPath: (path: string) => void;
  publicSiteOrigin?: string;
}

const ELEMENT_PATHS = [
  /^\/e\/[^/]+\/?$/,
  /^\/projects\/[^/]+\/e\/[^/]+\/?$/,
  /^\/projects\/[^/]+\/elements\/[^/]+\/?$/,
];

function recognizedElementPath(value: string, publicSiteOrigin?: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed, window.location.origin);
    const allowedOrigins = new Set([window.location.origin]);

    if (publicSiteOrigin) {
      try {
        allowedOrigins.add(new URL(publicSiteOrigin).origin);
      } catch {
        // Ignore an invalid optional deployment URL and keep the runtime origin safe.
      }
    }

    if (!allowedOrigins.has(url.origin) || !["http:", "https:"].includes(url.protocol)) return null;
    if (!ELEMENT_PATHS.some((pattern) => pattern.test(url.pathname))) return null;

    return url.pathname.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
}

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access is blocked. Allow camera permission in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return "No usable camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is being used by another app. Close it there, then try again.";
  }
  return "The camera could not start. Check browser permissions and try again.";
}

export function MobileQrScanner({
  open,
  onClose,
  onElementPath,
  publicSiteOrigin,
}: MobileQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledResultRef = useRef(false);
  const [state, setState] = useState<ScannerState>("initializing");
  const [message, setMessage] = useState("Starting rear camera…");
  const [attempt, setAttempt] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    handledResultRef.current = false;
    setState("initializing");
    setMessage("Starting rear camera…");

    const stopCamera = () => {
      controlsRef.current?.stop();
      controlsRef.current = null;

      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const startCamera = async () => {
      if (!window.isSecureContext) {
        setState("error");
        setMessage("Camera scanning needs a secure HTTPS connection.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        setState("error");
        setMessage("Camera scanning is not supported by this browser.");
        return;
      }

      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 120,
          delayBetweenScanSuccess: 600,
        });
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result, _error, activeControls) => {
            if (!result || cancelled || handledResultRef.current) return;

            const path = recognizedElementPath(result.getText(), publicSiteOrigin);
            if (!path) {
              setState("invalid");
              setMessage("This isn’t an ICP element QR code. Keep the code inside the frame.");
              return;
            }

            handledResultRef.current = true;
            setState("success");
            setMessage("Element found. Opening…");
            activeControls.stop();
            window.setTimeout(() => {
              if (!cancelled) onElementPath(path);
            }, 180);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        if (handledResultRef.current) {
          controls.stop();
        } else {
          setState("scanning");
          setMessage("Point the camera at an ICP element QR code.");
        }
      } catch (error) {
        if (cancelled) return;
        stopCamera();
        setState("error");
        setMessage(cameraErrorMessage(error));
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [attempt, onElementPath, open, publicSiteOrigin]);

  const retry = () => setAttempt((value) => value + 1);
  const isError = state === "error";
  const isSuccess = state === "success";
  const isInvalid = state === "invalid";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan element QR"
      titleIcon={<QrCode className="h-4 w-4 text-brand-secondary" />}
      description="View another precase element details by scanning below."
      cancelLabel="Close scanner"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="relative aspect-[4/5] max-h-[58dvh] overflow-hidden rounded-2xl border border-brand-secondary/40 bg-[#080d2d] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            aria-label="Live camera preview"
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_45%,rgba(8,13,45,0.7)_100%)]" />

          {state !== "error" && (
            <>
              <div className="pointer-events-none absolute inset-[14%]">
                <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-xl border-l-[3px] border-t-[3px] border-[#29aae2]" />
                <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-xl border-r-[3px] border-t-[3px] border-[#29aae2]" />
                <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-xl border-b-[3px] border-l-[3px] border-[#29aae2]" />
                <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-xl border-b-[3px] border-r-[3px] border-[#29aae2]" />
              </div>
              <motion.div
                className="pointer-events-none absolute left-[17%] right-[17%] h-px bg-[#29aae2] shadow-[0_0_12px_2px_rgba(41,170,226,0.8)]"
                initial={false}
                animate={shouldReduceMotion ? { top: "50%", opacity: 0.7 } : { top: ["20%", "80%", "20%"], opacity: [0.55, 1, 0.55] }}
                transition={shouldReduceMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}

          {state === "initializing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#080d2d]/75 text-white">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-brand-secondary" />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/75">Starting camera</span>
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                <Camera className="h-6 w-6 text-brand-secondary" />
              </div>
              <p className="text-sm font-semibold">Camera unavailable</p>
              <p className="mt-2 text-xs leading-relaxed text-white/65">{message}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-secondary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#218fbe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d2d]"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/15 bg-[#080d2d]/70 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur-sm">
            Field scanner
          </div>
        </div>

        <div
          aria-live="polite"
          className={`flex min-h-14 items-start gap-3 rounded-xl border px-3.5 py-3 ${
            isSuccess
              ? "border-green-200 bg-green-50 text-green-700"
              : isInvalid || isError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-brand-border bg-[#f5f7fc] text-brand-muted"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : isInvalid || isError ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary" />
          )}
          <p className="text-xs leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
