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
# ts_model_fit()  —  Lógica para POST /timesight/model-fit
# ══════════════════════════════════════════════════════════════════════════════

ts_model_fit <- function(values, freq, start, family, degree, seasonal,
                         harmonics, transform_log) {

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

    return(list(
      name         = paste0("ARIMA", paste(arimaorder(m), collapse = ",")),
      family       = "arima",
      equation     = capture.output(print(m))[1],
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

  # Volver a escala original
  if (isTRUE(transform_log) || family == "exponential") {
    smearing_factor <- mean(exp(resids_log))
    fitted_orig     <- exp(fitted_log) * smearing_factor
    resids_orig     <- as.numeric(y) - fitted_orig
  } else {
    smearing_factor <- 1
    fitted_orig     <- fitted_log
    resids_orig     <- resids_log
  }

  npar     <- length(coef(m))
  mse_orig <- mean(resids_orig^2, na.rm = TRUE)

  # AIC/BIC corregidos a escala original (fórmula del curso)
  aic_orig <- exp(log(mse_orig) + 2 * npar / n)
  bic_orig <- exp(log(mse_orig) + log(n) * npar / n)
  rmse_val <- sqrt(mse_orig)
  mape_val <- mean(abs(resids_orig / as.numeric(y)) * 100, na.rm = TRUE)
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

  # Ecuación (aproximada)
  coef_v <- coef(m)
  eq <- paste0(
    if (isTRUE(transform_log)) "log(Ŷ) = " else "Ŷ = ",
    paste(round(coef_v, 4), collapse = " + ...")
  )

  list(
    name         = model_name,
    family       = family,
    equation     = eq,
    aic          = aic_orig,
    bic          = bic_orig,
    rmse         = rmse_val,
    mape         = mape_val,
    coefficients = coefs,
    pvalues      = pvals,
    fitted       = as.list(fitted_orig),
    residuals    = as.list(resids_orig),
    smearingFactor = smearing_factor,
    params       = list(
      family       = family,
      degree       = as.integer(degree),
      seasonal     = seasonal,
      harmonics    = as.integer(harmonics),
      transformLog = isTRUE(transform_log)
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
                        horizon, confidence_level, bias_correction) {

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

  # Factor de smearing
  sf <- if (isTRUE(transform_log)) {
    if (bias_correction == "duan") mean(exp(resids_log))
    else if (bias_correction == "lognormal") exp(summary(m)$sigma^2 / 2)
    else 1
  } else 1

  # Predicciones futuras
  cyc_fut <- ((t_fut - 1) %% freq) + 1
  df_fut  <- build_X(t_fut, cyc_fut)
  pred_log  <- predict(m, newdata = df_fut, interval = "prediction",
                       level = 1 - alpha)

  if (isTRUE(transform_log)) {
    # Bootstrap no paramétrico para intervalos (estimador de Duan)
    B <- 300L
    set.seed(42L)
    sim <- sapply(seq_len(B), function(i) {
      exp(pred_log[, "fit"] + sample(resids_log, h, replace = TRUE)) * sf
    })
    f_vals <- rowMeans(sim)
    lo95   <- apply(sim, 1, quantile, probs = alpha / 2)
    hi95   <- apply(sim, 1, quantile, probs = 1 - alpha / 2)
    lo80   <- apply(sim, 1, quantile, probs = 0.10)
    hi80   <- apply(sim, 1, quantile, probs = 0.90)
  } else {
    f_vals <- pred_log[, "fit"]
    lo95   <- pred_log[, "lwr"]
    hi95   <- pred_log[, "upr"]
    # 80%
    pred80 <- predict(m, newdata = df_fut, interval = "prediction", level = 0.80)
    lo80   <- pred80[, "lwr"]
    hi80   <- pred80[, "upr"]
  }

  # ── Fan chart ─────────────────────────────────────────────────────────────
  plot_b64 <- ts_png_b64(function() {
    par(mar = c(4, 4, 3, 1), family = "sans")
    # Rango para el eje Y
    y_all <- c(as.numeric(y), f_vals, lo95, hi95)
    ylim  <- range(y_all, na.rm = TRUE)
    t_all <- c(seq_len(n), t_fut)
    plot(seq_len(n), as.numeric(y),
         xlim = range(t_all), ylim = ylim,
         type = "l", col = "#1c1917", lwd = 2,
         main = paste0("Pronóstico — horizonte ", h, " períodos"),
         xlab = "Tiempo", ylab = "", bty = "l")
    grid(col = "#e7e5e4", lty = 1)
    # Banda IC 95%
    polygon(c(t_fut, rev(t_fut)), c(hi95, rev(lo95)),
            col = "#bfdbfe80", border = NA)
    # Banda IC 80%
    polygon(c(t_fut, rev(t_fut)), c(hi80, rev(lo80)),
            col = "#3b82f640", border = NA)
    # Línea de pronóstico
    lines(t_fut, f_vals, col = "#ef4444", lwd = 2, lty = 1)
    # Separador
    abline(v = n, col = "#78716c", lty = 2)
    legend("topleft",
           legend = c("Observado", "Pronóstico", paste0("IC ", confidence_level, "%"), "IC 80%"),
           col  = c("#1c1917", "#ef4444", "#bfdbfe", "#93c5fd"),
           lwd  = c(2, 2, 8, 8), bty = "n", cex = 0.75)
  }, width = 900, height = 520)

  list(
    forecast = as.list(unname(f_vals)),
    lower80  = as.list(unname(lo80)),  upper80 = as.list(unname(hi80)),
    lower95  = as.list(unname(lo95)),  upper95 = as.list(unname(hi95)),
    horizon  = h,
    method   = bias_correction,
    smearingFactor = sf,
    plots    = Filter(Negate(is.null), list(plot_b64))
  )
}

# ══════════════════════════════════════════════════════════════════════════════
# ts_builtin()  —  Devuelve valores de un dataset de R
# ══════════════════════════════════════════════════════════════════════════════

ts_builtin <- function(dataset_id) {
  allowed <- c("AirPassengers", "co2", "JohnsonJohnson", "Nile", "nottem",
               "sunspot.year", "UKgas", "lynx", "EuStockMarkets",
               "nhtemp", "treering", "sunspots", "WWWusage")
  if (!dataset_id %in% allowed) {
    stop(paste0("Dataset no permitido: ", dataset_id))
  }
  env <- new.env(parent = emptyenv())
  utils::data(list = dataset_id, package = "datasets", envir = env)
  raw <- get(dataset_id, envir = env)
  # EuStockMarkets es una matriz → tomar primera columna
  if (is.matrix(raw)) raw <- raw[, 1]
  list(values = as.list(as.numeric(raw)))
}

# ══════════════════════════════════════════════════════════════════════════════
# FIN DE timesight_endpoints.R
# ══════════════════════════════════════════════════════════════════════════════
