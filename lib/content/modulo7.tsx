import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo7Content() {
  return (
    <div className="prose-content">

      <Callout type="info" title="¿Por qué ver ejemplos completos?">
        <p>
          La teoría de los módulos 1–6 dice <em>qué</em> hacer en cada paso.
          Los ejemplos muestran <em>cómo</em> se ve ese proceso cuando los datos
          son reales —incluyendo las decisiones ambiguas, los modelos que no
          funcionan a la primera, y la iteración necesaria para llegar a un
          resultado defendible.
        </p>
        <p className="mt-2">
          Los tres casos de este módulo representan tres tipos frecuentes de
          series de tiempo en la práctica: una serie con múltiples
          estacionalidades (ingeniería), una con tendencia y estacionalidad
          económica (economía), y una puramente estacional sin tendencia
          (ciencias ambientales). Cada una requiere decisiones de modelado
          diferentes.
        </p>
      </Callout>

      <p className="text-base text-stone-600 leading-relaxed mb-8 border-l-4 border-stone-200 pl-4">
        Tres casos de uso completos con código R reproducible. Cada ejemplo
        sigue el flujo de los siete pasos del Módulo 6: exploración →
        transformación → tendencia → estacionalidad → ajuste → diagnóstico →
        pronóstico.
      </p>

      {/* ── 7.1 Demanda eléctrica ─────────────────────────── */}
      <h2 id="electricidad">7.1 Ingeniería — Predicción de demanda eléctrica horaria</h2>
      <p>
        La demanda eléctrica horaria presenta <strong>múltiples
        estacionalidades</strong>: un patrón diario (24 horas), uno semanal
        (7 días) y, a veces, uno anual. Este ejemplo trabaja con datos
        horarios de una semana.
      </p>

      <Callout type="info" title="Características de los datos">
        <ul className="mt-1 space-y-1">
          <li><strong>Frecuencia:</strong> horaria (<I c="s = 24" /> para patrón diario).</li>
          <li><strong>Tendencia:</strong> polinomial de bajo grado (posiblemente lineal).</li>
          <li><strong>Estacionalidad:</strong> doble — hora del día y día de la semana.</li>
          <li><strong>Tipo:</strong> generalmente aditivo (varianza aproximadamente constante).</li>
        </ul>
      </Callout>

      <D c="Y_t = \beta_0 + \beta_1 t + \sum_{i=1}^{23} \delta_i I_{i,t}^{(\text{hora})} + \sum_{j=1}^{6} \gamma_j I_{j,t}^{(\text{día})} + E_t" />

      <CodeBlock
        title="Modelo horario con indicadoras de hora y día"
        code={`library(forecast)
library(lubridate)

# ── Cargar y preparar datos ───────────────────────────────
# consumo: vector de lecturas horarias
# fechas:  vector de POSIXct
n   <- length(consumo)
t   <- 1:n
yt  <- ts(consumo, frequency = 24)  # frecuencia diaria

# Variables de hora del día (ref = hora 24)
hora_dum <- seasonaldummy(yt)  # 23 indicadoras

# Variables de día de la semana (ref = domingo)
dia_semana <- factor(weekdays(fechas), levels =
  c("lunes","martes","miércoles","jueves","viernes","sábado","domingo"))
dia_dum <- model.matrix(~ dia_semana)[, -1]  # ref: domingo

# Tendencia lineal
poli <- data.frame(t1 = t)

# ── Ajuste del modelo ─────────────────────────────────────
datos_mod <- data.frame(yt = consumo, poli, hora_dum, dia_dum)
modelo_elec <- lm(yt ~ ., data = datos_mod)
cat("R² ajustado:", round(summary(modelo_elec)$adj.r.squared, 4), "\n")

# ── Diagnóstico rápido ────────────────────────────────────
e <- residuals(modelo_elec)
Box.test(e, lag = 24, type = "Ljung-Box")  # ¿independencia?

# ── Pronóstico para las próximas 24 horas ─────────────────
t_fut      <- (n+1):(n+24)
hora_fut   <- seasonaldummy(yt, h = 24)
# Asumir próximo día = lunes
dia_fut    <- matrix(c(1,0,0,0,0,0), nrow = 24, ncol = 6, byrow = TRUE)
colnames(dia_fut) <- colnames(dia_dum)
nuevos     <- data.frame(t1 = t_fut, hora_fut, dia_fut)
pred_elec  <- predict(modelo_elec, newdata = nuevos, interval = "prediction")

# ── Visualización ─────────────────────────────────────────
plot(t[1:168], consumo[1:168], type = "l", col = "#d6d3d1", lwd = 1,
     main = "Demanda eléctrica: observado vs ajustado (1 semana)",
     xlab = "Hora", ylab = "kWh")
lines(t[1:168], fitted(modelo_elec)[1:168], col = "#1d4ed8", lwd = 2)`}
        caption="Para datos con múltiples estacionalidades considere también los modelos TBATS o mstl() de la librería forecast."
      />

      <Callout type="warning" title="Extensión a múltiples estacionalidades">
        <p>
          Con datos horarios que abarcan varios años, la doble estacionalidad
          (diaria + semanal) se puede modelar con armónicos de Fourier en lugar
          de indicadoras, reduciendo el número de parámetros de{" "}
          <I c="23 + 6 = 29" /> a potencialmente 4–6 parámetros con{" "}
          <I c="k = 2" /> armónicos por ciclo. La función{" "}
          <code>fourier()</code> del paquete <code>forecast</code> facilita
          esto.
        </p>
      </Callout>

      {/* ── 7.2 PIB agrícola ──────────────────────────────── */}
      <h2 id="pib">7.2 Economía — PIB trimestral del sector agrícola (Colombia)</h2>
      <p>
        Serie del PIB trimestral del sector agropecuario de Colombia en miles
        de millones de pesos constantes. Presenta tendencia creciente con
        variabilidad que aumenta con el nivel → candidato a modelo log-cuadrático.
      </p>
      <Callout type="info" title="Lección de este ejemplo">
        <p>
          El PIB agrícola de Colombia ilustra una característica frecuente en
          series económicas colombianas: crecimiento con estacionalidad trimestral
          marcada (primer trimestre suele ser el más bajo por la temporada de
          siembra; cuarto trimestre el más alto por cosechas y cierre de año).
          Los coeficientes <I c="\exp(\hat{\delta}_i)" /> revelan directamente
          el porcentaje del PIB de cada trimestre relativo al cuarto trimestre
          de referencia —una lectura económicamente interpretable.
        </p>
      </Callout>

      <CodeBlock
        title="Análisis completo: PIB agrícola trimestral"
        code={`library(forecast)

# ── Datos (reemplazar con datos reales del DANE) ──────────
# yt: ts trimestral, ej. desde 2000-Q1
n <- length(yt)
t <- 1:n

# ── Paso 1: Exploración ───────────────────────────────────
plot(yt, main = "PIB sector agropecuario Colombia",
     ylab = "Miles de millones COP (constantes)", col = "#1d4ed8")
plot(log(yt), main = "log(PIB agropecuario)", col = "#1d4ed8")
ggseasonplot(yt, year.labels = TRUE)  # ¿cambia la estacionalidad?

# ── Paso 2: Descomposición exploratoria ───────────────────
descom <- decompose(log(yt), type = "additive")
plot(descom)

# ── Paso 3: Modelado de tendencia ─────────────────────────
# Observar la tendencia extraída sin los ciclos
plot(descom$trend, main = "Tendencia estimada")
# Grado 2 parece adecuado para el crecimiento observado

poli  <- Mipoly(t, grado = 2)
trim  <- seasonaldummy(yt)             # Q1, Q2, Q3 (ref Q4)

# ── Paso 4: Ajuste del modelo log-cuadrático con dummies ──
mod_pib <- lm(log(as.numeric(yt)) ~ ., data = data.frame(poli, trim))
mse_pib <- summary(mod_pib)$sigma^2
cat("\nResumen del modelo:\n")
print(summary(mod_pib)$coefficients)
cat("\nR² ajustado:", round(summary(mod_pib)$adj.r.squared, 4), "\n")

# ── Efectos estacionales ──────────────────────────────────
deltas   <- coef(mod_pib)[paste0("Q", 1:3)]
efec_rel <- exp(deltas)
cat("\nEfecto relativo vs Q4:\n")
for (i in 1:3) {
  cat(sprintf("  Q%d: %.4f (%.2f%% del PIB de Q4)\n",
              i, efec_rel[i], efec_rel[i]*100))
}

# ── Paso 5: Diagnóstico ───────────────────────────────────
e <- residuals(mod_pib)
par(mfrow = c(2,2))
plot(t, e, type="l", main="Residuos vs t"); abline(h=0,col="red",lty=2)
qqnorm(e); qqline(e, col="red")
acf(e, lag.max=20, main="ACF residuos")
pacf(e, lag.max=20, main="PACF residuos")
par(mfrow=c(1,1))

shapiro.test(e)
Box.test(e, lag=8, type="Ljung-Box")

# ── Paso 6: Pronóstico 4 trimestres ──────────────────────
h       <- 4
t_fut   <- (n+1):(n+h)
nuevos  <- data.frame(Mipoly(t_fut, 2), seasonaldummy(yt, h))
names(nuevos) <- names(coef(mod_pib))[-1]
pred    <- predict(mod_pib, newdata=nuevos, interval="prediction", level=0.95)
ythat_f <- exp(pred[,"fit"])   * exp(mse_pib/2)
li_95   <- exp(pred[,"lwr"])   * exp(mse_pib/2)
ls_95   <- exp(pred[,"upr"])   * exp(mse_pib/2)

cat("\nPronóstico PIB (miles de millones COP):\n")
trimestres_fut <- c("Q1","Q2","Q3","Q4")
for (l in 1:h) {
  cat(sprintf("  %s: %.1f  [%.1f, %.1f]\n",
              trimestres_fut[l], ythat_f[l], li_95[l], ls_95[l]))
}`}
        caption="El código asume que la función Mipoly() está cargada en el entorno. Ajuste el grado del polinomio según el AIC."
      />

      {/* ── 7.3 Nottingham Castle ─────────────────────────── */}
      <h2 id="temperatura">7.3 Ambiente — Temperatura mensual de Nottingham Castle</h2>
      <p>
        Serie de temperatura media mensual (°F) registrada en Nottingham Castle,
        1920–1939 (<I c="n = 240" />, <I c="s = 12" />). Es un ejemplo clásico
        de serie <strong>puramente estacional sin tendencia</strong>: la media
        global es aproximadamente constante.
      </p>

      <Callout type="example" title="Modelo apropiado">
        <p>
          Sin tendencia, el modelo se reduce a:
        </p>
        <D c="Y_t = \beta_0 + \sum_{i=1}^{11} \delta_i I_{i,t} + E_t" />
        <p>
          con 12 meses y referencia en diciembre. <I c="\beta_0" /> estima la
          temperatura media de diciembre; <I c="\delta_i" /> la diferencia
          absoluta respecto a diciembre para el mes <I c="i" />.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ Modelo solo estacional — Nottingham Castle (nottem)"
        code={`library(forecast)
library(ggplot2)

# ── Datos (disponibles en R base) ────────────────────────
yt <- nottem        # ts mensual 1920-1939, °F
n  <- length(yt)
t  <- 1:n

# ── Exploración con ggplot2 (evita plot.new issues) ──────
df_yt <- data.frame(
  Año = as.numeric(time(yt)),
  Tmp = as.numeric(yt)
)
mod_lineal <- lm(Tmp ~ Año, data = df_yt)
pval_tend  <- summary(mod_lineal)$coef[2, 4]
cat(sprintf("P-valor tendencia: %.4f → %s\n",
            pval_tend,
            if (pval_tend > 0.05) "sin tendencia significativa"
            else "tendencia significativa"))

ggplot(df_yt, aes(x = Año, y = Tmp)) +
  geom_line(colour = "#1d4ed8", linewidth = 1) +
  geom_smooth(method = "lm", se = FALSE,
              colour = "#ef4444", linetype = "dashed",
              linewidth = 0.8) +
  labs(title = "Temperatura mensual — Nottingham Castle (°F)",
       subtitle = paste0("Línea roja = tendencia lineal (p = ",
                         round(pval_tend, 3), ")"),
       x = "Año", y = "°F") +
  theme_bw(base_size = 12)

# ── Modelo solo estacional ─────────────────────────────────
mes_dum <- seasonaldummy(yt)   # Ene, Feb, ..., Nov (ref = Dic)
mod_est  <- lm(as.numeric(yt) ~ mes_dum)
cat("\nR² ajustado:", round(summary(mod_est)$adj.r.squared, 4), "\n")

# ── Efectos mensuales ─────────────────────────────────────
coefs  <- coef(mod_est)
beta0  <- coefs[1]
deltas <- coefs[-1]
meses  <- c("Ene","Feb","Mar","Abr","May","Jun",
            "Jul","Ago","Sep","Oct","Nov")
cat(sprintf("Media de diciembre (referencia): %.2f °F\n", beta0))
for (i in seq_along(meses))
  cat(sprintf("  %s: %.2f °F  (δ = %+.2f)\n",
              meses[i], beta0 + deltas[i], deltas[i]))

# ── Gráfico de efectos con ggplot2 ────────────────────────
todos_meses <- c(meses, "Dic")
temp_meses  <- c(deltas, 0) + beta0
df_bar <- data.frame(
  Mes   = factor(todos_meses, levels = todos_meses),
  Temp  = temp_meses,
  Sobre = temp_meses >= beta0
)

ggplot(df_bar, aes(x = Mes, y = Temp, fill = Sobre)) +
  geom_col(show.legend = FALSE) +
  geom_hline(yintercept = beta0,
             colour = "#1c1917", linetype = "dashed", linewidth = 1) +
  scale_fill_manual(values = c("TRUE" = "#ef4444", "FALSE" = "#3b82f6")) +
  scale_y_continuous(limits = c(30, 70)) +
  labs(title    = "Temperatura media estimada por mes (°F)",
       subtitle = paste0("Línea = referencia diciembre (",
                         round(beta0, 1), " °F)"),
       x = NULL, y = "°F") +
  theme_bw(base_size = 12)

# ── Diagnóstico ───────────────────────────────────────────
e_est <- residuals(mod_est)
cat("\n--- Shapiro-Wilk ---\n"); print(shapiro.test(e_est))
cat("--- Ljung-Box ---\n")
print(Box.test(e_est, lag = 24, type = "Ljung-Box"))

# ── Pronóstico (repetir patrón estacional) ────────────────
h       <- 12
mes_fut <- seasonaldummy(yt, h = h)
# Alinear nombres con los del modelo
colnames(mes_fut) <- colnames(mes_dum)
pred_not <- predict(mod_est,
                    newdata = as.data.frame(mes_fut),
                    interval = "prediction", level = 0.95)

cat("\nProyección 1 año adelante:\n")
print(data.frame(
  Mes  = todos_meses,
  Pron = round(pred_not[, "fit"], 1),
  LI95 = round(pred_not[, "lwr"], 1),
  LS95 = round(pred_not[, "upr"], 1)
))`}
        caption="La serie nottem está disponible en R base. Es un banco de prueba clásico para modelos estacionales sin tendencia."
      />

      <Callout type="info" title="Resultado clave">
        <p>
          El mes más cálido es julio (estimado ≈ 63.5°F) y el más frío es
          enero (≈ 39.4°F). La diferencia de <strong>~24°F entre julio y
          diciembre</strong> corresponde a{" "}
          <I c="\hat{\delta}_{\text{Jul}} \approx 21" />. El modelo explica
          más del 97% de la variabilidad total de la serie.
        </p>
      </Callout>

      {/* ── Comparación final ────────────────────────────── */}
      <h2 id="resumen-ejemplos">7.4 Resumen comparativo de los tres ejemplos</h2>
      <table>
        <thead>
          <tr>
            <th>Aspecto</th>
            <th>Demanda eléctrica</th>
            <th>PIB agrícola</th>
            <th>Temp. Nottingham</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Frecuencia</td>
            <td>Horaria (s=24)</td>
            <td>Trimestral (s=4)</td>
            <td>Mensual (s=12)</td>
          </tr>
          <tr>
            <td>Tendencia</td>
            <td>Lineal leve</td>
            <td>Cuadrática creciente</td>
            <td>Sin tendencia</td>
          </tr>
          <tr>
            <td>Tipo de modelo</td>
            <td>Aditivo</td>
            <td>Log-cuadrático</td>
            <td>Aditivo (solo S_t)</td>
          </tr>
          <tr>
            <td>Estacionalidad</td>
            <td>Doble (hora + día)</td>
            <td>Simple (trimestral)</td>
            <td>Simple (mensual)</td>
          </tr>
          <tr>
            <td>Predictores</td>
            <td>t, I_hora, I_día</td>
            <td>t, t², I_Q1, I_Q2, I_Q3</td>
            <td>I_Ene,…,I_Nov</td>
          </tr>
          <tr>
            <td>Transformación</td>
            <td>Ninguna</td>
            <td>log(Y_t)</td>
            <td>Ninguna</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
