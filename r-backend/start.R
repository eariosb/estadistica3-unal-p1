# start.R — Arranque del servidor Plumber
# Lee el puerto desde $PORT (Railway/Render/Fly.io lo inyectan automáticamente).
# En desarrollo local usa 8000 como valor por defecto.

port <- as.integer(Sys.getenv("PORT", unset = "8000"))

cat(sprintf("[start.R] Iniciando servidor Plumber en 0.0.0.0:%d\n", port))

pr <- plumber::plumb("plumber.R")

pr$run(
  host  = "0.0.0.0",
  port  = port,
  quiet = FALSE
)
