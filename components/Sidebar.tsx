"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { modules } from "@/lib/modules";
import { BookOpen, Home, ChevronRight, TrendingUp } from "@/components/Icons";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-stone-100 border-r border-stone-200 flex flex-col z-40 overflow-y-auto">
      {/* Logo / Course title */}
      <div className="px-5 py-5 border-b border-stone-200">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest leading-none">
              Curso
            </p>
            <p className="text-sm font-bold text-stone-900 leading-tight mt-0.5">
              Series de Tiempo
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {/* Home */}
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/"
              ? "bg-blue-600 text-white font-medium"
              : "text-stone-600 hover:bg-stone-200 hover:text-stone-900"
          }`}
        >
          <Home size={15} />
          <span>Inicio del curso</span>
        </Link>

        {/* Separator */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">
            Módulos
          </p>
        </div>

        {/* Modules */}
        {modules.map((mod) => {
          const isActive = pathname === `/modulo/${mod.id}`;
          return (
            <Link
              key={mod.id}
              href={`/modulo/${mod.id}`}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-stone-600 hover:bg-stone-200 hover:text-stone-900"
              }`}
            >
              <span
                className={`text-xs font-bold mt-0.5 flex-shrink-0 w-5 text-center ${
                  isActive ? "text-blue-200" : "text-stone-400 group-hover:text-stone-500"
                }`}
              >
                {mod.number}
              </span>
              <span className="leading-snug font-medium flex-1">{mod.title}</span>
              {isActive && (
                <ChevronRight size={14} className="text-blue-200 mt-0.5 flex-shrink-0" />
              )}
            </Link>
          );
        })}

        {/* Referencias */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">
            Referencias
          </p>
        </div>
        <Link
          href="/referencias"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/referencias"
              ? "bg-blue-600 text-white font-medium"
              : "text-stone-600 hover:bg-stone-200 hover:text-stone-900"
          }`}
        >
          <BookOpen size={15} />
          <span>Bibliografía</span>
        </Link>

        {/* TimeSight */}
        <div className="pt-3 pb-1 px-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">
            Herramienta
          </p>
        </div>
        <Link
          href="/timesight"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname.startsWith("/timesight")
              ? "bg-blue-600 text-white font-medium"
              : "text-stone-600 hover:bg-stone-200 hover:text-stone-900"
          }`}
        >
          <TrendingUp size={15} />
          <span>TimeSight 2.0</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-stone-200">
        <p className="text-[11px] text-stone-400 leading-relaxed">
          Basado en las notas de clase de la{" "}
          <span className="font-medium text-stone-500">
            Prof. Nelfi González
          </span>
          {" "}· UNAL
        </p>
      </div>
    </aside>
  );
}