import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo4Content() {
  return (
    <div className="prose-content">

      {/* ── Motivación ──────────────────────────────────────── */}
      <Callout type="info" title="El modelo completo: tendencia + estacionalidad juntas">
        <p>
          En los módulos anteriores modelaste la tendencia sola (Módulo 2) y la
          estacionalidad sola (Módulo 3). En la práctica, ambas componentes
          coexisten y deben estimarse de forma conjunta en un único modelo de
          regresión. Hacerlo por separado introduce sesgo: la tendencia absorbe
          parte de la estacionalidad y viceversa.
        </p>
        <p className="mt-2">
          Este módulo ensambla el modelo completo:{" "}
          <strong>tendencia + estacionalidad + corrección de sesgo +
          pronóstico con intervalos</strong>. También aprenderás a comparar
          el modelo aditivo vs multiplicativo de forma rigurosa, y a evaluar
          la calidad del pronóstico con métricas ex-post.
        </p>
      </Callout>

      {/* ── 4.1 Ecuaciones generales ─────────────────────── */}
      <h2 id="ecuaciones">4.1 Ecuaciones generales del modelo completo</h2>
      <p>
        Sea <I c="p" /> el grado del polinomio de tendencia y <I c="s" /> el
        periodo estacional. Los tres modelos principales, ordenados de menor a
        mayor complejidad conceptual:
      </p>

      <h3 id="aditivo">Modelo 1 — Polinomial-estacional aditivo</h3>
      <D c="Y_t = \beta_0 + \sum_{j=1}^{p} \beta_j t^j + \sum_{i=1}^{s-1} \delta_i I_{i,t} + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0,\sigma^2)" />
      <p>
        Adecuado cuando la serie tiene <strong>varianza constante</strong> y la
        amplitud estacional no crece con el nivel. Se estima directamente con{" "}
        <code>lm()</code> sobre <I c="Y_t" />. Los parámetros se interpretan
        en las unidades originales.
      </p>

      <h3 id="log-polinomial">Modelo 2 — Log-polinomial-estacional (completamente multiplicativo)</h3>
      <D c="\log(Y_t) = \beta_0 + \sum_{j=1}^{p} \beta_j t^j + \sum_{i=1}^{s-1} \delta_i I_{i,t} + \varepsilon_t, \quad \varepsilon_t \overset{\text{iid}}{\sim} N(0,\sigma^2)" />
      <p>
        Apropiado cuando el gráfico de la serie muestra amplitud estacional que
        crece con el nivel (patrón en abanico). El modelo se ajusta con{" "}
        <code>lm()</code> sobre <I c="\log(Y_t)" /> y las predicciones se
        corrigen con el factor de Duan:
      </p>
      <D c="\hat{Y}_t \approx \exp\!\left(\widehat{\log Y_t} + \frac{MSE}{2}\right)" />

      <h3 id="exponencial">Modelo 3 — Exponencial-polinomial (parcialmente multiplicativo)</h3>
      <D c="Y_t = \exp\!\left(\beta_0 + \sum_{j=1}^{p} \beta_j t^j + \sum_{i=1}^{s-1} \delta_i I_{i,t}\right) + E_t" />
      <p>
        La tendencia y la estacionalidad interactúan multiplicativamente, pero
        el error <I c="E_t" /> es aditivo en escala original. Requiere mínimos
        cuadrados no lineales (<code>regexponencialv02()</code>).
      </p>

      <Callout type="info" title="Variante trigonométrica">
        <p>
          En todos los modelos, las indicadoras{" "}
          <I c="\sum_{i=1}^{s-1} \delta_i I_{i,t}" /> pueden reemplazarse por
          armónicos de Fourier{" "}
          <I c="\sum_{j=1}^k [\alpha_j \sin(2\pi F_j t) + \gamma_j \cos(2\pi F_j t)]" />.
          La lógica de estimación es idéntica, solo cambia el conjunto de
          predictores.
        </p>
      </Callout>

      <Callout type="formula" title="¿Cómo elegir entre Modelo 1 y Modelo 2?">
        <p>
          Esta es la decisión más importante del módulo. El procedimiento es:
        </p>
        <ol className="mt-1 list-decimal list-inside space-y-1 text-sm">
          <li>
            <strong>Grafica la serie</strong> — ¿las oscilaciones estacionales
            crecen con el nivel? Si sí → candidato a Modelo 2.
          </li>
          <li>
            <strong>Ajusta ambos modelos</strong> y compara MAPE. El modelo
            con menor MAPE gana en precisión.
          </li>
          <li>
            <strong>Revisa los residuos</strong> de cada modelo — el que
            produce residuos más cercanos a ruido blanco es el correcto.
          </li>
          <li>
            Si los residuos del Modelo 1 tienen varianza creciente (embudo),
            usa el Modelo 2 (log).
          </li>
        </ol>
        <p className="mt-2 text-xs text-stone-500">
          AIC y BIC no son directamente comparables entre Modelo 1 y Modelo 2
          porque las variables de respuesta son distintas (<I c="Y_t" /> vs{" "}
          <I c="\log Y_t" />). Para comparar, usa el MAPE calculado en escala
          original.
        </p>
      </Callout>

      {/* ── 4.2 Pronósticos ─────────────────────────────── */}
      <h2 id="pronosticos">4.2 Pronósticos puntuales e intervalos de predicción</h2>
      <p>
        Con origen en <I c="t = n" />, el pronóstico a <I c="L" /> periodos
        adelante se obtiene evaluando la ecuación estimada en{" "}
        <I c="t = n + L" />. El vector de predictores para el horizonte{" "}
        <I c="L" /> es:
      </p>
      <D c="\mathbf{x}_0 = \bigl(1,\; n{+}L,\; (n{+}L)^2,\; \ldots,\; (n{+}L)^p,\; I_{1,\,n+L},\; \ldots,\; I_{s-1,\,n+L}\bigr)^T" />
      <p>
        El <strong>intervalo de predicción</strong> al nivel{" "}
        <I c="(1-\alpha)\times 100\%" /> para el Modelo 1 es:
      </p>
      <D c="\hat{Y}_n(L) \pm t_{\alpha/2,\; n-k}\; \sqrt{MSE\!\left[1 + \mathbf{x}_0^T (\mathbf{X}^T\mathbf{X})^{-1} \mathbf{x}_0\right]}" />
      <p>
        Para el Modelo 2 (log), el intervalo se construye en escala log y se
        transforma con <I c="\exp(\cdot)" />. Esto produce bandas{" "}
        <strong>asimétricas</strong> en escala original —el límite superior
        está más alejado del pronóstico central que el inferior. Ese es el
        comportamiento correcto, porque los valores negativos son imposibles.
      </p>

      <Callout type="example" title="¿Por qué los intervalos son asimétricos?">
        <p>
          En escala log, el intervalo es simétrico: pronóstico ± t × SE. Al
          aplicar exp(), la simetría se rompe. Por ejemplo, si el pronóstico
          en log es 5.5 con SE = 0.1:
        </p>
        <ul className="mt-1 space-y-1 text-sm">
          <li>Límite inferior: exp(5.5 − 0.196) = exp(5.304) ≈ 201</li>
          <li>Pronóstico: exp(5.5) ≈ 245</li>
          <li>Límite superior: exp(5.5 + 0.196) = exp(5.696) ≈ 298</li>
        </ul>
        <p className="mt-2">
          El intervalo en escala original es [201, 298] — no simétrico
          alrededor de 245. Eso es <strong>correcto</strong>: refleja que la
          distribución de Y en escala original es log-normal (asimétrica a la
          derecha).
        </p>
      </Callout>

      {/* ── 4.3 AirPassengers ───────────────────────────── */}
      <h2 id="airpassengers">4.3 Ejemplo A — AirPassengers: modelo multiplicativo</h2>
      <p>
        El dataset <code>AirPassengers</code> (base R) contiene el número mensual
        de pasajeros internacionales de aerolíneas (miles) de enero de 1949 a
        diciembre de 1960 (<I c="n = 144" />, <I c="s = 12" />). Es el ejemplo
        clásico de serie multiplicativa: tendencia creciente con amplitud
        estacional que también crece. Estrategia: <code>log(Y_t)</code>.
      </p>

      <Callout type="info" title="¿Qué vas a ver al ejecutar el código?">
        <ol className="mt-1 list-decimal list-inside space-y-1 text-sm">
          <li>
            El <code>summary()</code> del modelo con los 12 coeficientes (1
            intercepto + 1 tendencia + 11 dummies mensuales). Todos deberían
            ser significativos.
          </li>
          <li>
            El MAPE dentro de muestra: típicamente entre 2% y 5% para este
            modelo — excelente para una serie de 11 años.
          </li>
          <li>
            La serie observada (gris) vs la curva ajustada (azul): deberían
            seguirse de cerca.
          </li>
        </ol>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ AirPassengers — ajuste log-lineal + dummies mensuales (Modelo 2)"
        code={`library(forecast)
library(ggplot2)

# ── Función auxiliar Mipoly ───────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}

# ── Dataset ───────────────────────────────────────────────
yt <- AirPassengers
n  <- length(yt)             # 144
t  <- 1:n

# ── Predictores: tendencia lineal + 11 dummies ────────────
poli1 <- Mipoly(t, grado = 1)
dum   <- seasonaldummy(yt)

datos_mod <- data.frame(lyt = log(as.numeric(yt)), poli1, dum)

# ── Ajuste MCO sobre log(Y_t) ─────────────────────────────
modelo <- lm(lyt ~ ., data = datos_mod)

# ── Corrección por transformación log-normal ──────────────
# MSE en escala log; factor Duan = exp(MSE/2)
mse   <- summary(modelo)$sigma^2
duan  <- exp(mse / 2)
ythat <- exp(fitted(modelo)) * duan

cat(sprintf("MSE (escala log): %.6f\\n", mse))
cat(sprintf("Factor Duan exp(MSE/2): %.6f (corrección del %.2f%%)\\n",
            duan, (duan - 1) * 100))

MAPE <- mean(abs(as.numeric(yt) - ythat) / as.numeric(yt)) * 100
cat(sprintf("MAPE dentro de muestra: %.2f%%\\n", MAPE))
cat(sprintf("R² ajustado (escala log): %.4f\\n",
            summary(modelo)$adj.r.squared))

# ── Gráfico ggplot2 ───────────────────────────────────────
df_ap <- data.frame(
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
    subtitle = "log(Yₜ) = β₀ + β₁t + Σδᵢ Iᵢₜ + Eₜ  |  corrección exp(MSE/2) aplicada",
    x = "Año", y = "Pasajeros (miles)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="El factor de Duan para AirPassengers es típicamente muy cercano a 1.0 (corrección de <1%), lo que indica que el MSE en escala log es pequeño. Aun así, omitir la corrección introduciría un sesgo sistemático hacia abajo en todos los pronósticos."
      />

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ AirPassengers — pronóstico 24 meses con IC 95% asimétrico"
        code={`library(forecast)
library(ggplot2)

Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
yt    <- AirPassengers; n <- length(yt); t <- 1:n
poli1 <- Mipoly(t, 1); dum <- seasonaldummy(yt)
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

# predict() en escala log → transformar a escala original
pred_log  <- predict(mod, newdata = nuevos,
                     interval = "prediction", level = 0.95)
pred_orig <- exp(pred_log) * exp(mse / 2)
colnames(pred_orig) <- c("Pronostico", "LI_95", "LS_95")

# Mostrar asimetría del intervalo
cat("Pronóstico periodo 1 (enero 1961):\\n")
cat(sprintf("  Límite inferior 95%%: %.0f\\n", pred_orig[1, "LI_95"]))
cat(sprintf("  Pronóstico central:   %.0f\\n", pred_orig[1, "Pronostico"]))
cat(sprintf("  Límite superior 95%%: %.0f\\n", pred_orig[1, "LS_95"]))
cat(sprintf("  Amplitud inferior: %.0f | Amplitud superior: %.0f\\n",
            pred_orig[1,"Pronostico"] - pred_orig[1,"LI_95"],
            pred_orig[1,"LS_95"] - pred_orig[1,"Pronostico"]))

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
  annotate("text", x = 1961.1, y = 200, label = "Inicio pronóstico",
           hjust = 0, colour = "#6b7280", size = 3) +
  labs(title    = "AirPassengers — Pronóstico 24 meses (IC 95% asimétrico)",
       subtitle = "Banda azul: IC 95% · línea roja: pronóstico central",
       x = "Año", y = "Pasajeros (miles)") +
  theme_bw(base_size = 12)`}
        caption="Observa en la salida de texto que el intervalo es asimétrico: la amplitud hacia arriba es mayor que hacia abajo. Eso es correcto para una variable positiva con distribución log-normal."
      />

      {/* ── 4.4 UKDriverDeaths ──────────────────────────── */}
      <h2 id="ukdriver">4.4 Ejemplo B — UKDriverDeaths: modelo aditivo vs multiplicativo</h2>
      <p>
        El dataset <code>UKDriverDeaths</code> (base R) registra el número mensual
        de conductores muertos o gravemente heridos en el Reino Unido, de enero
        de 1969 a diciembre de 1984 (<I c="n = 192" />, <I c="s = 12" />). A
        diferencia de AirPassengers, <strong>la amplitud estacional no crece
        claramente con el nivel</strong>. Compararemos ambos modelos con MAPE.
      </p>

      <Callout type="info" title="¿Qué vas a ver al ejecutar el código?">
        <p>
          La comparación imprimirá dos MAPE: el del modelo aditivo y el del
          modelo log. Para UKDriverDeaths, los MAPEs suelen ser similares, lo
          que confirma que ambas especificaciones son razonables —pero el modelo
          aditivo es preferible por parsimonia conceptual (no requiere
          corrección de sesgo). También notarás un descenso brusco en los datos
          alrededor de 1983 — corresponde a la introducción del cinturón de
          seguridad obligatorio en el Reino Unido, un efecto estructural no
          capturado por el modelo de regresión.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ UKDriverDeaths — aditivo vs multiplicativo: comparación MAPE"
        code={`library(forecast)
library(ggplot2)

Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}

yt_uk <- UKDriverDeaths
n_uk  <- length(yt_uk)       # 192
t_uk  <- 1:n_uk

poli2_uk <- Mipoly(t_uk, grado = 2)    # tendencia cuadrática
dum_uk   <- seasonaldummy(yt_uk)       # 11 dummies (ref = dic)

# ── Modelo 1: aditivo ─────────────────────────────────────
datos_uk      <- data.frame(yt = as.numeric(yt_uk), poli2_uk, dum_uk)
mod_uk_adit   <- lm(yt ~ ., data = datos_uk)
ythat_adit    <- fitted(mod_uk_adit)
MAPE_adit     <- mean(abs(as.numeric(yt_uk) - ythat_adit) /
                       as.numeric(yt_uk)) * 100

# ── Modelo 2: log-polinomial ──────────────────────────────
datos_uk_log  <- data.frame(lyt = log(as.numeric(yt_uk)), poli2_uk, dum_uk)
mod_uk_log    <- lm(lyt ~ ., data = datos_uk_log)
mse_uk_log    <- summary(mod_uk_log)$sigma^2
ythat_log     <- exp(fitted(mod_uk_log)) * exp(mse_uk_log / 2)
MAPE_log      <- mean(abs(as.numeric(yt_uk) - ythat_log) /
                       as.numeric(yt_uk)) * 100

cat(sprintf("── Comparación de modelos ──────────────────\\n"))
cat(sprintf("MAPE Modelo 1 (aditivo):        %.2f%%\\n", MAPE_adit))
cat(sprintf("MAPE Modelo 2 (log-aditivo):    %.2f%%\\n", MAPE_log))
cat(sprintf("R² adj aditivo:  %.4f\\n", summary(mod_uk_adit)$adj.r.squared))
cat(sprintf("R² adj log:      %.4f\\n", summary(mod_uk_log)$adj.r.squared))
cat("\\nConclusion: MAPE similar → modelo aditivo preferible\\n")
cat("(mas simple, no requiere correccion de sesgo)\\n")

# ── Gráfico comparativo ───────────────────────────────────
df_uk <- data.frame(
  Año     = as.numeric(time(yt_uk)),
  Obs     = as.numeric(yt_uk),
  Adit    = ythat_adit,
  Log     = ythat_log
)

ggplot(df_uk, aes(x = Año)) +
  geom_line(aes(y = Obs,  colour = "Observado"),
            linewidth = 0.8, alpha = 0.85) +
  geom_line(aes(y = Adit, colour = sprintf("Aditivo (MAPE=%.1f%%)", MAPE_adit)),
            linewidth = 1.3) +
  geom_line(aes(y = Log,  colour = sprintf("Log (MAPE=%.1f%%)", MAPE_log)),
            linewidth = 1.1, linetype = "dashed") +
  scale_colour_manual(
    values = c("Observado" = "#78716c",
               sprintf("Aditivo (MAPE=%.1f%%)", MAPE_adit) = "#16a34a",
               sprintf("Log (MAPE=%.1f%%)", MAPE_log)  = "#dc2626")
  ) +
  labs(
    title    = "UKDriverDeaths — Modelo aditivo vs log-aditivo",
    subtitle = "Tendencia cuadrática + 11 dummies mensuales",
    x = "Año", y = "Conductores (muertos/heridos)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="La caída brusca alrededor de 1983 es el efecto del cinturón de seguridad obligatorio. Un modelo de regresión sin variable de intervención no puede capturar ese quiebre estructural — es una limitación conocida del enfoque determinístico."
      />

      {/* ── 4.5 Evaluación ──────────────────────────────── */}
      <h2 id="evaluacion">4.5 Evaluación de la calidad del modelo</h2>
      <p>
        La evaluación combina criterios de <strong>ajuste dentro de
        muestra</strong> (AIC, BIC, R² ajustado) y{" "}
        <strong>precisión de pronóstico ex-post</strong> (MAE, RMSE, MAPE,
        cobertura de intervalos). La evaluación ex-post es la más realista:
        ajusta el modelo con una parte de los datos y evalúa con el resto.
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
            <td>Error absoluto medio (mismas unidades que Y)</td>
          </tr>
          <tr>
            <td>RMSE</td>
            <td><I c="\sqrt{\frac{1}{h}\sum |e_l|^2}" /></td>
            <td>Penaliza errores grandes más que MAE</td>
          </tr>
          <tr>
            <td>MAPE</td>
            <td><I c="\frac{100}{h}\sum |e_l / Y_{n+l}|" /></td>
            <td>Error porcentual; comparable entre series</td>
          </tr>
          <tr>
            <td>Cobertura IC</td>
            <td><I c="\frac{1}{h}\sum \mathbf{1}[Y_{n+l} \in IC_{95}]" /></td>
            <td>Debe estar cerca del 95% para IC bien calibrado</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info" title="Guía de interpretación del MAPE">
        <p>
          Como referencia práctica en series de tiempo económicas y de negocios:
        </p>
        <ul className="mt-1 space-y-1 text-sm">
          <li><strong>MAPE &lt; 5%</strong> — excelente, modelo muy preciso</li>
          <li><strong>MAPE 5–10%</strong> — bueno, aceptable para la mayoría de aplicaciones</li>
          <li><strong>MAPE 10–20%</strong> — razonable, margen de mejora</li>
          <li><strong>MAPE &gt; 20%</strong> — el modelo no captura bien la dinámica de la serie</li>
        </ul>
        <p className="mt-2">
          La <strong>cobertura del IC</strong> debería estar cerca del nivel
          nominal (95%). Si es significativamente menor, los intervalos son
          demasiado estrechos (subestiman la incertidumbre). Si es mucho
          mayor, son innecesariamente anchos.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ Validación ex-post — AirPassengers (últimos 24 meses)"
        code={`library(forecast); library(ggplot2)

Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}

# ── Partición: entrenar con 120 obs, evaluar con últimas 24 ─
yt       <- AirPassengers
n        <- length(yt)             # 144
n_train  <- n - 24                 # 120 para entrenar
yt_train <- yt[1:n_train]
yt_test  <- yt[(n_train + 1):n]

# ── Modelo ajustado solo con datos de entrenamiento ───────
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

cat("── Métricas ex-post (últimos 24 meses) ────────────\\n")
cat(sprintf("MAE        = %.2f pasajeros\\n", MAE_ep))
cat(sprintf("RMSE       = %.2f pasajeros\\n", RMSE_ep))
cat(sprintf("MAPE       = %.2f%% (objetivo: <10%%)\\n", MAPE_ep))
cat(sprintf("Cobertura  = %.1f%% (nominal: 95%%)\\n", cobertura))

# ── Gráfico comparativo ───────────────────────────────────
t_yr <- as.numeric(time(yt))
ythat_in <- exp(fitted(mod_tr)) * exp(mse_tr / 2)

df_g <- data.frame(Año = t_yr, Val = as.numeric(yt),
                   Tipo = c(rep("Entrenamiento", n_train), rep("Real", 24)))
df_fc <- data.frame(Año = t_yr[(n_train+1):n],
                    FC = yhat_te, LI = li_te, LS = ls_te)

ggplot() +
  geom_ribbon(data = df_fc, aes(x = Año, ymin = LI, ymax = LS),
              fill = "#bfdbfe", alpha = 0.6) +
  geom_line(data = df_g, aes(x = Año, y = Val, colour = Tipo),
            linewidth = 0.9) +
  geom_line(data = df_fc, aes(x = Año, y = FC),
            colour = "#ef4444", linewidth = 1.2, linetype = "dashed") +
  scale_colour_manual(
    values = c("Entrenamiento" = "#475569", "Real" = "#16a34a")
  ) +
  labs(
    title    = "Validación ex-post — AirPassengers (últimos 24 meses)",
    subtitle = sprintf("MAPE = %.2f%%  |  Cobertura IC95%% = %.1f%%",
                       MAPE_ep, cobertura),
    x = "Año", y = "Pasajeros (miles)", colour = NULL
  ) +
  geom_vline(xintercept = t_yr[n_train + 1],
             linetype = "dashed", colour = "#6b7280") +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Si MAPE < 5% y cobertura cercana al 95%, el modelo está bien especificado y calibrado. Si la cobertura real es 70% cuando el IC nominal es 95%, los residuos tienen más varianza de la que el modelo asume."
      />

      <Callout type="warning" title="Residuos con ciclos — diagnóstico y solución">
        <p>
          Si el ACF de los residuos muestra barras significativas, el modelo
          de regresión no captura toda la estructura de dependencia.
          Alternativas:
        </p>
        <ul className="mt-1 space-y-1 text-sm">
          <li>
            Si el patrón residual tiene la misma frecuencia que la
            estacionalidad → añadir más armónicos de Fourier o dummies
            adicionales.
          </li>
          <li>
            Si hay correlación de largo plazo → modelar el error con ARIMA
            (ARIMAX — modelos con variables externas).
          </li>
          <li>
            Si hay cambios de nivel o pendiente → variables de intervención.
          </li>
          <li>
            STL + ARIMA sobre el componente residual (Módulo 5).
          </li>
        </ul>
      </Callout>

      <Callout type="info" title="Ciclo de modelado: lo que has aprendido hasta aquí">
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          {["Graficar", "→", "Transformar (log?)", "→", "Ajustar T+S", "→", "Evaluar MAPE", "→", "Revisar ACF residuos", "→", "Iterar"].map((s, i) => (
            s === "→"
              ? <span key={i} className="text-stone-400 text-lg">{s}</span>
              : <span key={i} className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs font-medium">{s}</span>
          ))}
        </div>
        <p className="mt-3 text-sm">
          Este ciclo es el núcleo del análisis de series de tiempo
          determinístico. Cada iteración mejora el modelo. El criterio de
          parada es cuando los residuos son ruido blanco —verificado con
          Ljung-Box y el ACF— y los pronósticos tienen un MAPE aceptable.
        </p>
      </Callout>
    </div>
  );
}
