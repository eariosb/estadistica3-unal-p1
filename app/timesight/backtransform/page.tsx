'use client'

// app/timesight/backtransform/page.tsx  --  Paso 5: Retorno a escala original
// Habilitado solo cuando se aplico una transformacion externa (log, sqrt, diff).
// Muestra la formula inversa, el factor Duan, el grafico y el R2 en escala original.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore } from '@/lib/timesight-store'
import { apiBackTransform, getExternalTransform } from '@/lib/timesight-api'
import type { BackTransformResult } from '@/lib/timesight-store'

// -- Imagen R con zoom -------------------------------------------------------

function RPlot({ b64, alt, caption }: { b64: string; alt: string; caption?: string }) {
  const [zoom, setZoom] = useState(false)
  return (
    <div>
      <img
        src={`data:image/png;base64,${b64}`}
        alt={alt}
        className="w-full rounded-lg border border-stone-200 cursor-zoom-in shadow-sm"
        style={{ maxHeight: 360, objectFit: 'contain', background: '#fff' }}
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

// -- Panel conceptual --------------------------------------------------------

function ConceptPanel({ ext }: { ext: string }) {
  const [open, setOpen] = useState(true)

  const transforms: Record<string, { name: string; why: string; inverse: string; note?: string }> = {
    log: {
      name: 'Transformacion logaritmica',
      why: 'Se aplica log(Y) para estabilizar la varianza cuando la serie tiene variabilidad creciente (heterocedasticidad multiplicativa). Es la mas comun en econometria y epidemiologia.',
      inverse: 'Para recuperar la escala original: Y_original = exp(Y_log)',
      note: 'Atencion: exp(E[Y_log]) subestima E[Y_original]. Se necesita el estimador de Duan: multiplicar por la media de exp(residuales).',
    },
    sqrt: {
      name: 'Transformacion de raiz cuadrada',
      why: 'Se aplica sqrt(Y) cuando la varianza crece con la media (datos de conteo, distribucion Poisson). Mas suave que el logaritmo.',
      inverse: 'Para recuperar la escala original: Y_original = Y_sqrt ^ 2',
      note: 'El sesgo de la transformacion inversa es menor que para log, pero sigue siendo positivo. Se aplica directamente sin correccion de smearing.',
    },
    diff: {
      name: 'Primera diferencia',
      why: 'Se aplica diff(Y) para eliminar una tendencia determinista o estabilizar la media (hacer la serie estacionaria). El modelo opera sobre cambios absolutos.',
      inverse: 'Para recuperar niveles: Y_t = Y_{t-1} + Delta_Y_t (acumulacion de diferencias desde el ultimo valor conocido).',
      note: 'La diferenciacion pierde la primera observacion. Los pronosticos en niveles requieren el ultimo valor observado como condicion inicial.',
    },
    logdiff: {
      name: 'Primera diferencia de log (tasas de cambio)',
      why: 'Se aplica diff(log(Y)) para hacer la serie estacionaria cuando hay tendencia exponencial. Equivale aproximadamente a la tasa de cambio porcentual.',
      inverse: 'Para recuperar niveles: Y_t = Y_{t-1} x exp(Delta_logY_t) (encadenamiento multiplicativo).',
      note: 'Las diferencias de log representan tasas de cambio relativas: delta_log(Y) ≈ (Y_t - Y_{t-1}) / Y_{t-1}.',
    },
  }

  const info = transforms[ext] ?? {
    name: 'Transformacion interna del modelo',
    why: 'El modelo aplica log(Y) internamente antes del ajuste.',
    inverse: 'Back-transform: exp(Yhat) x factor_Duan',
    note: undefined,
  }

  return (
    <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-blue-900 rounded-xl"
      >
        <span>Por que se aplico esta transformacion y como revertirla</span>
        <span className="text-xs opacity-60">{open ? 'Ocultar' : 'Ver explicacion'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-blue-900 leading-relaxed space-y-3">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-semibold text-blue-800 mb-1">{info.name}</p>
            <p className="text-blue-700 mb-2">{info.why}</p>
            <p className="font-mono bg-blue-50 px-2 py-1 rounded text-blue-800">
              {info.inverse}
            </p>
          </div>
          {info.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800">
              <strong>Nota estadistica:</strong> {info.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// -- Tarjeta de formula back-transform --------------------------------------

function FormulaCard({ result }: { result: BackTransformResult }) {
  const isDuan = result.smearingFactor !== 1 && result.smearingFactor > 0

  return (
    <div className="mb-5 p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-3">
      <h2 className="font-semibold text-stone-800 text-sm">Formula de back-transform aplicada</h2>

      <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-mono text-sm text-blue-800 break-all">
        {result.backtransformFormula}
      </div>

      {isDuan && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <p className="font-semibold mb-1">Estimador de Duan (correccion de sesgo)</p>
          <p>
            Al aplicar exp() a un valor predicho en escala log, se obtiene la mediana de Y, no
            la media. Para estimar la media (lo que generalmente se quiere), se multiplica por:
          </p>
          <p className="font-mono my-1 text-center text-amber-900">
            Factor Duan = mean(exp(residuales)) = {result.smearingFactor.toFixed(6)}
          </p>
          <p>
            Este factor compensa el sesgo hacia abajo que introduce la transformacion inversa
            (concavidad de exp). Es el estimador no parametrico de Duan (1983).
          </p>
        </div>
      )}

      {result.r2 != null && isFinite(result.r2) && (
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <span>R² en escala original:</span>
          <span
            className="font-bold text-sm"
            style={{ color: result.r2 > 0.8 ? '#10b981' : result.r2 > 0.5 ? '#f59e0b' : '#ef4444' }}
          >
            {result.r2.toFixed(4)}
          </span>
          <span className="text-stone-400">
            ({result.r2 > 0.8 ? 'Buen ajuste en escala original'
              : result.r2 > 0.5 ? 'Ajuste moderado'
              : 'Ajuste bajo — revisa el modelo'})
          </span>
        </div>
      )}
    </div>
  )
}

// -- Pagina principal --------------------------------------------------------

export default function BackTransformPage() {
  const router = useRouter()
  const {
    series,
    transformedSeries,
    transformCode,
    fittedModel,
    backTransformResult,
    setBackTransformResult,
  } = useTimeSightStore()

  const activeSeries = transformedSeries ?? series
  const extTransform = getExternalTransform(transformCode)
  const hasTransform = extTransform !== 'none' || (fittedModel?.params.transformLog === true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si no hay transformacion, redirigir
  if (!fittedModel) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">Primero ajusta un modelo en el paso anterior.</p>
        <button
          onClick={() => router.push('/timesight/model')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm"
        >
          Ir a Modelar
        </button>
      </div>
    )
  }

  if (!hasTransform) {
    return (
      <div className="text-center py-16 max-w-md mx-auto">
        <div className="text-4xl mb-4">🔄</div>
        <h2 className="text-lg font-semibold text-stone-700 mb-2">
          No hay transformacion activa
        </h2>
        <p className="text-stone-500 text-sm mb-6">
          Este paso solo aplica cuando se uso log, raiz cuadrada o diferencias en el paso de
          Transformar. El modelo fue ajustado directamente en la escala original de los datos.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/timesight/diagnostics')}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
          >
            Ir a Diagnosticos
          </button>
          <button
            onClick={() => router.push('/timesight/model')}
            className="px-4 py-2 border border-stone-300 text-stone-600 rounded-lg text-sm hover:bg-stone-50"
          >
            Volver a Modelar
          </button>
        </div>
      </div>
    )
  }

  const handleBackTransform = async () => {
    if (!series || !activeSeries) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiBackTransform(series, activeSeries, fittedModel, transformCode)
      setBackTransformResult(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al calcular back-transform')
    } finally {
      setLoading(false)
    }
  }

  const bt = backTransformResult

  const extLabel: Record<string, string> = {
    log: 'logaritmica [log(Y)]',
    sqrt: 'raiz cuadrada [sqrt(Y)]',
    diff: 'primera diferencia [diff(Y)]',
    logdiff: 'diferencia de log [diff(log(Y))]',
  }

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">
          Paso 5 — Retorno a escala original
        </h1>
        <p className="text-stone-500 mt-1">
          Transformacion activa:{' '}
          <strong className="text-blue-700">
            {extLabel[extTransform] ?? 'log interno del modelo'}
          </strong>
          {' '}· Modelo:{' '}
          <strong className="text-blue-700">{fittedModel.name}</strong>
        </p>
      </div>

      {/* Panel conceptual */}
      <ConceptPanel ext={extTransform} />

      {/* Boton de ejecucion */}
      {!bt && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800 mb-3">
            Se generara un grafico comparando la serie original con los valores ajustados
            del modelo despues de aplicar la transformacion inversa
            ({extLabel[extTransform] ?? 'log interno'}).
            Tambien se calculara el R² en escala original para evaluar la bondad de ajuste.
          </p>
          <button
            onClick={handleBackTransform}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <span className="flex gap-2 items-center">
                <span className="animate-spin inline-block">...</span>
                Calculando back-transform...
              </span>
            ) : (
              'Ver modelo en escala original'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Resultados */}
      {bt && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => { setBackTransformResult(null) }}
              className="text-xs text-blue-600 underline"
            >
              Re-calcular
            </button>
          </div>

          {/* Formula */}
          <FormulaCard result={bt} />

          {/* Grafico */}
          {bt.plots.length > 0 && (
            <div>
              <h2 className="font-semibold text-stone-800 mb-2">
                Serie original vs valores ajustados (escala original)
              </h2>
              <RPlot
                b64={bt.plots[0]}
                alt="Back-transform"
                caption="Linea gris: serie original. Linea azul: valores ajustados del modelo en escala original."
              />
            </div>
          )}

          {/* Escala nota si la hay */}
          {fittedModel.scaleNote && (
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600">
              <strong>Nota de escala del modelo:</strong> {fittedModel.scaleNote}
            </div>
          )}

          {/* Navegacion */}
          <div className="pt-4 border-t border-stone-200 flex gap-3">
            <button
              onClick={() => router.push('/timesight/diagnostics')}
              className="px-6 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-sm"
            >
              Ir a Diagnosticos
            </button>
            <button
              onClick={() => router.push('/timesight/model')}
              className="px-4 py-2 border border-stone-300 text-stone-600 rounded-lg text-sm hover:bg-stone-50"
            >
              Volver a Modelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
