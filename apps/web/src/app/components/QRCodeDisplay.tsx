import { useRef, useCallback, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

interface QRCodeDisplayProps {
  value: string;
  batch: number | null;
  serialNumber: string | null;
  fallbackName?: string;
  size?: number;
}

const DOWNLOAD_SIZE = 1024;
const DOWNLOAD_LABEL_HEIGHT = 180;

export function QRCodeDisplay({ value, batch, serialNumber, fallbackName = "element", size = 200 }: QRCodeDisplayProps) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const hasIdentity = batch != null && serialNumber != null;
  const identityLabel = hasIdentity
    ? `Batch ${batch} [${serialNumber}]`
    : "Unassigned batch / serial";

  useEffect(() => {
    const qrCanvas = sourceRef.current?.querySelector("canvas");
    const output = compositeCanvasRef.current;
    if (!qrCanvas || !output) return;

    output.width = DOWNLOAD_SIZE;
    output.height = DOWNLOAD_SIZE + DOWNLOAD_LABEL_HEIGHT;
    const context = output.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(qrCanvas, 0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);

    context.fillStyle = "#041D9D";
    context.textAlign = "center";
    context.textBaseline = "middle";
    let fontSize = 72;
    do {
      context.font = `700 ${fontSize}px sans-serif`;
      fontSize -= 2;
    } while (fontSize > 32 && context.measureText(identityLabel).width > DOWNLOAD_SIZE - 96);
    context.fillText(identityLabel, DOWNLOAD_SIZE / 2, DOWNLOAD_SIZE + DOWNLOAD_LABEL_HEIGHT / 2);
  }, [identityLabel, value]);

  const handleDownload = useCallback(() => {
    const output = compositeCanvasRef.current;
    if (!output) return;

    const link = document.createElement("a");
    const safeFallback = fallbackName.replace(/[^a-z0-9_-]+/gi, "_");
    link.download = hasIdentity ? `QR_B${batch}_S${serialNumber}.png` : `QR_${safeFallback}.png`;
    link.href = output.toDataURL("image/png");
    link.click();
  }, [batch, fallbackName, hasIdentity, identityLabel, serialNumber]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Keep the raw QR offscreen and present the labeled composite as one image. */}
      <div ref={sourceRef} className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <QRCodeCanvas
          value={value}
          size={DOWNLOAD_SIZE}
          level="M"
          fgColor="#041D9D"
          bgColor="#ffffff"
          marginSize={1}
        />
      </div>
      <div
        className="inline-block rounded-xl border border-brand-border bg-white p-3 shadow-sm"
        style={{ width: size + 24, height: size + (DOWNLOAD_LABEL_HEIGHT / DOWNLOAD_SIZE) * size + 24 }}
      >
        <canvas
          ref={compositeCanvasRef}
          aria-label={`QR code for ${identityLabel}`}
          className="block"
          style={{
            width: size,
            height: size + (DOWNLOAD_LABEL_HEIGHT / DOWNLOAD_SIZE) * size,
          }}
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
