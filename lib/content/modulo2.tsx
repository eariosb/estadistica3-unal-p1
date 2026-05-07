import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo2Content() {
  return (
    <div className="prose-content">

      {/* ── 2.1 Modelos según la descomposición ─────────── */}
      <h2 id="modelos">2.1 Modelos según la descomposición</h2>
      <p>
        Cuando la tendencia puede aproximarse con una función suave del tiempo,
        la modelamos directamente como una función de <I c="t" />. La forma
        funcional depende del tipo de descomposición elegida.
      </p>

      <h3 id="polinomial">Modelo polinomial (aditivo)</h3>
      <p>
        Para <I c="Y_t = T_t + E_t" />, la tendencia se aproxima con un
        polinomio de grado <I c="p" />:
      </p>
      <D c="T_t = \beta_0 + \sum_{j=1}^{p} \beta_j \, t^j" />
      <p>El modelo completo queda:</p>
      <D c="Y_t = \beta_0 + \beta_1 t + \beta_2 t^2 + \cdots + \beta_p t^p + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />

      <h3 id="log-polinomial">Modelo log-polinomial (multiplicativo)</h3>
      <p>
        Para la descomposición multiplicativa{" "}
        <I c="Y_t = T_t \cdot \exp(\varepsilon_t)" />, donde el error{" "}
        <I c="\varepsilon_t" /> actúa de forma proporcional al nivel de la
        serie, aplicamos logaritmo natural y obtenemos un modelo lineal en{" "}
        <I c="W_t = \log(Y_t)" />:
      </p>
      <D c="W_t = \log(Y_t) = \underbrace{\beta_0 + \sum_{j=1}^{p} \beta_j \, t^j}_{\log T_t} + \varepsilon_t, \quad \varepsilon_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        El modelo transformado es lineal y se ajusta con <code>lm()</code>{" "}
        sobre <I c="W_t" />. Para retrotraer las predicciones a la escala
        original se aplica la corrección por sesgo de la distribución
        log-normal:
      </p>
      <D c="\hat{Y}_t = \exp\!\left(\hat{W}_t + \frac{MSE}{2}\right) = \exp\!\left(\widehat{\log Y_t}\right) \cdot \exp\!\left(\frac{MSE}{2}\right)" />

      <Callout type="formula" title="¿Por qué exp(MSE/2)?">
        <p>
          Si <I c="W_t \sim N(\mu_t, \sigma^2)" /> con{" "}
          <I c="\mu_t = \beta_0 + \sum_j \beta_j t^j" />, entonces{" "}
          <I c="Y_t = \exp(W_t)" /> sigue una distribución log-normal con:
        </p>
        <D c="E[Y_t] = \exp\!\left(\mu_t + \frac{\sigma^2}{2}\right)" />
        <p>
          Sustituyendo <I c="\mu_t \leftarrow \hat{W}_t" /> y{" "}
          <I c="\sigma^2 \leftarrow MSE" /> obtenemos el estimador insesgado
          de <I c="E[Y_t]" />. Omitir el factor <I c="\exp(MSE/2)" />{" "}
          equivale a estimar la <em>mediana</em> en lugar de la <em>media</em>,
          lo que subestima sistemáticamente el nivel de la serie cuando{" "}
          <I c="\sigma^2 > 0" />.
        </p>
      </Callout>

      <h3 id="exponencial">Modelo exponencial-polinomial (parcialmente multiplicativo)</h3>
      <p>
        Cuando se desea que la <strong>tendencia sea intrínsecamente
        exponencial</strong> — es decir,{" "}
        <I c="T_t = \exp\!\left(\beta_0 + \sum_{j=1}^p \beta_j t^j\right)" />{" "}
        — pero manteniendo un error <em>aditivo</em> en la escala original:
      </p>
      <D c="Y_t = \exp\!\left(\beta_0 + \sum_{j=1}^{p} \beta_j \, t^j\right) + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        Se denomina <em>parcialmente multiplicativo</em> porque la media
        condicional <I c="E[Y_t] = T_t" /> es una función exponencial del
        tiempo (estructura multiplicativa en el nivel), mientras que el error{" "}
        <I c="E_t" /> se suma en la escala original (no en logaritmos).
        Nótese la diferencia con el modelo log-polinomial: aquí{" "}
        <I c="\log(Y_t - E_t) = \text{polinomio}" />, no{" "}
        <I c="\log(Y_t)" />. La estimación requiere{" "}
        <strong>mínimos cuadrados no lineales</strong>{" "}
        (función <code>regexponencialv02()</code> del repositorio de la
        profesora Nelfi González).
      </p>

      {/* ── 2.2 Estimación MCO ──────────────────────────── */}
      <h2 id="estimacion">2.2 Estimación por mínimos cuadrados</h2>
      <p>
        Para el modelo polinomial, la ecuación en forma matricial es:
      </p>
      <D c="\mathbf{Y} = \mathbf{X}\boldsymbol{\beta} + \mathbf{E}" />
      <p>
        donde <I c="\mathbf{X}" /> es la <strong>matriz de Vandermonde</strong>:
      </p>
      <D c="\mathbf{X} = \begin{pmatrix} 1 & t_1 & t_1^2 & \cdots & t_1^p \\ 1 & t_2 & t_2^2 & \cdots & t_2^p \\ \vdots & & & & \vdots \\ 1 & t_n & t_n^2 & \cdots & t_n^p \end{pmatrix}" />
      <p>El estimador de mínimos cuadrados es:</p>
      <D c="\hat{\boldsymbol{\beta}} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{Y}" />
      <p>
        En R, esto se realiza automáticamente con <code>lm()</code>. La
        función auxiliar <code>Mipoly()</code> construye la matriz de potencias
        de forma conveniente.
      </p>

      {/* ── 2.3 Ejemplo LakeHuron ────────────────────────── */}
      <h2 id="ejemplo-lakeh">2.3 Ejemplo A — Lago Hurón: tendencia polinomial</h2>
      <p>
        El dataset <code>LakeHuron</code> (base R) registra el nivel anual del
        lago Hurón en pies sobre el nivel del mar, de 1875 a 1972{" "}
        (<I c="n = 98" /> observaciones). La serie muestra una tendencia
        decreciente con cierta curvatura — un buen caso para comparar
        polinomios de distintos grados.
      </p>

      <Callout type="example" title="¿Qué grado de polinomio elegir?">
        <p>
          Ajustamos grados 1 a 4 y comparamos AIC, BIC y{" "}
          <I c="R^2" /> ajustado. El grado óptimo minimiza AIC/BIC sin
          sobreajustar. Para LakeHuron, el grado 2 suele ser suficiente: la
          tendencia es aproximadamente cuadrática con una suave caída en el
          último tercio de la serie.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ LakeHuron — ajuste polinomial con Mipoly() y ggplot2"
        code={`# ── Función auxiliar Mipoly (autocontenida) ───────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}

# ── Dataset ───────────────────────────────────────────────
yt <- LakeHuron              # base R — serie ts anual, frequency = 1
n  <- length(yt)             # 98 observaciones
t  <- 1:n

# ── Comparar grados 1 a 4 ─────────────────────────────────
criterios <- lapply(1:4, function(g) {
  mod <- lm(as.numeric(yt) ~ ., data = Mipoly(t, g))
  data.frame(Grado = g,
             AIC   = round(AIC(mod), 2),
             BIC   = round(BIC(mod), 2),
             R2adj = round(summary(mod)$adj.r.squared, 4))
})
print(do.call(rbind, criterios))

# ── Modelo seleccionado: grado 2 ──────────────────────────
mod_p2 <- lm(as.numeric(yt) ~ ., data = Mipoly(t, grado = 2))
summary(mod_p2)

# ── Gráfico con ggplot2 ───────────────────────────────────
library(ggplot2)

df_plot <- data.frame(
  Año    = as.numeric(time(yt)),
  Obs    = as.numeric(yt),
  Ajuste = fitted(mod_p2)
)

ggplot(df_plot, aes(x = Año)) +
  geom_line(aes(y = Obs,    colour = "Observado"),
            linewidth = 0.9, alpha = 0.85) +
  geom_line(aes(y = Ajuste, colour = "Ajustado"),
            linewidth = 1.4) +
  scale_colour_manual(
    values = c("Observado" = "#78716c", "Ajustado" = "#1d4ed8")
  ) +
  labs(
    title    = "Lago Hurón — Tendencia cuadrática (1875–1972)",
    subtitle = expression(hat(Y)[t] == hat(beta)[0] + hat(beta)[1]*t + hat(beta)[2]*t^2),
    x = "Año", y = "Nivel (pies)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Mipoly() genera columnas t, t2, … que lm() usa directamente como predictores. El R² ajustado indica si el grado extra mejora realmente el ajuste."
      />

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ Selección sistemática del grado del polinomio"
        code={`library(ggplot2)

# ── Función y datos ───────────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
yt <- LakeHuron
n  <- length(yt)
t  <- 1:n

# ── Ajuste de grados 1 a 4 ────────────────────────────────
grados    <- 1:4
lista_mod <- lapply(grados, function(g)
  lm(as.numeric(yt) ~ ., data = Mipoly(t, g))
)

criterios <- data.frame(
  Grado = grados,
  AIC   = round(sapply(lista_mod, AIC), 2),
  BIC   = round(sapply(lista_mod, BIC), 2),
  R2adj = round(sapply(lista_mod, function(m) summary(m)$adj.r.squared), 4),
  RMSE  = round(sapply(lista_mod, function(m) sqrt(mean(residuals(m)^2))), 3)
)
print(criterios)

# ── Gráfico AIC por grado ─────────────────────────────────
ggplot(criterios, aes(x = Grado, y = AIC)) +
  geom_line(colour = "#1d4ed8", linewidth = 1.2) +
  geom_point(colour = "#1d4ed8", size = 3) +
  geom_point(data = criterios[which.min(criterios$AIC), ],
             colour = "#dc2626", size = 5, shape = 8) +
  labs(title    = "AIC según grado del polinomio — LakeHuron",
       subtitle = "El punto rojo indica el mínimo (grado óptimo)",
       x = "Grado p", y = "AIC") +
  theme_bw(base_size = 12)`}
        caption="El grado óptimo minimiza AIC sin sobreajustar. Para LakeHuron, el grado 2 suele dominar."
      />

      {/* ── 2.4 Ejemplo co2 ─────────────────────────────── */}
      <h2 id="ejemplo-co2">2.4 Ejemplo B — CO₂ Mauna Loa: modelo log-lineal</h2>
      <p>
        El dataset <code>co2</code> (base R) contiene la concentración mensual
        de CO₂ atmosférico medida en el observatorio de Mauna Loa, Hawaii,
        entre enero de 1959 y diciembre de 1997 (<I c="n = 468" />{" "}
        observaciones). La serie tiene un crecimiento prácticamente exponencial
        más un ciclo estacional muy marcado — el modelo log-lineal captura la
        tendencia de largo plazo.
      </p>
      <p>
        El modelo ajustado sobre <I c="\log(Y_t)" /> es:
      </p>
      <D c="\widehat{\log(Y_t)} = \hat{\beta}_0 + \hat{\beta}_1\, t" />
      <p>
        Y en la escala original, con corrección por sesgo:
      </p>
      <D c="\hat{Y}_t = \exp\!\left(\hat{\beta}_0 + \hat{\beta}_1\, t\right) \cdot \exp\!\left(\frac{MSE}{2}\right)" />

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ co2 — modelo log-lineal con corrección y ggplot2"
        code={`# ── Función auxiliar ─────────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}

# ── Dataset ───────────────────────────────────────────────
yt2 <- co2                   # base R — mensual 1959–1997
n2  <- length(yt2)           # 468 observaciones
t2  <- 1:n2

# ── Modelo log-lineal (tendencia exponencial) ─────────────
X1_co2  <- Mipoly(t2, grado = 1)           # sólo columna t1
mod_log <- lm(log(as.numeric(yt2)) ~ ., data = X1_co2)
mse_log <- summary(mod_log)$sigma^2        # MSE en escala ln

# Corrección por transformación logarítmica
ythat_log <- exp(fitted(mod_log)) * exp(mse_log / 2)
cat("Tasa de crecimiento mensual estimada:",
    round((exp(coef(mod_log)["t1"]) - 1) * 100, 4), "%\n")
cat("MSE (escala original):",
    round(mean((as.numeric(yt2) - ythat_log)^2), 4), "\n")

# ── Gráfico ggplot2 ───────────────────────────────────────
library(ggplot2)

df_co2 <- data.frame(
  Año    = as.numeric(time(yt2)),
  Obs    = as.numeric(yt2),
  Ajuste = ythat_log
)

ggplot(df_co2, aes(x = Año)) +
  geom_line(aes(y = Obs,    colour = "Observado"),
            linewidth = 0.7, alpha = 0.8) +
  geom_line(aes(y = Ajuste, colour = "Tendencia log-lineal"),
            linewidth = 1.4) +
  scale_colour_manual(
    values = c("Observado" = "#78716c",
               "Tendencia log-lineal" = "#dc2626")
  ) +
  labs(
    title    = "CO₂ atmosférico — Mauna Loa (1959–1997)",
    subtitle = "log(Yₜ) = β₀ + β₁t + Eₜ  |  corrección exp(MSE/2) aplicada",
    x = "Año", y = "CO₂ (ppm)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="La tendencia roja ignora la estacionalidad — los residuos mostrarán un ciclo anual claro. Ese ciclo se modela en el Módulo 3."
      />

      {/* ── 2.5 Inferencia ──────────────────────────────── */}
      <h2 id="inferencia">2.5 Inferencia y selección del grado</h2>
      <p>
        Para determinar el grado <I c="p" /> del polinomio, añadimos términos
        de mayor grado y verificamos si el último coeficiente es
        estadísticamente significativo.
      </p>
      <p>Hipótesis para el término de grado <I c="p" />:</p>
      <D c="H_0: \beta_p = 0 \quad \text{vs} \quad H_1: \beta_p \neq 0" />
      <p>
        El estadístico de prueba sigue una distribución <I c="t" /> con{" "}
        <I c="n - (p+1)" /> grados de libertad. Si el p-valor es grande,
        reducimos el grado en uno.
      </p>

      {/* ── 2.6 Diagnóstico ─────────────────────────────── */}
      <h2 id="diagnostico">2.6 Diagnóstico de residuos</h2>
      <p>
        Los supuestos del modelo de regresión lineal exigen que{" "}
        <I c="E_t \overset{\text{iid}}{\sim} N(0,\sigma^2)" />. Verificamos
        cuatro condiciones:
      </p>

      <table>
        <thead>
          <tr>
            <th>Supuesto</th>
            <th>Herramienta visual</th>
            <th>Test formal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Media cero</td>
            <td><I c="\hat{E}_t" /> vs <I c="t" /></td>
            <td>—</td>
          </tr>
          <tr>
            <td>Varianza constante</td>
            <td><I c="\hat{E}_t" /> vs <I c="\hat{Y}_t" /></td>
            <td>Breusch-Pagan</td>
          </tr>
          <tr>
            <td>Independencia</td>
            <td>ACF / PACF de residuos</td>
            <td>Durbin-Watson, Ljung-Box</td>
          </tr>
          <tr>
            <td>Normalidad</td>
            <td>Q-Q plot</td>
            <td>Shapiro-Wilk</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ Diagnóstico completo de residuos — LakeHuron (grado 2)"
        code={`library(ggplot2)

# ── Funciones y datos ─────────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}
yt    <- LakeHuron          # ts anual 1875-1972, n=98
n     <- length(yt)
t     <- 1:n
mod_p2 <- lm(as.numeric(yt) ~ ., data = Mipoly(t, grado = 2))
res    <- residuals(mod_p2)
lim    <- qnorm(0.975) / sqrt(n)

# ── Tests formales ────────────────────────────────────────
sw <- shapiro.test(res)
lb <- Box.test(res, lag = 10, type = "Ljung-Box")
cat(sprintf("Shapiro-Wilk:  W=%.4f  p=%.4f  → %s\n",
    sw$statistic, sw$p.value,
    ifelse(sw$p.value > 0.05, "normalidad OK", "NO normal")))
cat(sprintf("Ljung-Box(10): Q=%.4f  p=%.4f  → %s\n",
    lb$statistic, lb$p.value,
    ifelse(lb$p.value > 0.05, "sin autocorrelación", "autocorrelación detectada")))

# ── Panel diagnóstico en formato largo (sin patchwork) ────
df_res <- data.frame(t = t, res = res, ajuste = fitted(mod_p2))

# G1: Residuos vs tiempo
ggplot(df_res, aes(x = t, y = res)) +
  geom_line(colour = "#3b82f6", linewidth = 0.8) +
  geom_hline(yintercept = 0, colour = "#ef4444", linetype = "dashed") +
  geom_hline(yintercept = c(-2, 2)*sd(res), colour = "#94a3b8",
             linetype = "dotted") +
  labs(title = "Residuos vs Tiempo — LakeHuron grado 2",
       subtitle = sprintf("SW p=%.3f  |  LB(10) p=%.3f", sw$p.value, lb$p.value),
       x = "t (año relativo)", y = expression(hat(E)[t])) +
  theme_bw(base_size = 12)`}
        caption="Las líneas punteadas indican ±2σ. Residuos fuera de esta banda son atípicos. La autocorrelación positiva en LakeHuron (rezagos significativos en ACF) indica que se necesitaría un modelo ARIMA para el error."
      />

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ ACF de residuos + Q-Q plot — LakeHuron"
        code={`library(ggplot2)

Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}
yt   <- LakeHuron; n <- length(yt); t <- 1:n
mod_p2 <- lm(as.numeric(yt) ~ ., data = Mipoly(t, 2))
res    <- residuals(mod_p2)
lim    <- qnorm(0.975) / sqrt(n)

# ACF de residuos
acf_v  <- acf(res, lag.max = 25, plot = FALSE)
df_acf <- data.frame(lag = acf_v$lag[-1], acf = acf_v$acf[-1])
ggplot(df_acf, aes(x = lag, y = acf, fill = abs(acf) > lim)) +
  geom_col(width = 0.7, show.legend = FALSE) +
  geom_hline(yintercept = c(-lim, lim), colour = "#ef4444",
             linetype = "dashed", linewidth = 0.8) +
  scale_fill_manual(values = c("FALSE"="#93c5fd","TRUE"="#ef4444")) +
  labs(title = "ACF de residuos — LakeHuron (grado 2)",
       subtitle = "Barras rojas: autocorrelación significativa (α=5%)",
       x = "Rezago k", y = "ACF") +
  theme_bw(base_size = 12)`}
        caption="Si hay barras rojas en los primeros rezagos, los residuos no son ruido blanco. Para LakeHuron es frecuente encontrar autocorrelación — señal de que el modelo necesita un componente ARIMA para el error."
      />

      <Callout type="warning" title="Patrón cíclico en los residuos">
        <p>
          Es muy común encontrar <strong>ciclos en los residuos</strong> de un
          modelo de tendencia sin estacionalidad. Esto indica: (1) correlación
          positiva entre errores consecutivos (viola independencia), o (2) que
          la estacionalidad no fue modelada. La solución es añadir la componente
          estacional (Módulo 3) o recurrir a modelos ARIMA para el error.
        </p>
      </Callout>

      {/* ── SVG diagnóstico ─────────────────────────────── */}
      <div className="my-6 rounded-xl border border-stone-200 bg-white p-4 overflow-x-auto">
        <svg viewBox="0 0 680 220" xmlns="http://www.w3.org/2000/svg" className="w-full">
          {/* Panel 1: Residuals vs t */}
          <rect x="20" y="10" width="300" height="180" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
          <text x="170" y="28" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600" fontFamily="Inter">Residuos vs Tiempo</text>
          <line x1="40" y1="100" x2="300" y2="100" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3"/>
          <path d="M40,95 C60,70 80,130 100,90 S140,50 160,110 S200,140 220,80 S260,60 280,100 S295,120 300,95"
            fill="none" stroke="#3b82f6" strokeWidth="2"/>
          <line x1="40" y1="165" x2="300" y2="165" stroke="#94a3b8" strokeWidth="1"/>
          <line x1="40" y1="35" x2="40" y2="165" stroke="#94a3b8" strokeWidth="1"/>
          <text x="170" y="185" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Inter">t</text>
          {/* Panel 2: ACF showing autocorrelation */}
          <rect x="360" y="10" width="300" height="180" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
          <text x="510" y="28" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="600" fontFamily="Inter">ACF de Residuos</text>
          <line x1="380" y1="120" x2="640" y2="120" stroke="#94a3b8" strokeWidth="1"/>
          <line x1="380" y1="40" x2="380" y2="165" stroke="#94a3b8" strokeWidth="1"/>
          {[50, 35, 30, 25, 22, 18, 14, 10, 12, 9, 8, 6, 24].map((h, i) => {
            const x = 395 + i * 19;
            const sig = h > 20;
            return (
              <rect key={i} x={x-4} y={120-h} width={8} height={h}
                fill={sig ? "#ef4444" : "#3b82f6"} opacity="0.8" rx="1"/>
            );
          })}
          <line x1="380" y1="100" x2="640" y2="100" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2"/>
          <line x1="380" y1="140" x2="640" y2="140" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2"/>
          <text x="510" y="185" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Inter">Lag</text>
          <text x="648" y="103" fill="#ef4444" fontSize="8" fontFamily="Inter">+2/√n</text>
        </svg>
        <p className="text-xs text-stone-400 text-center mt-2">
          Figura 2.1 — Residuos con ciclos (izq.) y ACF con barras significativas (der.) indican correlación serial.
        </p>
      </div>
    </div>
  );
}
