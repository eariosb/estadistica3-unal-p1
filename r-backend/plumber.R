# ══════════════════════════════════════════════════════════════════════════════
# plumber.R  —  Servidor principal del backend R del mini-curso
#
# IMPORTANTE: las anotaciones #* solo las procesa Plumber cuando estan
# directamente en el archivo que se pasa a plumb(). Por eso los endpoints
# se definen AQUI. Las funciones auxiliares (validate_code, safe_execute)
# se cargan con source() desde execute_endpoint.R.
#
# Arranque en RStudio / RGui:
#   setwd("ruta/a/r-backend")
#   plumber::plumb("plumber.R")$run(host="127.0.0.1", port=8000)
# ══════════════════════════════════════════════════════════════════════════════

library(plumber)

# Cargar funciones auxiliares  —  solo lógica R, sin anotaciones #*
source("execute_endpoint.R")       # validate_code, safe_execute
source("timesight_endpoints.R")    # ts_explore, ts_transform, ts_model_fit, ts_diagnose, ts_forecast, ts_builtin

# Operador null-coalescing (disponible en todos los endpoints)
`%||%` <- function(a, b) if (!is.null(a)) a else b

# ── Filtro global de CORS ─────────────────────────────────────────────────────

#* @filter cors
function(req, res) {
  origin <- req$HTTP_ORIGIN
  allowed_origins <- c(
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    Sys.getenv("NEXT_PUBLIC_SITE_URL", unset = "")
  )
  if (!is.null(origin) && origin %in% allowed_origins) {
    res$setHeader("Access-Control-Allow-Origin",  origin)
    res$setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    res$setHeader("Access-Control-Allow-Headers",
                  "Content-Type, X-Internal-Secret, Authorization")
    res$setHeader("Access-Control-Max-Age", "86400")
  }
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 204L
    return(list())
  }
  plumber::forward()
}

# ── GET /health ───────────────────────────────────────────────────────────────

#* Verifica que el servidor este activo
#* @get /health
#* @serializer json list(auto_unbox = TRUE)
function() {
  list(
    status  = "ok",
    version = paste(R.version$major, R.version$minor, sep = "."),
    time    = format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z")
  )
}

# ── POST /execute ─────────────────────────────────────────────────────────────
# Recibe codigo R, lo evalua de forma segura y devuelve:
#   { output, plots: [{type, data}], warnings, error }

#* Ejecuta codigo R enviado desde las lecciones del mini-curso
#* @post /execute
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {

  # Autenticacion por secreto compartido (desactivado si R_BACKEND_SECRET esta vacio)
  internal_secret <- Sys.getenv("R_BACKEND_SECRET", unset = "")
  if (nchar(internal_secret) > 0) {
    req_secret <- if (!is.null(req$HTTP_X_INTERNAL_SECRET))
                    req$HTTP_X_INTERNAL_SECRET else ""
    if (req_secret != internal_secret) {
      res$status <- 401L
      return(list(error = "No autorizado."))
    }
  }

  # Parsear body JSON
  body <- tryCatch(
    jsonlite::fromJSON(req$postBody, simplifyVector = FALSE),
    error = function(e) NULL
  )

  if (is.null(body) || is.null(body[["code"]]) ||
      !is.character(body[["code"]]) ||
      nchar(trimws(body[["code"]])) == 0L) {
    res$status <- 400L
    return(list(error = "Se requiere el campo 'code' con codigo R valido."))
  }

  code <- body[["code"]]

  # Limite de tamano
  if (nchar(code) > 8000L) {
    res$status <- 413L
    return(list(error = "El codigo supera el limite de 8000 caracteres."))
  }

  # Validacion de seguridad (lista negra de patrones peligrosos)
  check <- validate_code(code)
  if (!check$ok) {
    return(list(
      output   = "",
      plots    = list(),
      warnings = list(),
      error    = check$msg
    ))
  }

  # Ejecucion segura con timeout y captura de plots
  result <- safe_execute(code, timeout_secs = 10L)

  list(
    output   = if (is.null(result$output))   "" else result$output,
    plots    = if (is.null(result$plots))    list() else result$plots,
    warnings = if (is.null(result$warnings)) list() else as.list(result$warnings),
    error    = result$error
  )
}

# ══════════════════════════════════════════════════════════════════════════════
# TIMESIGHT 2.0  —  Endpoints de análisis guiado de series de tiempo
# Cada endpoint recibe el payload enviado desde el proxy Next.js.
# ══════════════════════════════════════════════════════════════════════════════

# ── POST /timesight/explore ───────────────────────────────────────────────────

#* Exploración: descomposición, ACF/PACF, tests de estacionariedad
#* @post /timesight/explore
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE),
                   error = function(e) NULL)
  if (is.null(body) || is.null(body[["series"]])) {
    res$status <- 400L
    return(list(error = "Se requiere el campo 'series'."))
  }
  tryCatch(
    ts_explore(
      values = unlist(body[["series"]]),
      freq   = body[["freq"]]  %||% 1,
      start  = unlist(body[["start"]]) %||% c(2000, 1),
      name   = body[["name"]]  %||% "Serie"
    ),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/transform ─────────────────────────────────────────────────

#* Transforma la serie con código R seguro
#* @post /timesight/transform
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE),
                   error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body inválido.")) }
  tryCatch(
    ts_transform(
      values = unlist(body[["series"]]),
      freq   = body[["freq"]]  %||% 1,
      start  = unlist(body[["start"]]) %||% c(2000, 1),
      code   = body[["code"]]  %||% "x"
    ),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/model-fit ─────────────────────────────────────────────────

#* Ajusta un modelo de regresión determinista o ARIMA
#* @post /timesight/model-fit
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE),
                   error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body inválido.")) }
  tryCatch(
    ts_model_fit(
      values        = unlist(body[["series"]]),
      freq          = body[["freq"]]         %||% 1,
      start         = unlist(body[["start"]]) %||% c(2000, 1),
      family        = body[["family"]]        %||% "polynomial",
      degree        = body[["degree"]]        %||% 2,
      seasonal      = body[["seasonal"]]      %||% "none",
      harmonics     = body[["harmonics"]]     %||% 2,
      transform_log = isTRUE(body[["transformLog"]])
    ),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/diagnose ──────────────────────────────────────────────────

#* Diagnóstico de residuos del modelo ajustado
#* @post /timesight/diagnose
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE),
                   error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body inválido.")) }
  tryCatch(
    ts_diagnose(
      series_vals   = unlist(body[["series"]]),
      freq          = body[["freq"]]      %||% 1,
      start         = unlist(body[["start"]]) %||% c(2000, 1),
      residuals_vals= unlist(body[["residuals"]]),
      fitted_vals   = unlist(body[["fitted"]]),
      nparams       = body[["nparams"]]   %||% 2
    ),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/forecast ──────────────────────────────────────────────────

#* Genera pronósticos con corrección de sesgo (Duan o log-normal)
#* @post /timesight/forecast
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE),
                   error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body inválido.")) }
  tryCatch(
    ts_forecast(
      values           = unlist(body[["series"]]),
      freq             = body[["freq"]]            %||% 1,
      start            = unlist(body[["start"]])   %||% c(2000, 1),
      family           = body[["family"]]           %||% "polynomial",
      degree           = body[["degree"]]           %||% 2,
      seasonal         = body[["seasonal"]]         %||% "none",
      harmonics        = body[["harmonics"]]        %||% 2,
      transform_log    = isTRUE(body[["transformLog"]]),
      smearing_factor  = body[["smearingFactor"]]   %||% 1,
      horizon          = body[["horizon"]]          %||% 12,
      confidence_level = body[["confidenceLevel"]]  %||% 95,
      bias_correction  = body[["biasCorrection"]]   %||% "duan"
    ),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/builtin ───────────────────────────────────────────────────

#* Devuelve los valores de un dataset de R incluido en el curso
#* @post /timesight/builtin
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE),
                   error = function(e) NULL)
  if (is.null(body) || is.null(body[["dataset"]])) {
    res$status <- 400L
    return(list(error = "Se requiere el campo 'dataset'."))
  }
  tryCatch(
    ts_builtin(body[["dataset"]]),
    error = function(e) { res$status <- 400L; list(error = conditionMessage(e)) }
  )
}

