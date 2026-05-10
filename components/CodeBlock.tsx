"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "@/components/Icons";
import { RExecutor } from "./RExecutor";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  caption?: string;
  executable?: boolean;
  packages?: string[];
}

// ── Resaltado de sintaxis R sin dependencias externas ─────────────────────────
function highlight(code: string, lang: string): string {
  if (!["r", "bash", "shell"].includes(lang.toLowerCase())) {
    return escHtml(code);
  }
  const s = escHtml(code);
  return s
    .replace(/(#[^\n]*)/g, '<span style="color:#6a9955">$1</span>')
    .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span style="color:#ce9178">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>')
    .replace(/\b(function|if|else|for|while|repeat|next|break|return|TRUE|FALSE|NULL|NA|Inf|NaN|library|require|source|in)\b/g,
      '<span style="color:#569cd6">$1</span>')
    .replace(/\b(lm|ts|plot|print|cat|summary|data\.frame|c|list|mean|sd|length|seq|rep|paste|paste0|sprintf|round|abs|log|exp|sqrt|diff|acf|pacf|decompose|forecast|ggplot|aes|geom_line|geom_point|theme)\b(?=\s*\()/g,
      '<span style="color:#dcdcaa">$1</span>')
    .replace(/(&lt;-|=&gt;)/g, '<span style="color:#d4d4d4">$1</span>');
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CodeBlock({
  code,
  language = "r",
  title,
  caption,
  executable = false,
  packages,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (executable && language.toLowerCase() === "r") {
    return <RExecutor code={code} title={title} caption={caption} packages={packages} />;
  }

  const langLabel = language.toUpperCase();
  const lines = code.trim().split("\n");
  const showNumbers = lines.length > 4;

  return (
    <div className="my-5 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-400" />
          <span className="text-slate-300 text-xs font-mono font-medium tracking-wider">
            {title || langLabel}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-700"
        >
          {copied ? (
            <><Check size={13} className="text-green-400" /><span className="text-green-400">Copiado</span></>
          ) : (
            <><Copy size={13} /><span>Copiar</span></>
          )}
        </button>
      </div>

      {/* Código con resaltado */}
      <div style={{ background: "#1e1e2e", overflowX: "auto", padding: "0.75rem 0" }}>
        <pre style={{
          margin: 0,
          fontFamily: "JetBrains Mono, Fira Code, 'Cascadia Code', monospace",
          fontSize: "0.825rem",
          lineHeight: "1.45",
          background: "transparent",
        }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: "flex" }}>
              {showNumbers && (
                <span style={{
                  userSelect: "none",
                  minWidth: "2.8rem",
                  paddingRight: "1rem",
                  paddingLeft: "1rem",
                  color: "#4a4a6a",
                  fontSize: "0.75rem",
                  textAlign: "right",
                  flexShrink: 0,
                  borderRight: "1px solid #2a2a3a",
                  lineHeight: "1.45",
                }}>
                  {i + 1}
                </span>
              )}
              <span
                style={{
                  paddingLeft: "1.25rem",
                  paddingRight: "1.25rem",
                  color: "#d4d4d4",
                  whiteSpace: "pre",
                  flex: 1,
                  lineHeight: "1.45",
                }}
                dangerouslySetInnerHTML={{ __html: highlight(line, language) }}
              />
            </div>
          ))}
        </pre>
      </div>

      {caption && (
        <div className="bg-slate-900 px-4 py-2 border-t border-slate-700">
          <p className="text-slate-300 text-xs italic">{caption}</p>
        </div>
      )}
    </div>
  );
}
