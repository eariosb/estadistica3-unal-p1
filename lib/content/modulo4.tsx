import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo4Content() {
  return (
    <div className="prose-content">

      {/* ── 4.1 Ecuaciones generales ─────────────────────── */}
      <h2 id="ecuaciones">4.1 Ecuaciones generales</h2>
      <p>
        Sea <I c="p" /> el grado del polinomio de tendencia y <I c="s" /> el
        periodo estacional. Combinamos ambas componentes en un único modelo de
        regresión. Los tres modelos principales son:
      </p>

      <h3 id="aditivo">Modelo 1 — Polinomial estacional con indicadoras (aditivo)</h3>
      <D c="Y_t = \beta_0 + \sum_{j=1}^{p} \beta_j t^j + \sum_{i=1}^{s-1} \delta_i I_{i,t} + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0,\sigma^2)" />
      <p>
        Adecuado cuando la serie tiene <strong>varianza constante</strong> y la
        estacionalidad es aditiva. Se estima directamente con <code>lm()</code>.
      </p>

      <h3 id="log-polinomial">Modelo 2 — Log-polinomial estacional (completamente multiplicativo)</h3>
      <D c="\log(Y_t) = \beta_0 + \sum_{j=1}^{p} \beta_j t^j + \sum_{i=1}^{s-1} \delta_i I_{i,t} + \varepsilon_t, \quad \varepsilon_t \overset{\text{iid}}{\sim} N(0,\sigma^2)" />
      <p>
        donde <I c="\varepsilon_t" /> es el error en la <strong>escala
        logarítmica</strong>. En la escala original, el modelo equivale a{" "}
        <I c="Y_t = T_t \cdot S_t \cdot \exp(\varepsilon_t)" />, es decir,
        tendencia y estacionalidad interactúan multiplicativamente y la
        varianza de <I c="Y_t" /> crece con su nivel. Apropiado cuando el
        gráfico de la serie muestra amplitud estacional que se expande con el
        tiempo (patrón <em>en abanico</em>). El ajuste se realiza con{" "}
        <code>lm()</code> sobre <I c="\log(Y_t)" /> y las predicciones se
        corrigen:
      </p>
      <D c="\hat{Y}_t \approx \exp\!\left(\widehat{\log Y_t} + \frac{MSE}{2}\right)" />

      <h3 id="exponencial">Modelo 3 — Exponencial-polinomial (parcialmente multiplicativo)</h3>
      <D c="Y_t = \exp\!\left(\beta_0 + \sum_{j=1}^{p} \beta_j t^j + \sum_{i=1}^{s-1} \delta_i I_{i,t}\right) + E_t" />
      <p>
        Estimado con mínimos cuadrados no lineales mediante{" "}
        <code>regexponencialv02()</code>. La tendencia y la estacionalidad
        interactúan multiplicativamente, pero el error es aditivo.
      </p>

      <Callout type="info" title="Trigonométricas como alternativa">
        <p>
          En todos los modelos, la suma de indicadoras{" "}
          <I c="\sum_{i=1}^{s-1} \delta_i I_{i,t}" /> puede reemplazarse por
          la suma de armónicos{" "}
          <I c="\sum_{j=1}^k [\alpha_j \sin(2\pi F_j t) + \gamma_j \cos(2\pi F_j t)]" />.
          Esto no cambia la lógica de estimación, solo el conjunto de
          predictores.
        </p>
      </Callout>

      {/* ── 4.2 Pronósticos ─────────────────────────────── */}
      <h2 id="pronosticos">4.2 Pronósticos puntuales y por intervalo</h2>
      <p>
        Con origen en <I c="t = n" />, el pronóstico a <I c="L" /> periodos
        adelante se obtiene evaluando la ecuación estimada en{" "}
        <I c="t = n + L" />.
      </p>

      <h3>Intervalos de predicción (1−α)100%</h3>
      <p>
        Sea <I c="k = 1 + p + (s-1)" /> el número total de parámetros
        (intercepto + grado del polinomio + indicadoras estacionales). El
        vector de predictores para el horizonte <I c="L" /> es:
      </p>
      <D c="\mathbf{x}_0 = \bigl(1,\; n{+}L,\; (n{+}L)^2,\; \ldots,\; (n{+}L)^p,\; I_{1,\,n+L},\; \ldots,\; I_{s-1,\,n+L}\bigr)^T \;\in\; \mathbb{R}^{k}" />
      <p>
        donde <I c="I_{i,\,n+L} = 1" /> si el periodo <I c="n+L" /> pertenece
        a la estación <I c="i" /> (0 en caso contrario).
      </p>
      <p><strong>Modelo 1 — polinomial aditivo:</strong></p>
      <D c="\hat{Y}_n(L) \pm t_{\alpha/2,\; n-k}\; \sqrt{MSE\!\left[1 + \mathbf{x}_0^T (\mathbf{X}^T\mathbf{X})^{-1} \mathbf{x}_0\right]}" />
      <p><strong>Modelo 2 — log-polinomial (escala original, con corrección):</strong></p>
      <D c="\exp\!\left(\hat{W}_n(L) \pm t_{\alpha/2,\,n-k}\sqrt{MSE\!\left[1 + \mathbf{x}_0^T(\mathbf{X}^T\mathbf{X})^{-1}\mathbf{x}_0\right]}\right) \cdot \exp\!\left(\frac{MSE}{2}\right)" />
      <p>
        donde <I c="\hat{W}_n(L) = \widehat{\log Y_n}(L)" /> es el pronóstico
        en escala logarítmica. Al transformar con <I c="\exp(\cdot)" />, los
        límites del intervalo resultan <strong>asimétricos</strong> en la
        escala original.
      </p>

      {/* ── 4.3 AirPassengers ───────────────────────────── */}
      <h2 id="airpassengers">4.3 Ejemplo A — AirPassengers: modelo log-lineal estacional</h2>
      <p>
        El dataset <code>AirPassengers</code> (base R) contiene el número mensual
        de pasajeros internacionales de aerolíneas (en miles) de enero de 1949
        a diciembre de 1960 (<I c="n = 144" />, <I c="s = 12" />). Es el
        ejemplo clásico de serie <strong>multiplicativa</strong>: tanto la
        tendencia como la amplitud estacional crecen. Trabajamos con{" "}
        <I c="\log(Y_t)" />.
      </p>

      <Callout type="example" title="¿Por qué transformar con log?">
        <p>
          En AirPassengers, la amplitud de los picos estivales (julio–agosto)
          crece casi proporcionalmente al nivel de la serie — claro indicio de
          multiplicatividad. Al tomar <I c="\log(Y_t)" />, la varianza se
          estabiliza y la estacionalidad se vuelve aditiva. El modelo log-lineal
          con indicadoras mensuales captura esta estructura con solo{" "}
          <I c="1 + 11 = 12" /> parámetros.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ AirPassengers — ajuste log-lineal + dummies mensuales"
        code={`# ── Funciones auxiliares (autocontenidas) ────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}

library(forecast)
library(ggplot2)

# ── Dataset ───────────────────────────────────────────────
# AirPassengers disponible directamente
yt <- AirPassengers
n  <- length(yt)             # 144
t  <- 1:n

# ── Predictores ───────────────────────────────────────────
poli1 <- Mipoly(t, grado = 1)          # tendencia lineal en log
dum   <- seasonaldummy(yt)             # 11 dummies (ref = dic)

datos_mod <- data.frame(lyt = log(as.numeric(yt)), poli1, dum)

# ── Ajuste MCO sobre log(Y_t) ─────────────────────────────
modelo <- lm(lyt ~ ., data = datos_mod)
summary(modelo)

# ── Corrección por transformación ─────────────────────────
mse    <- summary(modelo)$sigma^2
ythat  <- exp(fitted(modelo)) * exp(mse / 2)

# ── MAPE dentro de muestra ────────────────────────────────
MAPE <- mean(abs(as.numeric(yt) - ythat) / as.numeric(yt)) * 100
cat(sprintf("MAPE = %.2f%%\\n", MAPE))

# ── Gráfico ggplot2 ───────────────────────────────────────
df_ap <- data.frame(
  t      = t,
  Año    = as.numeric(time(yt)),
  Obs    = as.numeric(yt),
  Ajuste = ythat
)

ggplot(df_ap, aes(x = Año)) +
  geom_line(aes(y = Obs,    colour = "Observado"),
            linewidth = 0.9, alpha = 0.85) +
  geom_line(aes(y = Ajuste, colour = "Ajustado"),
            linewidth = 1.4) +
  scale_colour_manual(
    values = c("Observado" = "#78716c", "Ajustado" = "#1d4ed8")
  ) +
  labs(
    title    = "AirPassengers — Modelo log-lineal con dummies mensuales",
    subtitle = "log(Yₜ) = β₀ + β₁t + Σδᵢ Iᵢₜ + Eₜ  |  corrección exp(MSE/2)",
    x = "Año", y = "Pasajeros (miles)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="El MAPE dentro de muestra típicamente es <5% para AirPassengers con este modelo. Los residuos aún pueden mostrar leve autocorrelación — ver Módulo 8."
      />

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ AirPassengers — pronóstico 24 meses con IC 95% (autocontenido)"
        code={`library(forecast)
library(ggplot2)

# ── Funciones y datos ─────────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
yt    <- AirPassengers
n     <- length(yt)
t     <- 1:n
poli1 <- Mipoly(t, grado = 1)
dum   <- seasonaldummy(yt)
datos <- data.frame(lyt = log(as.numeric(yt)), poli1, dum)
mod   <- lm(lyt ~ ., data = datos)
mse   <- summary(mod)$sigma^2
ythat <- exp(fitted(mod)) * exp(mse / 2)

# ── Pronóstico 24 meses ───────────────────────────────────
h        <- 24
t_fut    <- (n + 1):(n + h)
poli_fut <- Mipoly(t_fut, grado = 1)
dum_fut  <- seasonaldummy(yt, h = h)
nuevos   <- data.frame(poli_fut, dum_fut)
names(nuevos) <- names(coef(mod))[-1]

pred_log  <- predict(mod, newdata = nuevos,
                     interval = "prediction", level = 0.95)
pred_orig <- exp(pred_log) * exp(mse / 2)
colnames(pred_orig) <- c("Pronostico", "LI_95", "LS_95")

# ── Gráfico ───────────────────────────────────────────────
df_all <- data.frame(
  Año        = c(as.numeric(time(yt)), 1961 + (0:(h-1)) / 12),
  Obs        = c(as.numeric(yt),       rep(NA, h)),
  Ajuste     = c(ythat,                rep(NA, h)),
  Pronostico = c(rep(NA, n),           pred_orig[, "Pronostico"]),
  LI         = c(rep(NA, n),           pred_orig[, "LI_95"]),
  LS         = c(rep(NA, n),           pred_orig[, "LS_95"])
)

ggplot(df_all, aes(x = Año)) +
  geom_ribbon(aes(ymin = LI, ymax = LS),
              fill = "#1d4ed8", alpha = 0.15, na.rm = TRUE) +
  geom_line(aes(y = Obs),        colour = "#78716c",
            linewidth = 0.9, na.rm = TRUE) +
  geom_line(aes(y = Ajuste),     colour = "#1d4ed8",
            linewidth = 1.2, na.rm = TRUE) +
  geom_line(aes(y = Pronostico), colour = "#dc2626",
            linewidth = 1.3, linetype = "dashed", na.rm = TRUE) +
  geom_vline(xintercept = 1961, linetype = "dashed", colour = "#6b7280") +
  labs(title    = "AirPassengers — Pronóstico 24 meses (IC 95%)",
       subtitle = "Banda azul: IC 95% · línea roja: pronóstico central",
       x = "Año", y = "Pasajeros (miles)") +
  theme_bw(base_size = 12)`}
        caption="El intervalo se construye en escala log y se transforma con exp(), produciendo bandas asimétricas que se amplían con el nivel de la serie."
      />

      {/* ── 4.4 UKDriverDeaths ──────────────────────────── */}
      <h2 id="ukdriver">4.4 Ejemplo B — UKDriverDeaths: modelo aditivo</h2>
      <p>
        El dataset <code>UKDriverDeaths</code> (base R) registra el número
        mensual de conductores muertos o gravemente heridos en el Reino Unido,
        de enero de 1969 a diciembre de 1984 (<I c="n = 192" />, <I c="s = 12" />).
        La serie <strong>no muestra crecimiento exponencial de la varianza</strong>,
        por lo que el modelo aditivo (sin transformación logarítmica) es
        apropiado.
      </p>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ UKDriverDeaths — modelo aditivo con tendencia cuadrática + dummies"
        code={`library(forecast)
library(ggplot2)

# ── Función auxiliar ─────────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}

# ── Dataset ───────────────────────────────────────────────
# UKDriverDeaths disponible directamente
yt_uk <- UKDriverDeaths
n_uk  <- length(yt_uk)       # 192
t_uk  <- 1:n_uk

# ── Predictores ───────────────────────────────────────────
poli2_uk <- Mipoly(t_uk, grado = 2)    # tendencia cuadrática
dum_uk   <- seasonaldummy(yt_uk)       # 11 dummies (ref = dic)

datos_uk <- data.frame(yt = as.numeric(yt_uk), poli2_uk, dum_uk)

# ── Ajuste MCO ────────────────────────────────────────────
mod_uk <- lm(yt ~ ., data = datos_uk)
summary(mod_uk)

# ── Comparar con modelo log ────────────────────────────────
datos_uk_log <- datos_uk; datos_uk_log$yt <- log(datos_uk_log$yt)
mod_uk_log   <- lm(yt ~ ., data = datos_uk_log)
mse_uk_log   <- summary(mod_uk_log)$sigma^2
ythat_log_uk <- exp(fitted(mod_uk_log)) * exp(mse_uk_log / 2)

MAPE_adit <- mean(abs(as.numeric(yt_uk) - fitted(mod_uk)) /
                    as.numeric(yt_uk)) * 100
MAPE_log  <- mean(abs(as.numeric(yt_uk) - ythat_log_uk) /
                    as.numeric(yt_uk)) * 100
cat(sprintf("MAPE aditivo: %.2f%%  |  MAPE log: %.2f%%\\n",
            MAPE_adit, MAPE_log))

# ── Gráfico ggplot2 ───────────────────────────────────────
df_uk <- data.frame(
  Año    = as.numeric(time(yt_uk)),
  Obs    = as.numeric(yt_uk),
  Ajuste = fitted(mod_uk)
)

ggplot(df_uk, aes(x = Año)) +
  geom_line(aes(y = Obs,    colour = "Observado"),
            linewidth = 0.8, alpha = 0.85) +
  geom_line(aes(y = Ajuste, colour = "Ajustado"),
            linewidth = 1.3) +
  scale_colour_manual(
    values = c("Observado" = "#78716c", "Ajustado" = "#16a34a")
  ) +
  labs(
    title    = "UKDriverDeaths — Modelo aditivo (tendencia cuadrática + dummies)",
    subtitle = "Yₜ = β₀ + β₁t + β₂t² + Σδᵢ Iᵢₜ + Eₜ",
    x = "Año", y = "Conductores (muertos/heridos graves)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="La caída brusca en enero de 1983 corresponde a la introducción del uso obligatorio del cinturón de seguridad en el Reino Unido — un efecto de intervención no capturado por el modelo de regresión."
      />

      {/* ── 4.5 Evaluación ──────────────────────────────── */}
      <h2 id="evaluacion">4.5 Evaluación de la calidad del modelo</h2>
      <p>
        La evaluación combina criterios de <strong>ajuste dentro de
        muestra</strong> (AIC, BIC) y <strong>precisión de pronóstico
        ex-post</strong> (MAE, RMSE, MAPE, cobertura de intervalos).
      </p>

      <table>
        <thead>
          <tr>
            <th>Medida</th>
            <th>Fórmula</th>
            <th>Interpretación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>MAE</td>
            <td><I c="\frac{1}{h}\sum_{l=1}^h |Y_{n+l} - \hat{Y}_n(l)|" /></td>
            <td>Error absoluto medio (misma unidad que Y)</td>
          </tr>
          <tr>
            <td>RMSE</td>
            <td><I c="\sqrt{\frac{1}{h}\sum |e_l|^2}" /></td>
            <td>Penaliza errores grandes</td>
          </tr>
          <tr>
            <td>MAPE</td>
            <td><I c="\frac{100}{h}\sum |e_l / Y_{n+l}|" /></td>
            <td>Error porcentual; comparable entre series</td>
          </tr>
          <tr>
            <td>Cobertura</td>
            <td><I c="\frac{1}{h}\sum \mathbf{1}[Y_{n+l} \in IC]" /></td>
            <td>Proporción de valores reales dentro del IC</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ Validación ex-post con AirPassengers (últimos 24 meses)"
        code={`library(forecast); library(ggplot2)

# ── Funciones auxiliares ───────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}

# ── Dataset y partición ───────────────────────────────────
yt       <- AirPassengers          # ts mensual 1949-1960, n=144
n        <- length(yt)
n_train  <- n - 24                 # 120 obs. para entrenar
yt_train <- yt[1:n_train]
yt_test  <- yt[(n_train + 1):n]

# ── Modelo sobre entrenamiento ────────────────────────────
t_train <- 1:n_train
poli_tr <- Mipoly(t_train, 1)
dum_tr  <- seasonaldummy(yt_train)
mod_tr  <- lm(log(as.numeric(yt_train)) ~ .,
              data = data.frame(poli_tr, dum_tr))
mse_tr  <- summary(mod_tr)$sigma^2

# ── Pronóstico ex-post ────────────────────────────────────
t_test    <- (n_train + 1):n
poli_te   <- Mipoly(t_test, 1)
dum_te    <- seasonaldummy(yt_train, h = 24)
nuevos_te <- data.frame(poli_te, dum_te)
names(nuevos_te) <- names(coef(mod_tr))[-1]

pred_te  <- predict(mod_tr, newdata = nuevos_te,
                    interval = "prediction", level = 0.95)
yhat_te  <- exp(pred_te[,"fit"]) * exp(mse_tr / 2)
li_te    <- exp(pred_te[,"lwr"]) * exp(mse_tr / 2)
ls_te    <- exp(pred_te[,"upr"]) * exp(mse_tr / 2)

# ── Métricas ex-post ──────────────────────────────────────
y_real    <- as.numeric(yt_test)
MAE_ep    <- mean(abs(y_real - yhat_te))
RMSE_ep   <- sqrt(mean((y_real - yhat_te)^2))
MAPE_ep   <- mean(abs((y_real - yhat_te) / y_real)) * 100
cobertura <- mean(y_real >= li_te & y_real <= ls_te) * 100

cat(sprintf("MAE       = %.2f pasajeros\\n", MAE_ep))
cat(sprintf("RMSE      = %.2f pasajeros\\n", RMSE_ep))
cat(sprintf("MAPE      = %.2f%%\\n", MAPE_ep))
cat(sprintf("Cobertura = %.1f%% (nominal: 95%%)\\n", cobertura))

# ── Gráfico comparativo ───────────────────────────────────
t_yr <- as.numeric(time(yt))
df_g <- data.frame(
  Año  = c(t_yr[1:n_train], t_yr[(n_train+1):n]),
  Val  = c(as.numeric(yt[1:n_train]), y_real),
  Tipo = c(rep("Entrenamiento", n_train), rep("Real (prueba)", 24))
)
df_fc <- data.frame(Año = t_yr[(n_train+1):n],
                    FC = yhat_te, LI = li_te, LS = ls_te)
ggplot() +
  geom_ribbon(data = df_fc, aes(x = Año, ymin = LI, ymax = LS),
              fill = "#bfdbfe", alpha = 0.6) +
  geom_line(data = df_g, aes(x = Año, y = Val, colour = Tipo), linewidth = 0.9) +
  geom_line(data = df_fc, aes(x = Año, y = FC), colour = "#ef4444",
            linewidth = 1.2, linetype = "dashed") +
  scale_colour_manual(values = c("Entrenamiento"="#475569","Real (prueba)"="#16a34a")) +
  labs(title    = "Validación ex-post — AirPassengers (últimos 24 meses)",
       subtitle = sprintf("MAPE=%.2f%%  ·  Cobertura IC95%%=%.1f%%", MAPE_ep, cobertura),
       x = "Año", y = "Pasajeros (miles)", colour = NULL) +
  theme_bw(base_size = 12) + theme(legend.position = "top")`}
        caption="MAPE < 10% es excelente. Cobertura cercana al 95% indica intervalos bien calibrados."
      />

      <Callout type="warning" title="Residuos con ciclos — ¿qué hacer?">
        <p>
          Si el ACF de los residuos muestra barras significativas, el modelo
          de regresión no captura toda la estructura de dependencia. Las
          alternativas son: (1) incluir más variables predictoras,
          (2) modelar el error con ARIMA (ARIMAX / regresión con errores
          ARIMA — fuera del alcance de este curso), o (3) usar STL para
          una descomposición más flexible (Módulo 5).
        </p>
      </Callout>
    </div>
  );
}
