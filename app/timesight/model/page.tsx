'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/model/page.tsx  —  Paso 4: Ajuste del modelo
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore, type ModelFamily, type FittedModel } from '@/lib/timesight-store'
import { apiModelFit } from '@/lib/timesight-api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, dec = 4): string {
  if (v === null || v === undefined) return '—'
  if (!isFinite(v)) return '∞'
  return v.toFixed(dec)
}

function fmtMape(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'N/A'
  if (!isFinite(v)) return 'N/A (∞)'
  return `${v.toFixed(2)}%`
}

function sigStars(p: number | null | undefined): string {
  if (p === null || p === undefined || !isFinite(p)) return ''
  if (p < 0.001) return '***'
  if (p < 0.01)  return '**'
  if (p < 0.05)  return '*'
  if (p < 0.1)   return '·'
  return ''
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

// ── Subcomponente: panel de resultados ────────────────────────────────────────

function ModelResults({ model }: { model: FittedModel }) {
  const router = useRouter()

  const coefNames = Object.keys(model.coefficients)
  const isLog     = model.family === 'log' || model.params?.transformLog
  const isArima   = model.family === 'arima'
  const hasDuan   = (model.smearingFactor ?? 1) !== 1

  // Interpretación del MAPE
  const mapeVal = typeof model.mape === 'number' && isFinite(model.mape) ? model.mape : null
  const mapeLabel = mapeVal === null ? '—' :
    mapeVal < 5  ? 'Excelente (< 5%)' :
    mapeVal < 10 ? 'Muy bueno (< 10%)' :
    mapeVal < 20 ? 'Aceptable (< 20%)' :
    'Revisar (≥ 20%)'
  const mapeColor = mapeVal === null ? 'text-stone-400' :
    mapeVal < 5  ? 'text-green-700' :
    mapeVal < 10 ? 'text-blue-700' :
    mapeVal < 20 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="mt-6 space-y-4">

      {/* ── Encabezado ── */}
      <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-green-600 text-lg">✅</span>
          <h3 className="font-bold text-green-900 text-base">{model.name}</h3>
          {isLog && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
              log(Y)
            </span>
          )}
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2 mt-3 sm:grid-cols-4">
          {[
            {
              k: 'AIC', v: fmt(model.aic, 3),
              tip: 'Criterio de información de Akaike. Penaliza el número de parámetros. Menor = mejor. Usar para comparar modelos del mismo tipo.',
            },
            {
              k: 'BIC', v: fmt(model.bic, 3),
              tip: 'Criterio de información Bayesiano. Penaliza más que el AIC para muestras grandes. Menor = mejor.',
            },
            {
              k: 'RMSE', v: fmt(model.rmse, 4),
              tip: 'Raíz del error cuadrático medio en la escala original. Mide cuánto se equivoca el modelo en promedio. Menor = mejor.',
            },
            {
              k: 'MAPE', v: fmtMape(model.mape),
              tip: 'Error porcentual absoluto medio. Indica el % de error promedio respecto al valor real. < 10% es muy bueno.',
              color: mapeColor,
            },
          ].map(({ k, v, tip, color }) => (
            <div key={k} className="text-center bg-white rounded-lg p-2.5 border border-green-100 shadow-sm">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide font-semibold flex items-center justify-center gap-1">
                {k}<TooltipIcon text={tip} />
              </div>
              <div className={`font-bold text-sm mt-0.5 ${color ?? 'text-stone-800'}`}>{v}</div>
            </div>
          ))}
        </div>

        {/* MAPE interpretación */}
        {mapeVal !== null && (
          <p className={`text-xs mt-2 font-semibold ${mapeColor}`}>
            Precisión de ajuste: {mapeLabel}
          </p>
        )}
      </div>

      {/* ── Ecuación del modelo ── */}
      {model.equation && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Ecuación ajustada
            </span>
            <TooltipIcon text="Expresión matemática del modelo con los coeficientes estimados. Los valores numéricos son los β̂ del modelo." />
          </div>
          <code className="text-xs font-mono text-blue-900 bg-white border border-blue-100 rounded px-3 py-2 block break-all leading-relaxed">
            {model.equation}
          </code>
          {isLog && (
            <p className="text-xs text-purple-700 mt-1.5 font-medium">
              ⚠️ El modelo fue ajustado en escala logarítmica. Los pronósticos se devuelven a escala original mediante corrección de sesgo{hasDuan ? ` (factor de Duan = ${(model.smearingFactor ?? 1).toFixed(4)})` : ''}.
            </p>
          )}
        </div>
      )}

      {/* ── Tabla de coeficientes ── */}
      {coefNames.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
              Coeficientes estimados
            </span>
            <TooltipIcon text="Estimates: valor de cada β̂. P-valor: probabilidad de observar este coeficiente si el verdadero fuera 0. *** p<0.001, ** p<0.01, * p<0.05, · p<0.1" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="px-3 py-2 text-left text-stone-500 font-semibold">Parámetro</th>
                  <th className="px-3 py-2 text-right text-stone-500 font-semibold">Estimado (β̂)</th>
                  <th className="px-3 py-2 text-right text-stone-500 font-semibold">P-valor</th>
                  <th className="px-3 py-2 text-left text-stone-500 font-semibold">Sig.</th>
                  <th className="px-3 py-2 text-left text-stone-500 font-semibold w-40">Interpretación</th>
                </tr>
              </thead>
              <tbody>
                {coefNames.map((name, i) => {
                  const est  = model.coefficients[name]
                  const pval = model.pvalues[name]
                  const sig  = sigStars(pval)
                  const isInt = i === 0
                  const isTrend = name === 'X1' || name === 't1' || (i === 1 && !isArima)
                  const isDummy = name.startsWith('X') && i > 1 && !isArima
                  const pSig = pval !== null && pval !== undefined && isFinite(pval) && pval < 0.05
                  
                  let interp = ''
                  if (isInt)   interp = 'Nivel base (t=0)'
                  else if (isTrend && isLog) interp = `Crecimiento ≈ ${((Math.exp(est) - 1) * 100).toFixed(2)}%/período`
                  else if (isTrend) interp = `Tendencia: +${est.toFixed(4)}/período`
                  else if (isDummy) interp = `Efecto estacional período ${i - 1}`
                  else interp = isArima ? 'Coef. ARIMA' : 'Efecto adicional'

                  return (
                    <tr key={name} className={`border-b border-stone-100 ${pSig ? '' : 'opacity-60'}`}>
                      <td className="px-3 py-1.5 font-mono text-stone-700">{name}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-blue-800">
                        {fmt(est, 6)}
                      </td>
                      <td className={`px-3 py-1.5 text-right ${pSig ? 'text-green-700 font-semibold' : 'text-stone-500'}`}>
                        {pval !== null && pval !== undefined && isFinite(pval)
                          ? (pval < 0.0001 ? '< 0.0001' : pval.toFixed(4))
                          : '—'}
                      </td>
                      <td className="px-3 py-1.5 font-bold text-amber-600">{sig}</td>
                      <td className="px-3 py-1.5 text-stone-500 leading-tight">{interp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-1.5 border-t border-stone-100 text-[10px] text-stone-400">
            Significancia: *** p&lt;0.001 · ** p&lt;0.01 · * p&lt;0.05 · · p&lt;0.1 · (en blanco) p≥0.1. Filas atenuadas = coeficiente no significativo.
          </div>
        </div>
      )}

      {/* ── Guía de interpretación ── */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm space-y-2">
        <p className="font-semibold text-amber-900 text-xs uppercase tracking-wide mb-2">
          📖 Guía de interpretación
        </p>

        {!isArima && (
          <div className="space-y-1.5 text-xs text-amber-900">
            <p><strong>AIC / BIC:</strong> Úsalos solo para comparar modelos de la misma serie. El modelo con menor AIC/BIC tiene mejor balance entre ajuste y complejidad.</p>
            <p><strong>RMSE:</strong> Está en las mismas unidades que Y. Compáralo con la desviación estándar de la serie para saber si el error es grande o pequeño.</p>
            {isLog ? (
              <p><strong>Coeficiente de tendencia:</strong> En escala log, β₁ = {fmt(model.coefficients['X1'] ?? model.coefficients['t1'], 4)} implica una tasa de cambio aproximada de {((Math.exp(model.coefficients['X1'] ?? model.coefficients['t1'] ?? 0) - 1) * 100).toFixed(2)}% por período. Esto se interpreta como crecimiento <em>multiplicativo</em>.</p>
            ) : (
              <p><strong>Coeficiente de tendencia:</strong> Cada unidad de tiempo la serie cambia en promedio {fmt(model.coefficients['X1'] ?? model.coefficients['t1'], 4)} unidades (tendencia <em>aditiva</em>).</p>
            )}
            <p><strong>Variables estacionales:</strong> Los coeficientes de las dummies miden la desviación promedio de cada período respecto al período de referencia (último período del año). Un coeficiente negativo indica un período típicamente bajo.</p>
            <p><strong>P-valores:</strong> Un coeficiente no significativo (p &gt; 0.05) sugiere que esa variable no aporta información útil. Considera simplificar el modelo eliminando términos no significativos.</p>
          </div>
        )}

        {isArima && (
          <div className="space-y-1.5 text-xs text-amber-900">
            <p><strong>ARIMA(p,d,q):</strong> p = orden autorregresivo (cuántos rezagos de Y se incluyen), d = grado de diferenciación para hacer la serie estacionaria, q = orden de media móvil (cuántos errores rezagados se incluyen).</p>
            <p><strong>Coeficientes AR:</strong> Si φ₁ es positivo, la serie tiene inercia positiva (sube cuando estuvo alta). Si es negativo, tiende a revertir.</p>
            <p><strong>Coeficientes MA:</strong> Capturan cómo los errores pasados influyen en el valor actual.</p>
            <p><strong>AIC:</strong> {fmt(model.aic, 2)} — auto.arima seleccionó este modelo por tener el menor AIC entre las especificaciones evaluadas.</p>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-amber-200">
          <p className="text-xs text-amber-800">
            <strong>Siguiente paso:</strong> Verifica que los <strong>residuos</strong> del modelo se comporten como ruido blanco gaussiano — esto valida que el modelo capturó toda la estructura sistemática de la serie.
          </p>
        </div>
      </div>

      {/* ── Botón continuar ── */}
      <button onClick={() => router.push('/timesight/diagnostics')}
        className="w-full py-3 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors shadow-sm flex items-center justify-center gap-2">
        Continuar → Diagnósticos de residuos
      </button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ModelPage() {
  const router = useRouter()
  const { series, transformedSeries, modelParams, setModelParams, setFittedModel, fittedModel } =
    useTimeSightStore()

  const activeSeries = transformedSeries ?? series
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  if (!activeSeries) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">⚠️ Primero carga una serie de tiempo.</p>
        <button onClick={() => router.push('/timesight/data')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">← Ir a Datos</button>
      </div>
    )
  }

  const handleFit = async () => {
    setLoading(true); setError(null)
    try {
      const model = await apiModelFit(activeSeries, modelParams)
      setFittedModel(model)
      // Don't auto-redirect — show results here first
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al ajustar el modelo')
    } finally { setLoading(false) }
  }

  const families: { id: ModelFamily; label: string; desc: string; tooltip: string }[] = [
    {
      id: 'polynomial', label: 'Polinomial', desc: 'Ŷ = β₀ + β₁t + β₂t² + … + ε',
      tooltip: 'Tendencia capturada mediante un polinomio en el tiempo. Grado 1 = lineal, 2 = cuadrática, 3 = cúbica.',
    },
    {
      id: 'log', label: 'Log-lineal', desc: 'log(Ŷ) = β₀ + β₁t + ε',
      tooltip: 'El logaritmo estabiliza varianza multiplicativa. Ideal para series con crecimiento proporcional. Se aplica corrección de sesgo de Duan al pronosticar.',
    },
    {
      id: 'exponential', label: 'Exponencial', desc: 'Ŷ = a · e^(bt)',
      tooltip: 'Modelo de crecimiento o decaimiento exponencial puro. Equivale al log-lineal sin intercepto diferente a 0.',
    },
    {
      id: 'arima', label: 'ARIMA automático', desc: 'auto.arima() · selección por AIC',
      tooltip: 'Ajusta automáticamente el mejor modelo ARIMA mediante criterio AIC. Incluye estacionalidad automática si freq > 1.',
    },
  ]

  const seasonalOpts = [
    { id: 'none',   label: 'Sin estacionalidad', tooltip: 'No incluye componente estacional en el modelo.' },
    { id: 'dummy',  label: 'Variables dummy',     tooltip: 'Crea S-1 indicadoras de período estacional (meses, trimestres…). Ref = último período.' },
    { id: 'fourier',label: 'Ondas de Fourier',   tooltip: 'Modela la estacionalidad con senos y cosenos. Más flexible para ciclos irregulares.' },
  ]

  const isArima = modelParams.family === 'arima'

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">📐 Paso 4 — Modelado</h1>
        <p className="text-stone-500 mt-1">
          Serie: <strong className="text-blue-700">{activeSeries.name}</strong>
          {transformedSeries && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">transformada</span>
          )}
        </p>
      </div>

      {/* ── Familia del modelo ── */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-2">
          Familia del modelo
          <TooltipIcon text="Elige el tipo de ecuación que mejor describe el comportamiento de tu serie." />
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {families.map((f) => (
            <button key={f.id}
              onClick={() => setModelParams({ family: f.id })}
              title={f.tooltip}
              className={['p-3 rounded-xl border-2 text-left transition-all',
                modelParams.family === f.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-stone-200 hover:border-blue-300',
              ].join(' ')}>
              <div className="font-semibold text-sm text-stone-800">{f.label}</div>
              <code className="text-xs text-stone-500">{f.desc}</code>
            </button>
          ))}
        </div>
      </div>

      {/* ── Opciones adicionales (solo si no es ARIMA) ── */}
      {!isArima && (
        <>
          {/* Grado polinomial */}
          {modelParams.family === 'polynomial' && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-stone-700 mb-2">
                Grado del polinomio
                <TooltipIcon text="Grado 1 = línea recta, 2 = parábola, 3 = cúbica. Evita grados > 4: el modelo sobreajusta la muestra y pronostica mal." />
              </h2>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((d) => (
                  <button key={d}
                    onClick={() => setModelParams({ degree: d })}
                    className={['w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all',
                      modelParams.degree === d
                        ? 'border-blue-500 bg-blue-100 text-blue-800'
                        : 'border-stone-200 text-stone-600 hover:border-blue-300',
                    ].join(' ')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estacionalidad */}
          {activeSeries.freq > 1 && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-stone-700 mb-2">
                Componente estacional
                <TooltipIcon text="¿Incluir variables para capturar el patrón estacional de la serie?" />
              </h2>
              <div className="flex flex-wrap gap-2">
                {seasonalOpts.map((s) => (
                  <button key={s.id}
                    onClick={() => setModelParams({ seasonal: s.id as 'none' | 'dummy' | 'fourier' })}
                    title={s.tooltip}
                    className={['px-3 py-1.5 rounded-full border text-sm transition-all',
                      modelParams.seasonal === s.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-stone-300 text-stone-600 hover:border-blue-400',
                    ].join(' ')}>
                    {s.label}
                  </button>
                ))}
              </div>
              {modelParams.seasonal === 'fourier' && (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-xs text-stone-600">Armónicos K:</label>
                  <input type="number" min={1} max={Math.floor(activeSeries.freq / 2)}
                    value={modelParams.harmonics}
                    onChange={(e) => setModelParams({ harmonics: Number(e.target.value) })}
                    className="w-16 border border-stone-300 rounded px-2 py-1 text-sm" />
                  <span className="text-xs text-stone-400">
                    (máx. {Math.floor(activeSeries.freq / 2)})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Corrección log */}
          <div className="mb-5 flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <input type="checkbox" id="transformLog"
              checked={modelParams.transformLog}
              onChange={(e) => setModelParams({ transformLog: e.target.checked })}
              className="mt-0.5" />
            <label htmlFor="transformLog" className="text-sm text-purple-800 cursor-pointer">
              <strong>Aplicar log internamente</strong> — El backend toma log(Y) antes de ajustar
              y corrige el sesgo al pronosticar (estimador de Duan).
              <TooltipIcon text="Útil cuando la serie tiene varianza multiplicativa pero no la transformaste manualmente en el paso 3. Los pronósticos se devuelven a escala original corregidos por el factor de Duan." />
            </label>
          </div>
        </>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* ── Botón ajustar ── */}
      <button onClick={handleFit} disabled={loading}
        className="px-6 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors shadow-sm flex items-center gap-2">
        {loading
          ? <><span className="animate-spin inline-block">⚙️</span> Ajustando modelo…</>
          : fittedModel ? '↺ Re-ajustar con nueva configuración' : '▶ Ajustar modelo →'}
      </button>

      {/* ── Resultados ── */}
      {fittedModel && <ModelResults model={fittedModel} />}
    </div>
  )
}
