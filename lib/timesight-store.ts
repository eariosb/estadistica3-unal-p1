// ══════════════════════════════════════════════════════════════════════════════
// lib/timesight-store.ts  —  Estado global de TimeSight
// Implementación propia sin zustand: módulo singleton + suscriptores React
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Freq = 1 | 2 | 4 | 12 | 52 | 365

export const FREQ_LABELS: Record<number, string> = {
  1: 'Anual', 2: 'Semestral', 4: 'Trimestral',
  12: 'Mensual', 52: 'Semanal', 365: 'Diaria',
}

export interface TSeries {
  values: number[]
  freq: Freq
  start: [number, number]
  name: string
  n: number
  source: 'upload' | 'builtin' | 'manual'
}

export interface StatTest {
  name: string; statistic: number; pvalue: number
  interpretation: string; isStationary?: boolean
}

export interface ExploreResult {
  n: number; mean: number; std: number; min: number; max: number
  decompType: 'additive' | 'multiplicative' | 'none'
  trend?: number[]; seasonal?: number[]; remainder?: number[]
  acfLags: number[]; acfValues: number[]
  pacfLags: number[]; pacfValues: number[]
  adf: StatTest; kpss: StatTest
  plots: string[]
}

export type ModelFamily = 'polynomial' | 'log' | 'exponential' | 'arima' | 'ets'

export interface ModelParams {
  family: ModelFamily; degree: number
  seasonal: 'none' | 'dummy' | 'fourier'; harmonics: number; transformLog: boolean
  externalTransform?: string  // 'none' | 'log' | 'sqrt' | 'diff' | 'logdiff'
}

export interface ArimaOrder {
  p: number; d: number; q: number
  P?: number; D?: number; Q?: number; S?: number
}

export interface FittedModel {
  name: string; family: ModelFamily; params: ModelParams
  equation: string; aic: number; bic: number; rmse: number; mape: number
  coefficients: Record<string, number>; pvalues: Record<string, number>
  fitted: number[]; residuals: number[]; smearingFactor?: number
  scaleNote?: string   // Descripción de la escala de los valores ajustados/residuales
  arimaOrder?: ArimaOrder  // Solo para modelos ARIMA
}

export interface DiagTest {
  name: string; statistic: number; pvalue: number; passed: boolean; interpretation: string
}

export interface DiagnosticsResult {
  tests: DiagTest[]; plots: string[]; overallOk: boolean; summary: string
}

export type BiasCorrection = 'duan' | 'lognormal' | 'none'

export interface HorizonMetric {
  h: number; mae: number; rmse: number; mape: number
}

export interface CrossValResult {
  horizonMetrics: HorizonMetric[]
  overall: { mae: number; rmse: number; mape: number; nFolds: number; initialWindow: number; horizon: number }
  plots: string[]
  nFolds: number
  initialWindow: number
  horizon: number
}

export interface ForecastResult {
  forecast: number[]; lower80: number[]; upper80: number[]
  lower95: number[]; upper95: number[]
  horizon: number; method: BiasCorrection; smearingFactor: number; plots: string[]
  scaleNote?: string  // Descripción de la escala de los pronósticos
}

export interface TransformResult {
  newValues: number[]; code: string; warnings: string[]; description: string
}

// ── Estado ────────────────────────────────────────────────────────────────────

export interface AnalysisState {
  series: TSeries | null
  exploreResult: ExploreResult | null
  transformedSeries: TSeries | null
  transformCode: string
  transformResult: TransformResult | null
  modelParams: ModelParams
  fittedModel: FittedModel | null
  diagnostics: DiagnosticsResult | null
  forecastHorizon: number
  confidenceLevel: number
  biasCorrection: BiasCorrection
  crossValResult: CrossValResult | null
  forecastResult: ForecastResult | null
  loadingStep: string | null
  errorMessage: string | null
}

const DEFAULT_MODEL_PARAMS: ModelParams = {
  family: 'polynomial', degree: 2, seasonal: 'none', harmonics: 2, transformLog: false,
}

const INITIAL: AnalysisState = {
  series: null, exploreResult: null,
  transformedSeries: null, transformCode: '', transformResult: null,
  modelParams: DEFAULT_MODEL_PARAMS, fittedModel: null, diagnostics: null,
  forecastHorizon: 12, confidenceLevel: 95, biasCorrection: 'duan',
  crossValResult: null, forecastResult: null, loadingStep: null, errorMessage: null,
}

// ── Store singleton ───────────────────────────────────────────────────────────

let _state: AnalysisState = { ...INITIAL }
const _listeners = new Set<() => void>()

function notify() { _listeners.forEach(fn => fn()) }

function setState(partial: Partial<AnalysisState>) {
  _state = { ..._state, ...partial }
  notify()
}

// ── API pública del store ─────────────────────────────────────────────────────

export const timeSightStore = {
  getState: () => _state,

  setSeries: (s: TSeries | null) => setState({
    series: s, exploreResult: null, transformedSeries: null,
    transformCode: '', transformResult: null, fittedModel: null,
    diagnostics: null, forecastResult: null,
  }),

  setExploreResult: (r: ExploreResult | null) => setState({ exploreResult: r }),

  setTransformedSeries: (s: TSeries | null) => setState({
    transformedSeries: s, fittedModel: null, diagnostics: null, forecastResult: null,
  }),

  setTransformCode: (c: string) => setState({ transformCode: c }),
  setTransformResult: (r: TransformResult | null) => setState({ transformResult: r }),

  setModelParams: (p: Partial<ModelParams>) => setState({
    modelParams: { ..._state.modelParams, ...p },
    fittedModel: null, diagnostics: null, forecastResult: null,
  }),

  setFittedModel: (m: FittedModel | null) => setState({
    fittedModel: m, diagnostics: null, forecastResult: null,
  }),

  setDiagnostics: (d: DiagnosticsResult | null) => setState({ diagnostics: d }),

  setCrossValResult: (r: CrossValResult | null) => setState({ crossValResult: r }),

  setForecastHorizon: (h: number) => setState({ forecastHorizon: h, forecastResult: null }),
  setConfidenceLevel: (l: number) => setState({ confidenceLevel: l, forecastResult: null }),
  setBiasCorrection: (m: BiasCorrection) => setState({ biasCorrection: m, forecastResult: null }),
  setForecastResult: (f: ForecastResult | null) => setState({ forecastResult: f }),

  setLoading: (step: string | null) => setState({ loadingStep: step, errorMessage: null }),
  setError: (msg: string | null) => setState({ errorMessage: msg, loadingStep: null }),

  reset: () => setState({ ...INITIAL }),

  getActiveSeries: () => _state.transformedSeries ?? _state.series,
}

export function useTimeSightStore(): AnalysisState & typeof timeSightStore {
  const [, forceRender] = useState(0)
  useEffect(() => {
    const fn = () => forceRender(n => n + 1)
    _listeners.add(fn)
    return () => { _listeners.delete(fn) }
  }, [])

  return { ..._state, ...timeSightStore }
}
