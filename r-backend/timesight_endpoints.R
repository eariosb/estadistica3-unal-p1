# ══════════════════════════════════════════════════════════════════════════════
# timesight_endpoints.R  —  Funciones auxiliares para los endpoints de TimeSight
#
# NO contiene anotaciones #*.  Las anotaciones Plumber están en plumber.R.
# Este archivo se carga con source("timesight_endpoints.R") desde plumber.R.
# ══════════════════════════════════════════════════════════════════════════════

suppressPackageStartupMessages({
  library(jsonlite)
  library(grDevices)
  library(tseries)
  library(forecast)
  library(stats)
})

# ── Utilidad: capturar un PNG a base64 ────────────────────────────────────────

ts_png_b64 <- function(fun, width = 820, height = 500, res = 120) {
  tmp <- tempfile(fileext = ".png")
  on.exit({
    try(while (dev.cur() > 1) dev.off(), silent = TRUE)
    if (file.exists(tmp)) file.remove(tmp)
  }, add = TRUE)
  png(tmp, width = width, height = height, res = res, bg = "white")
  tryCatch(fun(), error = function(e) NULL)
  dev.off()
  if (!file.exists(tmp) || file.size(tmp) < 500L) return(NULL)
  raw_bytes <- readBin(tmp, "raw", n = file.size(tmp))
  jsonlite::base64_enc(raw_bytes)
}

# ── Reconstruir objeto ts desde vectores ─────────────────────────────────────

make_ts <- function(values, freq, start) {
  ts(as.numeric(values), frequency = as.integer(freq),
     start = as.numeric(start))
}

# ══════════════════════════════════════════════════════════════════════════════
# ts_explore()  —  Lógica para POST /timesight/explore
# ══════════════════════════════════════════════════════════════════════════════

ts_explore <- function(values, freq, start, name = "Serie") {

  y <- make_ts(values, freq, start)
  n <- length(y)

  # ── Estadísticos básicos ──────────────────────────────────────────────────
  stats_list <- list(
    n    = n,
    mean = mean(y, na.rm = TRUE),
    std  = sd(y, na.rm = TRUE),
    min  = min(y, na.rm = TRUE),
    max  = max(y, na.rm = TRUE)
  )

  # ── ACF / PACF ────────────────────────────────────────────────────────────
  max_lag <- min(48L, floor(n / 3L))
  acf_obj  <- acf(y, lag.max = max_lag, plot = FALSE)
  pacf_obj <- pacf(y, lag.max = max_lag, plot = FALSE)

  # ── Tests de estacionariedad ──────────────────────────────────────────────
  adf_res  <- tryCatch(tseries::adf.test(y),
                       error = function(e) list(statistic = NA, p.value = NA))
  kpss_res <- tryCatch(tseries::kpss.test(y),
                       error = function(e) list(statistic = NA, p.value = NA))

  adf_p   <- if (is.na(adf_res$p.value)) NA else adf_res$p.value
  kpss_p  <- if (is.na(kpss_res$p.value)) NA else kpss_res$p.value

  adf_interp <- if (is.na(adf_p)) "No se pudo calcular" else
    if (adf_p < 0.05)
      paste0("Rechazamos H₀ (p=", round(adf_p, 4), "): la serie ES estacionaria")
    else
      paste0("No rechazamos H₀ (p=", round(adf_p, 4), "): la serie podría NO ser estacionaria")

  kpss_interp <- if (is.na(kpss_p)) "No se pudo calcular" else
    if (kpss_p > 0.05)
      paste0("No rechazamos H₀ (p=", round(kpss_p, 4), "): no hay evidencia de no estacionariedad")
    else
      paste0("Rechazamos H₀ (p=", round(kpss_p, 4), "): la serie NO es estacionaria")

  # ── Descomposición (solo si freq > 1 y hay suficientes datos) ─────────────
  decomp_result <- list(type = "none", trend = NULL, seasonal = NULL, remainder = NULL)
  if (freq > 1 && n >= 2 * freq) {
    tryCatch({
      d <- decompose(y, type = "additive")
      decomp_result <- list(
        type      = "additive",
        trend     = as.numeric(d$trend),
        seasonal  = as.numeric(d$seasonal),
        remainder = as.numeric(d$random)
      )
    }, error = function(e) NULL)
  }

  # ── Gráficos ──────────────────────────────────────────────────────────────
  # Gráfico 1: Serie de tiempo
  plot1 <- ts_png_b64(function() {
    par(mar = c(4, 4, 2.5, 1), family = "sans")
    plot(y, main = name, ylab = "", xlab = "Tiempo",
         col = "#1d4ed8", lwd = 2, bty = "l")
    grid(col = "#e7e5e4", lty = 1)
  })

  # Gráfico 2: Descomposición (si aplica)
  plot2 <- NULL
  if (decomp_result$type != "none") {
    plot2 <- ts_png_b64(function() {
      d <- decompose(y, type = "additive")
      par(mar = c(1.5, 4, 2, 1), family = "sans")
      plot(d, col = "#1d4ed8")
    }, height = 620)
  }

  # Gráfico 3: ACF + PACF combinados
  plot3 <- ts_png_b64(function() {
    par(mfrow = c(1, 2), mar = c(4, 4, 3, 1), family = "sans")
    acf(y, lag.max = max_lag, main = "ACF",
        col = "#1d4ed8", lwd = 2, ci.col = "#93c5fd")
    pacf(y, lag.max = max_lag, main = "PACF",
         col = "#7c3aed", lwd = 2, ci.col = "#c4b5fd")
  })

  # Gráfico 4: Season plot + boxplot (solo cuando hay estacionalidad)
  plot4 <- NULL
  if (freq > 1 && n >= 2 * freq) {
    plot4 <- tryCatch({
      ts_png_b64(function() {
        # Etiquetas de período
        if (freq == 12)     per_labels <- month.abb
        else if (freq == 4) per_labels <- paste0("T", 1:4)
        else                per_labels <- paste0("S", seq_len(freq))

        n_full <- floor(n / freq)            # ciclos completos
        y_full <- as.numeric(y)[seq_len(n_full * freq)]
        mat    <- matrix(y_full, nrow = freq, byrow = FALSE)

        start_yr <- if (length(start) >= 1) start[1] else 1
        years    <- start_yr + seq_len(n_full) - 1L

        par(mfrow = c(1, 2), mar = c(5, 4, 3.5, 1), family = "sans")

        # ── Panel 1: patrón estacional por año ───────────────
        cols <- colorRampPalette(
          c("#3b82f6","#8b5cf6","#ec4899","#f97316","#10b981")
        )(n_full)
        matplot(mat, type = "l", lty = 1, lwd = 1.6, col = cols,
                xaxt = "n",
                main = "Patrón estacional por año",
                sub  = "¿Crece la amplitud? → modelo multiplicativo",
                xlab = "Período", ylab = name, bty = "l",
                cex.main = 0.95, cex.sub = 0.8, font.sub = 3)
        axis(1, at = seq_len(freq), labels = per_labels,
             las = 2, cex.axis = 0.75)
        grid(col = "#e7e5e4", lty = 1)
        if (n_full <= 20) {
          legend("topleft", legend = years, col = cols, lty = 1,
                 cex = 0.55, ncol = max(1L, ceiling(n_full / 10L)),
                 bty = "n")
        }

        # ── Panel 2: boxplot por período ─────────────────────
        cyc <- as.integer(cycle(y))
        boxplot(as.numeric(y) ~ cyc,
                names  = per_labels, col = "#dbeafe", border = "#1d4ed8",
                main   = "Distribución por período",
                sub    = "Caja uniforme → aditivo · caja creciente → multiplicativo",
                xlab   = "Período", ylab = name,
                outline = TRUE, cex.axis = 0.75, bty = "l",
                las = 2, cex.main = 0.95, cex.sub = 0.8, font.sub = 3)
        grid(col = "#e7e5e4", lty = 1)
      }, width = 820, height = 430)
    }, error = function(e) NULL)
  }

  # Gráfico 5: Subseries plot (solo cuando hay estacionalidad)
  plot5 <- NULL
  if (freq > 1 && n >= 2 * freq) {
    plot5 <- tryCatch({
      ts_png_b64(function() {
        if (freq == 12)     per_labels <- month.abb
        else if (freq == 4) per_labels <- paste0("T", 1:4)
        else                per_labels <- paste0("S", seq_len(freq))
        par(mar = c(4.5, 4, 3.5, 1), family = "sans")
        monthplot(y,
                  labels  = per_labels,
                  col     = "#374151",
                  lwd     = 1.2,
                  col.base = "#1d4ed8",
                  lwd.base = 2.5,
                  main    = "Subseries por mes — media horizontal = promedio del mes",
                  sub     = "Línea azul: media histórica del período · Pendiente creciente → amplitud aumenta (multiplicativo)",
                  xlab    = "Mes", ylab = name,
                  bty     = "l", cex.main = 0.95, cex.sub = 0.78, font.sub = 3)
        grid(col = "#e7e5e4", lty = 1)
      }, width = 820, height = 430)
    }, error = function(e) NULL)
  }

  plots <- Filter(Negate(is.null), list(plot1, plot2, plot3, plot4, plot5))

  # ── Respuesta ──────────────────────────────────────────────────────────────
  c(
    stats_list,
    list(
      decompType = decomp_result$type,
      trend      = decomp_result$trend,
      seasonal   = decomp_result$seasonal,
      remainder  = decomp_result$remainder,
      acfLags    = as.numeric(acf_obj$lag),
      acfValues  = as.numeric(acf_obj$acf),
      pacfLags   = as.numeric(pacf_obj$lag),
      pacfValues = as.numeric(pacf_obj$acf),
      adf = list(
        statistic      = unname(adf_res$statistic),
        pvalue         = adf_p,
        interpretation = adf_interp,
        isStationary   = !is.na(adf_p) && adf_p < 0.05
      ),
      kpss = list(
        statistic      = unname(kpss_res$statistic),
        pvalue         = kpss_p,
        interpretation = kpss_interp,
        isStationary   = !is.na(kpss_p) && kpss_p > 0.05
      ),
      plots = plots
    )
  )
}

# ══════════════════════════════════════════════════════════════════════════════
# ts_transform()  —  Lógica para POST /timesight/transform
# ══════════════════════════════════════════════════════════════════════════════

ts_transform <- function(values, freq, start, code) {

  x    <- as.numeric(values)
  freq <- as.integer(freq)

  # Entorno seguro con solo operaciones numéricas
  env <- new.env(parent = emptyenv())
  env$x     <- x
  env$freq  <- freq
  env$log   <- base::log
  env$sqrt  <- base::sqrt
  env$diff  <- base::diff
  env$abs   <- base::abs
  env$exp   <- base::exp
  env$scale <- base::scale
  env$cumsum <- base::cumsum

  warns <- character(0)
  result <- tryCatch(
    withCallingHandlers(
      eval(parse(text = code), envir = env),
      warning = function(w) {
        warns <<- c(warns, conditionMessage(w))
        invokeRestart("muffleWarning")
      }
    ),
    error = function(e) stop(conditionMessage(e))
  )

  new_vals <- as.numeric(result)
  if (any(is.nan(new_vals))) {
    warns <- c(warns, "La transformación produjo valores NaN (p.ej. log de negativo).")
    new_vals[is.nan(new_vals)] <- NA_real_
  }

  list(
    newValues   = new_vals,
    warnings    = as.list(warns),
    description = paste0("Transformación aplicada: ", code)
  )
}

# ══════════════════════════════════════════════════════════════════════════════
# build_arima_equation()  —  Genera la ecuación LaTeX de un modelo ARIMA
#
# Produce la forma operatorial con el operador de retardo B:
#   φ(B) Φ(B^S) (1-B)^d (1-B^S)^D Y_t = θ(B) Θ(B^S) ε_t [+ drift]
# ══════════════════════════════════════════════════════════════════════════════

build_arima_equation <- function(m) {
  ord  <- arimaorder(m)               # c(p,d,q) o c(p,d,q,P,D,Q)
  p <- ord["p"]; d <- ord["d"]; q <- ord["q"]
  P <- if ("P" %in% names(ord)) ord["P"] else 0L
  D <- if ("D" %in% names(ord)) ord["D"] else 0L
  Q <- if ("Q" %in% names(ord)) ord["Q"] else 0L
  S <- frequency(m$x)
  if (is.null(S) || S <= 1) S <- 1L

  coefs <- coef(m)

  # ── Helper: construye una cadena de polinomio en el operador lag ────────────
  # negate = TRUE  → polinomio AR:  (1 - φ₁B - φ₂B²…)
  # negate = FALSE → polinomio MA:  (1 + θ₁B + θ₂B²…)
  poly_str <- function(vals, base_power = 1L, negate = FALSE) {
    if (length(vals) == 0) return("")
    terms <- sapply(seq_along(vals), function(i) {
      v   <- round(vals[i], 4)
      pow <- i * base_power
      # signo: AR resta, MA suma
      raw_sign <- if (negate) -v else v
      sign_str <- if (raw_sign >= 0) " + " else " - "
      b_str    <- if (pow == 1) "B" else paste0("B^{", pow, "}")
      paste0(sign_str, abs(v), "\\,", b_str)
    })
    paste0("(1", paste(terms, collapse = ""), ")")
  }

  # ── Polinomios AR / MA / SAR / SMA ─────────────────────────────────────────
  ar_c   <- coefs[grepl("^ar[0-9]",  names(coefs))]
  ma_c   <- coefs[grepl("^ma[0-9]",  names(coefs))]
  sar_c  <- coefs[grepl("^sar[0-9]", names(coefs))]
  sma_c  <- coefs[grepl("^sma[0-9]", names(coefs))]

  ar_poly  <- if (p > 0) poly_str(ar_c,  1L, negate = TRUE)  else ""
  ma_poly  <- if (q > 0) poly_str(ma_c,  1L, negate = FALSE) else "(1)"
  sar_poly <- if (P > 0) poly_str(sar_c, S,  negate = TRUE)  else ""
  sma_poly <- if (Q > 0) poly_str(sma_c, S,  negate = FALSE) else ""

  # ── Operadores de diferenciación ────────────────────────────────────────────
  diff_op  <- if (d == 1) "(1-B)" else if (d > 1) paste0("(1-B)^{", d, "}") else ""
  sdiff_op <- if (D == 1) paste0("(1-B^{", S, "})") else if (D > 1) paste0("(1-B^{", S, "})^{", D, "}") else ""

  # ── Drift / constante ───────────────────────────────────────────────────────
  drift_c  <- coefs[grepl("drift|intercept|mean", names(coefs), ignore.case = TRUE)]
  drift_c  <- drift_c[!grepl("^ar|^ma|^sar|^sma", names(drift_c))]
  drift_str <- if (length(drift_c) > 0 && abs(drift_c[1]) > 1e-8) {
    v <- round(drift_c[1], 4)
    if (v >= 0) paste0(" + ", v) else paste0(" - ", abs(v))
  } else ""

  # ── LHS: producto de filtros AR y diferenciación ────────────────────────────
  lhs_parts <- c(ar_poly, sar_poly, diff_op, sdiff_op)
  lhs_parts <- lhs_parts[nchar(lhs_parts) > 0]
  lhs <- if (length(lhs_parts) > 0) paste(lhs_parts, collapse = "\\,") else "1"

  # ── RHS: producto de filtros MA ─────────────────────────────────────────────
  rhs_parts <- c(ma_poly, sma_poly)
  rhs_parts <- rhs_parts[nchar(rhs_parts) > 0]
  rhs <- if (length(rhs_parts) > 0) paste(rhs_parts, collapse = "\\,") else "1"

  paste0(lhs, "\\,Y_t = ", rhs, "\\,\\varepsilon_t", drift_str)
}

# ══════════════════════════════════════════════════════════════════════════════
# build_regression_equation()  —  Genera la ecuación de regresión en LaTeX
# ══════════════════════════════════════════════════════════════════════════════

build_regression_equation <- function(coef_v, family, degree, seasonal,
                                      transform_log, ext) {
  use_log <- isTRUE(transform_log) || ext == "log"
  lhs     <- if (use_log) "\\log(\\hat{Y}_t)" else "\\hat{Y}_t"

  n_coef <- length(coef_v)
  terms  <- character(0)

  # ── Intercepto ─────────────────────────────────────────────────────────────
  b0 <- round(coef_v[1], 4)
  terms <- c(terms, as.character(b0))

  # ── Términos de tendencia (polinomio en t) ──────────────────────────────────
  if (degree >= 1 && n_coef >= 2) {
    for (k in seq_len(degree)) {
      if (k + 1 > n_coef) break
      v    <- round(coef_v[k + 1], 4)
      sign <- if (v >= 0) " + " else " - "
      t_str <- if (k == 1) "t" else paste0("t^{", k, "}")
      terms <- c(terms, paste0(sign, abs(v), "\\,", t_str))
    }
  }

  # ── Términos estacionales ───────────────────────────────────────────────────
  n_trend <- if (degree >= 1) degree else 0
  season_idx <- seq_len(n_coef - 1 - n_trend) + 1 + n_trend   # índices en coef_v

  if (length(season_idx) > 0) {
    if (seasonal == "dummy") {
      # Mostrar los primeros dos dummies explícitos, luego "…"
      show <- min(2L, length(season_idx))
      for (i in seq_len(show)) {
        v     <- round(coef_v[season_idx[i]], 4)
        sign  <- if (v >= 0) " + " else " - "
        terms <- c(terms, paste0(sign, abs(v), "\\,I_{", i + 1, ",t}"))
      }
      if (length(season_idx) > show)
        terms <- c(terms, " + \\cdots")
    } else if (seasonal == "fourier") {
      K <- length(season_idx) %/% 2
      terms <- c(terms,
        paste0(" + \\sum_{j=1}^{", K, "}",
               "[\\alpha_j\\sin(2\\pi F_j t) + \\gamma_j\\cos(2\\pi F_j t)]"))
    }
  }

  paste0(lhs, " = ", paste(terms, collapse = ""), " + \\varepsilon_t")
}

# ══════════════════════════════════════════════════════════════════════════════
# ts_model_fit()  —  Lógica para POST /timesight/model-fit
#
# external_transform: transformación aplicada externamente en el paso 3.
#   "none"    → sin transformación externa (default)
#   "log"     → log(x) fue aplicado → valores en escala log → back-transform exp()
#   "sqrt"    → sqrt(x) fue aplicado → valores en escala raíz → back-transform ^2
#   "diff"    → diff(x) fue aplicado → valores en escala diferenciada (sin back-transform)
#   "logdiff" → diff(log(x)) fue aplicado → escala diferencias de log (sin back-transform)
# ══════════════════════════════════════════════════════════════════════════════

ts_model_fit <- function(values, freq, start, family, degree, seasonal,
                         harmonics, transform_log, external_transform = "none") {

  y      <- make_ts(values, freq, start)
  n      <- length(y)
  t_vec  <- seq_len(n)
  freq   <- as.integer(frequency(y))

  # Aplicar log interno
  y_fit <- if (isTRUE(transform_log)) log(y) else y

  # ── Matriz de diseño ──────────────────────────────────────────────────────
  X <- matrix(1, nrow = n, ncol = 1)  # intercepto

  # Tendencia
  if (family %in% c("polynomial", "log")) {
    for (p in seq_len(as.integer(degree))) {
      X <- cbind(X, t_vec^p)
    }
  } else if (family == "exponential") {
    # se ajusta como log(y) ~ t, luego se exponencia
    y_fit <- log(y)
    X <- cbind(X, t_vec)
  }

  # Estacionalidad
  if (seasonal != "none" && freq > 1) {
    if (seasonal == "dummy") {
      period  <- cycle(y)
      for (s in 2:freq) {
        X <- cbind(X, as.integer(period == s))
      }
    } else if (seasonal == "fourier") {
      K <- min(as.integer(harmonics), floor(freq / 2))
      for (k in seq_len(K)) {
        X <- cbind(X, sin(2 * pi * k * t_vec / freq))
        X <- cbind(X, cos(2 * pi * k * t_vec / freq))
      }
    }
  }

  colnames(X) <- make.names(paste0("X", seq_len(ncol(X))), unique = TRUE)

  # ── Ajuste ARIMA automático ───────────────────────────────────────────────
  if (family == "arima") {
    m <- tryCatch(
      forecast::auto.arima(y, seasonal = (freq > 1), stepwise = TRUE, approximation = TRUE),
      error = function(e) stop(paste0("auto.arima falló: ", conditionMessage(e)))
    )
    fitted_vals <- as.numeric(fitted(m))
    resids      <- as.numeric(residuals(m))
    smearing    <- mean(exp(resids))  # para log si aplica

    aic_val  <- AIC(m)
    bic_val  <- BIC(m)
    rmse_val <- sqrt(mean(resids^2))
    mape_val <- mean(abs(resids / y[!is.na(y)]) * 100, na.rm = TRUE)
    if (!is.finite(mape_val)) mape_val <- NA_real_

    ord <- arimaorder(m)
    return(list(
      name         = paste0("ARIMA(", ord["p"], ",", ord["d"], ",", ord["q"], ")",
                            if ("P" %in% names(ord) && (ord["P"] | ord["D"] | ord["Q"]))
                              paste0("(", ord["P"], ",", ord["D"], ",", ord["Q"], ")[", frequency(y), "]")
                            else ""),
      family       = "arima",
      equation     = build_arima_equation(m),
      arimaOrder   = as.list(ord),
      aic          = aic_val,
      bic          = bic_val,
      rmse         = rmse_val,
      mape         = mape_val,
      coefficients = as.list(coef(m)),
      pvalues      = as.list(rep(NA_real_, length(coef(m)))),
      fitted       = fitted_vals,
      residuals    = resids,
      smearingFactor = smearing,
      params       = list(family = "arima", degree = 0, seasonal = "none",
                          harmonics = 0, transformLog = FALSE)
    ))
  }

  # ── Ajuste por mínimos cuadrados (lm) ────────────────────────────────────
  df_fit <- as.data.frame(X)
  df_fit$Y <- as.numeric(y_fit)

  m <- tryCatch(
    lm(Y ~ . - 1, data = df_fit),
    error = function(e) stop(paste0("lm falló: ", conditionMessage(e)))
  )

  fitted_log <- as.numeric(fitted(m))
  resids_log <- as.numeric(residuals(m))

  # ── Volver a escala original ──────────────────────────────────────────────
  # Se aplica back-transform según la transformación activa (externa o interna).
  # Prioridad: external_transform > transform_log interno.
  #
  # Nota estadística:
  #   Para E[Y] = E[exp(Z)] cuando Z = Ẑ + ε:
  #     Estimador naive: exp(Ẑ) → subestima la media (estima la mediana)
  #     Corrección de Duan (no paramétrica): exp(Ẑ) × mean(exp(ê_i))
  #     Esta corrección anula el sesgo hacia abajo por la concavidad de exp().

  ext <- external_transform

  if (ext == "log") {
    # Serie en escala log(Y_orig) → Y_orig = exp(y)
    Y_orig_vals     <- exp(as.numeric(y))
    smearing_factor <- mean(exp(resids_log))
    fitted_orig     <- exp(fitted_log) * smearing_factor
    resids_orig     <- Y_orig_vals - fitted_orig

  } else if (ext == "sqrt") {
    # Serie en escala sqrt(Y_orig) → Y_orig = y^2
    Y_orig_vals     <- as.numeric(y)^2
    smearing_factor <- 1
    # Back-transform directo (sesgo pequeño; transformación cuadrática es más suave)
    fitted_orig     <- fitted_log^2
    resids_orig     <- Y_orig_vals - fitted_orig

  } else if (ext %in% c("diff", "logdiff")) {
    # Serie diferenciada: el back-transform requiere condiciones iniciales de la
    # serie original. No se aplica back-transform automático; el modelo opera en
    # escala de diferencias. Se añade advertencia en los resultados.
    smearing_factor <- 1
    fitted_orig     <- fitted_log
    resids_orig     <- resids_log

  } else if (isTRUE(transform_log) || family == "exponential") {
    # Log interno (checkbox en UI o familia exponencial):
    # y contiene valores originales; y_fit = log(y) fue usado para ajuste.
    smearing_factor <- mean(exp(resids_log))
    fitted_orig     <- exp(fitted_log) * smearing_factor
    resids_orig     <- as.numeric(y) - fitted_orig

  } else {
    # Sin transformación: escala de los datos = escala original
    smearing_factor <- 1
    fitted_orig     <- fitted_log
    resids_orig     <- resids_log
  }

  npar     <- length(coef(m))
  mse_orig <- mean(resids_orig^2, na.rm = TRUE)

  # AIC y BIC basados en verosimilitud gaussiana aproximada por MCO
  # AIC = n·log(MSE) + 2k   (criterio de Akaike, menor = mejor)
  # BIC = n·log(MSE) + k·log(n)  (penaliza más los modelos grandes)
  aic_orig <- n * log(mse_orig) + 2  * npar
  bic_orig <- n * log(mse_orig) + npar * log(n)
  rmse_val <- sqrt(mse_orig)

  # Referencia para MAPE: escala original
  y_ref <- if (ext == "log") exp(as.numeric(y)) else
            if (ext == "sqrt") as.numeric(y)^2 else
            as.numeric(y)
  mape_val <- mean(abs(resids_orig / y_ref) * 100, na.rm = TRUE)
  if (!is.finite(mape_val)) mape_val <- NA_real_

  # Coeficientes y p-valores
  sm <- summary(m)
  coef_names <- rownames(sm$coefficients)
  coefs  <- setNames(as.list(sm$coefficients[, "Estimate"]),  coef_names)
  pvals  <- setNames(as.list(sm$coefficients[, "Pr(>|t|)"]), coef_names)

  # Nombre del modelo
  model_name <- paste0(
    switch(family, polynomial = "Polinomial", log = "Log-lineal", exponential = "Exponencial"),
    " grado ", degree,
    if (seasonal != "none") paste0(" + Estacional (", seasonal, ")") else ""
  )

  # Ecuación en LaTeX con coeficientes estimados
  coef_v <- coef(m)
  eq <- build_regression_equation(coef_v, family, degree, seasonal,
                                  transform_log, ext)

  # Nota de escala para el frontend
  scale_note <- switch(ext,
    log     = "Pronósticos y residuos en escala ORIGINAL (back-transform exp() + corrección de Duan aplicada).",
    sqrt    = "Pronósticos y residuos en escala ORIGINAL (back-transform cuadrático aplicado).",
    diff    = "⚠️ Serie diferenciada: valores ajustados en escala de PRIMERAS DIFERENCIAS. Para recuperar niveles acumule (cumsum) desde el último valor observado.",
    logdiff = "⚠️ Serie log-diferenciada (tasas de cambio): valores ajustados en escala de diferencias de log. Interprete como cambios porcentuales aproximados.",
    "Modelo ajustado directamente sobre los valores de la serie activa."
  )

  list(
    name           = model_name,
    family         = family,
    equation       = eq,
    aic            = aic_orig,
    bic            = bic_orig,
    rmse           = rmse_val,
    mape           = mape_val,
    coefficients   = coefs,
    pvalues        = pvals,
    fitted         = as.list(fitted_orig),
    residuals      = as.list(resids_orig),
    smearingFactor = smearing_factor,
    scaleNote      = scale_note,
    params         = list(
      family            = family,
      degree            = as.integer(degree),
      seasonal          = seasonal,
      harmonics         = as.integer(harmonics),
      transformLog      = isTRUE(transform_log),
      externalTransform = ext
    )
  )
}

# ══════════════════════════════════════════════════════════════════════════════
# ts_diagnose()  —  Lógica para POST /timesight/diagnose
# ══════════════════════════════════════════════════════════════════════════════

ts_diagnose <- function(series_vals, freq, start, residuals_vals, fitted_vals, nparams) {

  y      <- make_ts(series_vals, freq, start)
  resids <- as.numeric(residuals_vals)
  fitted <- as.numeric(fitted_vals)

  tests <- list()

  # ── Shapiro-Wilk (normalidad) ─────────────────────────────────────────────
  sw_n <- min(length(resids), 5000L)
  sw <- tryCatch(shapiro.test(resids[seq_len(sw_n)]), error = function(e) NULL)
  if (!is.null(sw)) {
    tests[[length(tests) + 1]] <- list(
      name       = "Shapiro-Wilk (normalidad de residuos)",
      statistic  = unname(sw$statistic),
      pvalue     = sw$p.value,
      passed     = sw$p.value > 0.05,
      interpretation = if (sw$p.value > 0.05)
        "No rechazamos normalidad. Los residuos tienen distribución aproximadamente normal."
        else "Rechazamos normalidad (p < 0.05). Considera transformar la serie."
    )
  }

  # ── Ljung-Box (autocorrelación de residuos) ───────────────────────────────
  lag_lb <- min(20L, floor(length(resids) / 5))
  lb <- tryCatch(Box.test(resids, lag = lag_lb, type = "Ljung-Box", fitdf = nparams),
                 error = function(e) NULL)
  if (!is.null(lb)) {
    tests[[length(tests) + 1]] <- list(
      name       = "Ljung-Box (autocorrelación de residuos)",
      statistic  = unname(lb$statistic),
      pvalue     = lb$p.value,
      passed     = lb$p.value > 0.05,
      interpretation = if (lb$p.value > 0.05)
        "No hay evidencia de autocorrelación en los residuos. El modelo captura bien la dependencia."
        else "Hay autocorrelación residual significativa. El modelo puede estar mal especificado."
    )
  }

  # ── Breusch-Pagan / varianza constante ────────────────────────────────────
  # Prueba simple: correlación de |resid| con tiempo
  t_vec <- seq_along(resids)
  bp_cor <- tryCatch(cor.test(abs(resids), t_vec), error = function(e) NULL)
  if (!is.null(bp_cor)) {
    tests[[length(tests) + 1]] <- list(
      name       = "Homocedasticidad (|residuos| vs tiempo)",
      statistic  = unname(bp_cor$statistic),
      pvalue     = bp_cor$p.value,
      passed     = bp_cor$p.value > 0.05,
      interpretation = if (bp_cor$p.value > 0.05)
        "No hay evidencia de heterocedasticidad. La varianza del error es constante."
        else "Posible heterocedasticidad (p < 0.05). Considera transformar con log o raíz cuadrada."
    )
  }

  # ── Gráficos de diagnóstico ───────────────────────────────────────────────

  # 1. Residuos vs tiempo
  plot1 <- ts_png_b64(function() {
    par(mar = c(4, 4, 3, 1), family = "sans")
    plot(resids, type = "l", col = "#1d4ed8", lwd = 1.5,
         main = "Residuos vs Tiempo", ylab = "Residuo", xlab = "Tiempo", bty = "l")
    abline(h = 0, col = "#ef4444", lty = 2, lwd = 1)
    grid(col = "#e7e5e4", lty = 1)
  })

  # 2. Q-Q Normal
  plot2 <- ts_png_b64(function() {
    par(mar = c(4, 4, 3, 1), family = "sans")
    qqnorm(resids, main = "Q-Q Normal de Residuos",
           col = "#1d4ed8", pch = 16, cex = 0.6)
    qqline(resids, col = "#ef4444", lwd = 2)
    grid(col = "#e7e5e4", lty = 1)
  })

  # 3. ACF de residuos
  plot3 <- ts_png_b64(function() {
    par(mar = c(4, 4, 3, 1), family = "sans")
    acf(resids, main = "ACF de Residuos",
        col = "#7c3aed", lwd = 2, ci.col = "#c4b5fd")
  })

  plots <- Filter(Negate(is.null), list(plot1, plot2, plot3))

  n_passed <- sum(sapply(tests, function(t) isTRUE(t$passed)))
  overall_ok <- n_passed >= length(tests) - 1L

  summary_txt <- if (overall_ok)
    paste0(n_passed, " de ", length(tests), " pruebas pasaron. El modelo es adecuado.")
    else
    paste0("Solo ", n_passed, " de ", length(tests), " pruebas pasaron. Revisa los supuestos del modelo.")

  list(
    tests      = tests,
    plots      = plots,
    overallOk  = overall_ok,
    summary    = summary_txt
  )
}

# ══════════════════════════════════════════════════════════════════════════════
# ts_forecast()  —  Lógica para POST /timesight/forecast
# ══════════════════════════════════════════════════════════════════════════════

ts_forecast <- function(values, freq, start, family, degree, seasonal,
                        harmonics, transform_log, smearing_factor,
                        horizon, confidence_level, bias_correction,
                        external_transform = "none") {

  y      <- make_ts(values, freq, start)
  n      <- length(y)
  freq   <- as.integer(frequency(y))
  h      <- as.integer(horizon)
  alpha  <- (100 - as.numeric(confidence_level)) / 100

  # Tiempo futuro
  t_fut <- (n + 1):(n + h)

  # ── ARIMA ─────────────────────────────────────────────────────────────────
  if (family == "arima") {
    m   <- forecast::auto.arima(y, seasonal = (freq > 1), stepwise = TRUE, approximation = TRUE)
    fc  <- forecast::forecast(m, h = h, level = c(80, confidence_level))
    f_vals <- as.numeric(fc$mean)
    lo95   <- as.numeric(fc$lower[, 2])
    hi95   <- as.numeric(fc$upper[, 2])
    lo80   <- as.numeric(fc$lower[, 1])
    hi80   <- as.numeric(fc$upper[, 1])

    plot_b64 <- ts_png_b64(function() {
      par(mar = c(4, 4, 3, 1), family = "sans")
      plot(fc, main = paste0("Pronóstico ARIMA — Horizonte ", h),
           fcol = "#ef4444", shadecols = c("#dbeafe", "#bfdbfe"),
           flwd = 2, bty = "l")
      grid(col = "#e7e5e4", lty = 1)
    })

    return(list(
      forecast = as.list(unname(f_vals)),
      lower80  = as.list(unname(lo80)),  upper80 = as.list(unname(hi80)),
      lower95  = as.list(unname(lo95)),  upper95 = as.list(unname(hi95)),
      horizon  = h,
      method   = "none",
      smearingFactor = 1,
      plots    = Filter(Negate(is.null), list(plot_b64))
    ))
  }

  # ── Regresión determinista ────────────────────────────────────────────────
  y_fit <- if (isTRUE(transform_log)) log(y) else y

  # Construir X_train
  t_vec  <- seq_len(n)
  period <- cycle(y)
  build_X <- function(t_idx, cyc = NULL) {
    X <- matrix(1, nrow = length(t_idx), ncol = 1)
    for (p in seq_len(as.integer(degree))) X <- cbind(X, t_idx^p)
    if (seasonal != "none" && freq > 1) {
      if (seasonal == "dummy") {
        per_idx <- if (!is.null(cyc)) cyc else ((t_idx - 1) %% freq) + 1
        for (s in 2:freq) X <- cbind(X, as.integer(per_idx == s))
      } else if (seasonal == "fourier") {
        K <- min(as.integer(harmonics), floor(freq / 2))
        for (k in seq_len(K)) {
          X <- cbind(X, sin(2 * pi * k * t_idx / freq))
          X <- cbind(X, cos(2 * pi * k * t_idx / freq))
        }
      }
    }
    colnames(X) <- make.names(paste0("X", seq_len(ncol(X))), unique = TRUE)
    as.data.frame(X)
  }

  df_train <- build_X(t_vec, as.integer(period))
  df_train$Y <- as.numeric(y_fit)
  m <- lm(Y ~ . - 1, data = df_train)
  resids_log <- residuals(m)

  ext <- external_transform

  # ── Factor de smearing y back-transform ────────────────────────