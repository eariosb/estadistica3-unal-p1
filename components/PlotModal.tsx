"use client";

/**
 * PlotModal — Modal de visualización de gráficos R
 *
 * Características:
 *  • Zoom con rueda del ratón y pinch en touch
 *  • Pan (arrastrar) para navegar
 *  • Botón de reset de zoom
 *  • Descarga directa como PNG
 *  • Navegación entre múltiples gráficos (←→)
 *  • Cierre con ESC o clic fuera
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "@/components/Icons";

interface PlotData {
  type: "png";
  data: string; // base64
}

interface PlotModalProps {
  plots: PlotData[];
  initialIndex?: number;
  onClose: () => void;
}

export function PlotModal({ plots, initialIndex = 0, onClose }: PlotModalProps) {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPlot = plots[currentIdx];

  // ── Teclado ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "+") zoomBy(0.2);
      if (e.key === "-") zoomBy(-0.2);
      if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, scale]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── Navegación ───────────────────────────────────────────────────────────

  const navigate = useCallback(
    (dir: -1 | 1) => {
      setCurrentIdx((prev) => {
        const next = prev + dir;
        if (next < 0 || next >= plots.length) return prev;
        resetZoom();
        return next;
      });
    },
    [plots.length]
  );

  // ── Zoom ─────────────────────────────────────────────────────────────────

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      zoomBy(delta);
    },
    [zoomBy]
  );

  // ── Pan (arrastrar) ──────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    },
    [scale, offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart.current) return;
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.clientY - dragStart.current.y),
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  // ── Descarga ─────────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${currentPlot.data}`;
    link.download = `grafico_R_${currentIdx + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentPlot, currentIdx]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Visualización de gráfico R"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950"
        style={{ width: "min(92vw, 900px)", maxHeight: "92vh" }}
      >
        {/* ── Toolbar superior ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <Maximize2 size={14} className="text-violet-400" />
            <span className="text-sm font-semibold text-slate-200">
              Gráfico {currentIdx + 1}
              {plots.length > 1 && ` de ${plots.length}`}
            </span>
            <span className="text-xs text-slate-500 font-mono ml-2">
              Zoom: {Math.round(scale * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Controles de zoom */}
            <button
              onClick={() => zoomBy(-0.2)}
              title="Reducir zoom (−)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={resetZoom}
              title="Zoom 100% (0)"
              className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors font-mono"
            >
              1:1
            </button>
            <button
              onClick={() => zoomBy(0.2)}
              title="Aumentar zoom (+)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <ZoomIn size={16} />
            </button>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            {/* Descargar */}
            <button
              onClick={handleDownload}
              title="Descargar PNG"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-emerald-300 hover:bg-slate-700 transition-colors"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            {/* Cerrar */}
            <button
              onClick={onClose}
              title="Cerrar (ESC)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Área de imagen ────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden flex items-center justify-center bg-[#0d0d1a] relative"
          style={{ minHeight: 300, cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Navegación izquierda */}
          {plots.length > 1 && currentIdx > 0 && (
            <button
              onClick={() => navigate(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800 bg-opacity-80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Imagen */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${currentPlot.data}`}
            alt={`Gráfico R ${currentIdx + 1}`}
            draggable={false}
            style={{
              transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
              transition: isDragging ? "none" : "transform 0.15s ease",
              maxWidth: "100%",
              maxHeight: "calc(92vh - 120px)",
              objectFit: "contain",
              userSelect: "none",
            }}
          />

          {/* Navegación derecha */}
          {plots.length > 1 && currentIdx < plots.length - 1 && (
            <button
              onClick={() => navigate(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800 bg-opacity-80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {/* Indicador de zoom */}
          {scale > 1 && (
            <div className="absolute bottom-3 right-3 text-xs font-mono text-slate-500 bg-slate-900 bg-opacity-80 px-2 py-1 rounded-md">
              Arrastra para mover
            </div>
          )}
        </div>

        {/* ── Footer: indicadores de página ───────────────────────────── */}
        {plots.length > 1 && (
          <div className="flex items-center justify-center gap-2 bg-slate-900 border-t border-slate-700 px-4 py-2.5 shrink-0">
            {plots.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIdx(i); resetZoom(); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? "bg-violet-400 scale-125"
                    : "bg-slate-600 hover:bg-slate-400"
                }`}
                aria-label={`Ir al gráfico ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* ── Atajos de teclado ────────────────────────────────────────── */}
        <div className="flex items-center gap-4 bg-slate-950 border-t border-slate-800 px-4 py-1.5 shrink-0">
          {[
            ["ESC", "Cerrar"],
            ["+/−", "Zoom"],
            ["0", "Resetear"],
            plots.length > 1 ? ["←→", "Navegar"] : null,
          ]
            .filter((item): item is [string, string] => item !== null)
            .map(([key, label]) => (
              <span key={key} className="text-xs text-slate-600 font-mono">
                <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px]">
                  {key}
                </kbd>{" "}
                {label}
              </span>
            ))}
        </div>
      </div>
    </div>

  );
}
