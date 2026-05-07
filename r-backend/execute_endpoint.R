# ══════════════════════════════════════════════════════════════════════════════
# execute_endpoint.R  —  Endpoint Plumber  POST /execute
#
# Recibe código R, lo evalúa en un entorno seguro, captura la salida de
# consola, las advertencias y los gráficos (como PNG en base64), y devuelve
# todo en JSON al proxy Next.js.
#
# Para incluir desde plumber.R:
#   source("execute_endpoint.R")
# ══════════════════════════════════════════════════════════════════════════════

# ── Dependencias ──────────────────────────────────────────────────────────────
suppressPackageStartupMessages({
  library(jsonlite)
  library(grDevices)
})

# ── Paquetes permitidos ───────────────────────────────────────────────────────
ALLOWED_PACKAGES <- c(
  "base", "stats", "graphics", "grDevices", "utils",
  "forecast", "ggplot2", "tseries", "zoo", "xts", "TTR"
)

# ── Patrones de código peligroso (lista negra) ────────────────────────────────
DANGEROUS_PATTERNS <- c(
  "system\\s*\\(",        # ejecutar comandos del SO
  "system2\\s*\\(",
  "shell\\s*\\(",
  "exec\\s*\\(",
  "readLines\\s*\\(",     # leer archivos
  "writeLines\\s*\\(",
  "write\\.csv\\s*\\(",
  "write\\.table\\s*\\(",
  "file\\s*\\(",
  "connection\\s*\\(",
  "url\\s*\\(",           # acceso a red
  "download\\.file\\s*\\(",
  "httr\\s*::",
  "curl\\s*::",
  "RCurl\\s*::",
  "Sys\\.setenv\\s*\\(",  # modificar entorno
  "Sys\\.getenv\\s*\\(",
  "setwd\\s*\\(",
  "getwd\\s*\\(",
  "source\\s*\\(",        # cargar scripts externos
  "\\.GlobalEnv",         # acceder al entorno global
  "globalenv\\s*\\(",
  "parent\\.env\\s*\\(",
  "<<-",                  # asignación al entorno padre
  ":::",                  # acceder a internals de paquetes
  "unlink\\s*\\(",        # borrar archivos
  "file\\.remove\\s*\\(", # borrar archivos
  "rm\\s*\\(.*all\\s*=\\s*TRUE"  # borrar todo el workspace
)

# ── Validación de código ──────────────────────────────────────────────────────
validate_code <- function(code) {
  for (pat in DANGEROUS_PATTERNS) {
    if (grepl(pat, code, perl = TRUE, ignore.case = TRUE)) {
      return(list(
        ok  = FALSE,
        msg = paste0(
          "Operacion no permitida detectada en el codigo.\n",
          "El entorno de ejecucion no permite acceso al sistema de archivos, ",
          "red ni modificacion del entorno global.\n",
          "Patron bloqueado: '", pat, "'"
        )
      ))
    }
  }

  # Validar paquetes que se intentan cargar con library() o require()
  pkg_uses <- gregexpr(
    "(?:library|require)\\s*\\(\\s*[\"']?([A-Za-z][A-Za-z0-9\\.]+)[\"']?\\s*\\)",
    code, perl = TRUE
  )
  pkg_names <- regmatches(code, pkg_uses)[[1]]
  for (pm in pkg_names) {
    pkg <- trimws(gsub("(?:library|require)\\s*\\(\\s*[\"']?|[\"']?\\s*\\)", "", pm, perl = TRUE))
    if (nchar(pkg) > 0 && !pkg %in% ALLOWED_PACKAGES) {
      return(list(
        ok  = FALSE,
        msg = paste0(
          "Paquete no permitido: '", pkg, "'.\n",
          "Paquetes disponibles: ", paste(ALLOWED_PACKAGES, collapse = ", ")
        )
      ))
    }
  }

  list(ok = TRUE, msg = NULL)
}

# ── Captura de un gráfico a PNG base64 ───────────────────────────────────────
# Abre un dispositivo PNG, llama a fun(), cierra el dispositivo y devuelve
# la imagen como base64. Devuelve NULL si no se dibujó nada.
capture_plot_as_b64 <- function(fun, width = 800, height = 520, res = 120) {
  tmp <- tempfile(fileext = ".png")
  on.exit({
    try(dev.off(), silent = TRUE)
    if (file.exists(tmp)) file.remove(tmp)
  }, add = TRUE)

  png(tmp, width = width, height = height, res = res, bg = "white")
  tryCatch(fun(), error = function(e) NULL)
  dev.off()

  if (!file.exists(tmp) || file.size(tmp) < 200L) return(NULL)

  raw_bytes <- readBin(tmp, "raw", n = file.size(tmp))
  jsonlite::base64_enc(raw_bytes)
}

# ── Cache de datasets — se crea UNA SOLA VEZ al hacer source() ───────────────
# Al usar este entorno como padre de safe_env, los datasets son accesibles
# directamente desde el código del estudiante sin ninguna llamada a data().
.CURSO_DATASETS <- local({
  e <- new.env(parent = baseenv())
  ds_list <- c(
    "AirPassengers",   # pasajeros aereos mensuales 1949-1960
    "nottem",          # temperaturas mensuales Nottingham Castle
    "co2",             # CO2 atmosferico mensual Mauna Loa
    "JohnsonJohnson",  # ganancias trimestrales Johnson & Johnson
    "WWWusage",        # uso de internet por minuto
    "sunspot.year",    # manchas solares anuales
    "UKgas",           # consumo de gas en UK trimestral
    "EuStockMarkets",  # indices bursatiles europeos diarios
    "lynx",            # capturas de linces en Canada anuales
    "Nile",            # caudal anual del rio Nilo
    "nhtemp",          # temperaturas anuales New Haven
    "treering",        # cronologia de anillos de arboles
    "sunspots",        # manchas solares mensuales
    "LakeHuron",       # nivel anual del lago Huron 1875-1972
    "USAccDeaths",     # muertes accidentales EEUU mensuales 1973-1978
    "UKDriverDeaths",  # muertes conductores UK mensuales 1969-1984
    "ldeaths",         # muertes pulmonares UK mensuales 1974-1979
    "airmiles",        # millas aereas EEUU anuales
    "presidents"       # aprobacion presidencial EEUU trimestral
  )
  tmp <- new.env(parent = emptyenv())
  for (ds in ds_list) {
    tryCatch({
      utils::data(list = ds, package = "datasets", envir = tmp)
      if (exists(ds, envir = tmp, inherits = FALSE))
        assign(ds, get(ds, envir = tmp, inherits = FALSE), envir = e)
    }, error = function(err) NULL)
  }
  e
})

# ── Ejecución segura ──────────────────────────────────────────────────────────
safe_execute <- function(code, timeout_secs = 10L) {

  # Resultado acumulado
  all_output   <- character(0)
  all_warnings <- character(0)
  all_plots    <- list()
  exec_error   <- NULL

  # ── Construir entorno aislado ─────────────────────────────────────────────
  # parent = .CURSO_DATASETS → los datasets del curso son visibles sin data()
  # .CURSO_DATASETS tiene parent = baseenv() para seguridad
  safe_env <- new.env(parent = .CURSO_DATASETS)

  # Poblar el entorno con funciones de los paquetes permitidos
  safe_pkgs <- c("stats", "graphics", "grDevices", "utils", "base",
                 "forecast", "ggplot2", "tseries", "zoo", "xts")
  for (pkg in safe_pkgs) {
    ns <- tryCatch(getNamespace(pkg), error = function(e) NULL)
    if (is.null(ns)) next
    for (sym in ls(ns, all.names = FALSE)) {
      tryCatch(
        assign(sym, get(sym, envir = ns, inherits = FALSE), envir = safe_env),
        error = function(e) NULL
      )
    }
  }

  # Fijar lag a stats::lag (evita confusión con dplyr::lag si existiera)
  assign("lag", stats::lag, envir = safe_env)

  # Interceptar library() / require() para validar paquetes en tiempo real
  make_safe_loader <- function(env) {
    function(package, ...) {
      pkg_name <- as.character(substitute(package))
      if (!pkg_name %in% ALLOWED_PACKAGES) {
        stop(paste0("Paquete '", pkg_name, "' no permitido. ",
                    "Disponibles: ", paste(ALLOWED_PACKAGES, collapse = ", ")))
      }
      ns <- tryCatch(getNamespace(pkg_name), error = function(e) NULL)
      if (!is.null(ns)) {
        for (sym in ls(ns, all.names = FALSE)) {
          tryCatch(assign(sym, get(sym, envir = ns), envir = env),
                   error = function(e) NULL)
        }
      }
      invisible(NULL)
    }
  }
  assign("library",  make_safe_loader(safe_env), envir = safe_env)
  assign("require",  make_safe_loader(safe_env), envir = safe_env)

  # ── Parsear el código ─────────────────────────────────────────────────────
  parsed <- tryCatch(
    parse(text = code, keep.source = FALSE),
    error = function(e) {
      exec_error <<- paste0("Error de sintaxis: ", conditionMessage(e))
      NULL
    }
  )
  if (is.null(parsed)) {
    return(list(output = "", plots = list(),
                warnings = all_warnings, error = exec_error))
  }

  # ── Evaluar expresión por expresión ───────────────────────────────────────
  tryCatch({
    setTimeLimit(cpu = timeout_secs, elapsed = timeout_secs, transient = TRUE)
    on.exit(setTimeLimit(cpu = Inf, elapsed = Inf), add = TRUE)

    for (i in seq_along(parsed)) {
      expr <- parsed[[i]]

      # Abrir dispositivo PNG para capturar cualquier gráfico que genere esta expr
      tmp_png <- tempfile(fileext = ".png")
      png(tmp_png, width = 800, height = 520, res = 120, bg = "white")
      plot_device <- dev.cur()

      # Capturar stdout + warnings de esta expresión
      expr_result  <- NULL
      expr_visible <- FALSE
      local_warns  <- character(0)

      expr_output <- capture.output({
        withCallingHandlers(
          tryCatch(
            {
              expr_result  <- eval(expr, envir = safe_env)
              expr_visible <- !is.null(expr_result) &&
                              withVisible(expr_result)$visible
            },
            error = function(e) {
              exec_error <<- conditionMessage(e)
            }
          ),
          warning = function(w) {
            local_warns <<- c(local_warns, conditionMessage(w))
            invokeRestart("muffleWarning")
          },
          message = function(m) {
            # Los mensajes de startup de paquetes van a output
            all_output <<- c(all_output,
                             trimws(conditionMessage(m), "right"))
            invokeRestart("muffleMessage")
          }
        )
      }, type = "output")

      # Acumular advertencias
      all_warnings <- c(all_warnings, local_warns)

      # ── Manejar el resultado ─────────────────────────────────────────────

      # ¿Es un objeto ggplot / patchwork?
      # Para ggplot2 sabemos con certeza que hay gráfico → imprimirlo al
      # dispositivo PNG abierto. recordPlot() no detecta grid/ggplot2
      # de forma fiable en todas las versiones de R, así que lo evitamos.
      is_gg <- !is.null(expr_result) &&
               inherits(expr_result, c("ggplot", "gg", "patchwork"))

      if (is_gg) {
        tryCatch(print(expr_result), error = function(e) NULL)
      }

      # Resultado visible no-gráfico → capturar como texto
      if (expr_visible && !is_gg) {
        text_out <- capture.output(print(expr_result))
        all_output <- c(all_output, text_out)
      }

      # Acumular output de texto de esta expresión
      if (length(expr_output) > 0) {
        all_output <- c(all_output, expr_output)
      }

      # ── Decidir si guardar el PNG ────────────────────────────────────────
      # Estrategia dual (más robusta que recordPlot()):
      #  • ggplot / patchwork → siempre hay contenido (acabamos de imprimirlo)
      #  • base R graphics   → un PNG vacío/blanco pesa < 8 KB; uno con
      #    contenido real (ejes, puntos, líneas) pesa típicamente > 8 KB
      dev.off()  # cerrar dispositivo PNG

      png_size <- if (file.exists(tmp_png)) file.size(tmp_png) else 0L
      plot_has_content <- is_gg || png_size > 8000L

      if (plot_has_content && png_size > 0L) {
        raw_bytes <- readBin(tmp_png, "raw", n = png_size)
        b64       <- jsonlite::base64_enc(raw_bytes)
        all_plots <- c(all_plots, list(list(type = "png", data = b64)))
      }
      if (file.exists(tmp_png)) file.remove(tmp_png)

      # Si hubo error, parar aquí
      if (!is.null(exec_error)) break
    }

  }, error = function(e) {
    msg <- conditionMessage(e)
    if (grepl("time limit|CPU time", msg, ignore.case = TRUE)) {
      exec_error <<- paste0(
        "Tiempo de ejecucion excedido (", timeout_secs, " s).\n",
        "Simplifica el codigo o reduce el tamano de los datos."
      )
    } else {
      exec_error <<- msg
    }
    # Cerrar dispositivos gráficos que pudieran haber quedado abiertos
    try(while (dev.cur() > 1) dev.off(), silent = TRUE)
  })

  # ── Armar respuesta ───────────────────────────────────────────────────────
  list(
    output   = paste(all_output, collapse = "\n"),
    plots    = all_plots,
    warnings = all_warnings,
    error    = exec_error
  )
}

# ══════════════════════════════════════════════════════════════════════════════
# FIN DE execute_endpoint.R
# Las funciones validate_code() y safe_execute() son cargadas desde plumber.R
# con source(). El endpoint #* @post /execute esta definido en plumber.R
# porque Plumber solo procesa anotaciones #* en el archivo que recibe plumb().
# ══════════════════════════════════════════════════════════════════════════════
