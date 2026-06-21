import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

export function Toaster() {
  const [topOffset, setTopOffset] = useState(72);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-header]");
    if (!header) return;

    let animationFrame = 0;
    const updateOffset = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const nextOffset = Math.max(8, Math.ceil(header.getBoundingClientRect().bottom) + 8);
        setTopOffset((current) => current === nextOffset ? current : nextOffset);
      });
    };

    const resizeObserver = new ResizeObserver(updateOffset);
    resizeObserver.observe(header);
    window.addEventListener("resize", updateOffset);
    window.addEventListener("scroll", updateOffset, { passive: true });
    window.visualViewport?.addEventListener("scroll", updateOffset);
    window.visualViewport?.addEventListener("resize", updateOffset);
    updateOffset();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateOffset);
      window.removeEventListener("scroll", updateOffset);
      window.visualViewport?.removeEventListener("scroll", updateOffset);
      window.visualViewport?.removeEventListener("resize", updateOffset);
    };
  }, []);

  return (
    <Sonner
      position="top-right"
      offset={{ top: topOffset, right: 24 }}
      mobileOffset={{ top: topOffset, right: 16, left: 16 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !shadow-lg !text-sm !font-medium !gap-3 !px-4 !py-3 !pr-10",
          success: "!bg-green-50 !border-green-200 !text-green-800",
          error: "!bg-red-50 !border-red-200 !text-red-800",
          info: "!bg-blue-50 !border-blue-200 !text-blue-800",
          warning: "!bg-orange-50 !border-orange-200 !text-orange-800",
          icon: "!mt-0",
          closeButton: "!translate-x-0",
        },
      }}
      richColors={false}
      closeButton
    />
  );
}
