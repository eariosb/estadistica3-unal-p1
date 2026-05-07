'use client'

// ══════════════════════════════════════════════════════════════════════════════
// app/timesight/data/page.tsx  —  Paso 1: Carga de datos
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BUILTIN_DATASETS,
  parseCSV,
  extractColumn,
  apiGetBuiltin,
  type ParsedCSV,
} from '@/lib/timesight-api'
import { useTimeSightStore, type Freq, FREQ_LABELS } from '@/lib/timesight-store'

// ── Mini gráfico SVG de la serie ──────────────────────────────────────────────

function SeriesSparkline({ values }: { values: number[] }) {
  if (!values.length) return null
  const W = 560
  const H = 120
  const pad = { top: 12, right: 12, bottom: 20, left: 42 }

  const valid = values.filter(isFinite)
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const n = valid.length

  const px = (i: number) => pad.left + (i / (n - 1)) * (W - pad.left - pad.right)
  const py = (v: number) => pad.top + ((max - v) / range) * (H - pad.top - pad.bottom)

  const points = valid.map((v, i) => `${px(i)},${py(v)}`).join(' ')
  const area = `M ${px(0)},${py(valid[0])} ` +
    valid.map((v, i) => `L ${px(i)},${py(v)}`).join(' ') +
    ` L ${px(n - 1)},${H - pad.bottom} L ${px(0)},${H - pad.bottom} Z`

  const ticks = 4
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    min + (range * i) / ticks
  )

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: W }}>
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid y */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={pad.left} y1={py(t)} x2={W - pad.right} y2={py(t)}
            stroke="#e7e5e4" strokeWidth="1"
          />
          <text x={pad.left - 4} y={py(t) + 4} textAnchor="end"
            fontSize="9" fill="#78716c">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      {/* Área */}
      <path d={area} fill="url(#area-grad)" />
      {/* Línea */}
      <polyline points={points} fill="none" stroke="#1d4ed8" strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* Eje X */}
      <line x1={pad.left} y1={H - pad.bottom} x2={W - pad.right} y2={H - pad.bottom}
        stroke="#a8a29e" strokeWidth="1" />
      <text x={pad.left} y={H} fontSize="9" fill="#78716c">1</text>
      <text x={W - pad.right} y={H} textAnchor="end" fontSize="9" fill="#78716c">{n}</text>
    </svg>
  )
}

// ── Tarjeta de dataset builtin ────────────────────────────────────────────────

function DatasetCard({
  ds,
  selected,
  onSelect,
}: {
  ds: (typeof BUILTIN_DATASETS)[0]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        'text-left p-3 rounded-lg border-2 transition-all duration-150',
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-stone-200 hover:border-blue-300 hover:bg-stone-50',
      ].join(' ')}
    >
      <div className="font-semibold text-sm text-stone-800">{ds.label}</div>
      <div className="text-xs text-stone-500 mt-0.5">{ds.description}</div>
      <div className="text-xs text-stone-400 mt-1">
        n={ds.n} · {FREQ_LABELS[ds.freq]} · desde {ds.start[0]}
      </div>
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Página principal
// ══════════════════════════════════════════════════════════════════════════════

type Tab = 'builtin' | 'upload'

export default function DataPage() {
  const router = useRouter()
  const { setSeries, series } = useTimeSightStore()

  const [tab, setTab] = useState<Tab>('builtin')
  const [selectedDs, setSelectedDs] = useState<string>(series?.name ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preview
  const [previewValues, setPreviewValues] = useState<number[]>(series?.values ?? [])
  const [previewName, setPreviewName] = useState<string>(series?.name ?? '')

  // CSV state
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [colIndex, setColIndex] = useState<number>(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Config
  const [freq, setFreq] = useState<Freq>(series?.freq ?? 12)
  const [startYear, setStartYear] = useState<number>(series?.start[0] ?? 2000)
  const [startPer, setStartPer] = useState<number>(series?.start[1] ?? 1)
  const [seriesName, setSeriesName] = useState<string>(series?.name ?? '')

  // ── Seleccionar dataset builtin ───────────────────────────────────────────

  const handleBuiltinSelect = async (ds: (typeof BUILTIN_DATASETS)[0]) => {
    setSelectedDs(ds.id)
    setLoading(true)
    setError(null)
    try {
      const { values } = await apiGetBuiltin(ds.id)
      setPreviewValues(values)
      setPreviewName(ds.label)
      setFreq(ds.freq as Freq)
      setStartYear(ds.start[0])
      setStartPer(ds.start[1])
      setSeriesName(ds.label)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar el dataset')
    } finally {
      setLoading(false)
    }
  }

  // ── Cargar CSV ────────────────────────────────────────────────────────────

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const p = parseCSV(text)
        setParsed(p)
        setColIndex(0)
        setPreviewValues(extractColumn(p, 0))
        setPreviewName(file.name.replace(/\.[^.]+$/, ''))
        setSeriesName(file.name.replace(/\.[^.]+$/, ''))
        setError(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al parsear el CSV')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleColChange = (idx: number) => {
    if (!parsed) return
    setColIndex(idx)
    setPreviewValues(extractColumn(parsed, idx))
  }

  // ── Usar esta serie ───────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!previewValues.length) return
    setSeries({
      values: previewValues,
      freq,
      start: [startYear, startPer],
      name: seriesName || previewName,
      n: previewValues.length,
      source: tab === 'builtin' ? 'builtin' : 'upload',
    })
    router.push('/timesight/explore')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">
          📂 Paso 1 — Carga de datos
        </h1>
        <p className="text-stone-500 mt-1">
          Selecciona un dataset de ejemplo o sube tu propio archivo CSV para comenzar el análisis.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-stone-200">
        {(['builtin', 'upload'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-stone-500 hover:text-stone-700',
            ].join(' ')}
          >
            {t === 'builtin' ? '🗃️ Datasets de ejemplo' : '⬆️ Subir CSV'}
          </button>
        ))}
      </div>

      {/* Contenido del tab */}
      {tab === 'builtin' ? (
        <div>
          <p className="text-sm text-stone-600 mb-4">
            Estos son los datasets de series de tiempo incluidos en el curso de R.
            Ideales para practicar antes de trabajar con tus propios datos.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {BUILTIN_DATASETS.map((ds) => (
              <DatasetCard
                key={ds.id}
                ds={ds}
                selected={selectedDs === ds.id}
                onSelect={() => handleBuiltinSelect(ds)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-stone-600 mb-4">
            Sube un archivo <code className="bg-stone-100 px-1 rounded">.csv</code> con la
            serie en una columna. Puede tener encabezado. Separador: coma o punto y coma.
          </p>

          {/* Drop zone */}
          <label
            className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f && fileRef.current) {
                const dt = new DataTransfer()
                dt.items.add(f)
                fileRef.current.files = dt.files
                handleFile({ target: fileRef.current } as React.ChangeEvent<HTMLInputElement>)
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <span className="text-3xl mb-2">📤</span>
            <span className="text-sm text-stone-600">
              Arrastra tu CSV aquí, o{' '}
              <span className="text-blue-600 underline">haz clic para seleccionar</span>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFile}
            />
          </label>

          {/* Selector de columna */}
          {parsed && (
            <div className="mt-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
              <p className="text-sm font-medium text-stone-700 mb-2">
                Columna de la serie ({parsed.headers.length} detectadas):
              </p>
              <div className="flex flex-wrap gap-2">
                {parsed.headers.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => handleColChange(i)}
                    className={[
                      'px-3 py-1 rounded-full text-sm border transition-colors',
                      colIndex === i
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-stone-600 border-stone-300 hover:border-blue-400',
                    ].join(' ')}
                  >
                    {h || `Col ${i + 1}`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">
                {previewValues.length} valores numéricos detectados
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 animate-pulse">
          Cargando datos desde el servidor R…
        </div>
      )}

      {/* Vista previa */}
      {previewValues.length > 0 && !loading && (
        <div className="mt-6 p-5 bg-white border border-stone-200 rounded-xl shadow-sm">
          <h2 className="font-semibold text-stone-800 mb-3">
            Vista previa: <span className="text-blue-700">{previewName}</span>
          </h2>

          <SeriesSparkline values={previewValues} />

          {/* Configuración de la serie */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Nombre de la serie
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="Ej: Ventas mensuales"
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Frecuencia
              </label>
              <select
                value={freq}
                onChange={(e) => setFreq(Number(e.target.value) as Freq)}
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {Object.entries(FREQ_LABELS).map(([f, label]) => (
                  <option key={f} value={f}>{label} (freq={f})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Año de inicio
              </label>
              <input
                type="number"
                value={startYear}
                min={1700}
                max={2100}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Período de inicio (1 = enero / Q1)
              </label>
              <input
                type="number"
                value={startPer}
                min={1}
                max={freq}
                onChange={(e) => setStartPer(Number(e.target.value))}
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Estadísticos rápidos */}
          <div className="mt-4 flex gap-4 text-xs text-stone-500">
            {[
              ['n', previewValues.length],
              ['Min', Math.min(...previewValues).toFixed(2)],
              ['Max', Math.max(...previewValues).toFixed(2)],
              ['Media', (previewValues.reduce((a, b) => a + b, 0) / previewValues.length).toFixed(2)],
            ].map(([label, val]) => (
              <span key={label} className="bg-stone-100 px-2 py-0.5 rounded">
                <strong>{label}:</strong> {val}
              </span>
            ))}
          </div>

          {/* Botón confirmar */}
          <button
            onClick={handleConfirm}
            className="mt-5 px-6 py-2.5 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-sm flex items-center gap-2"
          >
            Usar esta serie →
          </button>
        </div>
      )}

      {/* Si ya hay serie cargada, mostrar acceso rápido */}
      {series && !previewValues.length && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-800">
            ✅ Serie activa: <strong>{series.name}</strong> (n={series.n})
          </p>
          <button
            onClick={() => router.push('/timesight/explore')}
            className="mt-2 text-sm text-green-700 underline"
          >
            Ir a Explorar →
          </button>
        </div>
      )}
    </div>
  )
}
