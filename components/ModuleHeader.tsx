import { Module } from "@/lib/modules";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import { modules } from "@/lib/modules";

interface ModuleHeaderProps {
  module: Module;
}

export function ModuleHeader({ module }: ModuleHeaderProps) {
  const idx = modules.findIndex((m) => m.id === module.id);
  const prev = idx > 0 ? modules[idx - 1] : null;
  const next = idx < modules.length - 1 ? modules[idx + 1] : null;

  return (
    <div className="mb-8">
      {/* Module number badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
          Módulo {module.number}
        </span>
        <span className="text-stone-300">·</span>
        <span className="text-sm text-stone-500">{module.subtitle}</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-stone-900 leading-tight mb-4">
        {module.title}
      </h1>

      {/* Description */}
      <p className="text-base text-stone-600 leading-relaxed max-w-2xl mb-6">
        {module.description}
      </p>

      {/* Topics pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {module.topics.map((topic) => (
          <span
            key={topic}
            className="text-xs px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full border border-stone-200"
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-stone-200" />

      {/* Prev / Next */}
      <div className="flex items-center justify-between pt-4">
        {prev ? (
          <Link
            href={`/modulo/${prev.id}`}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>
              <span className="text-stone-400 text-xs">Anterior: </span>
              {prev.title}
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/modulo/${next.id}`}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-blue-600 transition-colors"
          >
            <span>
              <span className="text-stone-400 text-xs">Siguiente: </span>
              {next.title}
            </span>
            <ChevronRight size={16} />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>

  );
}
