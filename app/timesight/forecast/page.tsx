'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/forecast/page.tsx  —  Paso 6: Pronóstico
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore, type BiasCorrection, FREQ_LABELS } from '@/lib/timesight-store'
import { apiForecast } from '@/lib/timesight-api'

function RPlot({ b64, alt }: { b64: string; alt: string }) {
  const [zoom, setZoom] = useState(false)
  return (
    <div>
      <img src={`data:image/png;base64,${b64}`} alt={alt}
        className="w-full rounded-lg border border-stone-200 cursor-zoom-in shadow-sm"
        style={{ maxHeight: 360, objectFit: 'contain', background: '#fff' }}
        onClick={() => setZoom(true)} />
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

function TooltipIcon({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1">
      <button onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-stone-200 text-xs font-bold inline-flex items-center justify-center hover:bg-blue-100 hover:text-blue-700"
        tabIndex={-1}>i</button>
      {show && (
        <div className="absolute left-full top-0 ml-2 w-64 p-2 bg-stone-800 text-white text-xs rounded-lg shadow-xl z-50 leading-relaxed">
          {text}
        </div>
      )}
    </span>
  )
}

export default function ForecastPage() {
  const router = useRouter()
  const {
    series, transformedSeries, fittedModel,
    forecastHorizon, confidenceLevel, biasCorrection,
    forecastResult, setForecastHorizon, setConfidenceLevel,
    setBiasCorrection, setForecastResult,
  } = useTimeSightStore()

  const activeSeries = transformedSeries ?? series
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!fittedModel) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">⚠️ Primero ajusta y diagnostica un modelo.</p>
        <button onClick={() => router.push('/timesight/model')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">← Ir a Modelar</button>
      </div>
    )
  }

  const freqLabel = activeSeries ? (FREQ_LABELS[activeSeries.freq] ?? '') : ''

  const handleForecast = async () => {
    if (!activeSeries) return
    setLoading(true); setError(null)
    try {
      const result = await apiForecast(
        activeSeries, fittedModel, forecastHorizon, confidenceLevel, biasCorrection
      )
      setForecastResult(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al pronosticar')
    } finally { setLoading(false) }
  }

  const f = forecastResult

  // Defensive: R named lists come back as objects, not arrays
  const toArr = (v: unknown): number[] =>
    Array.isArray(v) ? v : Object.values(v as Record<string, number>)

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">📈 Paso 6 — Pronóstico</h1>
        <p className="text-stone-500 mt-1">
          Modelo: <strong className="text-blue-700">{fittedModel.name}</strong>
        </p>
      </div>

      {/* Configuración */}
      <div className="p-5 bg-white border border-stone-200 rounded-xl shadow-sm mb-5">
        <h2 className="font-semibold text-stone-800 mb-4">Configuración del pronóstico</h2>
        <div className="grid grid-cols-2 gap-5">
          {/* Horizonte */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Horizonte ({freqLabel.toLowerCase() || 'períodos'})
              <TooltipIcon text="Número de períodos futuros a pronosticar. Más horizonte = mayor incertidumbre." />
            </label>
            <input type="number" min={1} max={60} value={forecastHorizon}
              onChange={(e) => setForecastHorizon(Number(e.target.value))}
              className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Nivel de confianza */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Nivel de confianza
              <TooltipIcon text="Probabilidad de que el valor real caiga dentro del intervalo. 95% es el estándar académico." />
            </label>
            <select value={confidenceLevel}
              onChange={(e) => setConfidenceLevel(Number(e.target.value))}
              className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value={80}>80%</option>
              <option value={90}>90%</option>
              <option value={95}>95%</option>
              <option value={99}>99%</option>
            </select>
          </div>
        </div>

        {/* Corrección de sesgo */}
        {(fittedModel.params?.transformLog || fittedModel.family === 'log') && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-stone-600 mb-2">
              Corrección de sesgo por transformación log
              <TooltipIcon text="Al pronosticar en escala original después de una transformación log, se introduce sesgo. Duan es no paramétrico (recomendado); log-normal asume normalidad de residuos." />
            </label>
            <div className="flex gap-3">
              {([
                ['duan', 'Duan (no paramétrico, recomendado)', '#60a5fa'],
                ['lognormal', 'Log-normal (asume normalidad)', '#a78bfa'],
                ['none', 'Sin corrección', '#a8a29e'],
              ] as [BiasCorrection, string, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setBiasCorrection(id)}
                  className={['px-3 py-1.5 rounded-full text-xs border transition-all',
                    biasCorrection === id ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-stone-300 text-stone-600 hover:border-blue-400'].join(' ')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleForecast} disabled={loading}
          className="mt-5 px-6 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors shadow-sm flex items-center gap-2">
          {loading
            ? <><span className="animate-spin">⚙️</span> Calculando pronóstico…</>
            : '▶ Generar pronóstico'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠️ {error}</div>
      )}

      {/* Resultados */}
      {f && (
        <div className="space-y-5">
          {/* Fan chart de R */}
          {f.plots.length > 0 && (
            <div>
              <h2 className="font-semibold text-stone-800 mb-3">
                Fan chart — Pronóstico con intervalo de {confidenceLevel}%
              </h2>
              <RPlot b64={f.plots[0]} alt="Fan chart del pronóstico" />
            </div>
          )}

          {/* Tabla de valores */}
          <div>
            <h2 className="font-semibold text-stone-800 mb-2">Valores pronosticados</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-stone-100">
                    <th className="border border-stone-200 px-3 py-1.5 text-left text-xs">Período</th>
                    <th className="border border-stone-200 px-3 py-1.5 text-right text-xs">Pronóstico</th>
                    <th className="border border-stone-200 px-3 py-1.5 text-right text-xs">LI {confidenceLevel}%</th>
                    <th className="border border-stone-200 px-3 py-1.5 text-right text-xs">LS {confidenceLevel}%</th>
                  </tr>
                </thead>
                <tbody>
                  {toArr(f.forecast).map((val, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                      <td className="border border-stone-200 px-3 py-1 text-stone-600">t+{i + 1}</td>
                      <td className="border border-stone-200 px-3 py-1 text-right font-semibold text-blue-800">
                        {val.toFixed(3)}
                      </td>
                      <td className="border border-stone-200 px-3 py-1 text-right text-stone-500">
                        {(toArr(f.lower95)[i] ?? null)?.toFixed(3) ?? '—'}
                      </td>
                      <td className="border border-stone-200 px-3 py-1 text-right text-stone-500">
                        {(toArr(f.upper95)[i] ?? null)?.toFixed(3) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Corrección aplicada */}
          {f.smearingFactor !== 1 && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
              🔬 Factor de corrección de Duan aplicado: <strong>{f.smearingFactor.toFixed(4)}</strong>.
              Las predicciones están en escala original, sin sesgo.
            </div>
          )}

          {/* Ir a informe */}
          <div className="pt-4 border-t border-stone-200">
            <button onClick={() => router.push('/timesight/report')}
              className="px-6 py-2.5 bg-stone-700 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors">
              📄 Generar informe →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
