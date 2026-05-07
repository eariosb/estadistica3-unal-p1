'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/report/page.tsx  —  Paso 7: Informe del análisis
// ══════════════════════════════════════════════════════════════════════════════

import { useTimeSightStore, timeSightStore, FREQ_LABELS } from '@/lib/timesight-store'
import { useRouter } from 'next/navigation'

function Step({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className={['flex items-start gap-3 p-3 rounded-xl border',
      ok ? 'bg-green-50 border-green-200' : 'bg-stone-50 border-stone-200'].join(' ')}>
      <span className={['w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5',
        ok ? 'bg-green-600 text-white' : 'bg-stone-300 text-stone-600'].join(' ')}>
        {ok ? '✓' : '—'}
      </span>
      <div>
        <div className={['text-sm font-semibold', ok ? 'text-green-800' : 'text-stone-500'].join(' ')}>
          {label}
        </div>
        {detail && <div className="text-xs text-stone-500 mt-0.5">{detail}</div>}
      </div>
    </div>
  )
}

export default function ReportPage() {
  const router = useRouter()
  const { series, exploreResult, transformedSeries, fittedModel, diagnostics, forecastResult, transformCode } =
    useTimeSightStore()

  const allDone = !!series && !!fittedModel && !!forecastResult

  const handlePrint = () => window.print()

  const formatStart = (s: [number, number]) => `${s[0]} (período ${s[1]})`

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">📄 Paso 7 — Informe del análisis</h1>
        <p className="text-stone-500 mt-1">
          Resumen completo del flujo de análisis de TimeSight.
        </p>
      </div>

      {/* Progreso del análisis */}
      <div className="space-y-2 mb-6">
        <Step label="Datos cargados" ok={!!series}
          detail={series ? `${series.name} | n=${series.n} | ${FREQ_LABELS[series.freq]} | inicio: ${formatStart(series.start)}` : undefined} />
        <Step label="Exploración completada" ok={!!exploreResult}
          detail={exploreResult ? `ADF p=${exploreResult.adf.pvalue.toFixed(4)}, KPSS p=${exploreResult.kpss.pvalue.toFixed(4)}` : undefined} />
        <Step label="Transformación aplicada" ok={!!transformedSeries}
          detail={transformedSeries ? `Código: ${transformCode}` : 'Ninguna (serie original)'} />
        <Step label="Modelo ajustado" ok={!!fittedModel}
          detail={fittedModel ? `${fittedModel.name} | AIC=${fittedModel.aic?.toFixed(3)} | RMSE=${fittedModel.rmse?.toFixed(3)}` : undefined} />
        <Step label="Diagnósticos ejecutados" ok={!!diagnostics}
          detail={diagnostics ? `${diagnostics.overallOk ? 'Todos los supuestos se cumplen' : 'Algunos supuestos no se cumplen'}` : undefined} />
        <Step label="Pronóstico generado" ok={!!forecastResult}
          detail={forecastResult ? `Horizonte: ${forecastResult.horizon} períodos | Corrección: ${forecastResult.method}` : undefined} />
      </div>

      {/* Informe textual */}
      {series && (
        <div className="p-6 bg-white border border-stone-200 rounded-xl shadow-sm space-y-4 print:shadow-none" id="ts-report">
          <div className="border-b border-stone-200 pb-3">
            <h2 className="text-xl font-bold text-stone-900">Análisis de Serie de Tiempo</h2>
            <p className="text-sm text-stone-500">{new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
          </div>

          <section>
            <h3 className="font-semibold text-stone-800 mb-1">1. Descripción de los datos</h3>
            <p className="text-sm text-stone-700">
              Serie: <strong>{series.name}</strong>. Longitud n={series.n} observaciones.
              Frecuencia: {FREQ_LABELS[series.freq]} (freq={series.freq}).
              Período de inicio: {formatStart(series.start)}.
              Fuente: {series.source === 'builtin' ? 'dataset de R incluido en el curso' :
                series.source === 'upload' ? 'archivo CSV cargado por el usuario' : 'entrada manual'}.
            </p>
          </section>

          {exploreResult && (
            <section>
              <h3 className="font-semibold text-stone-800 mb-1">2. Exploración</h3>
              <p className="text-sm text-stone-700">
                Estadísticos básicos: media={exploreResult.mean?.toFixed(2)},
                desviación estándar={exploreResult.std?.toFixed(2)},
                rango=[{exploreResult.min?.toFixed(2)}, {exploreResult.max?.toFixed(2)}].
              </p>
              <p className="text-sm text-stone-700 mt-1">
                <strong>ADF:</strong> {exploreResult.adf.interpretation} (p={exploreResult.adf.pvalue.toFixed(4)}).
                <strong className="ml-2">KPSS:</strong> {exploreResult.kpss.interpretation} (p={exploreResult.kpss.pvalue.toFixed(4)}).
              </p>
            </section>
          )}

          {transformedSeries && (
            <section>
              <h3 className="font-semibold text-stone-800 mb-1">3. Transformación</h3>
              <p className="text-sm text-stone-700">
                Se aplicó la transformación <code className="bg-stone-100 px-1 rounded">{transformCode}</code> a la serie original.
                La serie transformada tiene n={transformedSeries.n} observaciones.
              </p>
            </section>
          )}

          {fittedModel && (
            <section>
              <h3 className="font-semibold text-stone-800 mb-1">4. Modelo</h3>
              <p className="text-sm text-stone-700">
                Se ajustó el modelo <strong>{fittedModel.name}</strong>.
                Criterios de información: AIC={fittedModel.aic?.toFixed(3)}, BIC={fittedModel.bic?.toFixed(3)}.
                Error de entrenamiento: RMSE={fittedModel.rmse?.toFixed(3)},
                MAPE={fittedModel.mape?.toFixed(1)}%.
              </p>
              {fittedModel.equation && (
                <p className="text-xs font-mono bg-stone-50 border border-stone-200 rounded p-2 mt-2 break-all">
                  {fittedModel.equation}
                </p>
              )}
            </section>
          )}

          {diagnostics && (
            <section>
              <h3 className="font-semibold text-stone-800 mb-1">5. Diagnósticos</h3>
              <p className="text-sm text-stone-700">{diagnostics.summary}</p>
              <ul className="mt-1 space-y-0.5">
                {diagnostics.tests.map((t) => (
                  <li key={t.name} className="text-xs text-stone-600">
                    {t.passed ? '✅' : '⚠️'} {t.name}: p={t.pvalue.toFixed(4)} — {t.interpretation}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {forecastResult && (
            <section>
              <h3 className="font-semibold text-stone-800 mb-1">6. Pronóstico</h3>
              <p className="text-sm text-stone-700">
                Horizonte: {forecastResult.horizon} períodos.
                Método de corrección de sesgo: <strong>{forecastResult.method}</strong>
                {forecastResult.smearingFactor !== 1 && ` (factor de Duan: ${forecastResult.smearingFactor.toFixed(4)})`}.
              </p>
              <p className="text-sm text-stone-700 mt-1">
                Pronóstico periodo t+1: <strong>{forecastResult.forecast[0]?.toFixed(3)}</strong>
                {' '}(IC 95%: [{forecastResult.lower95[0]?.toFixed(3)}, {forecastResult.upper95[0]?.toFixed(3)}]).
              </p>
            </section>
          )}

          <div className="border-t border-stone-200 pt-3 text-xs text-stone-400">
            Generado por TimeSight 2.0 — Mini Curso de Series de Tiempo · UNAL
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="mt-5 flex gap-3">
        {allDone && (
          <button onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-sm">
            🖨️ Imprimir / Guardar PDF
          </button>
        )}
        <button onClick={() => timeSightStore.reset()}
          className="px-5 py-2.5 border border-stone-300 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition-colors">
          ↺ Nuevo análisis
        </button>
      </div>

      {!series && (
        <div className="mt-6 text-center py-12">
          <p className="text-stone-400 mb-3">El informe estará disponible cuando completes el análisis.</p>
          <button onClick={() => router.push('/timesight/data')}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">
            Comenzar análisis →
          </button>
        </div>
      )}

      <style>{`
        @media print {
          aside, nav, button { display: none !important; }
          #ts-report { border: none; padding: 0; }
        }
      `}</style>
    </div>
  )
}
