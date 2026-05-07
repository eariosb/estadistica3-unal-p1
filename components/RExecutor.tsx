"use client";

/**
 * RExecutor — Editor interactivo de código R para el mini-curso de Series de Tiempo
 *
 * Características:
 *  • Editor con resaltado de sintaxis usando textarea enriquecida (sin dependencias extra)
 *  • Ctrl+Enter / Cmd+Enter para ejecutar
 *  • Botón "Restaurar código original"
 *  • Panel de salida con colores: resultado, advertencias, errores
 *  • Miniaturas de gráficos con clic para abrir modal
 *  • Historial de las últimas 5 ejecuciones
 *  • Toast de notificaciones integrado
 *  • Spinner durante la ejecución
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  RotateCcw,
  Terminal,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  ZoomIn,
  X,
  Download,
  Copy,
  Check,
} from "@/components/Icons";
import { PlotModal } from "./PlotModal";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface RExecutorProps {
  /** Código R inicial (el del ejemplo de la lección) */
  code: string;
  /** Título del bloque */
  title?: string;
  /** Paquetes que ya están disponibles en el backend (solo informativo) */
  packages?: string[];
  /** Caption opcional */
  caption?: string;
}

interface PlotData {
  type: "png";
  data: string; // base64
}

interface ExecutionResult {
  output: string;
  plots: PlotData[];
  error: string | null;
  warnings: string[];
  timestamp: Date;
}

interface ToastMessage {
  id: string;
  type: "error" | "warning" | "success";
  message: string;
}

// ─── Toast interno ────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}) {
  const colors = {
    error: "bg-red-900 border-red-700 text-red-100",
    warning: "bg-amber-900 border-amber-700 text-amber-100",
    success: "bg-emerald-900 border-emerald-700 text-emerald-100",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 px-4 py-3 rounded-lg border text-sm shadow-xl animate-in slide-in-from-right-4 ${colors[t.type]}`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="opacity-70 hover:opacity-100 shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function RExecutor({ code: originalCode, title, packages, caption }: RExecutorProps) {
  const [currentCode, setCurrentCode] = useState(originalCode);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [history, setHistory] = useState<ExecutionResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null);
  const [modalPlot, setModalPlot] = useState<{ plots: PlotData[]; index: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lineCount, setLineCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sincronizar líneas
  useEffect(() => {
    setLineCount(currentCode.split("\n").length);
  }, [currentCode]);

  // Sincronizar scroll entre números de línea y textarea
  const handleScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // ── Toasts ────────────────────────────────────────────────────────────────

  const addToast = useCallback((type: ToastMessage["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Ejecución ─────────────────────────────────────────────────────────────

  const executeCode = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setSelectedHistoryIdx(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch("/api/r-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: currentCode }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      const newResult: ExecutionResult = {
        output: data.output ?? "",
        plots: data.plots ?? [],
        error: data.error ?? null,
        warnings: data.warnings ?? [],
        timestamp: new Date(),
      };

      setResult(newResult);
      setHistory((prev) => [newResult, ...prev].slice(0, 5));

      if (newResult.error) {
        addToast("error", "El código generó un error. Revisa el panel de salida.");
      } else if (newResult.warnings.length > 0) {
        addToast("warning", `${newResult.warnings.length} advertencia(s) generada(s).`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          addToast("error", "La ejecución tardó demasiado y fue cancelada (>15 s).");
          setResult({
            output: "",
            plots: [],
            error: "Tiempo de ejecución excedido (15 segundos). Simplifica el código o reduce el tamaño de los datos.",
            warnings: [],
            timestamp: new Date(),
          });
        } else {
          addToast("error", `Error de conexión: ${err.message}`);
          setResult({
            output: "",
            plots: [],
            error: `No se pudo conectar con el servidor R: ${err.message}`,
            warnings: [],
            timestamp: new Date(),
          });
        }
      }
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, currentCode, addToast]);

  // ── Atajos de teclado ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        executeCode();
      }
      // Tab → insertar 2 espacios en lugar de cambiar foco
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newCode =
          currentCode.substring(0, start) + "  " + currentCode.substring(end);
        setCurrentCode(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [executeCode, currentCode]
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const handleReset = () => {
    setCurrentCode(originalCode);
    setResult(null);
    setSelectedHistoryIdx(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const displayResult =
    selectedHistoryIdx !== null ? history[selectedHistoryIdx] : result;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="my-6 rounded-xl overflow-hidden border border-slate-600 shadow-xl bg-slate-950">
        {/* ── Barra superior ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
              <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
            </div>
            <Terminal size={13} className="text-slate-400" />
            <span className="text-slate-300 text-xs font-mono font-semibold tracking-wider">
              {title ?? "R — Ejecutar en vivo"}
            </span>
            {packages && packages.length > 0 && (
              <span className="text-slate-500 text-xs font-mono hidden sm:block">
                ({packages.join(", ")})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Copiar */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
            >
              {copied ? (
                <><Check size={12} className="text-green-400" /><span className="text-green-400">Copiado</span></>
              ) : (
                <><Copy size={12} /><span>Copiar</span></>
              )}
            </button>
            {/* Restaurar */}
            <button
              onClick={handleReset}
              disabled={isRunning}
              title="Restaurar código original"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-slate-700 transition-colors disabled:opacity-40"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Restaurar</span>
            </button>
          </div>
        </div>

        {/* ── Editor ─────────────────────────────────────────────────────── */}
        <div className="relative flex bg-[#1e1e2e]" style={{ minHeight: "120px", maxHeight: "420px" }}>
          {/* Números de línea */}
          <div
            ref={lineNumbersRef}
            className="select-none overflow-hidden text-right text-xs font-mono text-slate-600 pt-4 pb-4 pl-3 pr-3 border-r border-slate-700 shrink-0"
            style={{ lineHeight: "1.65", fontSize: "0.8rem", overflowY: "hidden" }}
            aria-hidden
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={currentCode}
            onChange={(e) => setCurrentCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            className="flex-1 resize-none bg-transparent text-slate-100 font-mono text-sm outline-none px-4 py-4 overflow-auto"
            style={{
              lineHeight: "1.65",
              fontSize: "0.825rem",
              tabSize: 2,
              minHeight: "120px",
              maxHeight: "420px",
              caretColor: "#a9b1d6",
            }}
            placeholder="# Escribe o edita tu código R aquí..."
            aria-label="Editor de código R"
          />
        </div>

        {/* ── Barra de acciones ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 border-t border-slate-700">
          <div className="flex items-center gap-3">
            {/* Botón Ejecutar */}
            <button
              onClick={executeCode}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
              {isRunning ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Ejecutando…</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="white" />
                  <span>Ejecutar</span>
                </>
              )}
            </button>
            <span className="text-slate-500 text-xs hidden sm:block">
              {typeof window !== "undefined" && navigator.platform.includes("Mac")
                ? "⌘+Enter"
                : "Ctrl+Enter"}
            </span>
          </div>

          {/* Historial */}
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
            >
              <Clock size={12} />
              <span>Historial ({history.length})</span>
              {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {/* ── Historial de ejecuciones ─────────────────────────────────── */}
        {showHistory && history.length > 0 && (
          <div className="bg-slate-950 border-t border-slate-700 px-4 py-3">
            <p className="text-xs text-slate-500 mb-2 font-mono">Últimas ejecuciones:</p>
            <div className="flex flex-wrap gap-2">
              {history.map((h, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedHistoryIdx(idx === selectedHistoryIdx ? null : idx);
                  }}
                  className={`text-xs font-mono px-2.5 py-1 rounded border transition-colors ${
                    selectedHistoryIdx === idx
                      ? "bg-slate-700 border-slate-500 text-slate-200"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                  }`}
                >
                  {h.error ? "❌" : h.plots.length > 0 ? "📊" : "✅"}{" "}
                  {formatTime(h.timestamp)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Panel de resultados ─────────────────────────────────────────── */}
        {displayResult && (
          <div className="border-t border-slate-700">
            {/* Encabezado del panel */}
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-xs text-slate-500 font-mono">
              <span>
                {selectedHistoryIdx !== null
                  ? `📌 Resultado de ${formatTime(history[selectedHistoryIdx].timestamp)}`
                  : "▶ Resultado"}
              </span>
              {displayResult.plots.length > 0 && (
                <span className="text-violet-400">
                  {displayResult.plots.length} gráfico(s)
                </span>
              )}
            </div>

            {/* Error */}
            {displayResult.error && (
              <div className="flex items-start gap-3 bg-red-950 border-t border-red-900 px-4 py-3">
                <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">Error</p>
                  <pre className="text-red-200 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {displayResult.error}
                  </pre>
                </div>
              </div>
            )}

            {/* Warnings */}
            {displayResult.warnings.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-950 border-t border-amber-900 px-4 py-3">
                <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1">
                    Advertencia{displayResult.warnings.length > 1 ? "s" : ""}
                  </p>
                  {displayResult.warnings.map((w, i) => (
                    <pre key={i} className="text-amber-200 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                      {w}
                    </pre>
                  ))}
                </div>
              </div>
            )}

            {/* Output de consola */}
            {displayResult.output && (
              <div className="bg-[#141420] border-t border-slate-700 px-4 py-3 overflow-x-auto">
                <pre className="text-emerald-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {displayResult.output}
                </pre>
              </div>
            )}

            {/* Sin output ni error */}
            {!displayResult.error &&
              !displayResult.output &&
              displayResult.plots.length === 0 && (
                <div className="bg-[#141420] border-t border-slate-700 px-4 py-3">
                  <p className="text-slate-500 text-xs font-mono italic">
                    El código se ejecutó sin generar salida de consola.
                  </p>
                </div>
              )}

            {/* Gráficos */}
            {displayResult.plots.length > 0 && (
              <div className="bg-slate-900 border-t border-slate-700 px-4 py-4">
                <p className="text-xs text-slate-500 font-mono mb-3">
                  Gráfico{displayResult.plots.length > 1 ? "s" : ""} generado{displayResult.plots.length > 1 ? "s" : ""}
                  {" "}— haz clic para ampliar:
                </p>
                <div className="flex flex-wrap gap-3">
                  {displayResult.plots.map((plot, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        setModalPlot({ plots: displayResult.plots, index: idx })
                      }
                      className="relative group rounded-lg overflow-hidden border border-slate-700 hover:border-violet-500 transition-all shadow-lg"
                      style={{ width: 180, height: 130 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${plot.data}`}
                        alt={`Gráfico ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950 bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                        <ZoomIn
                          size={22}
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <span className="absolute bottom-1 right-1.5 text-xs text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx + 1}/{displayResult.plots.length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        {caption && (
          <div className="bg-slate-900 px-4 py-2 border-t border-slate-700">
            <p className="text-slate-400 text-xs italic">{caption}</p>
          </div>
        )}
      </div>

      {/* ── Modal de gráficos ─────────────────────────────────────────────── */}
      {modalPlot && (
        <PlotModal
          plots={modalPlot.plots}
          initialIndex={modalPlot.index}
          onClose={() => setModalPlot(null)}
        />
      )}

      {/* ── Toasts ───────────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
