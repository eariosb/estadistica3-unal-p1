'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/model/page.tsx  —  Paso 4: Ajuste del modelo
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore, type ModelFamily, type FittedModel } from '@/lib/timesight-store'
import { apiModelFit, getExternalTransform } from '@/lib/timesight-api'
import TooltipIcon from '@/components/TooltipIcon'
import { Math as KaTeX } from '@/components/Math'

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

// ── Leyenda ARIMA ─────────────────────────────────────────────────────────────

function ArimaLegend({ model }: { model: FittedModel }) {
  const ord = model.arimaOrder
  const coefs = model.coefficients
  const arNames  = Object.keys(coefs).filter(k => /^ar\d/.test(k))
  const maNames  = Object.keys(coefs).filter(k => /^ma\d/.test(k))
  const sarNames = Object.keys(coefs).filter(k => /^sar\d/.test(k))
  const smaNames = Object.keys(coefs).filter(k => /^sma\d/.test(k))
  const hasDrift = Object.keys(coefs).some(k => /drift|intercept|mean/i.test(k))

  const items: { sym: string; desc: string }[] = [
    { sym: 'B', desc: 'Operador de retardo: BY_t = Y_{t−1}' },
    { sym: '(1−B)', desc: `Diferenciación: (1−B)Y_t = Y_t − Y_{t−1}${ord?.d && ord.d > 1 ? ` — aplicada ${ord.d} veces` : ''}` },
  ]
  if ((ord?.P ?? 0) > 0 || (ord?.D ?? 0) > 0 || (ord?.Q ?? 0) > 0) {
    items.push({ sym: `B^{${ord?.S ?? 's'}}`, desc: `Retardo estacional de período ${ord?.S}` })
  }
  arNames.forEach((n, i) => items.push({
    sym: `\\varphi_${i+1}=${fmt(coefs[n], 4)}`,
    desc: `Coeficiente autorregresivo AR(${i+1}): influencia del valor en t−${i+1}`,
  }))
  maNames.forEach((n, i) => items.push({
    sym: `\\theta_${i+1}=${fmt(coefs[n], 4)}`,
    desc: `Coeficiente de media móvil MA(${i+1}): influencia del error en t−${i+1}`,
  }))
  sarNames.forEach((n, i) => items.push({
    sym: `\\Phi_${i+1}=${fmt(coefs[n], 4)}`,
    desc: `Coeficiente SAR estacional de orden ${i+1}`,
  }))
  smaNames.forEach((n, i) => items.push({
    sym: `\\Theta_${i+1}=${fmt(coefs[n], 4)}`,
    desc: `Coeficiente SMA estacional de orden ${i+1}`,
  }))
  if (hasDrift) items.push({ sym: 'c', desc: 'Constante (drift): tendencia determinística en la serie diferenciada' })
  items.push({ sym: '\\varepsilon_t', desc: 'Ruido blanco: error aleatorio con media 0 y varianza constante σ²' })

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-blue-800">Notación — operador de retardo B:</p>
      <div className="grid grid-cols-1 gap-1">
        {items.map(({ sym, desc }) => (
          <div key={sym} className="flex items-baseline gap-2 text-xs text-blue-900">
            <span className="font-mono shrink-0 min-w-[80px]">
              <KaTeX math={sym} />
            </span>
            <span className="text-blue-700">— {desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Leyenda Regresión ─────────────────────────────────────────────────────────

function RegressionLegend({ model, isLog, hasDuan }:
  { model: FittedModel; isLog: boolean; hasDuan: boolean }) {
  const coefs = model.coefficients
  const names = Object.keys(coefs)

  const items: { sym: string; desc: string }[] = []

  if (isLog) {
    items.push({ sym: '\\log(\\hat{Y}_t)', desc: 'Valor ajustado en escala logarítmica' })
  } else {
    items.push({ sym: '\\hat{Y}_t', desc: 'Valor ajustado en escala original' })
  }

  names.forEach((n) => {
    const v = fmt(coefs[n], 4)
    if (n === 'beta0') {
      items.push({ sym: `\\hat{\\beta}_0 = ${v}`, desc: 'Intercepto: nivel medio del período de referencia (t = 0)' })
    } else if (/^t\d+$/.test(n)) {
      const deg = parseInt(n.replace('t', ''))
      if (deg === 1) {
        items.push({ sym: `\\hat{\\beta}_1 = ${v}`, desc: isLog
          ? `Tendencia log-lineal → crecimiento ≈ ${((Math.exp(coefs[n]) - 1) * 100).toFixed(2)}% por período`
          : `Tendencia β₁: la serie crece ${v} unidades por período` })
      } else {
        items.push({ sym: `\\hat{\\beta}_{${deg}} = ${v}`, desc: `Componente de tendencia de orden ${deg} (t^{${deg}})` })
      }
    } else if (n.startsWith('I_')) {
      const period = n.replace('I_', '')
      items.push({ sym: `\\hat{\\delta}_{\\text{${period}}} = ${v}`, desc: `Desviación media de ${period} respecto al período de referencia` })
    } else if (/^(sen|cos)\d+$/.test(n)) {
      const k = n.replace(/^(sen|cos)/, '')
      items.push({ sym: `\\hat{\\gamma}_{${k}} = ${v}`, desc: `${n.startsWith('sen') ? 'Seno' : 'Coseno'} del armónico ${k} de Fourier` })
    }
  })

  items.push({ sym: '\\varepsilon_t', desc: 'Error: diferencia entre el valor real Y_t y el ajustado Ŷ_t' })

  return (
    <div className="space-y-2">
      {isLog && (
        <p className="text-xs text-purple-700 font-semibold">
          ✓ Ecuación en log-escala. Pronósticos devueltos a escala original
          {hasDuan ? ` (corrección de Duan = ${(model.smearingFactor ?? 1).toFixed(4)})` : ''}.
        </p>
      )}
      <p className="text-xs font-semibold text-blue-800">Significado de cada término:</p>
      <div className="grid grid-cols-1 gap-1">
        {items.map(({ sym, desc }) => (
          <div key={sym} className="flex items-baseline gap-2 text-xs text-blue-900">
            <span className="font-mono shrink-0 min-w-[120px]">
              <KaTeX math={sym} />
            </span>
            <span className="text-blue-700">— {desc}</span>
          </div>
        ))}
      </div>
    </div>
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

      {/* ── Nota de escala (back-transform info del backend) ── */}
      {model.scaleNote && (
        <div className={['p-3 rounded-xl border text-xs leading-relaxed',
          model.scaleNote.startsWith('⚠️')
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-purple-50 border-purple-200 text-purple-800',
        ].join(' ')}>
          {model.scaleNote}
        </div>
      )}

      {/* ── Ecuación del modelo ── */}
      {model.equation && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Ecuación estimada del modelo
            </span>
            <TooltipIcon text="Expresión matemática con los coeficientes estimados. Para ARIMA se usa la notación del operador de retardo B (donde BY_t = Y_{t-1}). Para regresión, los valores numéricos son los β̂ del modelo." />
          </div>

          {/* Render KaTeX */}
          <div className="bg-white rounded-lg border border-blue-100 px-4 py-3 overflow-x-auto">
            <KaTeX math={model.equation} display />
          </div>

          {/* Leyenda según tipo de modelo */}
          {isArima ? (
            <ArimaLegend model={model} />
          ) : (
            <RegressionLegend model={model} isLog={isLog} hasDuan={hasDuan} />
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
                  const pSig = pval !== null && pval !== undefined && isFinite(pval) && pval < 0.05

                  // Clasificación por nombre semántico (nuevos nombres del backend)
                  const isInt     = name === 'beta0'
                  const isTrend   = /^t\d+$/.test(name)
                  const isDummy   = name.startsWith('I_')
                  const isFourier = /^(sen|cos)\d+$/.test(name)

                  // Grado de la tendencia (t1 → 1, t2 → 2, ...)
                  const tDegree = isTrend ? parseInt(name.replace('t', '')) : 0
                  // Período del dummy (I_Feb → Feb, I_T2 → T2, ...)
                  const dPeriod = isDummy ? name.replace('I_', '') : ''

                  let interp = ''
                  if (isArima) {
                    if (/^ar\d/.test(name))  interp = `AR(${name.replace('ar','')}) — inercia: influencia de Y en t−${name.replace('ar','')}`
                    else if (/^ma\d/.test(name))  interp = `MA(${name.replace('ma','')}) — memoria del error en t−${name.replace('ma','')}`
                    else if (/^sar\d/.test(name)) interp = `SAR estacional orden ${name.replace('sar','')}`
                    else if (/^sma\d/.test(name)) interp = `SMA estacional orden ${name.replace('sma','')}`
                    else if (/drift|mean/i.test(name)) interp = 'Constante (drift): tendencia determinística'
                    else interp = 'Coef. ARIMA'
                  } else if (isInt) {
                    interp = 'Intercepto β₀: nivel medio del período de referencia'
                  } else if (isTrend) {
                    if (tDegree === 1 && isLog)
                      interp = `Tendencia log-lineal → crecimiento ≈ ${((Math.exp(est) - 1) * 100).toFixed(2)}%/período`
                    else if (tDegree === 1)
                      interp = `Tendencia β₁: ${est >= 0 ? '+' : ''}${est.toFixed(4)} unidades/período`
                    else
                      interp = `Componente de tendencia de orden ${tDegree} (t^${tDegree})`
                  } else if (isDummy) {
                    interp = `Efecto medio de ${dPeriod} vs. el período de referencia (enero)`
                  } else if (isFourier) {
                    const k = name.replace(/^(sen|cos)/, '')
                    interp = `${name.startsWith('sen') ? 'Seno' : 'Coseno'} del armónico ${k} — componente estacional`
                  } else {
                    interp = 'Efecto adicional'
                  }

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
            <p><strong>Variables estacionales:</strong> Los coeficientes de las dummies (I_Feb, I_Mar, …) miden la desviación promedio de cada período respecto al <strong>período de referencia (enero / T1 / P1)</strong>. Un coeficiente negativo indica un período típicamente más bajo que la referencia.</p>
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

// ── Banner de coherencia transformación ─────────────────────────────────────

function TransformBanner({ transformCode }: { transformCode: string }) {
  const ext = getExternalTransform(transformCode)
  if (ext === 'none') return null

  const banners: Record<string, { icon: string; cls: string; title: string; body: string }> = {
    log: {
      icon: '🔢',
      cls: 'bg-purple-50 border-purple-300 text-purple-900',
      title: 'Serie en escala logarítmica (log aplicado en paso 3)',
      body: 'Los valores actuales son log(Y_original). Los modelos Log-lineal y Exponencial han sido deshabilitados porque aplicarían log() de nuevo sobre datos ya en log-escala — esto modelaría log(log(Y)), que carece de sentido estadístico. El back-transform exp() + corrección de Duan se aplicará automáticamente en ajuste y pronóstico para devolver resultados a la escala original.',
    },
    sqrt: {
      icon: '√',
      cls: 'bg-teal-50 border-teal-300 text-teal-900',
      title: 'Serie en escala raíz cuadrada (sqrt aplicado en paso 3)',
      body: 'Los valores actuales son √Y_original. Los modelos actúan sobre la escala raíz. El back-transform cuadrático (·)² se aplica automáticamente en ajuste y pronóstico.',
    },
    diff: {
      icon: 'Δ',
      cls: 'bg-amber-50 border-amber-300 text-amber-900',
      title: 'Serie diferenciada (diff aplicado en paso 3)',
      body: 'Los valores actuales son ΔY_t = Y_t − Y_{t−1}. El modelo operará sobre primeras diferencias. Los pronósticos estarán en escala de cambios (no niveles). Para recuperar niveles se necesita sumar las diferencias pronosticadas al último valor observado. ARIMA con d=0 es la especificación apropiada, ya que la diferenciación ya fue aplicada externamente.',
    },
    logdiff: {
      icon: '∂',
      cls: 'bg-amber-50 border-amber-300 text-amber-900',
      title: 'Serie log-diferenciada (diff(log(x)) aplicado en paso 3)',
      body: 'Los valores actuales son log(Y_t) − log(Y_{t−1}) ≈ tasa de cambio porcentual. El modelo operará sobre estas tasas. Los pronósticos son cambios porcentuales aproximados, no niveles absolutos. ARIMA es el modelo más apropiado para esta escala.',
    },
  }

  const b = banners[ext]
  if (!b) return null

  return (
    <div className={`mb-5 p-4 rounded-xl border-2 ${b.cls}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{b.icon}</span>
        <div>
          <p className="font-bold text-sm mb-1">{b.title}</p>
          <p className="text-xs leading-relaxed">{b.body}</p>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ModelPage() {
  const router = useRouter()
  const { series, transformedSeries, transformCode, modelParams, setModelParams, setFittedModel, fittedModel } =
    useTimeSightStore()

  const activeSeries = transformedSeries ?? series
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // ── Detectar tipo de transformación externa ───────────────────────────────
  const extTransform = getExternalTransform(transformCode)
  const hasExternalLog  = extTransform === 'log'
  const hasExternalSqrt = extTransform === 'sqrt'
  const hasExternalDiff = extTransform === 'diff' || extTransform === 'logdiff'

  // Si el usuario aplicó log externo y el modelParams aún tiene log/exponential,
  // reset preventivo a polynomial para evitar double-log silencioso.
  // (Se hace en render, no en store, para no corromper estado guardado)
  const safeFamily: ModelFamily =
    hasExternalLog && (modelParams.family === 'log' || modelParams.family === 'exponential')
      ? 'polynomial'
      : modelParams.family

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
      // Pasar transformCode para que el backend sepa el tipo de back-transform
      const model = await apiModelFit(
        activeSeries,
        { ...modelParams, family: safeFamily },
        transformCode
      )
      setFittedModel(model)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al ajustar el modelo')
    } finally { setLoading(false) }
  }

  // ── Familias disponibles según transformación ─────────────────────────────
  // Regla de coherencia:
  //   - log externo → log y exponential REDUNDANTES (aplicarían log de nuevo)
  //   - sqrt externo → todos disponibles (√ no tiene familia equivalente)
  //   - diff externo → todos disponibles; ARIMA con d=0 es más apropiado
  //   - sin transformación → todos disponibles

  const allFamilies: { id: ModelFamily; label: string; desc: string; tooltip: string; disabled?: boolean; disabledReason?: string }[] = [
    {
      id: 'polynomial', label: 'Polinomial', desc: 'Ŷ = β₀ + β₁t + β₂t² + … + ε',
      tooltip: 'Tendencia capturada por un polinomio en el tiempo. Grado 1 = lineal, 2 = cuadrática, 3 = cúbica. Funciona sobre cualquier escala de datos.',
    },
    {
      id: 'log', label: 'Log-lineal', desc: 'log(Ŷ) = β₀ + β₁t + ε',
      tooltip: hasExternalLog
        ? 'DESHABILITADO: la serie ya fue transformada con log en el paso 3. Aplicar log de nuevo modelaría log(log(Y)), lo cual no tiene sentido estadístico. Usa Polinomial o ARIMA sobre la serie ya en log-escala.'
        : 'El logaritmo estabiliza varianza multiplicativa. Ideal cuando la serie crece proporcionalmente. Se aplica corrección de sesgo de Duan al pronosticar. Equivalente a ajustar una curva exponencial en escala original.',
      disabled: hasExternalLog,
      disabledReason: 'Redundante: la serie ya está en log-escala',
    },
    {
      id: 'exponential', label: 'Exponencial', desc: 'Ŷ = a · e^(bt)',
      tooltip: hasExternalLog
        ? 'DESHABILITADO: la serie ya fue transformada con log. Aplicar exponencial internamente haría log(log(Y)).'
        : 'Crecimiento o decaimiento exponencial puro. Internamente aplica log(Y) ~ t. Si la serie ya fue transformada externamente, este modelo es redundante.',
      disabled: hasExternalLog,
      disabledReason: 'Redundante: la serie ya está en log-escala',
    },
    {
      id: 'arima', label: 'ARIMA automático', desc: 'auto.arima() · selección por AIC',
      tooltip: hasExternalDiff
        ? 'Recomendado cuando la serie fue diferenciada externamente. auto.arima buscará ARIMA(p,0,q) sobre la serie ya diferenciada.'
        : 'Ajusta automáticamente el mejor ARIMA mediante criterio AIC. Incluye estacionalidad automática si freq > 1.',
    },
  ]

  const families = allFamilies.filter(f => !f.disabled)
  const disabledFamilies = allFamilies.filter(f => f.disabled)

  const seasonalOpts = [
    { id: 'none',    label: 'Sin estacionalidad', tooltip: 'No incluye componente estacional en el modelo.' },
    { id: 'dummy',   label: 'Variables dummy',    tooltip: 'Crea S-1 indicadoras de período estacional (meses, trimestres…). Ref = primer período (Ene / T1). Los coeficientes miden la desviación respecto a ese período base.' },
    { id: 'fourier', label: 'Ondas de Fourier',   tooltip: 'Modela la estacionalidad con senos y cosenos. Más flexible para ciclos irregulares.' },
  ]

  const isArima = safeFamily === 'arima'

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

      {/* Banner de coherencia transformación→modelo */}
      <TransformBanner transformCode={transformCode} />

      {/* ── Familia del modelo ── */}
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-stone-700 mb-2">
          Familia del modelo
          <TooltipIcon text="Elige el tipo de ecuación que mejor describe el comportamiento de tu serie. Algunos modelos pueden estar deshabilitados si son redundantes con la transformación aplicada en el paso 3." />
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {families.map((f) => (
            <button key={f.id}
              onClick={() => setModelParams({ family: f.id })}
              title={f.tooltip}
              className={['p-3 rounded-xl border-2 text-left transition-all',
                safeFamily === f.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-stone-200 hover:border-blue-300',
              ].join(' ')}>
              <div className="font-semibold text-sm text-stone-800">{f.label}</div>
              <code className="text-xs text-stone-500">{f.desc}</code>
            </button>
          ))}
        </div>

        {/* Familias deshabilitadas (informativo) */}
        {disabledFamilies.length > 0 && (
          <div className="mt-2 p-2.5 bg-stone-100 border border-stone-200 rounded-lg">
            <p className="text-xs text-stone-500 font-semibold mb-1">Modelos no disponibles con la transformación actual:</p>
            {disabledFamilies.map(f => (
              <p key={f.id} className="text-xs text-stone-400">
                <strong>{f.label}</strong> — {f.disabledReason}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Opciones adicionales (solo si no es ARIMA) ── */}
      {!isArima && (
        <>
          {/* Grado polinomial */}
          {safeFamily === 'polynomial' && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-stone-700 mb-2">
                Grado del polinomio
                <TooltipIcon text="Grado 1 = línea recta, 2 = parábola, 3 = cúbica. Evita grados > 4: el modelo sobreajusta la muestra y pronostica mal fuera de la muestra." />
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
                <TooltipIcon text="Incluir un componente estacional captura el patrón que se repite cada período (ej. pico en diciembre, caída en enero). Variables dummy: S-1 indicadoras. Fourier: senos/cosenos — más flexible para patrones complejos." />
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
                  <span className="text-xs text-stone-400">(máx. {Math.floor(activeSeries.freq / 2)})</span>
                </div>
              )}
            </div>
          )}

          {/* Corrección log INTERNA — solo visible si NO hay log externo */}
          {/* Si el usuario ya aplicó log(x) en paso 3, este checkbox causaría   */}
          {/* un doble-log (log de log), que se deshabilita aquí por coherencia. */}
          {!hasExternalLog && !hasExternalSqrt && !hasExternalDiff && (
            <div className="mb-5 flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <input type="checkbox" id="transformLog"
                checked={modelParams.transformLog}
                onChange={(e) => setModelParams({ transformLog: e.target.checked })}
                className="mt-0.5" />
              <label htmlFor="transformLog" className="text-sm text-purple-800 cursor-pointer">
                <strong>Aplicar log internamente</strong> — El backend toma log(Y) antes de ajustar
                y aplica corrección de sesgo de Duan al pronosticar.
                <TooltipIcon text="Útil cuando la serie tiene varianza multiplicativa pero NO la transformaste en el paso 3. Los pronósticos se devuelven a escala original multiplicados por el factor de Duan: E[exp(Ẑ + ε)] = exp(Ẑ) · mean(exp(êᵢ))." />
              </label>
            </div>
          )}

          {/* Nota informativa cuando hay log externo */}
          {hasExternalLog && (
            <div className="mb-5 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800">
              <strong>Back-transform automático activado:</strong> La serie ya está en escala log — el
              ajuste opera en log-escala y el back-transform exp() + corrección de Duan se aplica
              automáticamente en pronósticos. No es necesario activar ningún checkbox adicional.
            </div>
          )}
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

      {!fittedModel && !loading && (
        <p className="text-xs text-stone-400 mt-2">
          💡 Tras ajustar, revisa los diagnósticos de residuales para validar que el modelo captura correctamente la estructura de la serie.
          💡 Tras ajustar, revisa los diagnósticos de residuales para validar que el modelo captura correctamente la estructura de la serie.
        </p>
      )}

      {fittedModel && <ModelResults model={fittedModel} />}
    </div>
  )
}
