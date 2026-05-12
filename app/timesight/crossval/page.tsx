'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/crossval/page.tsx  —  Paso 6: Validación Cruzada
//
// Walk-forward (rolling-window) cross-validation para series de tiempo.
// Mide la capacidad predictiva real del modelo con datos no vistos.
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore } from '@/lib/timesight-store'
import { apiCrossVal, getExternalTransform } from '@/lib/timesight-api'
import type { CrossValResult, HorizonMetric } from '@/lib/timesight-store'

// ── Componente de imagen R ────────────────────────────────────────────────────

function RPlot({ b64, alt, caption }: { b64: string; alt: string; caption?: string }) {
  const [zoom, setZoom] = useState(false)
  return (
    <div>
      <img
        src={`data:image/png;base64,${b64}`}
        alt={alt}
        className="w-full rounded-lg border border-stone-200 cursor-zoom-in shadow-sm"
        style={{ maxHeight: 340, objectFit: 'contain', background: '#fff' }}
        onClick={() => setZoom(true)}
      />
      {caption && <p className="text-xs text-stone-400 mt-1 text-center">{caption}</p>}
      {zoom && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setZoom(false)}
        >
          <img
            src={`data:image/png;base64,${b64}`}
            alt={alt}
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
            className="rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}

// ── Panel educativo: qué es y por qué se usa ─────────────────────────────────

function CVConceptPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-blue-900 rounded-xl"
      >
        <span>🎓 ¿Qué es la validación cruzada en series de tiempo?</span>
        <span className="text-xs opacity-60">{open ? '▲' : '▼ Ver explicación'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-blue-900 leading-relaxed space-y-3">
          <p>
            En series de tiempo <strong>no podemos mezclar aleatoriamente</strong> los datos como en
            la validación cruzada clásica — el orden temporal importa. La solución es la
            <strong> validación walk-forward</strong> (también llamada rolling-window o
            out-of-sample evaluation):
          </p>

          <div className="bg-white rounded-lg p-3 border border-blue-100 font-mono text-xs overflow-x-auto">
            <p className="text-blue-700 mb-1">Fold 1: [████████░░░░░░░░]   Entrena → predice ↑</p>
            <p className="text-blue-700 mb-1">Fold 2: [█████████░░░░░░░]   Entrena → predice ↑</p>
            <p className="text-blue-700 mb-1">Fold 3: [██████████░░░░░░]   Entrena → predice ↑</p>
            <p className="text-blue-500 text-xs mt-1">
              ░ = ventana de test (h pasos adelante)   █ = entrenamiento acumulado
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-semibold text-blue-800 mb-1">Métricas que se calculan</p>
            <ul className="list-disc ml-4 space-y-0.5 text-blue-700">
              <li>
                <strong>MAE</strong> (Error Absoluto Medio): promedio de |y_t − ŷ_t|. Fácil de
                interpretar en las unidades de la serie.
              </li>
              <li>
                <strong>RMSE</strong> (Raíz del ECM): penaliza más los errores grandes. Útil cuando
                los errores grandes son costosos.
              </li>
              <li>
                <strong>MAPE</strong> (Error Porcentual Absoluto Medio): expresa el error como
                porcentaje de los valores reales. Comparable entre series de distintas escalas.
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-semibold text-blue-800 mb-1">Por qué las métricas crecen con el horizonte</p>
            <p className="text-blue-700">
              Es natural y esperado que el RMSE y el MAPE aumenten al pronosticar más pasos adelante
              (h=1, h=2, h=3…). La incertidumbre se acumula. Si las métricas son
              <em> relativamente estables</em> entre horizontes, el modelo captura bien la estructura
              temporal. Si se disparan en h=2 o h=3, considera ajustar el modelo o usar un horizonte
              de pronóstico más corto.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800">
            <strong>Importante:</strong> esta validación re-ajusta el modelo en cada fold con los
            mismos hiperparámetros (orden, grado, estacionalidad). Si usas{' '}
            <code>auto.arima()</code>, el orden se re-selecciona automáticamente en cada fold.
            Esto es más honesto pero puede ser lento para series largas.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tabla de métricas por horizonte ──────────────────────────────────────────

function MetricsTable({ metrics }: { metrics: HorizonMetric[] }) {
  const maxRmse = Math.max(...metrics.map((m) => m.rmse ?? 0))
  const maxMape = Math.max(...metrics.map((m) => m.mape ?? 0))

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-100 text-stone-600 text-xs uppercase tracking-wide">
            <th className="px-4 py-2 text-left">Horizonte</th>
            <th className="px-4 py-2 text-right">MAE</th>
            <th className="px-4 py-2 text-right">RMSE</th>
            <th className="px-4 py-2 text-right">MAPE (%)</th>
            <th className="px-4 py-2 text-left">Precisión visual</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const rmseWidth = maxRmse > 0 ? ((m.rmse ?? 0) / maxRmse) * 100 : 0
            const mapeWidth = maxMape > 0 ? ((m.mape ?? 0) / maxMape) * 100 : 0
            const mapeColor =
              (m.mape ?? 0) < 5
                ? '#10b981'
                : (m.mape ?? 0) < 15
                ? '#f59e0b'
                : '#ef4444'

            return (
              <tr
                key={m.h}
                className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}
              >
                <td className="px-4 py-2 font-semibold text-blue-700">
                  h = {m.h}
                </td>
                <td className="px-4 py-2 text-right font-mono text-stone-700">
                  {m.mae != null ? m.mae.toFixed(3) : '—'}
                </td>
                <td className="px-4 py-2 text-right font-mono text-stone-700">
                  {m.rmse != null ? m.rmse.toFixed(3) : '—'}
                </td>
                <td className="px-4 py-2 text-right font-mono"
                  style={{ color: mapeColor, fontWeight: 600 }}>
                  {m.mape != null ? m.mape.toFixed(2) + ' %' : '—'}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${rmseWidth}%`,
                          background: '#3b82f6',
                        }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${mapeWidth}%`,
                          background: mapeColor,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">RMSE · MAPE</div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Tarjeta de métricas globales ──────────────────────────────────────────────

function OverallMetrics({
  overall,
}: {
  overall: CrossValResult['overall']
}) {
  const mapeOk = overall.mape < 10
  const mapeMid = overall.mape >= 10 && overall.mape < 20

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[
        { label: 'MAE global', value: overall.mae.toFixed(3), color: '#3b82f6', note: 'Unidades de la serie' },
        { label: 'RMSE global', value: overall.rmse.toFixed(3), color: '#8b5cf6', note: 'Penaliza errores grandes' },
        {
          label: 'MAPE global',
          value: overall.mape.toFixed(2) + ' %',
          color: mapeOk ? '#10b981' : mapeMid ? '#f59e0b' : '#ef4444',
          note: mapeOk ? '✅ Excelente (< 10%)' : mapeMid ? '⚠️ Aceptable (10–20%)' : '❌ Alto (> 20%)',
        },
      ].map((card) => (
        <div
          key={card.label}
          className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm text-center"
        >
          <div className="text-xs text-stone-500 mb-1">{card.label}</div>
          <div className="text-2xl font-bold" style={{ color: card.color }}>
            {card.value}
          </div>
          <div className="text-xs text-stone-400 mt-1">{card.note}</div>
        </div>
      ))}
    </div>
  )
}

// ── Interpretación guiada de resultados ──────────────────────────────────────

function CVInterpretation({ result }: { result: CrossValResult }) {
  const mape = result.overall.mape
  const metrics = result.horizonMetrics

  const maxMape = Math.max(...metrics.map((m) => m.mape ?? 0))
  const minMape = Math.min(...metrics.map((m) => m.mape ?? 0))
  const degradation = maxMape > 0 ? ((maxMape - minMape) / minMape) * 100 : 0

  const quality =
    mape < 5
      ? { label: 'Excelente', color: 'green', msg: 'El modelo predice con muy alta precisión.' }
      : mape < 10
      ? { label: 'Muy bueno', color: 'green', msg: 'Errores de pronóstico menores al 10%: calidad comercial.' }
      : mape < 20
      ? { label: 'Aceptable', color: 'amber', msg: 'Errores moderados. Útil para planificación general.' }
      : { label: 'Bajo', color: 'red', msg: 'Errores superiores al 20%. Considera mejorar el modelo o el horizonte.' }

  return (
    <div
      className={[
        'p-4 rounded-xl border-2 mb-5',
        quality.color === 'green'
          ? 'border-green-300 bg-green-50'
          : quality.color === 'amber'
          ? 'border-amber-300 bg-amber-50'
          : 'border-red-300 bg-red-50',
      ].join(' ')}
    >
      <p className={[
        'font-semibold text-sm mb-1',
        quality.color === 'green' ? 'text-green-800'
          : quality.color === 'amber' ? 'text-amber-800' : 'text-red-800'
      ].join(' ')}>
        Precisión predictiva: {quality.label}
      </p>
      <p className="text-xs text-stone-600 mb-2">{quality.msg}</p>
      <ul className="text-xs text-stone-600 space-y-0.5 list-disc ml-4">
        <li>
          Se evaluaron <strong>{result.nFolds} folds</strong> con horizonte de{' '}
          <strong>{result.horizon} paso{result.horizon !== 1 ? 's' : ''}</strong>.
        </li>
        <li>
          Ventana inicial de entrenamiento: <strong>{result.initialWindow} observaciones</strong>.
        </li>
        {degradation > 50 && (
          <li>
            El MAPE crece un {degradation.toFixed(0)}% entre h=1 y h={result.horizon}: la
            incertidumbre acumulada es alta — considera pronosticar a <strong>horizontes más cortos</strong>.
          </li>
        )}
        {degradation <= 50 && result.horizon > 1 && (
          <li>
            El MAPE se mantiene relativamente estable entre horizontes (degradación{' '}
            {degradation.toFixed(0)}%): el modelo generaliza bien en el horizonte evaluado.
          </li>
        )}
      </ul>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CrossValPage() {
  const router = useRouter()
  const {
    series,
    transformedSeries,
    transformCode,
    fittedModel,
    crossValResult,
    setCrossValResult,
  } = useTimeSightStore()

  const activeSeries = transformedSeries ?? series
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Opciones configurables
  const defaultHorizon = fittedModel ? Math.min((activeSeries?.freq ?? 12), 12) : 12
  const [horizon, setHorizon] = useState(defaultHorizon)
  const [initialFrac, setInitialFrac] = useState(0.7)
  const [maxFolds, setMaxFolds] = useState(20)

  if (!fittedModel) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">⚠️ Primero ajusta un modelo en el paso anterior.</p>
        <button
          onClick={() => router.push('/timesight/model')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm"
        >
          ← Ir a Modelar
        </button>
      </div>
    )
  }

  const handleCrossVal = async () => {
    if (!activeSeries) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiCrossVal(
        activeSeries,
        fittedModel,
        horizon,
        transformCode,
        initialFrac,
        maxFolds
      )
      setCrossValResult(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error en la validación cruzada')
    } finally {
      setLoading(false)
    }
  }

  const cv = crossValResult

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">
          🎯 Paso 6 — Validación cruzada
        </h1>
        <p className="text-stone-500 mt-1">
          Modelo:{' '}
          <strong className="text-blue-700">{fittedModel.name}</strong>
        </p>
      </div>

      {/* Panel conceptual */}
      <CVConceptPanel />

      {/* Configuración */}
      {!cv && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-800 mb-3">
            ⚙️ Configuración de la validación
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Horizonte */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Horizonte de pronóstico (h)
              </label>
              <input
                type="number"
                min={1}
                max={activeSeries?.freq ?? 24}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white"
              />
              <p className="text-xs text-stone-400 mt-0.5">
                Máx. recomendado: {activeSeries?.freq ?? 12} (una temporada)
              </p>
            </div>

            {/* Fracción inicial */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Fracción inicial de entrenamiento
              </label>
              <select
                value={initialFrac}
                onChange={(e) => setInitialFrac(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white"
              >
                <option value={0.5}>50 % de los datos</option>
                <option value={0.6}>60 % de los datos</option>
                <option value={0.7}>70 % de los datos</option>
                <option value={0.8}>80 % de los datos</option>
              </select>
              <p className="text-xs text-stone-400 mt-0.5">
                Tamaño de la primera ventana
              </p>
            </div>

            {/* Max folds */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Máximo de folds
              </label>
              <select
                value={maxFolds}
                onChange={(e) => setMaxFolds(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white"
              >
                <option value={10}>10 folds (rápido)</option>
                <option value={20}>20 folds (recomendado)</option>
                <option value={30}>30 folds (lento)</option>
              </select>
              <p className="text-xs text-stone-400 mt-0.5">
                Más folds = estimación más estable
              </p>
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-3 text-xs text-stone-600 mb-4 border border-blue-100">
            Con la configuración actual se evaluará el modelo re-ajustando hasta{' '}
            <strong>{maxFolds} veces</strong>, cada vez pronosticando{' '}
            <strong>{horizon} paso{horizon !== 1 ? 's' : ''}</strong> adelante.
            Ventana inicial: aprox.{' '}
            <strong>
              {activeSeries
                ? Math.round((activeSeries.n) * initialFrac)
                : '—'}{' '}
              observaciones
            </strong>{' '}
            (≈ {(initialFrac * 100).toFixed(0)}% de n = {activeSeries?.n ?? '—'}).
          </div>

          <button
            onClick={handleCrossVal}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <span className="flex gap-2 items-center">
                <span className="animate-spin inline-block">⚙️</span>
                Validando modelo… (puede tardar unos segundos)
              </span>
            ) : (
              '▶ Ejecutar validación cruzada'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {cv && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setCrossValResult(null)
                setHorizon(defaultHorizon)
              }}
              className="text-xs text-blue-600 underline"
            >
              ↺ Re-configurar y re-ejecutar
            </button>
          </div>

          {/* Métricas globales */}
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">
              Métricas globales de pronóstico out-of-sample
            </h2>
            <OverallMetrics overall={cv.overall} />
          </div>

          {/* Interpretación automática */}
          <CVInterpretation result={cv} />

          {/* Tabla por horizonte */}
          <div>
            <h2 className="font-semibold text-stone-800 mb-2">
              Métricas por horizonte de pronóstico
            </h2>
            <p className="text-xs text-stone-500 mb-3">
              Cada fila muestra el error promedio cuando se pronostica exactamente{' '}
              <em>h</em> pasos adelante a lo largo de todos los folds de CV.
            </p>
            <MetricsTable metrics={cv.horizonMetrics} />
          </div>

          {/* Gráficos */}
          {cv.plots.length > 0 && (
            <div>
              <h2 className="font-semibold text-stone-800 mb-3">
                Gráficos de validación
              </h2>
              <div className="space-y-4">
                {cv.plots[0] && (
                  <RPlot
                    b64={cv.plots[0]}
                    alt="Métricas por horizonte"
                    caption="RMSE y MAPE por horizonte de pronóstico — barras más cortas indican mejor predicción"
                  />
                )}
                {cv.plots[1] && (
                  <RPlot
                    b64={cv.plots[1]}
                    alt="Verificación último fold"
                    caption="Último fold de CV: historia (gris), valores reales de test (gris punteado) vs pronóstico (rojo)"
                  />
                )}
              </div>
            </div>
          )}

          {/* Info técnica */}
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-500">
            <strong>Detalles técnicos:</strong> {cv.nFolds} folds ejecutados · ventana inicial{' '}
            {cv.initialWindow} obs · horizonte {cv.horizon} pasos · modelo {fittedModel.name}.
          </div>

          {/* Navegación */}
          <div className="pt-4 border-t border-stone-200 flex gap-3">
            <button
              onClick={() => router.push('/timesight/forecast')}
              className="px-6 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-sm"
            >
              📈 Ir a Pronóstico →
            </button>
            <button
              onClick={() => router.push('/timesight/diagnostics')}
              className="px-4 py-2 text-stone-600 border border-stone-300 rounded-lg text-sm hover:bg-stone-50"
            >
              ← Volver a Diagnósticos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
