'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/diagnostics/page.tsx  —  Paso 5: Diagnóstico del modelo
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore } from '@/lib/timesight-store'
import { apiDiagnose } from '@/lib/timesight-api'

function RPlot({ b64, alt, caption }: { b64: string; alt: string; caption?: string }) {
  const [zoom, setZoom] = useState(false)
  return (
    <div>
      <img src={`data:image/png;base64,${b64}`} alt={alt}
        className="w-full rounded-lg border border-stone-200 cursor-zoom-in shadow-sm"
        style={{ maxHeight: 320, objectFit: 'contain', background: '#fff' }}
        onClick={() => setZoom(true)} />
      {caption && <p className="text-xs text-stone-400 mt-1 text-center">{caption}</p>}
      {zoom && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setZoom(false)}>
          <img src={`data:image/png;base64,${b64}`} alt={alt}
            style={{ maxWidth: '90vw', maxHeight: '90vh' }} className="rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}

export default function DiagnosticsPage() {
  const router = useRouter()
  const { series, transformedSeries, fittedModel, diagnostics, setDiagnostics } =
    useTimeSightStore()

  const activeSeries = transformedSeries ?? series
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!fittedModel) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">⚠️ Primero ajusta un modelo.</p>
        <button onClick={() => router.push('/timesight/model')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">← Ir a Modelar</button>
      </div>
    )
  }

  const handleDiagnose = async () => {
    if (!activeSeries) return
    setLoading(true); setError(null)
    try {
      const result = await apiDiagnose(activeSeries, fittedModel)
      setDiagnostics(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error en diagnósticos')
    } finally { setLoading(false) }
  }

  const d = diagnostics

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">🩺 Paso 5 — Diagnósticos</h1>
        <p className="text-stone-500 mt-1">
          Modelo: <strong className="text-blue-700">{fittedModel.name}</strong>
        </p>
      </div>

      {!d && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800 mb-3">
            Se ejecutarán: prueba de normalidad (Shapiro-Wilk), autocorrelación (Ljung-Box),
            heterocedasticidad (Breusch-Pagan) y efecto ARCH.
          </p>
          <button onClick={handleDiagnose} disabled={loading}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors">
            {loading ? <span className="flex gap-2"><span className="animate-spin">⚙️</span> Diagnosticando…</span>
              : '▶ Ejecutar diagnósticos'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠️ {error}</div>
      )}

      {d && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={handleDiagnose} className="text-xs text-blue-600 underline">↺ Re-ejecutar</button>
          </div>

          {/* Resumen general */}
          <div className={['p-4 rounded-xl border-2',
            d.overallOk ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50',
          ].join(' ')}>
            <p className={['font-semibold', d.overallOk ? 'text-green-800' : 'text-orange-800'].join(' ')}>
              {d.overallOk ? '✅ El modelo pasa los diagnósticos principales' : '⚠️ Hay supuestos que no se cumplen'}
            </p>
            <p className="text-sm mt-1 text-stone-600">{d.summary}</p>
          </div>

          {/* Tests individuales */}
          <div className="grid grid-cols-1 gap-3">
            {d.tests.map((t) => (
              <div key={t.name}
                className={['p-4 rounded-xl border shadow-sm bg-white',
                  t.passed ? 'border-green-200' : 'border-orange-200'].join(' ')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-stone-800">{t.name}</span>
                  <span className={['text-xs px-2 py-0.5 rounded-full font-medium',
                    t.passed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'].join(' ')}>
                    p = {t.pvalue.toFixed(4)}
                  </span>
                </div>
                <div className="text-xs text-stone-500 mb-1">
                  Estadístico: <code className="font-mono">{t.statistic.toFixed(4)}</code>
                </div>
                <div className={['text-sm', t.passed ? 'text-green-700' : 'text-orange-700'].join(' ')}>
                  {t.passed ? '✅' : '⚠️'} {t.interpretation}
                </div>
              </div>
            ))}
          </div>

          {/* Gráficos de residuos */}
          {d.plots.length > 0 && (
            <div>
              <h2 className="font-semibold text-stone-800 mb-3">Gráficos de residuos</h2>
              <div className="space-y-3">
                {d.plots.map((p, i) => (
                  <RPlot key={i} b64={p} alt={`Diagnóstico ${i + 1}`}
                    caption={['Residuos vs tiempo', 'Q-Q Normal', 'ACF de residuos'][i] ?? ''} />
                ))}
              </div>
            </div>
          )}

          {/* Navegación */}
          <div className="pt-4 border-t border-stone-200">
            <button onClick={() => router.push('/timesight/forecast')}
              className="px-6 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-sm">
              📈 Ir a Pronóstico →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
