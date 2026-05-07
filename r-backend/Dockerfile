# ══════════════════════════════════════════════════════════════════════════════
# Dockerfile  —  Backend R + Plumber del mini-curso de Series de Tiempo
#
# Basado en rocker/r-ver para una base estable y reproducible.
# Incluye todos los paquetes R necesarios para las lecciones del curso
# y para el modulo TimeSight.
#
# Construir:
#   docker build -t r-curso-st ./r-backend
#
# Ejecutar (desarrollo):
#   docker run --rm -p 8000:8000 \
#     -e R_BACKEND_SECRET="" \
#     r-curso-st
# ══════════════════════════════════════════════════════════════════════════════

FROM rocker/r-ver:4.3.3

# ── Dependencias del sistema ──────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      libssl-dev        \
      libcurl4-openssl-dev \
      libxml2-dev       \
      libfontconfig1-dev \
      libharfbuzz-dev   \
      libfribidi-dev    \
      libfreetype6-dev  \
      libpng-dev        \
      libtiff5-dev      \
      libjpeg-dev       \
      pandoc            \
    && rm -rf /var/lib/apt/lists/*

# ── Paquetes R ────────────────────────────────────────────────────────────────
# Se instalan en una sola capa para aprovechar la cache de Docker.
# Si cambias algun paquete, solo se reconstruye desde este paso.
# Instalar paquetes en dos pasos:
# 1) Repositorio Posit (binarios pre-compilados Linux — muy rápido)
# 2) Fallback a CRAN oficial si hay error de red
RUN Rscript -e " \
  repos_posit <- 'https://packagemanager.posit.co/cran/__linux__/jammy/latest'; \
  repos_cran  <- 'https://cloud.r-project.org'; \
  options(repos = c(CRAN = repos_posit)); \
  pkgs <- c('plumber','jsonlite','forecast','tseries','zoo','xts','TTR', \
            'ggplot2','scales','rlang'); \
  for (p in pkgs) { \
    if (!requireNamespace(p, quietly = TRUE)) { \
      ok <- tryCatch({ \
        install.packages(p, quiet = TRUE, dependencies = TRUE); TRUE \
      }, error = function(e) FALSE); \
      if (!ok) { \
        message('Fallback CRAN para: ', p); \
        options(repos = c(CRAN = repos_cran)); \
        install.packages(p, quiet = TRUE, dependencies = TRUE); \
        options(repos = c(CRAN = repos_posit)); \
      } \
    } \
  } \
"

# ── Directorio de trabajo ─────────────────────────────────────────────────────
WORKDIR /app

# ── Copiar codigo fuente ──────────────────────────────────────────────────────
COPY plumber.R              ./plumber.R
COPY execute_endpoint.R     ./execute_endpoint.R
COPY timesight_endpoints.R  ./timesight_endpoints.R

# ── Puerto expuesto ───────────────────────────────────────────────────────────
EXPOSE 8000

# ── Healthcheck integrado ─────────────────────────────────────────────────────
# Docker reiniciara el contenedor si el health-check falla 3 veces.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD Rscript -e "tryCatch(readLines('http://localhost:8000/health'), error=function(e) quit(status=1))"

# ── Arrancar el servidor ──────────────────────────────────────────────────────
CMD ["Rscript", "-e", \
  "pr <- plumber::plumb('plumber.R'); pr$run(host='0.0.0.0', port=8000, quiet=FALSE)"]
