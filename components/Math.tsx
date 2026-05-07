"use client";

// ── Math.tsx — Renderizado de LaTeX via KaTeX CDN (sin npm install) ───────────
// KaTeX se carga desde CDN en layout.tsx (<link> + <script>).
// Este componente llama a window.katex en el cliente; en SSR devuelve el
// código LaTeX entre $ $ para que no falle el build.

import { useEffect, useRef } from "react";

interface MathProps {
  math: string;
  display?: boolean;
}

// Declaración mínima para TypeScript
declare global {
  interface Window {
    katex?: {
      renderToString: (s: string, opts?: object) => string;
    };
  }
}

export function Math({ math, display = false }: MathProps) {
  const ref = useRef<HTMLElement & HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const renderFn = () => {
      if (typeof window !== "undefined" && window.katex) {
        try {
          ref.current!.innerHTML = window.katex.renderToString(math, {
            throwOnError: false,
            displayMode: display,
            strict: false,
          });
        } catch {
          ref.current!.textContent = math;
        }
      }
    };
    // Si katex ya cargó, renderizar inmediatamente; si no, esperar el script
    if (window.katex) {
      renderFn();
    } else {
      const handler = () => renderFn();
      window.addEventListener("katex-loaded", handler, { once: true });
      return () => window.removeEventListener("katex-loaded", handler);
    }
  }, [math, display]);

  // SSR: mostrar el LaTeX crudo entre delimitadores (no falla el build)
  const fallback = display ? `\\[${math}\\]` : `\\(${math}\\)`;

  if (display) {
    return (
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="katex-display-wrapper overflow-x-auto py-1"
        suppressHydrationWarning
      >
        {fallback}
      </div>
    );
  }
  return (
    <span
      ref={ref as React.RefObject<HTMLElement>}
      className="katex-inline"
      suppressHydrationWarning
    >
      {fallback}
    </span>
  );
}

// Shortcuts
export const M = ({ c }: { c: string }) => <Math math={c} />;
export const D = ({ c }: { c: string }) => <Math math={c} display />;
