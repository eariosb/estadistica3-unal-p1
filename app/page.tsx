import Link from "next/link";
import { modules } from "@/lib/modules";
import { BookOpen, Code2, TrendingUp, ArrowRight, GraduationCap } from "@/components/Icons";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-12 pb-10 border-b border-stone-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
            Estadística III · 3009137
          </span>
        </div>
        <h1 className="text-4xl font-bold text-stone-900 leading-tight mb-4">
          Modelos de Regresión para{" "}
          <span className="text-blue-600">Series de Tiempo</span>
        </h1>
        <p className="text-xl text-stone-500 font-light leading-relaxed max-w-2xl mb-6">
          Tendencia, Estacionalidad y Ajustes Locales
        </p>
        <p className="text-base text-stone-600 leading-relaxed max-w-2xl mb-8">
          Curso completo basado en las notas de clase de la{" "}
          <strong className="text-stone-800">Profesora Nelfi González</strong>{" "}
          (Universidad Nacional de Colombia), complementado con referencias
          clásicas y código R reproducible para cada ejemplo.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { icon: BookOpen, label: "7 módulos estructurados" },
            { icon: Code2, label: "Código R listo para copiar" },
            { icon: TrendingUp, label: "Ejemplos con datos reales" },
            { icon: GraduationCap, label: "Rigor estadístico didáctico" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-sm text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-full"
            >
              <Icon size={14} className="text-stone-400" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Modules grid */}
      <div className="mb-12">
        <h2 className="text-lg font-bold text-stone-900 mb-5">
          Contenido del curso
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {modules.map((mod) => (
            <Link
              key={mod.id}
              href={`/modulo/${mod.id}`}
              className="group flex items-start gap-4 p-5 rounded-xl border border-stone-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all duration-150"
            >
              {/* Number */}
              <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-blue-600 flex items-center justify-center flex-shrink-0 transition-colors duration-150">
                <span className="text-sm font-bold text-stone-500 group-hover:text-white transition-colors duration-150">
                  {mod.number}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-stone-900 group-hover:text-blue-700 transition-colors text-[15px]">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">{mod.subtitle}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-stone-300 group-hover:text-blue-500 mt-1 flex-shrink-0 transition-colors"
                  />
                </div>
                <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                  {mod.description}
                </p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {mod.topics.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 bg-stone-50 text-stone-500 rounded border border-stone-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* TimeSight CTA */}
      <div className="rounded-xl bg-gradient-to-br from-blue-700 to-indigo-700 p-6 mb-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔭</span>
              <h2 className="text-lg font-bold">TimeSight 2.0 — Asistente de análisis</h2>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed max-w-xl">
              Analiza tu propia serie de tiempo paso a paso: carga datos, explora, transforma,
              modela, diagnostica y pronostica. Con corrección de sesgo (estimador de Duan)
              y gráficos interactivos generados en R.
            </p>
          </div>
          <Link
            href="/timesight"
            className="flex-shrink-0 px-5 py-2.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-md"
          >
            Abrir →
          </Link>
        </div>
      </div>

      {/* About section */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 mb-8">
        <h2 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
          <GraduationCap size={18} className="text-blue-600" />
          Sobre este curso
        </h2>
        <div className="text-sm text-stone-600 leading-relaxed space-y-2">
          <p>
            El análisis de series de tiempo mediante modelos de regresión es
            fundamental en ingeniería, economía y ciencias ambientales. Este
            material te guía desde los conceptos básicos hasta la construcción
            de modelos predictivos que integran <strong>tendencia</strong>,{" "}
            <strong>estacionalidad</strong> y <strong>ajustes locales</strong>.
          </p>
          <p>
            Cada módulo incluye la notación matemática formal, ejemplos
            numéricos y fragmentos de código R que puedes copiar directamente
            para replicar los análisis en tu propio entorno.
          </p>
          <p className="text-stone-500 text-xs pt-2 border-t border-blue-100">
            Fuentes principales: González (2024) Notas Estadística III, UNAL ·
            Hyndman &amp; Athanasopoulos (2021) FPP3 · Peña (2010) · Cleveland
            et al. (1990) STL
          </p>
        </div>
      </div>
    </div>
  );
}
