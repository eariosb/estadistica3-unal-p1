// ══════════════════════════════════════════════════════════════════════════════
// lib/timesight-api.ts  —  Funciones de llamada a la API de TimeSight
// Cada función llama al proxy Next.js /api/timesight/* que reenvía a R.
// ══════════════════════════════════════════════════════════════════════════════

import type {
  TSeries,
  ExploreResult,
  FittedModel,
  ModelParams,
  DiagnosticsResult,
  ForecastResult,
  BiasCorrection,
  TransformResult,
} from './timesight-store'

const API_BASE = '/api/timesight'

// ── Helpers ───────────────────────────────────────────────────────────────────
// El proxy Next.js acepta { endpoint, payload } y reenvía a R /timesight/<endpoint>

async function postJson<T>(endpoint: string, payload: unknown): Promise<T> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, payload }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Error ${res.status}`)
  }
  return data as T
}

// ── POST /timesight/explore ───────────────────────────────────────────────────

export async function apiExplore(series: TSeries): Promise<ExploreResult> {
  return postJson<ExploreResult>('explore', {
    series: series.values,
    freq: series.freq,
    start: series.start,
    name: series.name,
  })
}

// ── POST /timesight/transform ─────────────────────────────────────────────────

export async function apiTransform(
  series: TSeries,
  code: string
): Promise<TransformResult> {
  return postJson<TransformResult>('transform', {
    series: series.values,
    freq: series.freq,
    start: series.start,
    code,
  })
}

// ── POST /timesight/model-fit ─────────────────────────────────────────────────

export async function apiModelFit(
  series: TSeries,
  params: ModelParams
): Promise<FittedModel> {
  return postJson<FittedModel>('model-fit', {
    series: series.values,
    freq: series.freq,
    start: series.start,
    family: params.family,
    degree: params.degree,
    seasonal: params.seasonal,
    harmonics: params.harmonics,
    transformLog: params.transformLog,
  })
}

// ── POST /timesight/diagnose ──────────────────────────────────────────────────

export async function apiDiagnose(
  series: TSeries,
  model: FittedModel
): Promise<DiagnosticsResult> {
  return postJson<DiagnosticsResult>('diagnose', {
    series: series.values,
    freq: series.freq,
    start: series.start,
    residuals: model.residuals,
    fitted: model.fitted,
    nparams: Object.keys(model.coefficients).length,
  })
}

// ── POST /timesight/forecast ──────────────────────────────────────────────────

export async function apiForecast(
  series: TSeries,
  model: FittedModel,
  horizon: number,
  confidenceLevel: number,
  biasCorrection: BiasCorrection
): Promise<ForecastResult> {
  return postJson<ForecastResult>('forecast', {
    series: series.values,
    freq: series.freq,
    start: series.start,
    family: model.family,
    degree: model.params.degree,
    seasonal: model.params.seasonal,
    harmonics: model.params.harmonics,
    transformLog: model.params.transformLog,
    smearingFactor: model.smearingFactor ?? 1,
    horizon,
    confidenceLevel,
    biasCorrection,
  })
}

// ── Dataset de ejemplo (built-in R) ──────────────────────────────────────────

export interface BuiltinDataset {
  id: string
  label: string
  description: string
  freq: number
  start: [number, number]
  n: number
}

export const BUILTIN_DATASETS: BuiltinDataset[] = [
  {
    id: 'AirPassengers',
    label: 'AirPassengers',
    description: 'Pasajeros aéreos mensuales (1949–1960)',
    freq: 12,
    start: [1949, 1],
    n: 144,
  },
  {
    id: 'co2',
    label: 'CO₂ Mauna Loa',
    description: 'Concentración de CO₂ mensual (1959–1997)',
    freq: 12,
    start: [1959, 1],
    n: 468,
  },
  {
    id: 'JohnsonJohnson',
    label: 'Johnson & Johnson',
    description: 'Ganancias trimestrales (1960–1980)',
    freq: 4,
    start: [1960, 1],
    n: 84,
  },
  {
    id: 'Nile',
    label: 'Río Nilo',
    description: 'Caudal anual del Nilo (1871–1970)',
    freq: 1,
    start: [1871, 1],
    n: 100,
  },
  {
    id: 'nottem',
    label: 'Temperaturas Nottingham',
    description: 'Temperaturas mensuales (1920–1939)',
    freq: 12,
    start: [1920, 1],
    n: 240,
  },
  {
    id: 'sunspot.year',
    label: 'Manchas solares',
    description: 'Manchas solares anuales (1700–1988)',
    freq: 1,
    start: [1700, 1],
    n: 289,
  },
  {
    id: 'UKgas',
    label: 'Gas UK',
    description: 'Consumo de gas en UK trimestral (1960–1986)',
    freq: 4,
    start: [1960, 1],
    n: 108,
  },
  {
    id: 'lynx',
    label: 'Linces Canadá',
    description: 'Capturas anuales de linces (1821–1934)',
    freq: 1,
    start: [1821, 1],
    n: 114,
  },
]

// Obtiene datos de un dataset builtin via R
export async function apiGetBuiltin(datasetId: string): Promise<{ values: number[] }> {
  return postJson<{ values: number[] }>('builtin', { dataset: datasetId })
}

// ── Parse CSV simple (browser) ────────────────────────────────────────────────

export interface ParsedCSV {
  headers: string[]
  rows: number[][]
  raw: string[][]
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('El CSV debe tener al menos 2 filas')

  // Detectar separador
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ''))

  const raw: string[][] = []
  const rows: number[][] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''))
    raw.push(cols)
    const nums = cols.map((c) => {
      const n = parseFloat(c.replace(',', '.'))
      return isNaN(n) ? NaN : n
    })
    rows.push(nums)
  }

  return { headers, rows, raw }
}

export function extractColumn(parsed: ParsedCSV, colIndex: number): number[] {
  return parsed.rows.map((r) => r[colIndex]).filter((v) => !isNaN(v))
}
