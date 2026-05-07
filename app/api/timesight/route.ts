// ══════════════════════════════════════════════════════════════════════════════
// app/api/timesight/route.ts  —  Proxy genérico a cualquier endpoint TimeSight
//
// El cliente llama: POST /api/timesight  con { endpoint: "explore", payload: {...} }
// Este proxy reenvía: POST http://localhost:8000/timesight/<endpoint>
// ══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'

const R_BACKEND = process.env.R_BACKEND_URL ?? 'http://localhost:8000'
const R_SECRET  = process.env.R_BACKEND_SECRET ?? ''
const TIMEOUT   = 20_000   // ms

// Endpoints de TimeSight permitidos
const ALLOWED_ENDPOINTS = new Set([
  'explore',
  'transform',
  'model-fit',
  'diagnose',
  'forecast',
  'builtin',
])

export async function POST(req: NextRequest) {
  let body: { endpoint?: string; payload?: unknown }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { endpoint, payload } = body

  if (!endpoint || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json(
      { error: `Endpoint '${endpoint}' no permitido.` },
      { status: 400 }
    )
  }

  const rUrl = `${R_BACKEND}/timesight/${endpoint}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (R_SECRET) headers['X-Internal-Secret'] = R_SECRET

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)

  try {
    const rRes = await fetch(rUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload ?? {}),
      signal: controller.signal,
    })

    const data = await rRes.json()
    clearTimeout(timer)
    return NextResponse.json(data, { status: rRes.ok ? 200 : rRes.status })
  } catch (err: unknown) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'El servidor R tardó demasiado. Simplifica los parámetros.' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: 'No se pudo conectar con el servidor R. ¿Está corriendo Plumber?' },
      { status: 503 }
    )
  }
}
