'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/explore/page.tsx  —  Paso 2: Exploración de la serie
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore, type ExploreResult } from '@/lib/timesight-store'
import { apiExplore } from '@/lib/timesight-api'
import TooltipIcon from '@/components/TooltipIcon'

// ── Panel expandible genérico ─────────────────────────────────────────────────

function ExpandPanel({ title, children, defaultOpen = false, accent = 'blue' }:
  { title: string; children: React.ReactNode; defaultOpen?: boolean; accent?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 border-blue-200 text-blue-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    amber:  'bg-amber-50 border-amber-200 text-amber-900',
    teal:   'bg-teal-50 border-teal-200 text-teal-900',
  }
  const cls = colors[accent] ?? colors.blue
  return (
    <div className={`rounded-xl border ${cls.split(' ')[1]} ${cls.split(' ')[0]} mb-1`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 flex items-center justify-between text-sm font-semibold ${cls.split(' ')[2]} rounded-xl`}
      >
        <span>{title}</span>
        <span className="text-xs opacity-60">{open ? '▲ Cerrar' : '▼ Ver más'}</span>
      </button>
      {open && <div className="px-4 pb-4 text-xs leading-relaxed">{children}</div>}
    </div>
  )
}

// ── Glosario de términos clave ────────────────────────────────────────────────

function GlossaryPanel() {
  return (
    <ExpandPanel title="📖 Glosario de términos clave" accent="teal">
      <div className="space-y-2 mt-1 text-teal-900">
        <div>
          <strong>Estacionariedad (débil o en covarianza):</strong>{' '}
          Una serie {'{Y_t}'} es estacionaria si cumple simultáneamente:
          <ol className="list-decimal ml-4 mt-1 space-y-0.5">
            <li><em>Media constante:</em> E[Y_t] = μ para todo t (sin tendencia en nivel).</li>
            <li><em>Varianza constante (homocedasticidad):</em> Var(Y_t) = σ² &lt; ∞ para todo t (sin que la variabilidad crezca o decreca con el tiempo).</li>
            <li><em>Autocovarianza solo depende del rezago:</em> Cov(Y_t, Y_{'{'}t+k{'}'}) = γ(k) — no cambia con t.</li>
          </ol>
          <p className="mt-1 text-teal-800 italic">Implicación práctica: si la serie no es estacionaria, modelos como ARMA producen inferencias inválidas (regresiones espurias). Muchas transformaciones y diferenciaciones buscan lograr estacionariedad.</p>
        </div>
        <div>
          <strong>Homocedasticidad:</strong>{' '}
          Varianza constante a lo largo del tiempo. Su contrario es la <em>heterocedasticidad</em>: la amplitud de las fluctuaciones crece con el nivel de la serie (frecuente en datos financieros y económicos multiplicativos). La transformación logarítmica es el remedio estándar.
        </div>
        <div>
          <strong>Autocorrelación:</strong>{' '}
          Correlación de la serie consigo misma en diferentes momentos del tiempo. Una serie puede ser estacionaria <em>y</em> estar autocorrelacionada — de hecho, eso es lo que modela ARMA. La ACF y PACF cuantifican esta estructura.
        </div>
        <div>
          <strong>Raíz unitaria:</strong>{' '}
          Característica de series no estacionarias donde los shocks tienen efecto permanente (p.ej. una caminata aleatoria Y_t = Y_{'{t-1}'} + ε_t). Una raíz unitaria implica que la serie «recuerda» todos sus valores pasados indefinidamente.
        </div>
        <div>
          <strong>ACF (Función de Autocorrelación):</strong>{' '}
          Mide la correlación entre Y_t e Y_{'{'}t-k{'}'} para cada rezago k. Barras que superan las bandas punteadas (±1.96/√n) son estadísticamente significativas al 5%.
        </div>
        <div>
          <strong>PACF (Autocorrelación Parcial):</strong>{' '}
          Igual que ACF pero controlando el efecto de los rezagos intermedios. Útil para identificar el orden p del componente AR de un modelo ARIMA.
        </div>
        <div className="pt-1 border-t border-teal-200">
          <strong className="text-teal-800">Distinción importante — serie original vs residuales:</strong>{' '}
          Los supuestos de estacionariedad y homocedasticidad aplican a la <em>serie original</em> para decidir qué modelo usar. Los mismos conceptos aplicados a los <em>residuales del modelo estimado</em> tienen una función diferente: verificar si el modelo capturó toda la estructura. Un modelo bien ajustado tiene residuales que se comportan como <em>ruido blanco</em>: media cero, sin autocorrelación y varianza constante.
        </div>
      </div>
    </ExpandPanel>
  )
}

// ── Tarjeta de test de hipótesis ──────────────────────────────────────────────
// CORRECCIÓN: isStationary (del backend) determina el color, no pvalue < 0.05.
// Para ADF: isStationary = pvalue < 0.05 (rechazar H₀ = estacionaria).
// Para KPSS: isStationary = pvalue > 0.05 (NO rechazar H₀ = estacionaria).
// Usar pvalue < 0.05 para ambos era un BUG: el KPSS mostraba verde cuando la
// serie era NO estacionaria (H₀ rechazada) y naranja cuando era estacionaria.

function TestCard({
  name, stat, pvalue, interpretation, tooltip, isStationary,
}: {
  name: string; stat: number; pvalue: number
  interpretation: string; tooltip: string; isStationary: boolean
}) {
  return (
    <div className={[
      'p-4 rounded-xl border bg-white shadow-sm',
      isStationary ? 'border-green-200' : 'border-orange-200',
    ].join(' ')}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-stone-800 text-sm">
          {name}
          <TooltipIcon text={tooltip} />
        </span>
        <span className={[
          'text-xs px-2 py-0.5 rounded-full font-medium',
          isStationary ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
        ].join(' ')}>
          p = {isFinite(pvalue) ? pvalue.toFixed(4) : '—'}
        </span>
      </div>
      <div className="text-xs text-stone-500 mb-1">
        Estadístico: <code className="font-mono">{isFinite(stat) ? stat.toFixed(4) : '—'}</code>
      </div>
      <div className={['text-sm leading-snug', isStationary ? 'text-green-700' : 'text-orange-700'].join(' ')}>
        {isStationary ? '✅' : '⚠️'} {interpretation}
      </div>
    </div>
  )
}

// ── Panel explicativo: metodología ADF + KPSS ─────────────────────────────────

function AdfKpssPanel({ adfStationary, kpssStationary }:
  { adfStationary: boolean; kpssStationary: boolean }) {

  // Determinar escenario de los 4 posibles
  const scenario =
    adfStationary && kpssStationary   ? 'both_stationary'   :
    !adfStationary && !kpssStationary ? 'both_nonstationary':
    adfStationary && !kpssStationary  ? 'conflict_adf'      :
    'conflict_kpss'

  const scenarios: Record<string, { label: string; cls: string; msg: string }> = {
    both_stationary: {
      label: '✅ Evidencia fuerte de ESTACIONARIEDAD',
      cls: 'bg-green-50 border-green-300 text-green-900',
      msg: 'Ambos tests concuerdan: ADF rechaza H₀ (no hay raíz unitaria) y KPSS no rechaza H₀ (la serie es estacionaria). Puedes proceder con modelos que asumen estacionariedad (ARMA, regresión con errores estacionarios).',
    },
    both_nonstationary: {
      label: '⚠️ Evidencia fuerte de NO ESTACIONARIEDAD',
      cls: 'bg-orange-50 border-orange-300 text-orange-900',
      msg: 'Ambos tests concuerdan: la serie NO es estacionaria. Considera diferenciar (diff), aplicar log si hay heterocedasticidad, o usar ARIMA con d > 0.',
    },
    conflict_adf: {
      label: '🔶 Conflicto: ADF sugiere estacionaria, KPSS no',
      cls: 'bg-yellow-50 border-yellow-300 text-yellow-900',
      msg: 'Posibles causas: (1) presencia de quiebre estructural en la media, (2) memoria larga (d fraccional), (3) muestra pequeña que limita la potencia del KPSS. Revisa la gráfica visual de la serie antes de decidir.',
    },
    conflict_kpss: {
      label: '🔶 Conflicto: KPSS sugiere estacionaria, ADF no',
      cls: 'bg-yellow-50 border-yellow-300 text-yellow-900',
      msg: 'El ADF puede tener baja potencia frente a raíces cercanas a 1 o con heterocedasticidad. El KPSS podría estar pasando por alto heterocedasticidad. Aumenta la muestra si es posible o usa pruebas adicionales (PP, DFGLS).',
    },
  }

  const s = scenarios[scenario]

  return (
    <div className="space-y-2 mt-3">
      {/* Conclusión conjunta */}
      <div className={`p-3 rounded-xl border-2 ${s.cls}`}>
        <p className="font-bold text-sm">{s.label}</p>
        <p className="text-xs mt-1 leading-relaxed">{s.msg}</p>
      </div>

      {/* Metodología expandible */}
      <ExpandPanel title="🔬 ¿Por qué se usan ADF y KPSS juntos? — Metodología" accent="violet">
        <div className="space-y-2 text-violet-900">
          <p>
            La pregunta &quot;¿es la serie estacionaria?&quot; no tiene una respuesta directa mediante un
            único test, porque <strong>tanto el error tipo I como el tipo II son relevantes</strong>.
            ADF y KPSS tienen hipótesis nulas <em>opuestas</em>: son complementarios por diseño.
          </p>

          <div>
            <strong>Test ADF — Dickey-Fuller Aumentado:</strong>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li><strong>H₀:</strong> La serie tiene raíz unitaria → NO es estacionaria</li>
              <li><strong>H₁:</strong> La serie es estacionaria (no tiene raíz unitaria)</li>
              <li><strong>Decisión:</strong> p &lt; 0.05 → rechazamos H₀ → evidencia de estacionariedad</li>
              <li><strong>Limitación:</strong> Baja potencia ante raíces cercanas a 1 y sensible a rezagos incluidos. Puede fallar con quiebres estructurales.</li>
            </ul>
          </div>

          <div>
            <strong>Test KPSS — Kwiatkowski-Phillips-Schmidt-Shin:</strong>
            <ul className="list-disc ml-4 mt-1 space-y-0.5">
              <li><strong>H₀:</strong> La serie ES estacionaria (alrededor de una constante o tendencia)</li>
              <li><strong>H₁:</strong> La serie tiene raíz unitaria → NO es estacionaria</li>
              <li><strong>Decisión:</strong> p &gt; 0.05 → NO rechazamos H₀ → evidencia de estacionariedad</li>
              <li><strong>Nota:</strong> Al tener H₀ opuesta al ADF, la condición para &quot;serie estacionaria&quot; es <em>no rechazar</em> (p &gt; 0.05), no rechazar como en el ADF.</li>
            </ul>
          </div>

          <div className="bg-violet-100 rounded-lg p-2 mt-1">
            <strong>La lógica de la prueba cruzada — los 4 escenarios:</strong>
            <table className="w-full mt-2 text-xs border-collapse">
              <thead>
                <tr className="bg-violet-200">
                  <th className="border border-violet-300 px-2 py-1 text-left">ADF</th>
                  <th className="border border-violet-300 px-2 py-1 text-left">KPSS</th>
                  <th className="border border-violet-300 px-2 py-1 text-left">Conclusión</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50">
                  <td className="border border-violet-300 px-2 py-1">Rechaza H₀ (p &lt; 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1">No rechaza H₀ (p &gt; 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1 font-semibold text-green-800">✅ Estacionaria — evidencia fuerte</td>
                </tr>
                <tr className="bg-orange-50">
                  <td className="border border-violet-300 px-2 py-1">No rechaza H₀ (p ≥ 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1">Rechaza H₀ (p &lt; 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1 font-semibold text-orange-800">⚠️ No estacionaria — evidencia fuerte</td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="border border-violet-300 px-2 py-1">Rechaza H₀ (p &lt; 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1">Rechaza H₀ (p &lt; 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1 font-semibold text-yellow-800">🔶 Conflicto — posible quiebre estructural o memoria larga</td>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="border border-violet-300 px-2 py-1">No rechaza H₀ (p ≥ 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1">No rechaza H₀ (p &gt; 0.05)</td>
                  <td className="border border-violet-300 px-2 py-1 font-semibold text-yellow-800">🔶 Conflicto — potencia insuficiente, muestra pequeña</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-violet-700 italic">
            Al usarlos en pareja, el error tipo I de uno controla el error tipo II del otro y viceversa.
            El acuerdo entre ambos es la señal más confiable antes de decidir si transformar o diferenciar la serie.
          </p>
        </div>
      </ExpandPanel>
    </div>
  )
}

// ── Gráfico PNG desde base64 ──────────────────────────────────────────────────

function RPlot({ b64, alt, caption }: { b64: string; alt: string; caption?: string }) {
  const [zoom, setZoom] = useState(false)
  return (
    <div>
      <img
        src={`data:image/png;base64,${b64}`} alt={alt}
        className="w-full rounded-lg border border-stone-200 cursor-zoom-in shadow-sm"
        style={{ maxHeight: 380, objectFit: 'contain', background: '#fff' }}
        onClick={() => setZoom(true)}
      />
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

// ── Barra ACF/PACF SVG ────────────────────────────────────────────────────────

function AcfChart({ lags, values, title, n }:
  { lags: number[]; values: number[]; title: string; n: number }) {
  const W = 480; const H = 140
  const pad = { top: 12, right: 12, bottom: 20, left: 36 }
  const ci = 1.96 / Math.sqrt(n)
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
        <rect x={pad.left} y={py(ci)} width={innerW} height={py(-ci) - py(ci)} fill="#dbeafe" opacity="0.6" />
        <line x1={pad.left} y1={midY} x2={W - pad.right} y2={midY} stroke="#a8a29e" strokeWidth="0.8" />
        <line x1={pad.left} y1={py(ci)} x2={W - pad.right} y2={py(ci)} stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="4,3" />
        <line x1={pad.left} y1={py(-ci)} x2={W - pad.right} y2={py(-ci)} stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="4,3" />
        {values.map((v, i) => {
          const x = px(i); const significant = Math.abs(v) > ci
          return <rect key={i} x={x - 2} y={v >= 0 ? py(v) : midY} width={4}
            height={Math.abs(py(v) - midY)} fill={significant ? '#1d4ed8' : '#93c5fd'} />
        })}
        <text x={W - pad.right} y={py(ci) - 2} textAnchor="end" fontSize="8" fill="#60a5fa">±1.96/√n</text>
        {[-0.5, 0, 0.5, 1].map((v) => (
          <text key={v} x={pad.left - 2} y={py(v) + 3} textAnchor="end" fontSize="8" fill="#78716c">{v}</text>
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
        <button onClick={() => router.push('/timesight/data')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">← Ir a Datos</button>
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
        <h1 className="text-2xl font-bold text-stone-900">🔍 Paso 2 — Exploración</h1>
        <p className="text-stone-500 mt-1">
          Serie activa: <strong className="text-blue-700">{series.name}</strong> — n={series.n}, freq={series.freq}
        </p>
      </div>

      {/* Glosario siempre visible */}
      <GlossaryPanel />

      {/* Botón explorar */}
      {!r && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl mt-3">
          <p className="text-sm text-blue-800 mb-3">
            El análisis exploratorio calculará: descomposición clásica, ACF/PACF, prueba ADF
            (Dickey-Fuller aumentada) y prueba KPSS de estacionariedad. Ambas pruebas se usan
            en conjunto porque tienen hipótesis nulas opuestas — ver glosario arriba.
          </p>
          <button onClick={handleExplore} disabled={!!loadingStep}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors shadow-sm">
            {loadingStep === 'explore'
              ? <span className="flex items-center gap-2"><span className="animate-spin">⚙️</span> Analizando…</span>
              : '▶ Analizar serie'}
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
        <div className="space-y-6 mt-3">

          {/* Botón re-analizar */}
          <div className="flex justify-end">
            <button onClick={handleExplore} className="text-xs text-blue-600 underline">↺ Re-analizar</button>
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

          {/* Gráfico principal */}
          {r.plots.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-stone-800">Serie de tiempo</h2>
              <RPlot b64={r.plots[0]} alt="Serie de tiempo" caption="Haz clic para ampliar" />
            </div>
          )}

          {/* Descomposición */}
          {r.decompType !== 'none' && r.plots.length > 1 && (
            <div>
              <h2 className="font-semibold text-stone-800 mb-1">
                Descomposición clásica
                <TooltipIcon text="La descomposición clásica separa la serie en tres componentes: tendencia (movimiento suave de largo plazo), estacionalidad (patrón que se repite cada período) y residuo (variación no explicada por los otros dos)." />
              </h2>
              <div className="flex gap-2 mb-3">
                {(['additive', 'multiplicative'] as const).map((t) => (
                  <button key={t} onClick={() => setDecompType(t)}
                    className={['px-3 py-1 rounded-full text-xs border transition-colors',
                      decompType === t ? 'bg-blue-600 text-white border-blue-600' : 'text-stone-500 border-stone-300 hover:border-blue-400',
                    ].join(' ')}>
                    {t === 'additive' ? 'Aditiva' : 'Multiplicativa'}
                  </button>
                ))}
              </div>
              <RPlot b64={r.plots[1]} alt="Descomposición" caption="Tendencia, estacionalidad y residuos" />
              <ExpandPanel title="¿Aditiva o multiplicativa? — Cómo decidir" accent="amber">
                <div className="text-amber-900 space-y-1">
                  <p><strong>Modelo aditivo:</strong> Y_t = Tendencia + Estacionalidad + Residuo. Aplica cuando la amplitud del patrón estacional es <em>constante</em> en el tiempo.</p>
                  <p><strong>Modelo multiplicativo:</strong> Y_t = Tendencia × Estacionalidad × Residuo. Aplica cuando la amplitud crece o decrece proporcional al nivel (series económicas con crecimiento exponencial). Equivale al aditivo sobre log(Y_t).</p>
                  <p className="italic text-xs">Regla práctica: si en el season plot los años recientes tienen mayor separación vertical → multiplicativo → aplica log antes de modelar.</p>
                </div>
              </ExpandPanel>
            </div>
          )}

          {/* Análisis estacional */}
          {r.plots.length > 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-stone-800">
                Análisis del patrón estacional
                <TooltipIcon text="Dos gráficos clave para decidir si la estacionalidad es ADITIVA (amplitud constante → usar dummies directamente) o MULTIPLICATIVA (amplitud crece → usar log + dummies)." />
              </h2>
              <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800 leading-relaxed">
                <strong>Cómo leer estos gráficos:</strong>{' '}
                En el <em>patrón por año</em>, si las líneas de años recientes están mucho más separadas → amplitud creciente → modelo <strong>multiplicativo</strong> (usar log).
                En el <em>subseries</em>, si la línea de cada mes sube con pendiente pronunciada → el promedio de ese mes crece → confirma multiplicativo.
                Si las líneas son paralelas y planas → modelo <strong>aditivo</strong>.
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Season plot — cada año como línea · Boxplot por período
                </p>
                <RPlot b64={r.plots[3]} alt="Season plot y boxplot estacional"
                  caption="Izquierda: cada línea es un año. Amplitud creciente → multiplicativo. Derecha: cajas más altas en verano con rango creciente confirman multiplicativo." />
              </div>
              {r.plots.length > 4 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    Subseries — evolución histórica de cada período
                  </p>
                  <RPlot b64={r.plots[4]} alt="Subseries plot"
                    caption="Cada panel = un mes. La línea azul horizontal es el promedio histórico. Si la secuencia de puntos sube → el promedio de ese mes crece con el tiempo." />
                </div>
              )}
            </div>
          )}

          {/* ACF / PACF */}
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">
              ACF y PACF
              <TooltipIcon text="La ACF (función de autocorrelación) mide la correlación de la serie con sus rezagos. La PACF (parcial) controla los rezagos intermedios. Barras azules oscuras superan la banda de confianza al 95% (±1.96/√n) y son estadísticamente significativas. Patrones en ACF/PACF guían la selección del modelo ARIMA." />
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {r.acfLags.length > 0 && (
                <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                  <AcfChart lags={r.acfLags} values={r.acfValues} title="ACF — Función de Autocorrelación" n={r.n} />
                </div>
              )}
              {r.pacfLags.length > 0 && (
                <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                  <AcfChart lags={r.pacfLags} values={r.pacfValues} title="PACF — Función de Autocorrelación Parcial" n={r.n} />
                </div>
              )}
            </div>
            {r.plots.length > 2 && (
              <div className="mt-3">
                <RPlot b64={r.plots[2]} alt="ACF/PACF" />
              </div>
            )}
            <ExpandPanel title="¿Cómo leer ACF y PACF para identificar modelos ARIMA?" accent="blue">
              <div className="text-blue-900 space-y-1">
                <p><strong>Proceso AR(p):</strong> PACF se corta en el rezago p (barras significativas solo hasta k=p). ACF decrece geométricamente.</p>
                <p><strong>Proceso MA(q):</strong> ACF se corta en el rezago q. PACF decrece geométricamente.</p>
                <p><strong>Proceso ARMA(p,q):</strong> Ambas decrecen gradualmente — se requiere el criterio AIC para seleccionar el orden.</p>
                <p><strong>Serie no estacionaria:</strong> ACF decrece muy lentamente (barras significativas hasta rezagos muy altos). Señal para diferenciar.</p>
                <p className="text-xs italic text-blue-700">Si usas ARIMA automático (auto.arima), este análisis es informativo pero no obligatorio — el algoritmo evalúa combinaciones de p,d,q por AIC.</p>
              </div>
            </ExpandPanel>
          </div>

          {/* Tests de estacionariedad */}
          <div>
            <h2 className="font-semibold text-stone-800 mb-1">
              Tests de estacionariedad
              <TooltipIcon text="ADF y KPSS tienen hipótesis nulas opuestas. Para concluir estacionariedad se necesita que ADF rechace su H₀ (p < 0.05) Y que KPSS NO rechace su H₀ (p > 0.05). Ver panel explicativo debajo." />
            </h2>

            {/* Nota previa: lógica de hipótesis */}
            <div className="mb-3 p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600 leading-relaxed">
              <strong>Leer con cuidado:</strong> Estos dos tests tienen hipótesis nulas opuestas.
              Para el <strong>ADF</strong>, el ✅ verde significa que <em>rechazamos</em> H₀ (p &lt; 0.05) → serie estacionaria.
              Para el <strong>KPSS</strong>, el ✅ verde significa que <em>no rechazamos</em> H₀ (p &gt; 0.05) → serie estacionaria.
              El color refleja siempre si la evidencia apunta a estacionariedad, no simplemente si p &lt; 0.05.
            </div>

            <div className="grid grid-cols-1 gap-3">
              <TestCard
                name="Test ADF (Dickey-Fuller Aumentado)"
                stat={r.adf.statistic}
                pvalue={r.adf.pvalue}
                interpretation={r.adf.interpretation}
                isStationary={r.adf.isStationary ?? (r.adf.pvalue < 0.05)}
                tooltip="H₀: la serie tiene raíz unitaria (NO es estacionaria). p < 0.05 → rechazamos H₀ → la serie SÍ es estacionaria. El estadístico τ sigue la distribución Dickey-Fuller, no la normal estándar — por eso los p-valores son distintos a los de otros tests."
              />
              <TestCard
                name="Test KPSS (Kwiatkowski-Phillips-Schmidt-Shin)"
                stat={r.kpss.statistic}
                pvalue={r.kpss.pvalue}
                interpretation={r.kpss.interpretation}
                isStationary={r.kpss.isStationary ?? (r.kpss.pvalue > 0.05)}
                tooltip="H₀: la serie ES estacionaria. p > 0.05 → NO rechazamos H₀ → la serie SÍ es estacionaria. p < 0.05 → rechazamos H₀ → la serie NO es estacionaria. Interpretar al revés del ADF — verde aquí significa p ALTO (no rechazar)."
              />
            </div>

            {/* Conclusión conjunta + metodología */}
            <AdfKpssPanel
              adfStationary={r.adf.isStationary ?? (r.adf.pvalue < 0.05)}
              kpssStationary={r.kpss.isStationary ?? (r.kpss.pvalue > 0.05)}
            />
          </div>

          {/* Navegación */}
          <div className="flex gap-3 pt-4 border-t border-stone-200">
            <button onClick={() => router.push('/timesight/transform')}
              className="px-5 py-2 bg-stone-700 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
              ⚙️ Transformar →
            </button>
            <button onClick={() => router.push('/timesight/model')}
              className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
              📐 Ir a Modelar →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
