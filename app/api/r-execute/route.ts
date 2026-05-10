/**
 * app/api/r-execute/route.ts
 *
 * Proxy seguro entre el frontend Next.js y el backend R (Plumber).
 *
 * Responsabilidades:
 *  1. Verificar autenticación del usuario (NextAuth session o token)
 *  2. Validar el payload de entrada
 *  3. Reenviar el código al endpoint R con timeout
 *  4. Normalizar la respuesta antes de devolver al cliente
 *
 * Configuración (variables de entorno):
 *  R_BACKEND_URL  → URL interna del contenedor R, ej: http://r-backend:8000
 *                   o http://localhost:8000 en desarrollo
 *  R_BACKEND_SECRET → Secreto compartido entre Next.js y Nginx/Plumber
 *                     para validar peticiones internas (opcional)
 */

import { NextRequest, NextResponse } from "next/server";

// ── Configuración ─────────────────────────────────────────────────────────────

const R_BACKEND_URL = process.env.R_BACKEND_URL ?? "http://localhost:8000";
const R_BACKEND_SECRET = process.env.R_BACKEND_SECRET ?? "";
const EXECUTION_TIMEOUT_MS = 12_000; // 12 segundos (el backend usa 10 s internamente)
const MAX_CODE_LENGTH = 8_000; // ~200 líneas de código

// ── Tipos de respuesta ────────────────────────────────────────────────────────

interface RExecuteResponse {
  output: string;
  plots: Array<{ type: "png"; data: string }>;
  error: string | null;
  warnings: string[];
}

// ── Validación simple de token ────────────────────────────────────────────────
// En producción reemplazar por: import { getServerSession } from "next-auth";

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  // Opción A: Verificar cookie de sesión NextAuth (cuando esté implementado)
  // const session = await getServerSession(authOptions);
  // return !!session?.user;

  // Opción B: verificar header personalizado (cuando el frontend lo envíe)
  //const authHeader = req.headers.get("x-session-token");
  //if (authHeader && authHeader.length > 10) return true;

  // Opción C: acceso abierto para curso público (sin autenticación de usuarios)
  // Cambiar a false y habilitar Opción A cuando se quiera restringir acceso.
  return true;
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Autenticación
  const authenticated = await isAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json(
      { error: "No autorizado. Inicia sesión para ejecutar código R." },
      { status: 401 }
    );
  }

  // 2. Parsear y validar el body
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Payload inválido. Se esperaba JSON con campo 'code'." },
      { status: 400 }
    );
  }

  const code = body.code;
  if (typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json(
      { error: "El campo 'code' es requerido y debe ser texto." },
      { status: 400 }
    );
  }

  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      {
        error: `El código excede el límite de ${MAX_CODE_LENGTH} caracteres.
Simplifica el ejemplo para la ejecución en el navegador.`,
      },
      { status: 413 }
    );
  }

  // 3. Reenviar al backend R con timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (R_BACKEND_SECRET) {
      headers["X-Internal-Secret"] = R_BACKEND_SECRET;
    }

    const rResponse = await fetch(`${R_BACKEND_URL}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 4. Manejar respuesta del backend R
    if (!rResponse.ok) {
      const errorText = await rResponse.text().catch(() => "");
      console.error(`[r-execute] Backend R respondió ${rResponse.status}: ${errorText}`);

      return NextResponse.json(
        {
          output: "",
          plots: [],
          warnings: [],
          error: `El servidor de R respondió con error ${rResponse.status}.
Por favor intenta de nuevo en unos momentos.`,
        } satisfies RExecuteResponse,
        { status: 200 } // devolvemos 200 para que el cliente maneje el error en el panel
      );
    }

    const data = await rResponse.json() as Partial<RExecuteResponse>;

    // 5. Normalizar y sanitizar la respuesta
    const normalized: RExecuteResponse = {
      output: typeof data.output === "string" ? data.output : "",
      plots: Array.isArray(data.plots) ? data.plots : [],
      error: typeof data.error === "string" && data.error ? data.error : null,
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
    };

    return NextResponse.json(normalized, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        {
          output: "",
          plots: [],
          warnings: [],
          error: "La ejecución tardó más de 12 segundos y fue cancelada. Reduce la complejidad del código o el tamaño de los datos.",
        } satisfies RExecuteResponse,
        { status: 200 }
      );
    }

    console.error("[r-execute] Error de conexión con backend R:", err);
    return NextResponse.json(
      {
        output: "",
        plots: [],
        warnings: [],
        error: `No se pudo conectar con el servidor de R.
Verifica que el backend esté activo (${R_BACKEND_URL}).`,
      } satisfies RExecuteResponse,
      { status: 200 }
    );
  }
}

// Solo POST está permitido
export async function GET() {
  return NextResponse.json({ error: "Método no permitido." }, { status: 405 });
}
