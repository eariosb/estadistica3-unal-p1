'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/transform/page.tsx  —  Paso 3: Transformación de la serie
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTimeSightStore } from '@/lib/timesight-store'
import { apiTransform } from '@/lib/timesight-api'

const PRESETS = [
  { label: 'Logaritmo natural', code: 'log(x)', desc: 'Estabiliza varianza multiplicativa' },
  { label: 'Raíz cuadrada', code: 'sqrt(x)', desc: 'Estabiliza varianza moderada' },
  { label: 'Primera diferencia', code: 'diff(x)', desc: 'Elimina tendencia lineal' },
  { label: 'Diferencia estacional', code: 'diff(x, lag=freq)', desc: 'Elimina estacionalidad' },
  { label: 'Log + diferencia', code: 'diff(log(x))', desc: 'Tasas de cambio porcentual' },
  { label: 'Sin transformación', code: 'x', desc: 'Usar serie original' },
]

function MiniSparkline({ values }: { values: number[] }) {
  if (!values.length) return null
  const W = 400; const H = 80
  const pad = { t: 8, r: 8, b: 8, l: 8 }
  const valid = values.filter(isFinite)
  if (valid.length < 2) return null
  const min = Math.min(...valid); const max = Math.max(...valid)
  const range = max - min || 1
  const n = valid.length
  const px = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r)
  const py = (v: number) => pad.t + ((max - v) / range) * (H - pad.t - pad.b)
  const pts = valid.map((v, i) => `${px(i)},${py(v)}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full rounded">
      <polyline points={pts} fill="none" stroke="#1d4ed8" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function TransformPage() {
  const router = useRouter()
  const { series, transformedSeries, setTransformedSeries, setTransformCode, transformCode } =
    useTimeSightStore()
  const [code, setCode] = useState(transformCode || 'log(x)')
  const [preview, setPreview] = useState<number[]>(transformedSeries?.values ?? [])
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(!!transformedSeries)

  if (!series) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">⚠️ Primero carga una serie de tiempo.</p>
        <button onClick={() => router.push('/timesight/data')}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">← Ir a Datos</button>
      </div>
    )
  }

  const handlePreview = async () => {
    setLoading(true); setError(null)
    try {
      const result = await apiTransform(series, code)
      setPreview(result.newValues)
      setWarnings(result.warnings ?? [])
      setApplied(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al transformar')
    } finally { setLoading(false) }
  }

  const handleApply = async () => {
    if (!preview.length) { await handlePreview(); return }
    setTransformedSeries({
      ...series,
      values: preview,
      n: preview.length,
      name: `${series.name} [${code}]`,
    })
    setTransformCode(code)
    setApplied(true)
    router.push('/timesight/model')
  }

  const handleSkip = () => {
    setTransformedSeries(null)
    setTransformCode('')
    router.push('/timesight/model')
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">⚙️ Paso 3 — Transformación</h1>
        <p className="text-stone-500 mt-1">
          Transforma la serie para estabilizar varianza o eliminar tendencia.{' '}
          <strong>Este paso es opcional.</strong>
        </p>
      </div>

      {/* Presets */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-stone-600 mb-2">Transformaciones rápidas:</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.code} onClick={() => { setCode(p.code); setApplied(false) }}
              title={p.desc}
              className={['px-3 py-1 rounded-full text-sm border transition-colors',
                code === p.code
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-stone-300 text-stone-600 hover:border-blue-400',
              ].join(' ')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor de código */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-stone-600 mb-1">
          Código R (usa <code>x</code> como nombre de la serie y <code>freq</code> como frecuencia):
        </label>
        <div className="relative">
          <textarea
            value={code}
            onChange={(e) => { setCode(e.target.value); setApplied(false) }}
            rows={3}
            spellCheck={false}
            className="w-full font-mono text-sm bg-stone-900 text-green-300 rounded-xl p-4 border border-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Ej: diff(log(x))"
          />
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Variables disponibles: <code>x</code> (serie original), <code>freq</code> (frecuencia={series.freq})
        </p>
      </div>

      {/* Botones */}
      <div className="flex gap-3 mb-5">
        <button onClick={handlePreview} disabled={loading}
          className="px-4 py-2 bg-stone-700 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-60 transition-colors">
          {loading ? '⚙️ Calculando…' : '👁 Vista previa'}
        </button>
        <button onClick={handleApply} disabled={loading || !preview.length}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors">
          {applied ? '✅ Aplicada' : '✓ Aplicar y continuar'}
        </button>
        <button onClick={handleSkip}
          className="px-4 py-2 border border-stone-300 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition-colors">
          Saltar (sin transformar) →
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠️ {error}</div>
      )}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          ⚠️ {warnings.join(' | ')}
        </div>
      )}

      {/* Comparación */}
      {preview.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-stone-500 mb-2">Serie original</p>
            <MiniSparkline values={series.values} />
          </div>
          <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-blue-600 mb-2">Transformada: <code>{code}</code></p>
            <MiniSparkline values={preview} />
          </div>
        </div>
      )}

      {applied && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          ✅ Transformación aplicada. El modelado usará la serie transformada.
        </div>
      )}
    </div>
  )
}
