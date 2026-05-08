import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

export function Modulo6Content() {
  return (
    <div className="prose-content">

      <p className="text-base text-stone-600 leading-relaxed mb-8 border-l-4 border-stone-200 pl-4">
        Este módulo consolida el flujo de trabajo completo: desde el primer
        gráfico hasta el pronóstico final validado. Úsalo como lista de
        verificación en cada análisis.
      </p>

      {/* ── 6.1 Pasos recomendados ───────────────────────── */}
      <h2 id="pasos">6.1 Flujo de trabajo recomendado</h2>

      {[
        {
          n: "01",
          title: "Análisis exploratorio",
          color: "border-blue-500",
          bg: "bg-blue-50",
          tc: "text-blue-800",
          items: [
            "Graficar la serie: ¿tendencia creciente/decreciente? ¿oscilaciones estacionales?",
            "¿La varianza aumenta con el nivel? → considerar log(Y_t)",
            "Usar decompose() para una primera estimación visual de T_t y S_t",
            "Calcular acf() de la serie original para detectar la periodicidad s",
          ],
          code: `# ── AirPassengers: exploración completa ──────────────────
yt <- AirPassengers      # ts mensual 1949-1960, s=12
n  <- length(yt)

{
par(mfrow = c(2, 2))
plot(yt, main = "Serie original", col = "#1d4ed8", lwd = 1.5)
plot(log(yt), main = "log(Yt) — varianza estabilizada",
     col = "#7c3aed", lwd = 1.5)
plot(decompose(yt, type = "multiplicative"))
acf(yt, lag.max = 36, main = "ACF — detectar periodicidad s")
par(mfrow = c(1, 1))
}
cat("Rango serie:", range(yt), "\n")
cat("Varianza primera mitad:", var(yt[1:(n/2)]), "\n")
cat("Varianza segunda mitad:", var(yt[(n/2+1):n]), "\n")`
        },
        {
          n: "02",
          title: "Transformación",
          color: "border-stone-400",
          bg: "bg-stone-50",
          tc: "text-stone-700",
          items: [
            "Si la varianza crece con el nivel: trabajar con log(Y_t) → modelo multiplicativo",
            "Si la varianza es constante: trabajar con Y_t → modelo aditivo",
            "Verificar visualmente que el log estabiliza la varianza",
          ],
          code: `# ── AirPassengers: comparar varianza (decisión de transformar) ──
yt <- AirPassengers
n  <- length(yt)
v1 <- var(yt[1:(n/2)])
v2 <- var(yt[(n/2+1):n])
cat("Varianza 1ª mitad:", round(v1, 1), "\n")
cat("Varianza 2ª mitad:", round(v2, 1), "\n")
cat("Razón (debería ser ~1 si es aditivo):", round(v2/v1, 2), "\n")
# Razón >> 1 → transformar con log

# Verificar visualmente
{
par(mfrow = c(1, 2))
plot(yt,     main = "Original  — varianza creciente")
plot(log(yt), main = "log(Yt) — varianza estable", col = "#7c3aed")
par(mfrow = c(1, 1))
}`
        },
        {
          n: "03",
          title: "Modelado de tendencia",
          color: "border-emerald-500",
          bg: "bg-emerald-50",
          tc: "text-emerald-800",
          items: [
            "Desestacionalizar la serie (con decompose() o STL) y graficar T_t",
            "Observar la forma de la tendencia — ¿lineal? ¿cuadrática? ¿cúbica?",
            "Ajustar modelos polinomiales de grado 1, 2, 3 y comparar AIC/BIC",
            "No elegir el grado por los ciclos visibles en los residuos",
          ],
          code: `# ── AirPassengers: selección del grado de tendencia ──────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
yt <- log(AirPassengers)   # trabajar en escala log
n  <- length(yt)
t  <- 1:n
grados <- 1:4
aics   <- sapply(grados, function(g)
  AIC(lm(as.numeric(yt) ~ ., data = Mipoly(t, g)))
)
cat("AIC por grado:\n")
print(data.frame(Grado = grados, AIC = round(aics, 2)))
{
plot(grados, aics, type = "b", pch = 16,
     col = "#1d4ed8", lwd = 2,
     main = "AIC por grado del polinomio",
     xlab = "Grado p", ylab = "AIC")
abline(v = which.min(aics), col = "#ef4444", lty = 2)
}
cat("Grado óptimo:", which.min(aics), "\n")`
        },
        {
          n: "04",
          title: "Modelado de estacionalidad",
          color: "border-violet-500",
          bg: "bg-violet-50",
          tc: "text-violet-800",
          items: [
            "Patrón estable cada año → variables indicadoras (seasonaldummy)",
            "Patrón que evoluciona → funciones trigonométricas o STL",
            "Verificar con boxplot por mes si la forma cambia",
          ],
          code: `# ── AirPassengers: verificar patrón estacional ───────────
library(forecast)
yt <- AirPassengers

# Extraer mes y año
mes <- cycle(yt)
mes_labels <- c("Ene","Feb","Mar","Abr","May","Jun",
                "Jul","Ago","Sep","Oct","Nov","Dic")

# Temperatura media por mes — ¿cambia el rango?
boxplot(as.numeric(yt) ~ mes,
        names = mes_labels,
        col = "#dbeafe",
        main = "Distribución de pasajeros por mes (AirPassengers)",
        xlab = "Mes", ylab = "Pasajeros (miles)")

# Medias y comparar primera vs segunda mitad
med_mes_1 <- tapply(as.numeric(yt)[1:72],  cycle(yt)[1:72],  mean)
med_mes_2 <- tapply(as.numeric(yt)[73:144], cycle(yt)[73:144], mean)
cat("Amplitud 1ª mitad:", round(diff(range(med_mes_1)), 1), "\n")
cat("Amplitud 2ª mitad:", round(diff(range(med_mes_2)), 1), "\n")
# Amplitud creciente → estacionalidad multiplicativa (usar log + dummies)`
        },
        {
          n: "05",
          title: "Ajuste del modelo completo",
          color: "border-amber-500",
          bg: "bg-amber-50",
          tc: "text-amber-800",
          items: [
            "Combinar predictores de tendencia y estacionalidad en data.frame",
            "Ajustar con lm() (modelos aditivo y log) o nls() (exponencial)",
            "Obtener tabla de coeficientes, R² ajustado, F-global",
            "Calcular valores ajustados y residuos",
          ],
          code: `# ── AirPassengers: ajuste del modelo completo ─────────────
library(forecast)
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
yt  <- AirPassengers
n   <- length(yt)
t   <- 1:n
p   <- 1                       # grado elegido (lineal)
poli  <- Mipoly(t, grado = p)
dummy <- seasonaldummy(yt)     # 11 indicadoras (ref = Dic)
mod   <- lm(log(as.numeric(yt)) ~ ., data = data.frame(poli, dummy))
mse   <- summary(mod)$sigma^2

cat("R² ajustado:", round(summary(mod)$adj.r.squared, 4), "\n")
cat("RMSE (escala log):", round(sqrt(mse), 5), "\n")

# Valores ajustados en escala original
ythat <- exp(fitted(mod)) * exp(mse / 2)
MAPE  <- mean(abs(as.numeric(yt) - ythat) / as.numeric(yt)) * 100
cat(sprintf("MAPE dentro de muestra: %.2f%%\n", MAPE))`
        },
        {
          n: "06",
          title: "Diagnóstico de residuos",
          color: "border-rose-500",
          bg: "bg-rose-50",
          tc: "text-rose-800",
          items: [
            "Graficar Ê_t vs t (media cero, sin tendencia residual)",
            "Graficar Ê_t vs Ŷ_t (homocedasticidad)",
            "ACF y PACF de residuos (independencia)",
            "Q-Q plot y test Shapiro-Wilk (normalidad)",
            "Durbin-Watson o Ljung-Box para autocorrelación",
          ],
          code: `# ── Diagnóstico completo — modelo AirPassengers ───────────
library(forecast)
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
yt  <- AirPassengers
n   <- length(yt)
t   <- 1:n
s   <- 12
mod <- lm(log(as.numeric(yt)) ~ .,
          data = data.frame(Mipoly(t, 1), seasonaldummy(yt)))
e   <- residuals(mod)

{
par(mfrow = c(2, 2))
plot(t, e, type = "l", col = "#3b82f6", lwd = 1.2,
     main = "Residuos vs t", xlab = "t", ylab = "Ehat")
abline(h = 0, col = "red", lty = 2)

plot(fitted(mod), e, col = "#3b82f6", pch = 16, cex = 0.7,
     main = "Residuos vs Ajustados",
     xlab = "Yhat", ylab = "Ehat")
abline(h = 0, col = "red", lty = 2)

qqnorm(e, col = "#3b82f6", pch = 16, cex = 0.8, main = "Q-Q Normal")
qqline(e, col = "red", lwd = 1.5)

acf(e, lag.max = 3*s, main = "ACF de residuos")
par(mfrow = c(1, 1))
}

cat("\n--- Shapiro-Wilk ---\n"); print(shapiro.test(e))
cat("--- Ljung-Box (lag=24) ---\n")
print(Box.test(e, lag = 2*s, type = "Ljung-Box"))`
        },
        {
          n: "07",
          title: "Pronóstico y validación",
          color: "border-cyan-500",
          bg: "bg-cyan-50",
          tc: "text-cyan-800",
          items: [
            "Generar predicciones puntuales para h periodos adelante",
            "Calcular intervalos de predicción al 95%",
            "Comparar con periodo de prueba (ex-post): MAE, RMSE, MAPE, cobertura",
          ],
          code: `# ── Pronóstico 12 meses — AirPassengers ──────────────────
library(forecast)
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
yt  <- AirPassengers
n   <- length(yt)
t   <- 1:n
mod <- lm(log(as.numeric(yt)) ~ .,
          data = data.frame(Mipoly(t, 1), seasonaldummy(yt)))
mse <- summary(mod)$sigma^2

h       <- 12
t_fut   <- (n + 1):(n + h)
nuevos  <- data.frame(Mipoly(t_fut, 1), seasonaldummy(yt, h))
names(nuevos) <- names(coef(mod))[-1]

pred    <- predict(mod, newdata = nuevos,
                   interval = "prediction", level = 0.95)
ythat_f <- exp(pred[, "fit"]) * exp(mse / 2)
li_f    <- exp(pred[, "lwr"]) * exp(mse / 2)
ls_f    <- exp(pred[, "upr"]) * exp(mse / 2)

res_df <- data.frame(
  Periodo    = paste0("1961-", sprintf("%02d", 1:12)),
  Pronostico = round(ythat_f, 1),
  LI_95      = round(li_f, 1),
  LS_95      = round(ls_f, 1)
)
print(res_df)`
        },
      ].map(({ n, title, color, bg, tc, items, code }) => (
        <div key={n} className={`mb-6 rounded-xl border-l-4 ${color} ${bg} p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`font-mono text-2xl font-bold ${tc} opacity-50`}>{n}</span>
            <h3 className={`text-base font-bold ${tc} m-0`} style={{marginTop:0,marginBottom:0}}>{title}</h3>
          </div>
          <ul className="text-sm text-stone-600 space-y-1 mb-3">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0"/>
                {item}
              </li>
            ))}
          </ul>
          <CodeBlock executable={true} packages={["forecast","ggplot2"]} code={code} title="▶ Ejemplo ejecutable" />
        </div>
      ))}

      {/* ── 6.2 Tabla de funciones R ─────────────────────── */}
      <h2 id="funciones">6.2 Tabla de funciones R clave (repositorio Nelfi González)</h2>

      <table>
        <thead>
          <tr>
            <th>Función</th>
            <th>Propósito</th>
            <th>Argumentos clave</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Mipoly(tiempo, grado)", "Genera data.frame con columnas t¹, …, tᵖ", "tiempo: vector 1:n, grado: entero ≥ 1"],
            ["seasonaldummy(serie, h)", "Crea s−1 variables indicadoras estacionales", "h: periodos futuros para pronóstico"],
            ["Mytrigon(tiempo, Frecuencias)", "Crea senos y cosenos para frecuencias dadas", "Frecuencias: vector Fⱼ"],
            ["lm(formula, data)", "Ajuste MCO de modelos lineales (base R)", "formula, data, subset"],
            ["regexponencialv02(respuesta, data)", "Ajuste no lineal de modelo exponencial-polinomial", "respuesta, data, grado, dummies"],
            ["exp.crit.inf.resid(resid, n.par)", "Calcula AIC y BIC en escala original (para log-modelos)", "residuos, número de parámetros"],
            ["amplitud.cobertura(real, LIP, LSP)", "Mide precisión y cobertura de intervalos de predicción", "vectores de reales, LI y LS"],
            ["interpdeltas(modelo, gradopoly, aditivo)", "Extrae y grafica efectos estacionales δᵢ", "modelo lm, grado polinomio, tipo"],
            ["spec.pgram(x, ...)", "Calcula el periodograma (base R)", "taper, log, spans"],
            ["stl(serie, s.window)", "Descomposición STL con LOESS (base R)", "s.window: \"periodic\" o entero impar"],
          ].map(([fn, desc, args]) => (
            <tr key={fn as string}>
              <td><code className="text-xs">{fn as string}</code></td>
              <td className="text-sm">{desc as string}</td>
              <td className="text-xs text-stone-500 font-mono">{args as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 6.3 Errores comunes ──────────────────────────── */}
      <h2 id="errores">6.3 Errores comunes y cómo evitarlos</h2>

      <div className="space-y-3">
        {[
          {
            error: "Elegir el grado del polinomio por los ciclos en los residuos",
            solucion: "Los ciclos indican falta de estacionalidad o autocorrelación, no mayor grado de tendencia. La tendencia se modela observando la componente Tt del decompose(), no los residuos completos.",
          },
          {
            error: "Olvidar la corrección exp(MSE/2) al volver de log",
            solucion: "Las predicciones en escala original siempre deben multiplicarse por exp(MSE/2). Omitirla produce estimaciones sesgadas hacia abajo.",
          },
          {
            error: "Incluir s dummies en lugar de s−1",
            solucion: "Incluir las s indicadoras junto al intercepto genera colinealidad perfecta. R elimina una automáticamente pero lo hace silenciosamente, lo que puede confundir la interpretación.",
          },
          {
            error: "Comparar AIC/BIC entre modelos log y no-log directamente",
            solucion: "AIC y BIC no son comparables entre escalas. Use la función exp.crit.inf.resid() que calcula los criterios en la escala original, o compare RMSE/MAPE en el periodo de prueba.",
          },
          {
            error: "Extrapolar muy lejos del rango de entrenamiento",
            solucion: "Los modelos polinomiales de alto grado pueden divergir rápidamente fuera de la muestra. Prefiera grado bajo para pronóstico y valide con un periodo ex-post.",
          },
        ].map(({ error, solucion }) => (
          <div key={error} className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm font-semibold text-rose-700 mb-1 flex items-start gap-2">
              <span className="flex-shrink-0">✗</span> {error}
            </p>
            <p className="text-sm text-stone-600 pl-5">{solucion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

    </div>
  );
}
