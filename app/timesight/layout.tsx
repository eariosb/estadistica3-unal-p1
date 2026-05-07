'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/layout.tsx  —  Layout del asistente de análisis TimeSight
// ══════════════════════════════════════════════════════════════════════════════

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTimeSightStore, timeSightStore } from '@/lib/timesight-store'

// ── Definición de pasos del wizard ────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    path: '/timesight/data',
    label: 'Datos',
    icon: '📂',
    description: 'Carga o selecciona tu serie de tiempo',
    tooltip: 'Sube un CSV o usa uno de los datasets de ejemplo incluidos en el curso.',
  },
  {
    id: 2,
    path: '/timesight/explore',
    label: 'Explorar',
    icon: '🔍',
    description: 'Descomposición, ACF/PACF y tests',
    tooltip: 'Analiza la estructura de tu serie: tendencia, estacionalidad y estacionariedad.',
  },
  {
    id: 3,
    path: '/timesight/transform',
    label: 'Transformar',
    icon: '⚙️',
    description: 'log, raíz cuadrada, diferencias',
    tooltip: 'Aplica transformaciones para estabilizar varianza o eliminar tendencia.',
  },
  {
    id: 4,
    path: '/timesight/model',
    label: 'Modelar',
    icon: '📐',
    description: 'Regresión determinista o ARIMA',
    tooltip: 'Ajusta un modelo a la serie transformada o directamente a la original.',
  },
  {
    id: 5,
    path: '/timesight/diagnostics',
    label: 'Diagnósticos',
    icon: '🩺',
    description: 'Residuos, normalidad, autocorrelación',
    tooltip: 'Verifica los supuestos del modelo mediante gráficos y pruebas estadísticas.',
  },
  {
    id: 6,
    path: '/timesight/forecast',
    label: 'Pronóstico',
    icon: '📈',
    description: 'Fan chart e intervalos de confianza',
    tooltip: 'Genera pronósticos con corrección de sesgo (estimador de Duan).',
  },
  {
    id: 7,
    path: '/timesight/report',
    label: 'Informe',
    icon: '📄',
    description: 'PDF con todo el análisis',
    tooltip: 'Exporta un informe reproducible con todos los pasos del análisis.',
  },
]

// ── Componente de barra lateral ───────────────────────────────────────────────

function WizardSidebar() {
  const pathname = usePathname()
  const { series, exploreResult, fittedModel, diagnostics, forecastResult } =
    useTimeSightStore()

  // Qué pasos están desbloqueados
  const unlocked = (stepId: number) => {
    if (stepId === 1) return true
    if (stepId === 2) return !!series
    if (stepId === 3) return !!series
    if (stepId === 4) return !!series
    if (stepId === 5) return !!fittedModel
    if (stepId === 6) return !!fittedModel
    if (stepId === 7) return !!forecastResult
    return false
  }

  // Qué pasos están completados
  const completed = (stepId: number) => {
    if (stepId === 1) return !!series
    if (stepId === 2) return !!exploreResult
    if (stepId === 3) return true   // siempre opcional
    if (stepId === 4) return !!fittedModel
    if (stepId === 5) return !!diagnostics
    if (stepId === 6) return !!forecastResult
    if (stepId === 7) return false
    return false
  }

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/')

  return (
    <aside
      style={{ width: 220, minWidth: 220 }}
      className="flex flex-col bg-stone-50 border-r border-stone-200"
    >
      {/* Cabecera */}
      <div className="p-4 border-b border-stone-200 bg-blue-700">
        <div className="flex items-center gap-2 text-white">
          <span className="text-2xl">🔭</span>
          <div>
            <div className="font-bold text-base leading-tight">TimeSight</div>
            <div className="text-xs text-blue-200">Asistente de análisis</div>
          </div>
        </div>
      </div>

      {/* Serie activa */}
      {series && (
        <div className="mx-3 mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
          <div className="font-semibold text-blue-800 truncate">{series.name}</div>
          <div className="text-blue-600">
            n={series.n} · freq={series.freq}
          </div>
        </div>
      )}

      {/* Pasos */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {STEPS.map((step) => {
          const active = isActive(step.path)
          const ok = completed(step.id)
          const canAccess = unlocked(step.id)

          return (
            <div key={step.id} className="relative">
              {/* Línea vertical conectora */}
              {step.id < STEPS.length && (
                <div
                  className="absolute left-7 top-10 bottom-0 w-px"
                  style={{
                    background: ok ? '#1d4ed8' : '#d6d3d1',
                    height: 24,
                    zIndex: 0,
                  }}
                />
              )}

              <Link
                href={canAccess ? step.path : '#'}
                className={[
                  'relative z-10 flex items-start gap-3 mx-2 mb-1 px-3 py-2 rounded-lg transition-all duration-150',
                  active
                    ? 'bg-blue-100 border border-blue-300 text-blue-900'
                    : canAccess
                    ? 'hover:bg-stone-100 text-stone-700 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed text-stone-400',
                ].join(' ')}
                title={step.tooltip}
                onClick={(e) => !canAccess && e.preventDefault()}
              >
                {/* Indicador de estado */}
                <div
                  className={[
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5',
                    ok
                      ? 'bg-blue-700 text-white'
                      : active
                      ? 'bg-blue-200 text-blue-800 border-2 border-blue-500'
                      : 'bg-stone-200 text-stone-500',
                  ].join(' ')}
                >
                  {ok ? '✓' : step.id}
                </div>

                <div className="min-w-0">
                  <div
                    className={[
                      'text-sm font-semibold',
                      active ? 'text-blue-800' : '',
                    ].join(' ')}
                  >
                    {step.icon} {step.label}
                  </div>
                  <div className="text-xs text-stone-500 leading-tight">
                    {step.description}
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-stone-200">
        <button
          onClick={() => timeSightStore.reset()}
          className="w-full text-xs text-stone-500 hover:text-red-600 transition-colors py-1"
          title="Reinicia todo el análisis"
        >
          ↺ Nuevo análisis
        </button>
      </div>
    </aside>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────

export default function TimeSightLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <WizardSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
