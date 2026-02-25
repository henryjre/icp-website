import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

interface QRCodeDisplayProps {
  value: string;
  markNumber: string;
  size?: number;
}

const DOWNLOAD_SIZE = 1024;

export function QRCodeDisplay({ value, markNumber, size = 200 }: QRCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `QR_${markNumber}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [markNumber]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Canvas is rendered at DOWNLOAD_SIZE but visually scaled down to `size` via CSS */}
      <div ref={containerRef} className="p-3 bg-white border border-brand-border rounded-xl shadow-sm inline-block" style={{ width: size + 24, height: size + 24 }}>
        <QRCodeCanvas
          value={value}
          size={DOWNLOAD_SIZE}
          level="M"
          fgColor="#041D9D"
          bgColor="#ffffff"
          marginSize={1}
          style={{ width: size, height: size }}
        />
      </div>
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 bg-brand-primary hover-bg-brand-primary text-white py-3 rounded-xl transition text-sm"
        style={{ fontWeight: 600 }}
      >
        <Download className="w-4 h-4" />
        Download QR Code
      </button>
      <p className="text-brand-muted text-xs text-center">Scan to open this element's detail page</p>
    </div>
  );
}
