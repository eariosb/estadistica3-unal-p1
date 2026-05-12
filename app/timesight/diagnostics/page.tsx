'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/diagnostics/page.tsx  —  Paso 5: Diagnóstico del modelo
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore } from '@/lib/timesight-store'
import { apiDiagnose } from '@/lib/timesight-api'
import { getExternalTransform } from '@/lib/timesight-api'

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

// ── Panel de contexto de residuales ─────────────────────────────────────────
// Explica la distinción CRUCIAL entre:
//   (a) propiedades de la serie original (relevantes para elegir modelo)
//   (b) propiedades de los residuales del modelo (relevantes para validarlo)

function ResidualsContextPanel({ modelName, extTransform }:
  { modelName: string; extTransform: string }) {

  const [open, setOpen] = useState(false)
  const isDiff = extTransform === 'diff' || extTransform === 'logdiff'

  return (
    <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50">
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-blue-900 rounded-xl">
        <span>🔬 ¿Qué estamos verificando aquí y por qué?</span>
        <span className="text-xs opacity-60">{open ? '▲' : '▼ Ver explicación'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-blue-900 leading-relaxed space-y-3">
          <p>
            Los diagnósticos de este paso verifican los <strong>residuales del modelo estimado</strong>{' '}
            ê_t = Y_t − Ŷ_t, <em>no</em> las propiedades de la serie original.
            Esta distinción es fundamental y a menudo se confunde.
          </p>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-semibold mb-1 text-blue-800">Serie original → ¿qué queremos?</p>
            <ul className="list-disc ml-4 space-y-0.5 text-blue-700">
              <li><strong>Estacionariedad</strong> (o transformación para lograrla) → paso 2 y 3</li>
              <li><strong>Homocedasticidad</strong> (varianza constante) → si no, aplicar log</li>
              <li>Evidencia de tendencia, estacionalidad, autocorrelación → guía el tipo de modelo</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-semibold mb-1 text-blue-800">Residuales del modelo → ¿qué buscamos?</p>
            <p className="mb-1 text-blue-700">
              Si el modelo capturó correctamente toda la estructura de la serie, los residuales
              deben comportarse como <strong>ruido blanco gaussiano</strong>:
            </p>
            <ul className="list-disc ml-4 space-y-0.5 text-blue-700">
              <li><strong>Sin autocorrelación</strong> → prueba Ljung-Box (H₀: sin autocorrelación). Si p &gt; 0.05: el modelo capturó la dependencia temporal. Si no, falta estructura AR/MA.</li>
              <li><strong>Homocedasticidad de residuales</strong> → |ê_t| no debe crecer con el tiempo (test de correlación |residuo| ~ tiempo). Si hay heterocedasticidad residual, considera transformación o modelo GARCH/ARCH.</li>
              <li><strong>Normalidad</strong> → prueba Shapiro-Wilk (H₀: distribución normal). Necesaria para que los IC de pronóstico sean exactos. Violaciones leves son tolerables en muestras grandes.</li>
            </ul>
          </div>

          <div className="bg-blue-100 rounded-lg p-2">
            <p className="font-semibold text-blue-900">Analogía útil:</p>
            <p className="text-blue-800">
              La serie original es el &quot;paciente&quot; — diagnóstico previo al tratamiento.
              Los residuales son el &quot;rastro del error&quot; después del tratamiento (modelo).
              Queremos que ese rastro sea &quot;ruido puro&quot;: sin información aprovechable, sin patrón.
              Si hay patrón en los residuales → el modelo no capturó todo → hay que mejorarlo.
            </p>
          </div>

          {isDiff && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800">
              <strong>Nota:</strong> La serie fue diferenciada externamente. Los residuales están en escala
              de diferencias, al igual que los valores ajustados. Los tests de autocorrelación y
              homocedasticidad siguen siendo válidos en esta escala.
            </div>
          )}

          <p className="text-blue-700 italic">
            Modelo activo: <strong>{modelName}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

// ── Interpretación guiada de cada test ───────────────────────────────────────

function testGuidance(testName: string, passed: boolean): string {
  const name = testName.toLowerCase()
  if (name.includes('shapiro') || name.includes('normalidad')) {
    return passed
      ? 'Los residuos tienen distribución aproximadamente normal. Los intervalos de confianza de pronóstico son confiables.'
      : 'Residuos no normales. Los IC de pronóstico son aproximados. Esto puede deberse a outliers o asimetría residual. En muestras grandes (n > 50), el Teorema Central del Límite modera el impacto.'
  }
  if (name.includes('ljung') || name.includes('autocorrelaci')) {
    return passed
      ? 'Sin autocorrelación residual significativa. El modelo capturó adecuadamente la dependencia temporal de la serie.'
      : 'Autocorrelación residual detectada: el modelo no capturó toda la estructura temporal. Considera aumentar el orden del modelo, añadir términos estacionales, o usar ARIMA.'
  }
  if (name.includes('homocedasticidad') || name.includes('breusch')) {
    return passed
      ? 'Varianza de los residuos constante en el tiempo. El modelo es homocedástico.'
      : 'Heterocedasticidad residual: la varianza del error crece (o decrece) con el tiempo. Soluciones: transformación log, ajuste ponderado (WLS), o modelo ARCH/GARCH para volatilidad variable.'
  }
  return passed ? 'Prueba superada.' : 'Prueba no superada — revisa el modelo.'
}

export default function DiagnosticsPage() {
  const router = useRouter()
  const { series, transformedSeries, transformCode, fittedModel, diagnostics, setDiagnostics } =
    useTimeSightStore()

  const activeSeries = transformedSeries ?? series
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const extTransform = getExternalTransform(transformCode)

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
        <h1 className="text-2xl font-bold text-stone-900">🩺 Paso 5 — Diagnósticos de residuales</h1>
        <p className="text-stone-500 mt-1">
          Modelo: <strong className="text-blue-700">{fittedModel.name}</strong>
        </p>
      </div>

      {/* Panel de contexto educativo — siempre visible */}
      <ResidualsContextPanel modelName={fittedModel.name} extTransform={extTransform} />

      {!d && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800 mb-3">
            Se verificarán tres supuestos clave sobre los <strong>residuales</strong> del modelo:
            normalidad (Shapiro-Wilk), ausencia de autocorrelación (Ljung-Box)
            y homocedasticidad (correlación |ê_t| vs tiempo).
            Estos supuestos validan que el modelo capturó toda la estructura de la serie.
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
                    p = {isFinite(t.pvalue) ? t.pvalue.toFixed(4) : '—'}
                  </span>
                </div>
                <div className="text-xs text-stone-500 mb-1">
                  Estadístico: <code className="font-mono">{isFinite(t.statistic) ? t.statistic.toFixed(4) : '—'}</code>
                </div>
                <div className={['text-sm mb-1', t.passed ? 'text-green-700' : 'text-orange-700'].join(' ')}>
                  {t.passed ? '✅' : '⚠️'} {t.interpretation}
                </div>
                {/* Guía pedagógica adicional */}
                <div className="text-xs text-stone-500 italic leading-snug mt-1 border-t border-stone-100 pt-1">
                  {testGuidance(t.name, t.passed)}
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
