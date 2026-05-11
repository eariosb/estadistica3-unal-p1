import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

/* ── Tarjeta de prueba reutilizable ─────────────────────── */
function TestCard({
  id, number, title, badge, badgeColor, children,
}: {
  id: string; number: string; title: string;
  badge: string; badgeColor: string; children: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-8 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      <div className={`px-5 py-3 flex items-center gap-3 ${badgeColor}`}>
        <span className="text-xs font-mono font-bold opacity-60">{number}</span>
        <h3 className="font-bold text-base m-0" style={{ margin: 0 }}>{title}</h3>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 bg-white/60 rounded-full border border-current/20">
          {badge}
        </span>
      </div>
      <div className="px-5 py-4 prose-content">{children}</div>
    </div>
  );
}

/* ── Fila hipótesis ─────────────────────────────────────── */
function HypRow({ label, math }: { label: string; math: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-stone-100 last:border-0">
      <span className="text-xs font-semibold text-stone-500 w-8 flex-shrink-0 mt-0.5">{label}</span>
      <I c={math} />
    </div>
  );
}

export function Modulo8Content() {
  return (
    <div className="prose-content">

      <Callout type="info" title="¿Por qué el diagnóstico es el paso más importante?">
        <p>
          Hay un patrón común en los análisis de series de tiempo: mucho esfuerzo
          ajustando modelos y eligiendo parámetros, pero muy poco revisando los
          residuos. El resultado: modelos con R² alto que producen pronósticos
          pobres, o con inferencias estadísticas inválidas porque se violaron
          supuestos.
        </p>
        <p className="mt-2">
          Los residuos son la <strong>huella del error de especificación</strong>.
          Si el modelo es correcto, los residuos no deberían tener ninguna
          estructura —deberían parecer ruido aleatorio. Cualquier patrón visible
          en los residuos es una señal de que el modelo se puede mejorar.
        </p>
        <p className="mt-2">
          Un analista experimentado revisa los residuos antes de comunicar
          cualquier resultado. Esta es la prueba de fuego del modelo.
        </p>
      </Callout>

      <p className="text-base text-stone-600 leading-relaxed mb-8 border-l-4 border-teal-300 pl-4">
        Un modelo de regresión para series de tiempo solo es válido si sus residuos se
        comportan como <strong>ruido blanco gaussiano</strong>:{" "}
        <I c="E_t \overset{\text{iid}}{\sim} N(0,\sigma^2)" />. Este módulo
        reúne todas las pruebas formales y gráficos diagnósticos para verificarlo,
        con ejemplos reproducibles usando datasets de R base.
      </p>

      <Callout type="formula" title="Los cuatro supuestos que verificarás — en orden de importancia">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {[
            { num: "1", name: "Independencia", why: "Si los residuos están correlacionados, los errores estándar son incorrectos y las pruebas t no son válidas. Es el supuesto más crítico en series de tiempo.", tools: "ACF, Ljung-Box, Durbin-Watson" },
            { num: "2", name: "Homocedasticidad", why: "Si la varianza cambia con el tiempo o con el nivel, los intervalos de predicción serán mal calibrados.", tools: "Gráfico residuos vs ajustados, Breusch-Pagan" },
            { num: "3", name: "Media cero", why: "Si los residuos tienen sesgo sistemático, el modelo está subestimando o sobreestimando en alguna región.", tools: "Gráfico residuos vs tiempo" },
            { num: "4", name: "Normalidad", why: "Necesaria para las pruebas t y los IC exactos. Con n grande (>30), el TCL suaviza las violaciones moderadas.", tools: "Q-Q plot, Shapiro-Wilk" },
          ].map(({ num, name, why, tools }) => (
            <div key={num} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <p className="font-bold text-sm text-stone-800 mb-1">{num}. {name}</p>
              <p className="text-xs text-stone-600 mb-1">{why}</p>
              <p className="text-xs font-mono text-blue-600">{tools}</p>
            </div>
          ))}
        </div>
      </Callout>

      {/* ── Bloque de funciones auxiliares ─────────────── */}
      <h2 id="setup">Configuración inicial — funciones auxiliares y paquetes</h2>
      <p>
        Todos los ejemplos del módulo usan las siguientes funciones. Ejecútalas
        una sola vez al inicio de tu sesión de R.
      </p>
      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ setup.R — funciones auxiliares del módulo 8"
        code={`# ── Cargar librerías disponibles ──────────────────────────
library(forecast)   # seasonaldummy, auto.arima
library(ggplot2)    # visualizaciones

# ── Mipoly: genera matriz de potencias t^1, ..., t^p ─────
Mipoly <- function(tiempo, grado) {
  df <- as.data.frame(
    sapply(1:grado, function(j) tiempo^j)
  )
  names(df) <- paste0("t", 1:grado)
  return(df)
}

# ── Mytrigon: genera senos y cosenos para frecuencias Fj ─
Mytrigon <- function(tiempo, Frecuencias) {
  cols <- lapply(seq_along(Frecuencias), function(j) {
    data.frame(
      s = sin(2 * pi * Frecuencias[j] * tiempo),
      c = cos(2 * pi * Frecuencias[j] * tiempo)
    )
  })
  df <- do.call(cbind, cols)
  nm <- unlist(lapply(seq_along(Frecuencias),
               function(j) c(paste0("sen",j), paste0("cos",j))))
  names(df) <- nm
  return(df)
}

# ── interpdeltas: extrae y grafica efectos estacionales ──
interpdeltas <- function(modelo, gradopoly, aditivo = TRUE,
                         labels_est = NULL) {
  cf  <- coef(modelo)
  k   <- gradopoly + 1         # intercepto + términos poly
  del <- cf[(k+1):length(cf)]
  del <- c(del, 0)             # añadir referencia = 0
  if (!aditivo) del <- exp(del)
  if (is.null(labels_est)) labels_est <- paste0("S", seq_along(del))
  df <- data.frame(estacion = labels_est, efecto = del)
  ggplot(df, aes(x = estacion, y = efecto, fill = efecto > ifelse(aditivo,0,1))) +
    geom_col(width = 0.6, show.legend = FALSE) +
    geom_hline(yintercept = ifelse(aditivo, 0, 1),
               linetype = "dashed", color = "#ef4444") +
    scale_fill_manual(values = c("#3b82f6","#ef4444")) +
    labs(title = if(aditivo) "Efectos estacionales aditivos (δ̂ᵢ)"
                 else "Factores estacionales multiplicativos (exp(δ̂ᵢ))",
         x = "Estación", y = if(aditivo) "δ̂ᵢ" else "exp(δ̂ᵢ)") +
    theme_bw(base_size = 12)
}`}
        caption="Copia este bloque al inicio de cualquier script del curso para tener todas las funciones disponibles."
      />

      {/* ════════════════════════════════════════════════ */}
      <h2 id="seccion-parametros">8.1 Pruebas sobre los parámetros del modelo</h2>

      {/* ── Tarjeta 1 ─────────────────────────────────── */}
      <TestCard
        id="prueba-t-bp"
        number="T·01"
        title="Prueba t para βₚ — grado del polinomio de tendencia"
        badge="Parámetros de tendencia"
        badgeColor="bg-blue-50 text-blue-900 border-b border-blue-200"
      >
        <p>
          <strong>Objetivo:</strong> Determinar si la potencia más alta{" "}
          <I c="t^p" /> contribuye significativamente a la tendencia, o si
          podría reducirse a grado <I c="p-1" />.
        </p>
        <p>
          <strong>Modelo aplicable:</strong>{" "}
          <I c="Y_t = \beta_0 + \sum_{j=1}^p \beta_j t^j + E_t" />, con{" "}
          <I c="E_t \overset{\text{iid}}{\sim} N(0,\sigma^2)" />.
        </p>

        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis</p>
          <HypRow label="H₀" math="\beta_p = 0 \quad \text{(el grado } p \text{ no es necesario)}" />
          <HypRow label="H₁" math="\beta_p \neq 0 \quad \text{(el grado } p \text{ es significativo)}" />
        </div>

        <p><strong>Estadístico de prueba:</strong></p>
        <D c="T_0 = \frac{\hat{\beta}_p}{\text{s.e.}(\hat{\beta}_p)} \sim t_{n-k}" />
        <p>
          donde <I c="k = p + (\text{n}^\circ \text{ de parámetros estacionales}) + 1" />{" "}
          es el número total de parámetros del modelo.
        </p>

        <p>
          <strong>Supuestos:</strong> Errores normales, independientes y
          homocedásticos. La prueba t es robusta con muestras grandes.
        </p>

        <p>
          <strong>Regla de decisión:</strong> Si <I c="P(|t_{n-k}| > |T_0|) < \alpha" />{" "}
          (usualmente <I c="\alpha = 0.05" />), se rechaza <I c="H_0" /> y el
          grado <I c="p" /> se justifica. En caso contrario, reducir a{" "}
          <I c="p - 1" />.
        </p>

        <CodeBlock
          executable={true}
          packages={["forecast"]}
          title="▶ Ejemplo ejecutable: LakeHuron — prueba t de tendencia"
          code={`library(ggplot2)

# ── Función auxiliar ─────────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}

# ── Datos ────────────────────────────────────────────────
yt <- LakeHuron              # ts anual, n = 98
n  <- length(yt)
t  <- 1:n

# ── Ajustar modelos polinomiales grado 1, 2, 3 ───────────
resultados <- lapply(1:3, function(p) {
  X   <- Mipoly(t, p)
  mod <- lm(as.numeric(yt) ~ ., data = X)
  cf  <- summary(mod)$coef
  tibble_row <- c(
    grado    = p,
    beta_p   = round(cf[p+1, 1], 6),
    se_p     = round(cf[p+1, 2], 6),
    T0       = round(cf[p+1, 3], 3),
    pvalor   = round(cf[p+1, 4], 4),
    AIC      = round(AIC(mod), 2),
    R2adj    = round(summary(mod)$adj.r.squared, 4)
  )
  tibble_row
})
cat("Tabla de significancia del último coeficiente:\n")
print(do.call(rbind, resultados))

# ── Modelo lineal elegido ─────────────────────────────────
mod1 <- lm(as.numeric(yt) ~ t)
cat("\nSummary del modelo lineal:\n")
print(summary(mod1)$coef)

# ── Visualización ─────────────────────────────────────────
df <- data.frame(
  t       = time(yt),
  obs     = as.numeric(yt),
  ajus    = fitted(mod1)
)
ggplot(df, aes(x = t)) +
  geom_line(aes(y = obs, color = "Observado"), linewidth = 0.8) +
  geom_line(aes(y = ajus, color = "Ajustado (grado 1)"),
            linewidth = 1.2, linetype = "dashed") +
  scale_color_manual(values = c("Observado" = "#475569",
                                "Ajustado (grado 1)" = "#1d4ed8")) +
  labs(title = "LakeHuron: nivel del lago y tendencia lineal ajustada",
       subtitle = "H₀: β₁ = 0  →  p-valor ≈ 0.048 → tendencia significativa",
       x = "Año", y = "Nivel (pies)", color = NULL) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
          caption="Interpreta la columna Pr(>|t|) de summary() para el coeficiente t1, t2, t3. El grado cuyo p-valor > 0.05 puede eliminarse."
        />

        <Callout type="info" title="Cómo leer la salida de R">
          <p>
            En <code>summary(mod)$coef</code>, la última fila antes de los
            coeficientes estacionales corresponde a <I c="\hat{\beta}_p" />.
            Si su columna <code>Pr(&gt;|t|)</code> es <strong>menor a 0.05</strong>,
            el grado <I c="p" /> se mantiene. Si es mayor, prueba con{" "}
            <I c="p-1" />.
          </p>
        </Callout>
      </TestCard>

      {/* ── Tarjeta 2 ─────────────────────────────────── */}
      <TestCard
        id="prueba-t-delta"
        number="T·02"
        title="Prueba t para δᵢ — efectos estacionales con indicadoras"
        badge="Parámetros estacionales"
        badgeColor="bg-violet-50 text-violet-900 border-b border-violet-200"
      >
        <p>
          <strong>Objetivo:</strong> Verificar si la estación <I c="i" /> tiene
          un nivel medio que difiere significativamente de la estación de
          referencia <I c="s" />.
        </p>

        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis</p>
          <HypRow label="H₀" math="\delta_i = 0 \quad \text{(la estación } i \text{ no difiere de la referencia)}" />
          <HypRow label="H₁" math="\delta_i \neq 0 \quad \text{(la estación } i \text{ tiene efecto propio)}" />
        </div>

        <D c="T_0 = \frac{\hat{\delta}_i}{\text{s.e.}(\hat{\delta}_i)} \sim t_{n-k}" />

        <p>
          <strong>Nota en modelos multiplicativos:</strong> La prueba sobre{" "}
          <I c="\hat{\delta}_i" /> es idéntica, pero la interpretación en
          escala original usa <I c="\exp(\hat{\delta}_i)" />: si{" "}
          <I c="\exp(\hat{\delta}_1) = 0.877" />, la estación 1 tiene un
          nivel 12.3% menor que la de referencia.
        </p>

        <CodeBlock
          executable={true}
          packages={["forecast"]}
          title="▶ Ejemplo ejecutable: nottem — prueba t de efectos estacionales"
          code={`library(forecast)
library(ggplot2)

yt <- nottem          # ts mensual, s = 12, n = 240  (pre-cargado)
n  <- length(yt)

# Nombres de los 12 meses en español
meses_nom <- c("Ene","Feb","Mar","Abr","May","Jun",
               "Jul","Ago","Sep","Oct","Nov","Dic")

# ── Modelo solo estacional (sin tendencia detectada) ──────
# Usar data.frame + lm(yt ~ .) para que los nombres de
# coeficientes sean legibles (Ene...Nov, ref = Dic)
mes_dum            <- seasonaldummy(yt)    # 11 cols; ref = Dic
colnames(mes_dum)  <- meses_nom[-12]      # renombrar Ene...Nov
datos_est          <- data.frame(yt = as.numeric(yt), mes_dum)
mod_est            <- lm(yt ~ ., data = datos_est)
sm                 <- summary(mod_est)

# ── Tabla de coeficientes estacionales ────────────────────
cat("Coeficientes estacionales (ref = diciembre):\n")
cf_est <- sm$coef[-1, ]          # quitar intercepto (11 filas)
print(round(cf_est, 4))

# ── ¿Qué meses no difieren significativamente de diciembre?
p_vals <- cf_est[, "Pr(>|t|)"]   # longitud 11
no_sig <- names(p_vals[p_vals > 0.05])
cat("\nMeses NO significativos (p > 0.05):",
    if (length(no_sig) == 0) "ninguno" else no_sig, "\n")

# ── Gráfico de efectos estacionales ──────────────────────
coefs  <- coef(mod_est)           # 12 valores (intercepto + 11)
deltas <- c(coefs[-1], 0)        # 11 deltas + 0 para Dic = 12 valores
df_d   <- data.frame(
  mes   = factor(meses_nom, levels = meses_nom),   # 12
  delta = deltas,                                   # 12
  sig   = c(p_vals < 0.05, TRUE)                   # 11 + TRUE(Dic) = 12
)

ggplot(df_d, aes(x = mes, y = delta, fill = delta > 0)) +
  geom_col(width = 0.65, show.legend = FALSE) +
  geom_hline(yintercept = 0, linetype = "dashed", color = "#ef4444") +
  geom_text(aes(label = ifelse(!sig, "ns", ""),
                y = delta + sign(delta) * 0.3),
            size = 3, color = "#ef4444") +
  scale_fill_manual(values = c("FALSE" = "#3b82f6", "TRUE" = "#ef4444")) +
  labs(title = "Efectos estacionales delta_i — Temperatura Nottingham Castle",
       subtitle = "Referencia: diciembre. 'ns' = no significativo (p > 0.05)",
       x = "Mes", y = "delta_i (°F vs diciembre)") +
  theme_bw(base_size = 12)`}
          caption="Todos los meses resultan significativos para nottem: hay patrón estacional claro con máximo en julio (+21°F vs diciembre)."
        />
      </TestCard>

      {/* ── Tarjeta 3 ─────────────────────────────────── */}
      <TestCard
        id="prueba-t-trig"
        number="T·03"
        title="Prueba t para αⱼ y γⱼ — parámetros trigonométricos"
        badge="Armónicos de Fourier"
        badgeColor="bg-emerald-50 text-emerald-900 border-b border-emerald-200"
      >
        <p>
          <strong>Objetivo:</strong> Decidir si la onda senoidal de frecuencia{" "}
          <I c="F_j" /> contribuye al patrón estacional, es decir, si el
          par <I c="(\alpha_j, \gamma_j)" /> puede eliminarse del modelo.
        </p>

        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis por parámetro</p>
          <HypRow label="H₀" math="\alpha_j = 0 \quad \text{(o } \gamma_j = 0\text{)}" />
          <HypRow label="H₁" math="\alpha_j \neq 0 \quad \text{(o } \gamma_j \neq 0\text{)}" />
        </div>

        <p>
          <strong>Regla de decisión:</strong> Si <strong>al menos uno</strong>{" "}
          de los dos parámetros <I c="\alpha_j" /> o <I c="\gamma_j" /> es
          significativo, la onda <I c="j" /> debe conservarse. Solo si{" "}
          <strong>ambos</strong> son no significativos se puede eliminar.
        </p>

        <CodeBlock
          executable={true}
          packages={["ggplot2","forecast"]}
          title="▶ Armónicos para USAccDeaths — periodograma + modelo trigonométrico"
          code={`library(ggplot2)
library(forecast)

# ── Funciones auxiliares ──────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- data.frame(matrix(nrow = length(tiempo), ncol = grado))
  for (j in 1:grado) df[, j] <- tiempo^j
  names(df) <- paste0("t", 1:grado)
  df
}
Mytrigon <- function(tiempo, Frecuencias) {
  cols <- lapply(seq_along(Frecuencias), function(j) {
    data.frame(s = sin(2*pi*Frecuencias[j]*tiempo),
               c = cos(2*pi*Frecuencias[j]*tiempo))
  })
  df <- do.call(cbind, cols)
  names(df) <- paste0(rep(c("sen","cos"), length(Frecuencias)),
                      rep(seq_along(Frecuencias), each = 2))
  df
}

# ── Datos ─────────────────────────────────────────────────
yt <- USAccDeaths    # ts mensual 1973-1978, n = 72
n  <- length(yt)
t  <- 1:n

# ── Periodograma para identificar frecuencias ─────────────
dyt      <- diff(log(as.numeric(yt)))
esp      <- spec.pgram(dyt, taper = 0, log = "no", plot = FALSE)
ord      <- order(esp$spec, decreasing = TRUE)
cat("Top-5 frecuencias dominantes:\n")
print(round(data.frame(F = esp$freq[ord[1:5]],
                       Potencia = esp$spec[ord[1:5]]), 4))

# ── Modelo con 3 armónicos (F = 1/12, 2/12, 3/12) ────────
Frec  <- c(1, 2, 3) / 12
trig  <- Mytrigon(t, Frec)
poli  <- Mipoly(t, 1)
mod_trig <- lm(log(as.numeric(yt)) ~ ., data = cbind(poli, trig))

cat("\nCoeficientes del modelo trigonométrico:\n")
print(round(summary(mod_trig)$coef, 4))

# ── Prueba conjunta por onda (F-test parcial) ─────────────
# ¿Es significativa la onda F3 = 3/12?
mod_sin3 <- lm(log(as.numeric(yt)) ~ .,
               data = cbind(poli, Mytrigon(t, c(1,2)/12)))
cat("\nPrueba F: ¿es necesaria la onda 3/12?\n")
print(anova(mod_sin3, mod_trig))

# ── Visualización del periodograma ────────────────────────
df_esp <- data.frame(freq = esp$freq, spec = esp$spec)
ggplot(df_esp, aes(x = freq, y = spec)) +
  geom_line(color = "#475569", linewidth = 0.7) +
  geom_vline(xintercept = (1:6)/12, color = "#ef4444",
             linetype = "dashed", alpha = 0.7) +
  annotate("text", x = (1:6)/12, y = max(esp$spec)*0.92,
           label = paste0("F=", 1:6, "/12"), color = "#ef4444",
           size = 3, angle = 90, vjust = -0.3) +
  labs(title = "Periodograma — diff(log(USAccDeaths))",
       subtitle = "Líneas rojas: frecuencias mensuales fundamentales",
       x = "Frecuencia", y = "Potencia espectral") +
  theme_bw(base_size = 12)`}
          caption="La prueba F de anova() compara el modelo con y sin la onda j. Si p > 0.05, la onda puede eliminarse."
        />
      </TestCard>

      {/* ── Tarjeta 4 ─────────────────────────────────── */}
      <TestCard
        id="prueba-F"
        number="T·04"
        title="Prueba F global (ANOVA) — significancia conjunta del modelo"
        badge="Significancia global"
        badgeColor="bg-amber-50 text-amber-900 border-b border-amber-200"
      >
        <p>
          <strong>Objetivo:</strong> Evaluar si el conjunto completo de
          predictores (tendencia + estacionalidad) explica una proporción
          significativa de la variabilidad de la serie.
        </p>

        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis</p>
          <HypRow label="H₀" math="\beta_1 = \cdots = \beta_p = \delta_1 = \cdots = \delta_{s-1} = 0" />
          <HypRow label="H₁" math="\text{Al menos un coeficiente es } \neq 0" />
        </div>

        <D c="F_0 = \frac{MSR}{MSE} = \frac{SCR/(k-1)}{SCE/(n-k)} \sim F_{k-1,\, n-k}" />

        <p>
          donde <I c="SCR" /> = suma de cuadrados de regresión,{" "}
          <I c="SCE" /> = suma de cuadrados del error, y{" "}
          <I c="k" /> = número total de parámetros (incluyendo intercepto).
        </p>

        <Callout type="formula" title="Relación con R²">
          <p>
            El estadístico F también se puede expresar como{" "}
            <I c="F_0 = \frac{R^2/(k-1)}{(1-R^2)/(n-k)}" />. Un{" "}
            <I c="R^2" /> alto no garantiza significancia individual de cada
            predictor, pero sí global.
          </p>
        </Callout>

        <CodeBlock
          title="Ejemplo: prueba F para modelo AirPassengers (tendencia + estacionalidad)"
          code={`data("AirPassengers")  # ts mensual 1949-1960, n = 144
yt <- AirPassengers
n  <- length(yt)
t  <- 1:n

# ── Modelo log-lineal con indicadoras mensuales ────────────
poli  <- Mipoly(t, 1)
mdum  <- seasonaldummy(yt)           # 11 indicadoras, ref = dic
mod   <- lm(log(as.numeric(yt)) ~ ., data = cbind(poli, mdum))

sm <- summary(mod)
cat("═══════════════════════════════════════════════\n")
cat("PRUEBA F GLOBAL\n")
cat("F =", round(sm$fstatistic[1], 2),
    "  gl =", sm$fstatistic[2], "y", sm$fstatistic[3], "\n")
cat("P-valor =", format.pval(pf(sm$fstatistic[1],
                               sm$fstatistic[2],
                               sm$fstatistic[3],
                               lower.tail = FALSE), digits = 4), "\n")
cat("R² ajustado =", round(sm$adj.r.squared, 4), "\n")
cat("═══════════════════════════════════════════════\n\n")

# ── Tabla ANOVA ────────────────────────────────────────────
print(anova(mod))

# ── Gráfico de descomposición de la variabilidad ─────────
sct <- sum((as.numeric(yt) - mean(as.numeric(yt)))^2)
scr <- sum((fitted(mod) - mean(as.numeric(yt)))^2)
sce <- sum(residuals(mod)^2)
df_var <- data.frame(
  comp    = c("Regresión (T+S)", "Error (E)"),
  sc      = c(scr, sce),
  prop    = c(scr/sct, sce/sct)*100
)
ggplot(df_var, aes(x = comp, y = prop, fill = comp)) +
  geom_col(width = 0.5, show.legend = FALSE) +
  geom_text(aes(label = paste0(round(prop,1),"%")),
            vjust = -0.5, fontface = "bold") +
  scale_fill_manual(values = c("#1d4ed8","#e2e8f0")) +
  labs(title = "Descomposición de la variabilidad — AirPassengers",
       subtitle = paste0("F = ", round(sm$fstatistic[1],1),
                         "  →  p-valor < 2e-16"),
       x = NULL, y = "% de variabilidad total") +
  theme_bw(base_size = 12) + ylim(0, 105)`}
          caption="Un F significativo (p < 0.05) indica que el modelo explica variabilidad real. Para AirPassengers, R² ≈ 0.995 y F >> 1000."
        />
      </TestCard>

      {/* ════════════════════════════════════════════════ */}
      <h2 id="seccion-normalidad">8.2 Pruebas de normalidad de residuos</h2>

      <TestCard
        id="shapiro-wilk"
        number="T·05a"
        title="Shapiro-Wilk — normalidad de los residuos"
        badge="Normalidad"
        badgeColor="bg-rose-50 text-rose-900 border-b border-rose-200"
      >
        <p>
          <strong>Hipótesis:</strong> <I c="H_0" />: los residuos{" "}
          <I c="\hat{E}_t" /> provienen de una distribución normal (sin
          especificar media ni varianza). <I c="H_1" />: no normalidad.
        </p>
        <p>
          El estadístico <I c="W \in (0, 1]" />: valores cercanos a 1
          indican normalidad. Con <I c="n > 5000" /> usar Jarque-Bera.
        </p>

        <CodeBlock
          executable={true}
          packages={["forecast","ggplot2","tseries"]}
          title="Shapiro-Wilk + Jarque-Bera sobre residuos de AirPassengers"
          code={`library(forecast); library(ggplot2); library(tseries)

# ── Funciones auxiliares ───────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- as.data.frame(sapply(1:grado, function(j) tiempo^j))
  names(df) <- paste0("t", 1:grado); df
}

# ── Datos y modelo ─────────────────────────────────────────
yt  <- AirPassengers
n   <- length(yt); t <- 1:n
poli <- Mipoly(t, 1)
mdum <- seasonaldummy(yt)
mod  <- lm(log(as.numeric(yt)) ~ ., data = cbind(poli, mdum))
e    <- residuals(mod)

# ── Shapiro-Wilk ───────────────────────────────────────────
sw <- shapiro.test(e)
cat("Shapiro-Wilk:\n")
cat("  W =", round(sw$statistic, 4), "\n")
cat("  p-valor =", round(sw$p.value, 4), "\n")
cat("  Conclusión:", ifelse(sw$p.value > 0.05,
    "No se rechaza H₀ → residuos aproximadamente normales",
    "Se rechaza H₀ → residuos NO normales"), "\n\n")

# ── Jarque-Bera ────────────────────────────────────────────
jb <- jarque.bera.test(e)
cat("Jarque-Bera:\n")
cat("  JB =", round(jb$statistic, 4), "\n")
cat("  p-valor =", round(jb$p.value, 4), "\n\n")

# ── Panel: Q-Q + Histograma con facet ─────────────────────
df_e <- data.frame(e = e)

# Q-Q plot
ggplot(df_e, aes(sample = e)) +
  stat_qq(color = "#1d4ed8", alpha = 0.7, size = 1.5) +
  stat_qq_line(color = "#ef4444", linewidth = 1) +
  labs(title = "Q-Q Normal de residuos — AirPassengers",
       subtitle = paste0("Shapiro-Wilk: W=", round(sw$statistic,3),
                         "  p=", round(sw$p.value,3),
                         "  |  Jarque-Bera p=", round(jb$p.value,3)),
       x = "Cuantiles teóricos N(0,1)", y = "Cuantiles muestrales") +
  theme_bw(base_size = 12)`}
          caption="Si el Q-Q plot muestra colas pesadas (puntos se alejan de la línea roja en los extremos), los residuos tienen distribución leptocúrtica."
        />

        <Callout type="warning" title="Cuidado con muestras grandes">
          <p>
            Con <I c="n > 100" />, Shapiro-Wilk detecta desviaciones
            pequeñas de la normalidad que son irrelevantes en la práctica.
            Siempre complementar con el Q-Q plot visual y recordar que el
            TLC garantiza aproximación normal en la distribución de{" "}
            <I c="\hat{\beta}" /> para <I c="n" /> suficientemente grande.
          </p>
        </Callout>
      </TestCard>

      {/* ════════════════════════════════════════════════ */}
      <h2 id="seccion-autocorr">8.3 Pruebas de autocorrelación (independencia)</h2>

      <TestCard
        id="durbin-watson"
        number="T·06"
        title="Durbin-Watson — autocorrelación de orden 1"
        badge="Independencia"
        badgeColor="bg-cyan-50 text-cyan-900 border-b border-cyan-200"
      >
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis</p>
          <HypRow label="H₀" math="\rho(1) = 0 \quad \text{(no autocorrelación de primer orden)}" />
          <HypRow label="H₁" math="\rho(1) \neq 0 \quad \text{(autocorrelación de primer orden)}" />
        </div>

        <D c="DW = \frac{\sum_{t=2}^n (\hat{E}_t - \hat{E}_{t-1})^2}{\sum_{t=1}^n \hat{E}_t^2} \approx 2(1 - \hat{\rho}(1))" />

        <p>
          <strong>Rango:</strong> <I c="DW \in [0, 4]" />. Cerca de 2 → no
          autocorrelación. DW significativamente menor que 2 → autocorrelación
          positiva. DW mayor que 2 → negativa.
        </p>

        <CodeBlock
          executable={true}
          packages={["forecast","ggplot2"]}
          title="Durbin-Watson sobre modelo UKDriverDeaths"
          code={`library(forecast); library(ggplot2)

# ── Funciones auxiliares ───────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- as.data.frame(sapply(1:grado, function(j) tiempo^j))
  names(df) <- paste0("t", 1:grado); df
}

# ── Datos y modelo ─────────────────────────────────────────
yt    <- UKDriverDeaths   # ts mensual 1969-1984, n = 192
n     <- length(yt); t <- 1:n
poli  <- Mipoly(t, 1)
mdum  <- seasonaldummy(yt)
mod_uk <- lm(log(as.numeric(yt)) ~ ., data = cbind(poli, mdum))

# ── Durbin-Watson manual ───────────────────────────────────
e_res   <- residuals(mod_uk)
dw_stat <- sum(diff(e_res)^2) / sum(e_res^2)
rho_hat <- cor(e_res[-1], e_res[-length(e_res)])
cat("Durbin-Watson (manual):\n")
cat("  DW  =", round(dw_stat, 4), "\n")
cat("  ρ̂(1) =", round(rho_hat, 4), "  (≈ 1 - DW/2)\n")
cat("  Interpretación:",
    ifelse(abs(dw_stat - 2) < 0.5,
      "DW ≈ 2 → no evidencia de autocorrelación de orden 1",
      ifelse(dw_stat < 1.5,
        "DW < 1.5 → autocorrelación positiva (residuos siguen la misma dirección)",
        "DW > 2.5 → autocorrelación negativa")), "\n")

# ── ACF de residuos ────────────────────────────────────────
lim_acf <- qnorm(0.975) / sqrt(n)
acf_vals <- acf(e_res, plot = FALSE, lag.max = 24)
df_acf <- data.frame(lag = acf_vals$lag[-1], acf = acf_vals$acf[-1])

ggplot(df_acf, aes(x = lag, y = acf, fill = abs(acf) > lim_acf)) +
  geom_col(width = 0.7, show.legend = FALSE) +
  geom_hline(yintercept = c(-lim_acf, lim_acf),
             linetype = "dashed", color = "#ef4444", linewidth = 0.8) +
  scale_fill_manual(values = c("FALSE" = "#93c5fd", "TRUE" = "#ef4444")) +
  labs(title = "ACF de residuos — UKDriverDeaths",
       subtitle = paste0("DW = ", round(dw_stat, 3),
                         "   ρ̂(1) = ", round(rho_hat, 3),
                         "   Barras rojas: autocorrelación significativa"),
       x = "Rezago", y = "Autocorrelación") +
  theme_bw(base_size = 12)`}
        />
      </TestCard>

      <TestCard
        id="ljung-box"
        number="T·07"
        title="Ljung-Box — autocorrelación hasta el rezago m"
        badge="Independencia"
        badgeColor="bg-cyan-50 text-cyan-900 border-b border-cyan-200"
      >
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis</p>
          <HypRow label="H₀" math="\rho(1) = \rho(2) = \cdots = \rho(m) = 0" />
          <HypRow label="H₁" math="\exists\, k \leq m : \rho(k) \neq 0" />
        </div>

        <D c="Q_{LB} = n(n+2) \sum_{k=1}^{m} \frac{\hat{\rho}_k^2}{n-k} \sim \chi^2_m \quad \text{(bajo } H_0\text{)}" />

        <p>
          <strong>Elección de m:</strong> Para series estacionales usar{" "}
          <I c="m = 2s" /> (dos periodos). Ejemplo: series mensuales →{" "}
          <I c="m = 24" />.
        </p>

        <CodeBlock
          executable={true}
          packages={["forecast","ggplot2"]}
          title="Ljung-Box con gráfico de p-valores por rezago"
          code={`library(forecast); library(ggplot2)

# ── Funciones auxiliares ───────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- as.data.frame(sapply(1:grado, function(j) tiempo^j))
  names(df) <- paste0("t", 1:grado); df
}

# ── Datos y modelo ─────────────────────────────────────────
yt     <- UKDriverDeaths
n      <- length(yt); t <- 1:n
poli   <- Mipoly(t, 1)
mdum   <- seasonaldummy(yt)
mod_uk <- lm(log(as.numeric(yt)) ~ ., data = cbind(poli, mdum))
e_uk   <- residuals(mod_uk)

# ── Ljung-Box para m = 12 y m = 24 ────────────────────────
for (m in c(12, 24)) {
  lb <- Box.test(e_uk, lag = m, type = "Ljung-Box")
  cat(sprintf("Ljung-Box (m=%d): Q=%.3f, p=%.4f → %s\n",
    m, lb$statistic, lb$p.value,
    ifelse(lb$p.value > 0.05,
           "No se rechaza H₀ (residuos ≈ ruido blanco)",
           "Se rechaza H₀ (hay autocorrelación)")))
}

# ── Gráfico de p-valores Ljung-Box por rezago ─────────────
lags  <- 1:30
pvals <- sapply(lags, function(m)
  Box.test(e_uk, lag = m, type = "Ljung-Box")$p.value)

df_lb <- data.frame(lag = lags, pval = pvals)
ggplot(df_lb, aes(x = lag, y = pval)) +
  geom_point(aes(color = pval < 0.05), size = 3) +
  geom_line(color = "#94a3b8", linewidth = 0.6) +
  geom_hline(yintercept = 0.05, linetype = "dashed",
             color = "#ef4444", linewidth = 1) +
  scale_color_manual(values = c("TRUE" = "#ef4444", "FALSE" = "#22c55e"),
                     labels = c("p < 0.05 (rechaza H₀)",
                                "p ≥ 0.05 (no rechaza)")) +
  scale_x_continuous(breaks = seq(5, 30, 5)) +
  labs(title = "P-valores de Ljung-Box por rezago — residuos UKDriverDeaths",
       subtitle = "Puntos rojos: rezagos con autocorrelación significativa",
       x = "Rezago m", y = "P-valor", color = NULL) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
          caption="Si varios puntos están por debajo de la línea roja (α = 0.05), los residuos no son ruido blanco y el modelo necesita mejoras."
        />
      </TestCard>

      {/* ════════════════════════════════════════════════ */}
      <h2 id="seccion-homocedasticidad">8.4 Prueba de homocedasticidad</h2>

      <TestCard
        id="breusch-pagan"
        number="T·08"
        title="Breusch-Pagan / White — varianza constante"
        badge="Homocedasticidad"
        badgeColor="bg-orange-50 text-orange-900 border-b border-orange-200"
      >
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis</p>
          <HypRow label="H₀" math="\text{Var}(E_t) = \sigma^2 \quad \forall\,t \quad \text{(homocedasticidad)}" />
          <HypRow label="H₁" math="\text{Var}(E_t) \text{ depende de los predictores}" />
        </div>

        <p>
          <strong>Breusch-Pagan:</strong> regresa{" "}
          <I c="\hat{E}_t^2" /> sobre los predictores del modelo original.
          El estadístico <I c="BP = nR^2 \sim \chi^2_{k-1}" />.
        </p>
        <p>
          <strong>White:</strong> variante robusta que incluye también los
          cuadrados e interacciones de los predictores.
        </p>

        <CodeBlock
          executable={true}
          packages={["forecast","ggplot2"]}
          title="Breusch-Pagan (manual) + gráfico de residuos vs ajustados"
          code={`library(forecast); library(ggplot2)

# ── Funciones auxiliares ───────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- as.data.frame(sapply(1:grado, function(j) tiempo^j))
  names(df) <- paste0("t", 1:grado); df
}

# ── Datos y modelo ─────────────────────────────────────────
yt     <- UKDriverDeaths
n      <- length(yt); t <- 1:n
poli   <- Mipoly(t, 1)
mdum   <- seasonaldummy(yt)
mod_uk <- lm(log(as.numeric(yt)) ~ ., data = cbind(poli, mdum))

# ── Breusch-Pagan manual: regresión de e² sobre predictores ─
e2     <- residuals(mod_uk)^2
X_mat  <- model.matrix(mod_uk)
bp_aux <- lm(e2 ~ X_mat[, -1])          # sin intercepto duplicado
BP     <- n * summary(bp_aux)$r.squared
df_bp  <- ncol(X_mat) - 1
p_bp   <- pchisq(BP, df = df_bp, lower.tail = FALSE)

cat("Breusch-Pagan (manual — sin paquetes externos):\n")
cat("  BP =", round(BP, 4), "  gl =", df_bp, "\n")
cat("  p-valor =", round(p_bp, 4), "\n")
cat("  Conclusión:", ifelse(p_bp > 0.05,
    "No se rechaza H₀ → varianza constante (homocedasticidad)",
    "Se rechaza H₀ → heterocedasticidad"), "\n\n")

# ── Gráficos diagnósticos de heterocedasticidad ────────────
df_diag <- data.frame(
  fitted   = fitted(mod_uk),
  resid    = residuals(mod_uk),
  absresid = abs(residuals(mod_uk))
)

# G1: Residuos vs ajustados
ggplot(df_diag, aes(x = fitted, y = resid)) +
  geom_point(color = "#1d4ed8", alpha = 0.5, size = 1.5) +
  geom_hline(yintercept = 0, color = "#ef4444", linetype = "dashed") +
  geom_smooth(method = "loess", formula = y~x, se = FALSE,
              color = "#f59e0b", linewidth = 1) +
  labs(title = "Residuos vs Valores Ajustados — UKDriverDeaths",
       subtitle = paste0("BP = ", round(BP,3), "  p = ", round(p_bp,4),
                         "  |  Patrón plano → homocedasticidad"),
       x = expression(hat(Y)[t]), y = expression(hat(E)[t])) +
  theme_bw(base_size = 12)`}
          caption="Un patrón de embudo (varianza creciente con el nivel) indica heterocedasticidad → aplicar log(Yt). El test BP manual es equivalente al bptest() del paquete lmtest."
        />
      </TestCard>

      {/* ════════════════════════════════════════════════ */}
      <h2 id="seccion-adf">8.5 Prueba de estacionariedad — Dickey-Fuller Aumentada</h2>

      <TestCard
        id="adf"
        number="T·09"
        title="Dickey-Fuller Aumentada (ADF) — raíz unitaria"
        badge="Estacionariedad"
        badgeColor="bg-stone-100 text-stone-900 border-b border-stone-300"
      >
        <p>
          <strong>Contexto:</strong> Si el modelo de regresión no elimina
          completamente la tendencia, los residuos pueden ser no estacionarios
          (contener raíz unitaria). La ADF verifica si el proceso que genera{" "}
          <I c="\hat{E}_t" /> tiene raíz unitaria.
        </p>

        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 my-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Hipótesis</p>
          <HypRow label="H₀" math="\phi = 1 \quad \text{(raíz unitaria — no estacionario)}" />
          <HypRow label="H₁" math="|\phi| < 1 \quad \text{(estacionario)}" />
        </div>

        <p>
          El modelo aumentado es:{" "}
          <I c="\Delta \hat{E}_t = \mu + \phi \hat{E}_{t-1} + \sum_{j=1}^p \gamma_j \Delta \hat{E}_{t-j} + \varepsilon_t" />.
          El estadístico ADF no sigue una distribución t estándar; se usan
          valores críticos de Dickey-Fuller.
        </p>

        <CodeBlock
          executable={true}
          packages={["forecast","ggplot2","tseries"]}
          title="ADF sobre residuos y sobre la serie original co2"
          code={`library(forecast); library(ggplot2); library(tseries)

# ── Funciones auxiliares ───────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- as.data.frame(sapply(1:grado, function(j) tiempo^j))
  names(df) <- paste0("t", 1:grado); df
}

# ── Datos y modelo ─────────────────────────────────────────
yt_co2 <- co2    # ts mensual CO₂ Mauna Loa, 1959-1997, n = 468
n_co2  <- length(yt_co2)
t_co2  <- 1:n_co2
poli_c  <- Mipoly(t_co2, 1)
mdum_c  <- seasonaldummy(yt_co2)
mod_co2 <- lm(as.numeric(yt_co2) ~ ., data = cbind(poli_c, mdum_c))
e_co2   <- residuals(mod_co2)

# ── ADF sobre la serie original ────────────────────────────
cat("ADF sobre co2 original:\n")
adf_orig <- adf.test(as.numeric(yt_co2))
print(adf_orig)

# ── ADF sobre los residuos ─────────────────────────────────
cat("\nADF sobre residuos del modelo lineal + dummies:\n")
adf_res <- adf.test(e_co2)
print(adf_res)
cat("Conclusión:",
    ifelse(adf_res$p.value < 0.05,
    "Se rechaza H₀ → residuos son estacionarios ✓",
    "No se rechaza H₀ → residuos tienen raíz unitaria ✗"), "\n\n")

# ── Visualización con long-format (sin patchwork) ─────────
t_orig <- as.numeric(time(yt_co2))
df_plot <- rbind(
  data.frame(t = t_orig, y = as.numeric(yt_co2),
             panel = "CO₂ original (ppm)"),
  data.frame(t = t_orig[-1], y = diff(as.numeric(yt_co2)),
             panel = "diff(CO₂) — serie diferenciada")
)
ggplot(df_plot, aes(x = t, y = y, color = panel)) +
  geom_line(linewidth = 0.7, show.legend = FALSE) +
  geom_hline(data = data.frame(panel = "diff(CO₂) — serie diferenciada",
                                y = 0),
             aes(yintercept = y), linetype = "dashed",
             color = "#94a3b8") +
  facet_wrap(~ panel, ncol = 1, scales = "free_y") +
  scale_color_manual(values = c("CO₂ original (ppm)" = "#1d4ed8",
                                "diff(CO₂) — serie diferenciada" = "#22c55e")) +
  labs(title = "CO₂ Mauna Loa — original vs diferenciada",
       subtitle = paste0("ADF residuos: p=", round(adf_res$p.value,4),
                         "  |  ADF serie: p=", round(adf_orig$p.value,4)),
       x = "Año", y = NULL) +
  theme_bw(base_size = 11) +
  theme(strip.text = element_text(face = "bold"))`}
          caption="Si los residuos del modelo son estacionarios (ADF rechaza H₀), la tendencia fue correctamente eliminada. Si no, aumentar el grado del polinomio o aplicar diferenciación."
        />
      </TestCard>

      {/* ════════════════════════════════════════════════ */}
      <h2 id="graficos">8.6 Guía completa de gráficos diagnósticos</h2>
      <p>
        Los gráficos son indispensables como complemento de las pruebas
        formales — a veces detectan problemas que los tests no capturan (y
        viceversa). El siguiente código genera un panel completo de 6 gráficos
        para cualquier modelo de regresión.
      </p>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="Panel diagnóstico completo (4 gráficos) — AirPassengers"
        code={`library(forecast); library(ggplot2)

# ── Funciones auxiliares ───────────────────────────────────
Mipoly <- function(tiempo, grado) {
  df <- as.data.frame(sapply(1:grado, function(j) tiempo^j))
  names(df) <- paste0("t", 1:grado); df
}

# ── Datos y modelo ─────────────────────────────────────────
yt   <- AirPassengers
n    <- length(yt); t <- 1:n
poli <- Mipoly(t, 1)
mdum <- seasonaldummy(yt)
mod  <- lm(log(as.numeric(yt)) ~ ., data = cbind(poli, mdum))

e     <- residuals(mod)
yhat  <- exp(fitted(mod))
t_yr  <- as.numeric(time(yt))
sw_p  <- shapiro.test(e)$p.value
lb_p  <- Box.test(e, lag = 24, type = "Ljung-Box")$p.value
lim   <- qnorm(0.975) / sqrt(n)

cat("══ Diagnóstico rápido ══════════════════════════════\n")
cat("Shapiro-Wilk p =", round(sw_p, 4),
    ifelse(sw_p > 0.05, "→ normalidad OK", "→ ojo: no normalidad"), "\n")
cat("Ljung-Box(24) p =", round(lb_p, 4),
    ifelse(lb_p > 0.05, "→ ruido blanco OK", "→ hay autocorrelación"), "\n\n")

# ── G1: Serie observada vs ajustada ───────────────────────
df_fit <- data.frame(t = t_yr,
                      obs  = as.numeric(yt),
                      ajus = yhat)
df_long <- rbind(
  data.frame(t = t_yr, y = as.numeric(yt), tipo = "Observado"),
  data.frame(t = t_yr, y = yhat,            tipo = "Ajustado")
)
ggplot(df_long, aes(x = t, y = y, color = tipo, linetype = tipo)) +
  geom_line(linewidth = 0.9) +
  scale_color_manual(values = c("Observado"="#475569","Ajustado"="#ef4444")) +
  scale_linetype_manual(values = c("Observado"="solid","Ajustado"="dashed")) +
  labs(title = "AirPassengers — Serie observada vs ajustada",
       subtitle = paste0("R²_adj = ", round(summary(mod)$adj.r.squared,4)),
       x = "Año", y = "Pasajeros (miles)", color = NULL, linetype = NULL) +
  theme_bw(base_size = 12) + theme(legend.position = "top")`}
        caption="Ejecuta este bloque para ver la serie ajustada. Los gráficos de residuos (Q-Q, ACF, scale-location) se detallan en las secciones anteriores de este módulo."
      />

      {/* ── Gráficos individuales detallados ───────────── */}
      <h3 id="serie-ajustada">G·01 — Serie observada vs ajustada</h3>
      <p>
        <strong>¿Qué buscar?</strong> La curva ajustada debe seguir el centro
        de los datos, pasando entre las fluctuaciones sin replicar el ruido.
        Desviaciones sistemáticas persistentes indican mala especificación.
      </p>

      <h3 id="residuos-tiempo">G·02 — Residuos vs tiempo</h3>
      <p>
        <strong>Patrón ideal:</strong> Nube horizontal centrada en cero, sin
        tendencias ni ciclos, dispersión constante. Problemas comunes:
      </p>
      <ul>
        <li><strong>Ciclos</strong> → autocorrelación positiva (modelo ARIMA necesario).</li>
        <li><strong>Rachas alternadas ±</strong> → autocorrelación negativa.</li>
        <li><strong>Embudo creciente</strong> → heterocedasticidad (aplicar log).</li>
      </ul>

      <h3 id="residuos-ajustados">G·03 — Residuos vs valores ajustados</h3>
      <p>
        <strong>Buen ajuste:</strong> Dispersión aleatoria en torno a cero.
        Una curvatura (forma de U) sugiere omisión de un término cuadrático.
        Un embudo sugiere varianza proporcional al nivel.
      </p>

      <h3 id="qqplot">G·04 — Q-Q plot normal</h3>
      <p>
        Si los puntos siguen la diagonal, los residuos son normales. Desviaciones
        típicas: colas pesadas (puntos se alejan en los extremos), asimetría
        (curva en S), valores atípicos (puntos aislados).
      </p>

      <h3 id="acf-pacf">G·05/06 — ACF y PACF de residuos</h3>
      <p>
        En un modelo bien ajustado, <strong>ninguna barra</strong> debe
        superar las bandas <I c="\pm 1.96/\sqrt{n}" />. Barras en rezagos
        múltiplos de <I c="s" /> indican estacionalidad residual no modelada.
      </p>

      <h3 id="boxplot-estacion">G·07 — Boxplots por estación</h3>
      <p>
        Muestra la distribución de los residuos para cada período del año.
        Si las medianas son sistemáticamente distintas de cero para algunas
        estaciones, el modelo estacional no captura bien esas estaciones
        específicas.
      </p>

      <CodeBlock
        title="Periodograma y boxplot estacional — ejemplo nottem"
        code={`data("nottem")
yt_n <- nottem
n_n  <- length(yt_n)
t_n  <- 1:n_n

# ── Modelo estacional puro ────────────────────────────────
mod_n  <- lm(as.numeric(yt_n) ~ seasonaldummy(yt_n))
e_n    <- residuals(mod_n)

# ── G: Periodograma de la serie diferenciada ─────────────
esp_n <- spec.pgram(diff(as.numeric(yt_n)),
                    taper=0, log="no", plot=FALSE)
df_esp <- data.frame(freq=esp_n$freq, spec=esp_n$spec)

g_period <- ggplot(df_esp, aes(x=freq, y=spec)) +
  geom_line(color="#475569", linewidth=0.7) +
  geom_vline(xintercept=(1:6)/12, color="#ef4444",
             linetype="dashed", alpha=0.8) +
  annotate("text", x=(1:6)/12, y=max(esp_n$spec)*0.95,
           label=paste0(1:6,"/12"), color="#ef4444",
           size=3.2, angle=90, vjust=-0.2) +
  labs(title="Periodograma — diff(nottem)",
       subtitle="Pico dominante en F=1/12 (ciclo anual)",
       x="Frecuencia", y="Potencia espectral") +
  theme_bw(base_size=12)

# ── G: Boxplot residuos por mes ───────────────────────────
df_bx <- data.frame(
  resid = e_n,
  mes   = factor(month.abb[cycle(yt_n)], levels=month.abb)
)
g_box <- ggplot(df_bx, aes(x=mes, y=resid, fill=mes)) +
  geom_boxplot(show.legend=FALSE, outlier.shape=21, outlier.size=1.5) +
  geom_hline(yintercept=0, linetype="dashed", color="#ef4444") +
  scale_fill_viridis_d(option="plasma", begin=0.2, end=0.9) +
  labs(title="Residuos por mes — modelo estacional puro",
       subtitle="Medianas cerca de 0: buen ajuste estacional",
       x="Mes", y=expression(hat(E)[t])) +
  theme_bw(base_size=12)

g_period / g_box`}
        caption="Si las medianas del boxplot son distintas de cero por mes, considera añadir interacciones o modelos de estacionalidad evolutiva (STL)."
      />

      {/* ════════════════════════════════════════════════ */}
      <h2 id="resumen">8.7 Tabla de referencia rápida</h2>
      <table>
        <thead>
          <tr>
            <th>Prueba / Gráfico</th>
            <th>¿Cuándo usarla?</th>
            <th>Función R</th>
            <th>Problema si falla</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["t para βₚ", "Al decidir grado del polinomio", "summary(lm)", "Sobreparametrización"],
            ["t para δᵢ", "Validar cada efecto estacional", "summary(lm)", "Estacionalidad irrelevante"],
            ["t para αⱼ/γⱼ", "Validar cada armónico Fj", "summary(lm) + anova()", "Onda innecesaria"],
            ["F global (ANOVA)", "Significancia conjunta del modelo", "summary(lm)$fstatistic", "Modelo inútil"],
            ["Shapiro-Wilk", "Normalidad (n < 5000)", "shapiro.test(resid)", "Tests t e IC inválidos"],
            ["Jarque-Bera", "Normalidad (n grande)", "jarque.bera.test(resid)", "Asimetría/curtosis excesiva"],
            ["Durbin-Watson", "Autocorrelación orden 1", "durbinWatsonTest(mod)", "DW ≠ 2 → AR(1) residual"],
            ["Ljung-Box", "Autocorrelación hasta rezago m", "Box.test(resid, lag, type)", "Estructura temporal no modelada"],
            ["Breusch-Pagan", "Homocedasticidad", "bptest(mod)", "Heterocedasticidad → log()"],
            ["White", "Homocedasticidad robusta", "white_lm(mod)", "Varianza no lineal en predictores"],
            ["ADF", "Estacionariedad de residuos", "adf.test(resid)", "Raíz unitaria → modelo incompleto"],
            ["G: Serie vs ajust.", "Calidad de ajuste visual", "ggplot", "Desviaciones sistemáticas"],
            ["G: Resid vs t", "Ciclos, tendencia residual", "ggplot", "Autocorrelación, heterocedasticidad"],
            ["G: Q-Q plot", "Normalidad visual", "stat_qq()", "Colas pesadas, asimetría"],
            ["G: ACF/PACF", "Estructura de correlación", "acf(), pacf()", "Modelo insuficiente"],
            ["G: Boxplot estac.", "Ajuste por estación", "ggplot + geom_boxplot", "Efecto estacional mal modelado"],
            ["G: Periodograma", "Identificar frecuencias", "spec.pgram(diff(y))", "Omitir frecuencias importantes"],
          ].map(([prueba, cuando, fn, problema]) => (
            <tr key={prueba as string}>
              <td className="font-medium">{prueba as string}</td>
              <td className="text-sm">{cuando as string}</td>
              <td><code className="text-xs">{fn as string}</code></td>
              <td className="text-sm text-stone-600">{problema as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ════════════════════════════════════════════════ */}
      <h2 id="datasets">8.8 Datasets y paquetes del curso</h2>

      <h3>Datasets utilizados</h3>
      <table>
        <thead>
          <tr><th>Dataset</th><th>Paquete</th><th>Frecuencia</th><th>Período</th><th>Descripción</th></tr>
        </thead>
        <tbody>
          {[
            ["AirPassengers","datasets","Mensual","1949–1960","Pasajeros aéreos EE.UU. (multiplicativo)"],
            ["nottem","datasets","Mensual","1920–1939","Temperatura Nottingham Castle (estacional puro)"],
            ["UKDriverDeaths","datasets","Mensual","1969–1984","Muertes en carretera Reino Unido"],
            ["UKgas","datasets","Trimestral","1960–1986","Consumo de gas Reino Unido"],
            ["USAccDeaths","datasets","Mensual","1973–1978","Muertes accidentales EE.UU."],
            ["co2","datasets","Mensual","1959–1997","CO₂ Mauna Loa (tendencia fuerte)"],
            ["LakeHuron","datasets","Anual","1875–1972","Nivel del Lago Hurón"],
            ["sunspot.year","datasets","Anual","1700–1988","Manchas solares (ciclos ~11 años)"],
            ["EuStockMarkets","datasets","Diario (aprox)","1991–1998","4 índices bursátiles europeos"],
            ["taylor","forecast","30-min","2000","Demanda eléctrica (doble estacionalidad)"],
            ["gas","forecast","Mensual","1956–1995","Producción de gas Australia"],
            ["austourists","forecast","Trimestral","1999–2010","Turistas internacionales Australia"],
          ].map(([ds, pkg, freq, period, desc]) => (
            <tr key={ds as string}>
              <td><code className="text-xs font-semibold">{ds as string}</code></td>
              <td><code className="text-xs">{pkg as string}</code></td>
              <td className="text-sm">{freq as string}</td>
              <td className="text-sm">{period as string}</td>
              <td className="text-sm">{desc as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Paquetes de R requeridos</h3>
      <CodeBlock
        title="Instalación de todos los paquetes del curso"
        code={`# ── Instalar todos los paquetes del curso ────────────────
paquetes_curso <- c(
  # Series de tiempo y pronóstico
  "forecast",    # seasonaldummy, auto.arima, stlf, ggplot wrappers
  "tseries",     # adf.test, jarque.bera.test, kpss.test
  "TSA",         # periodogram(), spec.pgram alternativa
  # Diagnóstico de regresión
  "lmtest",      # bptest, dwtest, coeftest
  "car",         # durbinWatsonTest, vif, leveneTest
  "skedastic",   # white_lm, goldfeld_quandt
  # Visualización
  "ggplot2",     # gramática de gráficos
  "patchwork",   # combinar múltiples ggplots
  "viridis",     # escalas de color accesibles
  # Manipulación de datos
  "dplyr",       # %>%, mutate, filter
  "tidyr",       # pivot_longer, pivot_wider
  "lubridate"    # manejo de fechas
)
install.packages(paquetes_curso)

# ── Cargar todos ──────────────────────────────────────────
invisible(lapply(paquetes_curso, library, character.only = TRUE))`}
        caption="Ejecuta este bloque una sola vez. Si ya tienes los paquetes, solo ejecuta library()."
      />

      <Callout type="info" title="Resumen del ciclo de validación">
        <p>
          El flujo completo de diagnóstico para un modelo <I c="Y_t = T_t + S_t + E_t" /> es:
        </p>
        <ol className="mt-2 space-y-1 text-sm list-decimal pl-4">
          <li><strong>Panel visual:</strong> <code>panel_diagnostico(mod, serie)</code></li>
          <li><strong>Normalidad:</strong> <code>shapiro.test(resid)</code> + Q-Q plot</li>
          <li><strong>Independencia:</strong> <code>durbinWatsonTest(mod)</code> + <code>Box.test(resid, lag=2s)</code> + ACF</li>
          <li><strong>Homocedasticidad:</strong> <code>bptest(mod)</code> + gráfico resid vs ajust.</li>
          <li><strong>Estacionariedad:</strong> <code>adf.test(resid)</code> si hay dudas</li>
          <li><strong>Significancia:</strong> <code>summary(mod)</code> para cada coeficiente</li>
        </ol>
        <p className="mt-2">
          Si alguna prueba falla, consulta la columna "Problema si falla"
          de la tabla anterior para la acción correctiva.
        </p>
      </Callout>
    </div>
  );
}
