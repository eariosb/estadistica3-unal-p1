'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/explore/page.tsx  —  Paso 2: Exploración de la serie
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore, type ExploreResult } from '@/lib/timesight-store'
import { apiExplore } from '@/lib/timesight-api'

// ── Tooltip pedagógico ────────────────────────────────────────────────────────

function TooltipIcon({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-stone-200 text-stone-600 text-xs font-bold inline-flex items-center justify-center hover:bg-blue-100 hover:text-blue-700 transition-colors"
        tabIndex={-1}
      >
        i
      </button>
      {show && (
        <div className="absolute left-full top-0 ml-2 w-64 p-2 bg-stone-800 text-white text-xs rounded-lg shadow-xl z-50 leading-relaxed">
          {text}
        </div>
      )}
    </span>
  )
}

// ── Tarjeta de test de hipótesis ──────────────────────────────────────────────

function TestCard({
  name,
  stat,
  pvalue,
  interpretation,
  tooltip,
}: {
  name: string
  stat: number
  pvalue: number
  interpretation: string
  tooltip: string
}) {
  const isRejected = pvalue < 0.05
  return (
    <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-stone-800 text-sm">
          {name}
          <TooltipIcon text={tooltip} />
        </span>
        <span
          className={[
            'text-xs px-2 py-0.5 rounded-full font-medium',
            isRejected ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
          ].join(' ')}
        >
          p = {pvalue.toFixed(4)}
        </span>
      </div>
      <div className="text-xs text-stone-500 mb-1">
        Estadístico: <code className="font-mono">{stat.toFixed(4)}</code>
      </div>
      <div
        className={[
          'text-sm leading-snug',
          isRejected ? 'text-green-700' : 'text-orange-700',
        ].join(' ')}
      >
        {isRejected ? '✅' : '⚠️'} {interpretation}
      </div>
    </div>
  )
}

// ── Gráfico PNG desde base64 ──────────────────────────────────────────────────

function RPlot({
  b64,
  alt,
  caption,
}: {
  b64: string
  alt: string
  caption?: string
}) {
  const [zoom, setZoom] = useState(false)
  return (
    <div>
      <img
        src={`data:image/png;base64,${b64}`}
        alt={alt}
        className="w-full rounded-lg border border-stone-200 cursor-zoom-in shadow-sm"
        style={{ maxHeight: 380, objectFit: 'contain', background: '#fff' }}
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

// ── Barra ACF/PACF SVG ────────────────────────────────────────────────────────

function AcfChart({
  lags,
  values,
  title,
  n,
}: {
  lags: number[]
  values: number[]
  title: string
  n: number
}) {
  const W = 480
  const H = 140
  const pad = { top: 12, right: 12, bottom: 20, left: 36 }
  const ci = 1.96 / Math.sqrt(n)   // intervalo de confianza al 95%

  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const maxAbs = Math.max(Math.abs(Math.min(...values)), Math.max(...values), 0.3)

  const px = (i: number) => pad.left + (i / (lags.length - 1)) * innerW
  const py = (v: number) => pad.top + ((maxAbs - v) / (2 * maxAbs)) * innerH
  const midY = py(0)

  return (
    <div>
      <div className="text-xs font-semibold text-stone-600 mb-1">{title}</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* CI bands */}
        <rect x={pad.left} y={py(ci)} width={innerW} height={py(-ci) - py(ci)}
          fill="#dbeafe" opacity="0.6" />
        {/* Mid line */}
        <line x1={pad.left} y1={midY} x2={W - pad.right} y2={midY}
          stroke="#a8a29e" strokeWidth="0.8" />
        {/* CI lines */}
        <line x1={pad.left} y1={py(ci)} x2={W - pad.right} y2={py(ci)}
          stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="4,3" />
        <line x1={pad.left} y1={py(-ci)} x2={W - pad.right} y2={py(-ci)}
          stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="4,3" />
        {/* Barras */}
        {values.map((v, i) => {
          const x = px(i)
          const significant = Math.abs(v) > ci
          return (
            <rect
              key={i}
              x={x - 2}
              y={v >= 0 ? py(v) : midY}
              width={4}
              height={Math.abs(py(v) - midY)}
              fill={significant ? '#1d4ed8' : '#93c5fd'}
            />
          )
        })}
        {/* Etiqueta CI */}
        <text x={W - pad.right} y={py(ci) - 2} textAnchor="end" fontSize="8" fill="#60a5fa">
          ±1.96/√n
        </text>
        {/* Eje Y labels */}
        {[-0.5, 0, 0.5, 1].map((v) => (
          <text key={v} x={pad.left - 2} y={py(v) + 3} textAnchor="end" fontSize="8" fill="#78716c">
            {v}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Página principal
// ══════════════════════════════════════════════════════════════════════════════

export default function ExplorePage() {
  const router = useRouter()
  const { series, exploreResult, setExploreResult, setLoading, setError, loadingStep, errorMessage } =
    useTimeSightStore()

  const [decompType, setDecompType] = useState<'additive' | 'multiplicative'>('additive')

  useEffect(() => {
    if (exploreResult) setDecompType(exploreResult.decompType as 'additive' | 'multiplicative' ?? 'additive')
  }, [exploreResult])

  if (!series) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">⚠️ Primero debes cargar una serie de tiempo.</p>
        <button
          onClick={() => router.push('/timesight/data')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm"
        >
          ← Ir a Datos
        </button>
      </div>
    )
  }

  const handleExplore = async () => {
    setLoading('explore')
    setError(null)
    try {
      const result = await apiExplore(series)
      setExploreResult(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al explorar la serie')
    } finally {
      setLoading(null)
    }
  }

  const r = exploreResult

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">
          🔍 Paso 2 — Exploración
        </h1>
        <p className="text-stone-500 mt-1">
          Serie activa: <strong className="text-blue-700">{series.name}</strong> — n={series.n},
          freq={series.freq}
        </p>
      </div>

      {/* Botón explorar */}
      {!r && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800 mb-3">
            El análisis exploratorio calculará: descomposición clásica, ACF/PACF, prueba ADF
            (Dickey-Fuller aumentada) y prueba KPSS de estacionariedad.
          </p>
          <button
            onClick={handleExplore}
            disabled={!!loadingStep}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loadingStep === 'explore' ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚙️</span> Analizando…
              </span>
            ) : (
              '▶ Analizar serie'
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Resultados */}
      {r && (
        <div className="space-y-6">

          {/* Botón re-analizar */}
          <div className="flex justify-end">
            <button
              onClick={handleExplore}
              className="text-xs text-blue-600 underline"
            >
              ↺ Re-analizar
            </button>
          </div>

          {/* Estadísticos básicos */}
          <div className="grid grid-cols-4 gap-3">
            {[
              ['n', r.n],
              ['Media', r.mean?.toFixed(2)],
              ['D.E.', r.std?.toFixed(2)],
              ['Rango', `[${r.min?.toFixed(1)}, ${r.max?.toFixed(1)}]`],
            ].map(([label, val]) => (
              <div key={String(label)} className="p-3 bg-white border border-stone-200 rounded-xl text-center shadow-sm">
                <div className="text-xs text-stone-500">{label}</div>
                <div className="text-lg font-bold text-stone-800">{val}</div>
              </div>
            ))}
          </div>

          {/* Gráfico principal + descomposición */}
          {r.plots.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-stone-800">
                Serie de tiempo
              </h2>
              <RPlot
                b64={r.plots[0]}
                alt="Serie de tiempo"
                caption="Haz clic para ampliar"
              />
            </div>
          )}

          {/* Descomposición */}
          {r.decompType !== 'none' && r.plots.length > 1 && (
            <div>
              <h2 className="font-semibold text-stone-800 mb-1">
                Descomposición clásica
                <TooltipIcon text="La descomposición clásica separa la serie en tres componentes: tendencia (movimiento suave de largo plazo), estacionalidad (patrón repetido cada período) y residuo (variación no explicada)." />
              </h2>
              <div className="flex gap-2 mb-3">
                {(['additive', 'multiplicative'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDecompType(t)}
                    className={[
                      'px-3 py-1 rounded-full text-xs border transition-colors',
                      decompType === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-stone-500 border-stone-300 hover:border-blue-400',
                    ].join(' ')}
                  >
                    {t === 'additive' ? 'Aditiva' : 'Multiplicativa'}
                  </button>
                ))}
              </div>
              <RPlot
                b64={r.plots[1]}
                alt="Descomposición"
                caption="Tendencia, estacionalidad y residuos"
              />
            </div>
          )}

          {/* Análisis estacional — season plot + subseries */}
          {r.plots.length > 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-stone-800">
                Análisis del patrón estacional
                <TooltipIcon text="Dos gráficos clave para decidir si la estacionalidad es ADITIVA (amplitud constante → usar dummies directamente) o MULTIPLICATIVA (amplitud crece → usar log + dummies). Son el paso más importante antes de especificar el modelo." />
              </h2>
              <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800 leading-relaxed">
                <strong>Cómo leer estos gráficos:</strong>{' '}
                En el <em>patrón por año</em>, si las líneas de años recientes están mucho más separadas que las antiguas → amplitud creciente → modelo <strong>multiplicativo</strong> (usar log).
                En el <em>subseries</em>, si la línea de cada mes sube con pendiente pronunciada → el nivel promedio de ese mes crece → confirma multiplicativo.
                Si las líneas son paralelas y planas → modelo <strong>aditivo</strong>.
              </div>
              {/* Season plot + boxplot */}
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Season plot — cada año como línea · Boxplot por período
                </p>
                <RPlot
                  b64={r.plots[3]}
                  alt="Season plot y boxplot estacional"
                  caption="Izquierda: cada línea es un año. Amplitud creciente → multiplicativo. Derecha: cajas más altas en verano con rango creciente confirman multiplicativo."
                />
              </div>
              {/* Subseries plot */}
              {r.plots.length > 4 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Subseries — evolución histórica de cada período
                  </p>
                  <RPlot
                    b64={r.plots[4]}
                    alt="Subseries plot"
                    caption="Cada panel = un mes. La línea azul horizontal es el promedio histórico. Si la secuencia de puntos sube → el promedio de ese mes crece con el tiempo."
                  />
                </div>
              )}
            </div>
          )}

          {/* ACF / PACF */}
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">
              ACF y PACF
              <TooltipIcon text="La ACF (función de autocorrelación) mide la correlación de la serie con sus rezagos. La PACF (parcial) controla los rezagos intermedios. Patrones en estas gráficas guían la selección del modelo ARIMA." />
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {r.acfLags.length > 0 && (
                <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                  <AcfChart
                    lags={r.acfLags}
                    values={r.acfValues}
                    title="ACF — Función de Autocorrelación"
                    n={r.n}
                  />
                </div>
              )}
              {r.pacfLags.length > 0 && (
                <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                  <AcfChart
                    lags={r.pacfLags}
                    values={r.pacfValues}
                    title="PACF — Función de Autocorrelación Parcial"
                    n={r.n}
                  />
                </div>
              )}
            </div>
            {/* Plots de R como alternativa */}
            {r.plots.length > 2 && (
              <div className="mt-3">
                <RPlot b64={r.plots[2]} alt="ACF/PACF" />
              </div>
            )}
          </div>

          {/* Tests de estacionariedad */}
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">
              Tests de estacionariedad
              <TooltipIcon text="Una serie es estacionaria si su media, varianza y covarianza no cambian con el tiempo. Esto es importante porque muchos modelos de series de tiempo lo asumen." />
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <TestCard
                name="Test ADF (Dickey-Fuller Aumentado)"
                stat={r.adf.statistic}
                pvalue={r.adf.pvalue}
                interpretation={r.adf.interpretation}
                tooltip="H₀: la serie tiene raíz unitaria (NO es estacionaria). p < 0.05 → rechazamos H₀ → la serie SÍ es estacionaria."
              />
              <TestCard
                name="Test KPSS"
                stat={r.kpss.statistic}
                pvalue={r.kpss.pvalue}
                interpretation={r.kpss.interpretation}
                tooltip="H₀: la serie ES estacionaria. p < 0.05 → rechazamos H₀ → la serie NO es estacionaria. Interpretación contraria al ADF."
              />
            </div>
            <p className="text-xs text-stone-400 mt-2">
              💡 Usa ambos tests juntos: si ADF rechaza H₀ y KPSS no, hay evidencia fuerte de estacionariedad.
            </p>
          </div>

          {/* Navegación */}
          <div className="flex gap-3 pt-4 border-t border-stone-200">
            <button
              onClick={() => router.push('/timesight/transform')}
              className="px-5 py-2 bg-stone-700 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              ⚙️ Transformar →
            </button>
            <button
              onClick={() => router.push('/timesight/model')}
              className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              📐 Ir a Modelar →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
