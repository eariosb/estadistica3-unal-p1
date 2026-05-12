# ══════════════════════════════════════════════════════════════════════════════
# plumber.R  —  Servidor principal del backend R del mini-curso
# ══════════════════════════════════════════════════════════════════════════════

library(plumber)

source("execute_endpoint.R")
source("timesight_endpoints.R")

`%||%` <- function(a, b) if (!is.null(a)) a else b

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin",  "*")
  res$setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, X-Internal-Secret, Authorization")
  res$setHeader("Access-Control-Max-Age", "86400")
  if (req$REQUEST_METHOD == "OPTIONS") { res$status <- 204L; return(list()) }
  plumber::forward()
}

#* @get /health
#* @serializer json list(auto_unbox = TRUE)
function() {
  list(status = "ok",
       version = paste(R.version$major, R.version$minor, sep = "."),
       time    = format(Sys.time(), "%Y-%m-%d %H:%M:%S %Z"))
}

#* @post /execute
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  internal_secret <- Sys.getenv("R_BACKEND_SECRET", unset = "")
  if (nchar(internal_secret) > 0) {
    req_secret <- if (!is.null(req$HTTP_X_INTERNAL_SECRET)) req$HTTP_X_INTERNAL_SECRET else ""
    if (req_secret != internal_secret) { res$status <- 401L; return(list(error = "No autorizado.")) }
  }
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body) || is.null(body[["code"]]) || !is.character(body[["code"]]) || nchar(trimws(body[["code"]])) == 0L) {
    res$status <- 400L; return(list(error = "Se requiere el campo 'code' con codigo R valido."))
  }
  code <- body[["code"]]
  if (nchar(code) > 8000L) { res$status <- 413L; return(list(error = "El codigo supera el limite de 8000 caracteres.")) }
  check <- validate_code(code)
  if (!check$ok) return(list(output = "", plots = list(), warnings = list(), error = check$msg))
  result <- safe_execute(code, timeout_secs = 10L)
  list(
    output   = if (is.null(result$output))   "" else result$output,
    plots    = if (is.null(result$plots))    list() else result$plots,
    warnings = if (is.null(result$warnings)) list() else as.list(result$warnings),
    error    = result$error
  )
}

# ── POST /timesight/explore ───────────────────────────────────────────────────

#* @post /timesight/explore
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body) || is.null(body[["series"]])) { res$status <- 400L; return(list(error = "Se requiere 'series'.")) }
  tryCatch(
    ts_explore(values = unlist(body[["series"]]),
               freq   = body[["freq"]]  %||% 1,
               start  = unlist(body[["start"]]) %||% c(2000, 1),
               name   = body[["name"]]  %||% "Serie"),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/transform ─────────────────────────────────────────────────

#* @post /timesight/transform
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body invalido.")) }
  tryCatch(
    ts_transform(values = unlist(body[["series"]]),
                 freq   = body[["freq"]]  %||% 1,
                 start  = unlist(body[["start"]]) %||% c(2000, 1),
                 code   = body[["code"]]  %||% "x"),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/model-fit ─────────────────────────────────────────────────

#* @post /timesight/model-fit
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body invalido.")) }
  tryCatch(
    ts_model_fit(values             = unlist(body[["series"]]),
                 freq               = body[["freq"]]              %||% 1,
                 start              = unlist(body[["start"]])     %||% c(2000, 1),
                 family             = body[["family"]]             %||% "polynomial",
                 degree             = body[["degree"]]             %||% 2,
                 seasonal           = body[["seasonal"]]           %||% "none",
                 harmonics          = body[["harmonics"]]          %||% 2,
                 transform_log      = isTRUE(body[["transformLog"]]),
                 external_transform = body[["externalTransform"]] %||% "none"),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/diagnose ──────────────────────────────────────────────────

#* @post /timesight/diagnose
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body invalido.")) }
  tryCatch(
    ts_diagnose(series_vals    = unlist(body[["series"]]),
                freq           = body[["freq"]]      %||% 1,
                start          = unlist(body[["start"]]) %||% c(2000, 1),
                residuals_vals = unlist(body[["residuals"]]),
                fitted_vals    = unlist(body[["fitted"]]),
                nparams        = body[["nparams"]]   %||% 2),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/forecast ──────────────────────────────────────────────────

#* @post /timesight/forecast
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body invalido.")) }
  tryCatch(
    ts_forecast(values             = unlist(body[["series"]]),
                freq               = body[["freq"]]              %||% 1,
                start              = unlist(body[["start"]])     %||% c(2000, 1),
                family             = body[["family"]]             %||% "polynomial",
                degree             = body[["degree"]]             %||% 2,
                seasonal           = body[["seasonal"]]           %||% "none",
                harmonics          = body[["harmonics"]]          %||% 2,
                transform_log      = isTRUE(body[["transformLog"]]),
                smearing_factor    = body[["smearingFactor"]]    %||% 1,
                horizon            = body[["horizon"]]            %||% 12,
                confidence_level   = body[["confidenceLevel"]]   %||% 95,
                bias_correction    = body[["biasCorrection"]]    %||% "duan",
                external_transform = body[["externalTransform"]] %||% "none"),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/crossval ──────────────────────────────────────────────────

#* @post /timesight/crossval
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body invalido.")) }
  tryCatch(
    ts_crossval(values             = unlist(body[["series"]]),
                freq               = body[["freq"]]              %||% 1,
                start              = unlist(body[["start"]])     %||% c(2000, 1),
                family             = body[["family"]]             %||% "polynomial",
                degree             = body[["degree"]]             %||% 2,
                seasonal           = body[["seasonal"]]           %||% "none",
                harmonics          = body[["harmonics"]]          %||% 2,
                transform_log      = isTRUE(body[["transformLog"]]),
                external_transform = body[["externalTransform"]] %||% "none",
                horizon            = body[["horizon"]]            %||% NULL,
                initial_frac       = body[["initialFrac"]]       %||% 0.7,
                max_folds          = body[["maxFolds"]]          %||% 20),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/backtransform ─────────────────────────────────────────────

#* @post /timesight/backtransform
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body)) { res$status <- 400L; return(list(error = "Body invalido.")) }
  tryCatch(
    ts_backtransform(values_orig        = unlist(body[["seriesOrig"]]),
                     values_active      = unlist(body[["seriesActive"]]),
                     freq               = body[["freq"]]              %||% 1,
                     start              = unlist(body[["start"]])     %||% c(2000, 1),
                     fitted_vals        = unlist(body[["fitted"]]),
                     smearing_factor    = body[["smearingFactor"]]    %||% 1,
                     external_transform = body[["externalTransform"]] %||% "none",
                     transform_log      = isTRUE(body[["transformLog"]]),
                     family             = body[["family"]]             %||% "polynomial"),
    error = function(e) { res$status <- 500L; list(error = conditionMessage(e)) }
  )
}

# ── POST /timesight/builtin ───────────────────────────────────────────────────

#* @post /timesight/builtin
#* @serializer json list(auto_unbox = TRUE)
function(req, res) {
  body <- tryCatch(jsonlite::fromJSON(req$postBody, simplifyVector = FALSE), error = function(e) NULL)
  if (is.null(body) || is.null(body[["dataset"]])) {
    res$status <- 400L; return(list(error = "Se requiere el campo 'dataset'."))
  }
  tryCatch(
    ts_builtin(body[["dataset"]]),
    error = function(e) { res$status <- 400L; list(error = conditionMessage(e)) }
  )
}
