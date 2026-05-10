import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo2Content() {
  return (
    <div className="prose-content">

      {/* ── Motivación ──────────────────────────────────────── */}
      <Callout type="info" title="¿Por qué modelar la tendencia?">
        <p>
          Cuando una serie de tiempo tiene una tendencia clara —sube año a año,
          o baja, o tiene una curva— los estadísticos y las pruebas de hipótesis
          clásicas dejan de ser válidas. La media no es constante, la varianza
          puede cambiar, y las autocorrelaciones están contaminadas por la
          tendencia. <strong>El primer paso siempre es remover la tendencia</strong>{" "}
          para poder estudiar lo que queda.
        </p>
        <p className="mt-2">
          En este módulo aprenderás a <em>modelar</em> la tendencia —no solo a
          eliminarla— mediante polinomios y transformaciones logarítmicas. La
          diferencia es importante: un modelo de tendencia da una ecuación
          interpretable, permite extrapolar y da residuos con una distribución
          conocida. Un simple diferenciado quita la tendencia pero no te dice
          qué forma tenía.
        </p>
      </Callout>

      {/* ── 2.1 Modelos según la descomposición ─────────── */}
      <h2 id="modelos">2.1 Modelos según la descomposición</h2>
      <p>
        La forma funcional de la tendencia depende directamente del tipo de
        descomposición que elegiste en el Módulo 1. Si la serie es{" "}
        <strong>aditiva</strong> (varianza estable), la tendencia entra de forma
        lineal o polinomial en la ecuación. Si es <strong>multiplicativa</strong>{" "}
        (varianza crece con el nivel), trabajas con <I c="\log(Y_t)" /> y la
        tendencia también queda lineal o polinomial en esa escala.
      </p>

      <h3 id="polinomial">Modelo polinomial (aditivo)</h3>
      <p>
        Para <I c="Y_t = T_t + E_t" />, la tendencia se aproxima con un
        polinomio de grado <I c="p" />:
      </p>
      <D c="T_t = \beta_0 + \sum_{j=1}^{p} \beta_j \, t^j" />
      <p>El modelo completo queda:</p>
      <D c="Y_t = \beta_0 + \beta_1 t + \beta_2 t^2 + \cdots + \beta_p t^p + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        Los parámetros <I c="\beta_j" /> se estiman por mínimos cuadrados
        ordinarios (MCO) con <code>lm()</code>. Su interpretación es directa:{" "}
        <I c="\beta_1" /> es la pendiente lineal de la tendencia por unidad de
        tiempo; <I c="\beta_2" /> controla la curvatura.
      </p>

      <h3 id="log-polinomial">Modelo log-polinomial (multiplicativo)</h3>
      <p>
        Para la descomposición multiplicativa{" "}
        <I c="Y_t = T_t \cdot \exp(\varepsilon_t)" />, donde el error actúa
        proporcionalmente al nivel, aplicamos logaritmo natural y obtenemos un
        modelo lineal en <I c="W_t = \log(Y_t)" />:
      </p>
      <D c="W_t = \log(Y_t) = \underbrace{\beta_0 + \sum_{j=1}^{p} \beta_j \, t^j}_{\log T_t} + \varepsilon_t, \quad \varepsilon_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        El modelo transformado es lineal y se ajusta con <code>lm()</code> sobre{" "}
        <I c="W_t" />. Para volver a la escala original se aplica la corrección
        por sesgo de la distribución log-normal:
      </p>
      <D c="\hat{Y}_t = \exp\!\left(\hat{W}_t + \frac{MSE}{2}\right) = \exp\!\left(\widehat{\log Y_t}\right) \cdot \exp\!\left(\frac{MSE}{2}\right)" />

      <Callout type="formula" title="¿Por qué exp(MSE/2)? — La intuición">
        <p>
          Cuando <I c="W_t \sim N(\mu_t, \sigma^2)" />, la variable{" "}
          <I c="Y_t = \exp(W_t)" /> sigue una distribución log-normal cuya
          media es:
        </p>
        <D c="E[Y_t] = \exp\!\left(\mu_t + \frac{\sigma^2}{2}\right)" />
        <p>
          Sustituimos <I c="\mu_t \leftarrow \hat{W}_t" /> y{" "}
          <I c="\sigma^2 \leftarrow MSE" /> y obtenemos el estimador correcto
          de <I c="E[Y_t]" />. Omitir el factor <I c="\exp(MSE/2)" /> es estimar
          la <em>mediana</em> de la distribución, no la <em>media</em>. Si{" "}
          <I c="MSE = 0.04" /> la diferencia es ~2% (tolerable); si{" "}
          <I c="MSE = 0.25" /> es ~13% (ya importa). La corrección siempre
          sube el pronóstico respecto al naive <I c="\exp(\hat{W}_t)" />.
        </p>
      </Callout>

      <h3 id="exponencial">Modelo exponencial-polinomial (parcialmente multiplicativo)</h3>
      <p>
        Cuando se desea que la tendencia sea intrínsecamente exponencial pero
        con error aditivo en la escala original:
      </p>
      <D c="Y_t = \exp\!\left(\beta_0 + \sum_{j=1}^{p} \beta_j \, t^j\right) + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        La diferencia con el modelo log-polinomial es sutil pero importante:{" "}
        aquí la varianza de <I c="E_t" /> es constante en escala original (no
        en escala log). La estimación requiere{" "}
        <strong>mínimos cuadrados no lineales</strong> —función{" "}
        <code>nls()</code> en R o la función <code>regexponencialv02()</code>
        del repositorio de la profesora Nelfi González.
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

      <Callout type="info" title="Cómo leer el summary(lm()) en R">
        <p>
          Cuando ejecutas <code>summary(mod)</code>, los números clave son:
        </p>
        <ul className="mt-1 space-y-1 text-sm">
          <li>
            <strong>Estimate (β̂):</strong> el valor ajustado de cada coeficiente.
          </li>
          <li>
            <strong>Std. Error:</strong> la incertidumbre del estimador.
          </li>
          <li>
            <strong>Pr(&gt;|t|):</strong> el p-valor de la prueba{" "}
            <I c="H_0: \beta_j = 0" />. Si es menor a 0.05, el término aporta
            información real.
          </li>
          <li>
            <strong>Residual standard error:</strong> es <I c="\hat{\sigma}" />,
            la raíz del MSE.{" "}
            <I c="MSE = \hat{\sigma}^2" />, que necesitas para la corrección
            log-normal.
          </li>
          <li>
            <strong>Adjusted R²:</strong> proporción de varianza explicada,
            penalizada por el número de parámetros. Más útil que el R² simple
            para comparar modelos de distinto grado.
          </li>
        </ul>
      </Callout>

      <Callout type="formula" title="Parsimonia: el principio que guía la selección de modelos">
        <p>
          En series de tiempo —como en estadística en general— existe una tensión
          entre <strong>ajuste</strong> y <strong>complejidad</strong>. Un
          polinomio de grado 10 siempre se ajusta mejor al conjunto de
          entrenamiento que uno de grado 2, pero sus predicciones fuera de la
          muestra suelen ser peores: está aprendiendo el ruido, no la señal.
        </p>
        <p className="mt-2">
          El principio de <strong>parsimonia</strong> (navaja de Occam aplicada a
          modelos) dice: <em>el mejor modelo es el más simple que explica
          adecuadamente los datos</em>. En la práctica, esto se operacionaliza
          con AIC y BIC.
        </p>
      </Callout>

      {/* ── AIC/BIC explicación ─────────────────────────── */}
      <h2 id="aicbic">2.3 AIC, BIC y selección de modelos</h2>
      <p>
        AIC (Criterio de Información de Akaike) y BIC (Criterio Bayesiano de
        Schwarz) son las herramientas estándar para comparar modelos con distinto
        número de parámetros. Penalizan la log-verosimilitud por la complejidad
        del modelo:
      </p>
      <D c="\text{AIC} = -2\ell(\hat{\boldsymbol{\beta}}) + 2k \qquad \text{BIC} = -2\ell(\hat{\boldsymbol{\beta}}) + k\log(n)" />
      <p>
        donde <I c="\ell" /> es la log-verosimilitud maximizada, <I c="k" /> es
        el número de parámetros estimados y <I c="n" /> es el tamaño de la
        muestra.{" "}
        <strong>Un AIC/BIC más bajo indica un mejor modelo.</strong> BIC
        penaliza más fuerte la complejidad (especialmente con <I c="n" />{" "}
        grande), por lo que tiende a elegir modelos más parsimoniosos.
      </p>

      <Callout type="example" title="¿Cuándo usar AIC vs BIC?">
        <p>
          Usa <strong>AIC</strong> cuando el objetivo principal es la
          predicción —quieres capturar toda la señal posible aunque el modelo
          sea un poco más complejo.
        </p>
        <p className="mt-2">
          Usa <strong>BIC</strong> cuando el objetivo es identificar el
          verdadero proceso generador de datos —quieres el modelo más simple
          que sea consistente con los datos.
        </p>
        <p className="mt-2">
          En la práctica, si AIC y BIC apuntan al mismo modelo, la decisión
          está clara. Si discrepan, analiza los residuos de ambos modelos y
          decide con criterio estadístico.
        </p>
      </Callout>

      {/* ── 2.4 Ejemplo LakeHuron ────────────────────────── */}
      <h2 id="ejemplo-lakeh">2.4 Ejemplo A — Lago Hurón: tendencia polinomial</h2>
      <p>
        El dataset <code>LakeHuron</code> (base R) registra el nivel anual del
        lago Hurón en pies sobre el nivel del mar, de 1875 a 1972 (
        <I c="n = 98" /> observaciones). La serie muestra una tendencia
        decreciente con cierta curvatura — un caso ideal para comparar
        polinomios de distintos grados con AIC/BIC.
      </p>

      <Callout type="info" title="¿Qué vas a ver al ejecutar este código?">
        <ul className="mt-1 space-y-1 text-sm">
          <li>
            Una tabla comparando grados 1 a 4: AIC, BIC, R² ajustado y RMSE.
            Busca el grado donde AIC/BIC deja de bajar —ahí está el punto
            de equilibrio entre ajuste y parsimonia.
          </li>
          <li>
            El resumen del modelo de grado 2: coeficientes, p-valores y R²
            ajustado.
          </li>
          <li>
            Un gráfico de la serie original con la tendencia cuadrática
            superpuesta.
          </li>
        </ul>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ LakeHuron — ajuste polinomial con Mipoly() y selección por AIC/BIC"
        code={`# ── Función auxiliar Mipoly (autocontenida) ───────────────
# Construye la matriz [t, t^2, ..., t^p] para usar con lm()
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

# ── Comparar grados 1 a 4 con AIC, BIC, R²adj, RMSE ──────
criterios <- lapply(1:4, function(g) {
  mod <- lm(as.numeric(yt) ~ ., data = Mipoly(t, g))
  data.frame(
    Grado = g,
    AIC   = round(AIC(mod), 2),
    BIC   = round(BIC(mod), 2),
    R2adj = round(summary(mod)$adj.r.squared, 4),
    RMSE  = round(sqrt(mean(residuals(mod)^2)), 3)
  )
})
cat("── Comparación de modelos (menor AIC/BIC = mejor) ──\\n")
print(do.call(rbind, criterios))

# ── Modelo seleccionado: grado 2 ──────────────────────────
cat("\\n── Modelo grado 2 (seleccionado por parsimonia) ───\\n")
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
  geom_line(aes(y = Ajuste, colour = "Tendencia cuadrática"),
            linewidth = 1.4) +
  scale_colour_manual(
    values = c("Observado" = "#78716c", "Tendencia cuadrática" = "#1d4ed8")
  ) +
  labs(
    title    = "Lago Hurón — Tendencia cuadrática (1875–1972)",
    subtitle = expression(hat(Y)[t] == hat(beta)[0] + hat(beta)[1]*t + hat(beta)[2]*t^2),
    x = "Año", y = "Nivel (pies)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="En la tabla de criterios: si el AIC baja de grado 1 a 2 pero apenas cambia de 2 a 3, el principio de parsimonia indica quedarse con grado 2. Agregar más términos cuando AIC no mejora significativamente solo añade complejidad sin beneficio real."
      />

      <Callout type="example" title="Cómo interpretar la tabla de criterios">
        <p>
          Para LakeHuron es típico observar que el AIC cae claramente de
          grado 1 a grado 2 (la curvatura es real), pero apenas cambia de
          grado 2 a 3. El BIC, que penaliza más fuerte la complejidad,
          suele señalar directamente el grado 2. El R² ajustado también
          debería aumentar al pasar a grado 2 y estabilizarse después.
        </p>
        <p className="mt-2">
          Recuerda: un R² alto no es suficiente. Un polinomio de grado 8
          tendrá R² = 0.99 pero sus residuos mostrarán oscilaciones
          salvajes (sobreajuste). El diagnóstico de residuos es el
          criterio definitivo.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ Visualización del AIC/BIC por grado — curva de selección"
        code={`library(ggplot2)

Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}
yt <- LakeHuron; n <- length(yt); t <- 1:n

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

# AIC por grado: curva de selección
ggplot(criterios, aes(x = Grado, y = AIC)) +
  geom_line(colour = "#1d4ed8", linewidth = 1.2) +
  geom_point(colour = "#1d4ed8", size = 3) +
  geom_point(data = criterios[which.min(criterios$AIC), ],
             colour = "#dc2626", size = 5, shape = 8) +
  labs(title    = "AIC según grado del polinomio — LakeHuron",
       subtitle = "Punto rojo = grado óptimo (mínimo AIC)",
       x = "Grado p", y = "AIC") +
  theme_bw(base_size = 12)`}
        caption="Este tipo de gráfico es el que usarás en la práctica cada vez que compares modelos: identifica visualmente dónde la curva 'se aplana' — ese es el punto de parsimonia."
      />

      {/* ── 2.5 Ejemplo co2 ─────────────────────────────── */}
      <h2 id="ejemplo-co2">2.5 Ejemplo B — CO₂ Mauna Loa: modelo log-lineal</h2>
      <p>
        El dataset <code>co2</code> (base R) contiene la concentración mensual
        de CO₂ atmosférico medida en el observatorio de Mauna Loa, Hawaii,
        entre enero de 1959 y diciembre de 1997 (<I c="n = 468" />{" "}
        observaciones). La serie tiene crecimiento prácticamente exponencial —
        el modelo log-lineal captura la tendencia de largo plazo. La
        estacionalidad se añade en el Módulo 3.
      </p>
      <p>
        El modelo ajustado sobre <I c="\log(Y_t)" /> es:
      </p>
      <D c="\widehat{\log(Y_t)} = \hat{\beta}_0 + \hat{\beta}_1\, t" />
      <p>
        Y en la escala original, con corrección por sesgo:
      </p>
      <D c="\hat{Y}_t = \exp\!\left(\hat{\beta}_0 + \hat{\beta}_1\, t\right) \cdot \exp\!\left(\frac{MSE}{2}\right)" />
      <p>
        El coeficiente <I c="\hat{\beta}_1" /> en escala log se interpreta
        como la <strong>tasa de crecimiento mensual continua</strong> del CO₂.
        La tasa porcentual mensual es{" "}
        <I c="(\exp(\hat{\beta}_1) - 1) \times 100\%" />.
      </p>

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ co2 — modelo log-lineal con corrección por sesgo"
        code={`# ── Función auxiliar ─────────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}

# ── Dataset ───────────────────────────────────────────────
yt2 <- co2                   # base R — mensual 1959–1997
n2  <- length(yt2)           # 468 observaciones
t2  <- 1:n2

# ── Modelo log-lineal (tendencia exponencial) ─────────────
mod_log <- lm(log(as.numeric(yt2)) ~ ., data = Mipoly(t2, grado = 1))
mse_log <- summary(mod_log)$sigma^2        # MSE en escala ln

# Corrección por sesgo de la distribución log-normal
ythat_log <- exp(fitted(mod_log)) * exp(mse_log / 2)

# Interpretación del coeficiente
tasa_mensual <- (exp(coef(mod_log)["t1"]) - 1) * 100
cat(sprintf("Tasa de crecimiento mensual: %.4f%%\\n", tasa_mensual))
cat(sprintf("Tasa de crecimiento anual:   %.2f%%\\n", tasa_mensual * 12))
cat(sprintf("MSE (escala log):            %.6f\\n", mse_log))
cat(sprintf("Factor de corrección Duan:   %.6f\\n", exp(mse_log / 2)))

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
    values = c("Observado"          = "#78716c",
               "Tendencia log-lineal" = "#dc2626")
  ) +
  labs(
    title    = "CO₂ atmosférico — Mauna Loa (1959–1997)",
    subtitle = "log(Yₜ) = β₀ + β₁t + Eₜ  |  corrección exp(MSE/2) aplicada",
    x = "Año", y = "CO₂ (ppm)", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Los residuos de este modelo mostrarán un ciclo anual muy claro: la curva roja captura solo la tendencia. Ese ciclo es la estacionalidad, que modelaremos con variables dummy y series de Fourier en el Módulo 3."
      />

      <Callout type="example" title="¿Qué deberías ver en los resultados?">
        <p>
          La tasa de crecimiento mensual del CO₂ estará alrededor de{" "}
          <strong>0.12% mensual</strong>, lo que equivale a ~1.4% anual. El
          factor de corrección de Duan <I c="\exp(MSE/2)" /> estará muy cerca
          de 1.0 —el MSE en escala log es pequeño porque la tendencia es muy
          limpia. La gráfica mostrará la curva roja siguiendo el centro de la
          serie, ignorando las oscilaciones anuales —eso es intencional.
        </p>
      </Callout>

      {/* ── 2.6 Inferencia ──────────────────────────────── */}
      <h2 id="inferencia">2.6 Inferencia y selección del grado</h2>
      <p>
        Para determinar el grado <I c="p" /> del polinomio, añadimos términos
        de mayor grado y verificamos si el último coeficiente es
        estadísticamente significativo.
      </p>
      <p>Hipótesis para el término de grado <I c="p" />:</p>
      <D c="H_0: \beta_p = 0 \quad \text{vs} \quad H_1: \beta_p \neq 0" />
      <p>
        El estadístico de prueba sigue una distribución <I c="t" /> con{" "}
        <I c="n - (p+1)" /> grados de libertad bajo <I c="H_0" />. Si el
        p-valor es grande (por convención, mayor a 0.05), reducimos el grado
        en uno. Si es pequeño, el término aporta información real.
      </p>

      <Callout type="warning" title="Error frecuente: elegir el grado por R² solamente">
        <p>
          El R² siempre sube cuando añades un término al modelo —eso no
          significa que el modelo mejore. Un R² = 0.95 con grado 3 puede ser
          peor que un R² = 0.93 con grado 2 si el término cúbico tiene
          p-valor = 0.8. Usa <strong>R² ajustado</strong> y{" "}
          <strong>AIC/BIC</strong> para comparar, no el R² simple.
        </p>
      </Callout>

      {/* ── 2.7 Diagnóstico ─────────────────────────────── */}
      <h2 id="diagnostico">2.7 Diagnóstico de residuos</h2>
      <p>
        El diagnóstico de residuos es el <strong>paso más importante</strong>{" "}
        del análisis —y el más frecuentemente omitido. Un buen ajuste en
        entrenamiento no garantiza nada si los residuos tienen estructura.{" "}
        Verificamos cuatro condiciones sobre{" "}
        <I c="\hat{E}_t = Y_t - \hat{Y}_t" />:
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

      <Callout type="info" title="El orden de importancia de los supuestos">
        <p>
          En series de tiempo, el supuesto más crítico es la{" "}
          <strong>independencia</strong> (no autocorrelación de residuos).
          Si los residuos están autocorrelacionados, los errores estándar
          de los coeficientes son incorrectos, las pruebas t no son válidas
          y los intervalos de confianza no tienen el nivel nominal. La
          normalidad es el supuesto menos crítico —los estimadores MCO son
          robustos a desviaciones moderadas de normalidad gracias al
          teorema central del límite.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ Diagnóstico completo de residuos — LakeHuron (grado 2)"
        code={`library(ggplot2)

Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}
yt    <- LakeHuron
n     <- length(yt)
t     <- 1:n
mod_p2 <- lm(as.numeric(yt) ~ ., data = Mipoly(t, grado = 2))
res    <- residuals(mod_p2)

# ── Tests formales ────────────────────────────────────────
sw <- shapiro.test(res)
lb <- Box.test(res, lag = 10, type = "Ljung-Box")
cat(sprintf("Shapiro-Wilk:  W=%.4f  p=%.4f  → %s\\n",
    sw$statistic, sw$p.value,
    ifelse(sw$p.value > 0.05, "normalidad OK", "NO normal")))
cat(sprintf("Ljung-Box(10): Q=%.4f  p=%.4f  → %s\\n",
    lb$statistic, lb$p.value,
    ifelse(lb$p.value > 0.05,
           "sin autocorrelacion signif.",
           "autocorrelacion detectada → revisar modelo")))

# ── Residuos vs Tiempo ────────────────────────────────────
df_res <- data.frame(t = t, res = res)
ggplot(df_res, aes(x = t, y = res)) +
  geom_line(colour = "#3b82f6", linewidth = 0.8) +
  geom_hline(yintercept = 0, colour = "#ef4444", linetype = "dashed") +
  geom_hline(yintercept = c(-2, 2)*sd(res), colour = "#94a3b8",
             linetype = "dotted") +
  labs(title    = "Residuos vs Tiempo — LakeHuron grado 2",
       subtitle = sprintf("SW p=%.3f  |  LB(10) p=%.3f  |  SD residuos=%.3f",
                          sw$p.value, lb$p.value, sd(res)),
       x = "t (período relativo)", y = expression(hat(E)[t])) +
  theme_bw(base_size = 12)`}
        caption="Las líneas punteadas indican ±2σ — aproximadamente el 95% de los residuos debería caer dentro. Si ves un patrón sistemático (curva ascendente, embudo, o ciclos), el modelo no capturó toda la estructura de la serie."
      />

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ ACF de residuos — ¿hay autocorrelación?"
        code={`library(ggplot2)

Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado); df
}
yt   <- LakeHuron; n <- length(yt); t <- 1:n
mod_p2 <- lm(as.numeric(yt) ~ ., data = Mipoly(t, 2))
res    <- residuals(mod_p2)
lim    <- qnorm(0.975) / sqrt(n)    # banda de significancia al 95%

# ACF de residuos
acf_v  <- acf(res, lag.max = 25, plot = FALSE)
df_acf <- data.frame(lag = acf_v$lag[-1], acf = acf_v$acf[-1])

ggplot(df_acf, aes(x = lag, y = acf, fill = abs(acf) > lim)) +
  geom_col(width = 0.7, show.legend = FALSE) +
  geom_hline(yintercept = c(-lim, lim), colour = "#ef4444",
             linetype = "dashed", linewidth = 0.8) +
  scale_fill_manual(values = c("FALSE" = "#93c5fd", "TRUE" = "#ef4444")) +
  labs(title    = "ACF de residuos — LakeHuron (grado 2)",
       subtitle = "Barras rojas: autocorrelación significativa (α=5%)",
       x = "Rezago k", y = "ACF") +
  theme_bw(base_size = 12)`}
        caption="Si hay barras rojas en los primeros rezagos, los residuos no son ruido blanco. Para LakeHuron es común encontrar autocorrelación positiva en los primeros rezagos — señal de que hay un ciclo lento (decadal) que el modelo de tendencia no capturó. Esto se resolvería con un componente ARIMA para el error."
      />

      <Callout type="warning" title="Patrón cíclico en los residuos: diagnóstico y solución">
        <p>
          Es muy frecuente encontrar <strong>ciclos en los residuos</strong> de
          un modelo de tendencia. Esto indica: (1) correlación positiva entre
          errores consecutivos (viola independencia), o (2) que hay
          estacionalidad no modelada.
        </p>
        <p className="mt-2">
          La solución depende del diagnóstico:
        </p>
        <ul className="mt-1 space-y-1 text-sm">
          <li>
            Si el ciclo tiene el mismo período que la estacionalidad
            (por ejemplo, 12 meses para datos mensuales) → añadir componente
            estacional (Módulo 3).
          </li>
          <li>
            Si el ciclo es de largo plazo (varios años) → se necesita un
            componente ARIMA para el error (módulos avanzados).
          </li>
        </ul>
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
          <text x="510" y="185" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Inter">Rezago k</text>
          <text x="648" y="103" fill="#ef4444" fontSize="8" fontFamily="Inter">+2/√n</text>
        </svg>
        <p className="text-xs text-stone-400 text-center mt-2">
          Figura 2.1 — Residuos con ciclos (izq.) y ACF con barras significativas en rojo (der.) indican
          correlación serial: el modelo de tendencia solo no es suficiente.
        </p>
      </div>

      <Callout type="info" title="Conexión con el Módulo 3">
        <p>
          Los residuos del modelo de tendencia para <code>co2</code> muestran
          un ciclo anual perfecto: el modelo no capturó la estacionalidad.
          En el Módulo 3 añadirás variables dummy estacionales (una por mes)
          o series de Fourier para modelar ese patrón. El resultado será un
          modelo con tendencia + estacionalidad cuyos residuos finalmente
          deberían comportarse como ruido blanco.
        </p>
      </Callout>
    </div>
  );
}
