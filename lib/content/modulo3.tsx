import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo3Content() {
  return (
    <div className="prose-content">

      {/* ── 3.1 Variables indicadoras ───────────────────── */}
      <h2 id="indicadoras">3.1 Estacionalidad con variables indicadoras (dummies)</h2>
      <p>
        Cuando el patrón estacional es <strong>regular y se repite
        idénticamente</strong> de año en año, lo modelamos con un conjunto de
        variables binarias. Para una serie con periodo <I c="s" />, se definen{" "}
        <I c="s - 1" /> variables indicadoras:
      </p>
      <D c="I_{i,t} = \begin{cases} 1 & \text{si en } t \text{ se observa la estación } i \\ 0 & \text{en otro caso} \end{cases} \quad (i = 1, \ldots, s-1)" />
      <p>
        La estación <I c="s" /> actúa como <strong>categoría de
        referencia</strong>. La componente estacional queda:
      </p>
      <D c="S_t = \sum_{i=1}^{s-1} \delta_i I_{i,t}" />
      <p>
        El modelo estacional completo (con nivel constante, sin tendencia) es:
      </p>
      <D c="Y_t = \mu + \sum_{i=1}^{s-1} \delta_i \, I_{i,t} + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        donde <I c="\mu = \beta_0" /> es el nivel medio de la{" "}
        <strong>estación de referencia</strong> (<I c="s" />), y cada{" "}
        <I c="\delta_i" /> mide la desviación del nivel medio de la estación{" "}
        <I c="i" /> respecto a esa referencia. Al incorporar tendencia
        polinomial (Módulo 4), <I c="\mu" /> queda absorbido en{" "}
        <I c="\beta_0" />.
      </p>

      <h3 id="interpretacion-deltas">Interpretación de los coeficientes δᵢ</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <p className="font-semibold text-blue-800 text-sm mb-2">Modelo aditivo</p>
          <D c="\delta_i = E[Y_t \mid \text{estación } i] - E[Y_t \mid \text{estación } s]" />
          <p className="text-sm text-stone-600 mt-2">
            Diferencia absoluta en el nivel medio entre la estación i y la
            estación de referencia.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
          <p className="font-semibold text-emerald-800 text-sm mb-2">Modelo multiplicativo (log)</p>
          <D c="\exp(\delta_i) = \frac{E[Y_t \mid \text{estación } i]}{E[Y_t \mid \text{estación } s]}" />
          <p className="text-sm text-stone-600 mt-2">
            Razón entre el nivel medio de la estación i y el de referencia.
            Si <I c="\exp(\delta_i) = 0.88" /> → la estación i tiene un
            nivel 12% menor.
          </p>
        </div>
      </div>

      <Callout type="info" title="¿Por qué s − 1 indicadoras y no s?">
        <p>
          Incluir las <I c="s" /> indicadoras genera colinealidad perfecta con
          el intercepto (multicolinealidad exacta), pues{" "}
          <I c="\sum_{i=1}^s I_{i,t} = 1" /> para todo <I c="t" />. Se omite
          una (la categoría de referencia) para que el sistema sea identificable.
          Todas las comparaciones se expresan entonces relativamente a esa
          categoría omitida.
        </p>
      </Callout>

      {/* ── Ejemplo nottem ──────────────────────────────── */}
      <h2 id="ejemplo-nottem">3.2 Ejemplo A — nottem: temperatura mensual de Nottingham</h2>
      <p>
        El dataset <code>nottem</code> (base R) registra la temperatura media
        mensual en grados Fahrenheit en Nottingham Castle (Reino Unido), de
        enero de 1920 a diciembre de 1939 (<I c="n = 240" /> observaciones,{" "}
        <I c="s = 12" />). No hay tendencia apreciable, por lo que el modelo
        es solo estacional con intercepto:
      </p>
      <D c="Y_t = \mu + \sum_{i=1}^{11} \delta_i I_{i,t} + E_t" />

      <Callout type="example" title="Efecto estacional en nottem (ref = diciembre)">
        <p>
          Junio, julio y agosto son los meses más cálidos: sus{" "}
          <I c="\hat{\delta}_i" /> son positivos (~14–16°F sobre diciembre).
          Enero y febrero muestran los coeficientes más negativos (~−11°F).
          El <I c="R^2" /> ajustado supera 0.97, lo que confirma que la
          estacionalidad explica casi toda la variabilidad.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ nottem — modelo de estacionalidad con dummies y ggplot2"
        code={`library(forecast)
library(ggplot2)

# ── Dataset ───────────────────────────────────────────────
# nottem disponible directamente en el entorno de R
yt <- nottem
n  <- length(yt)             # 240
t  <- 1:n

# ── s-1 = 11 indicadoras; referencia = diciembre (mes 12) ─
dum_nottem <- seasonaldummy(yt)   # columnas Ene, Feb, ..., Nov
datos      <- data.frame(yt = as.numeric(yt), dum_nottem)
mod_est    <- lm(yt ~ ., data = datos)
summary(mod_est)

# ── Efectos estacionales: δ̂ᵢ ─────────────────────────────
coefs <- coef(mod_est)
meses <- c("Ene","Feb","Mar","Abr","May","Jun",
           "Jul","Ago","Sep","Oct","Nov","Dic")
delta_est <- c(coefs[-1], 0)   # δ₁₂ = 0 por ser referencia
df_delta  <- data.frame(Mes = factor(meses, levels = meses),
                         delta = delta_est)

ggplot(df_delta, aes(x = Mes, y = delta,
                     fill = delta > 0)) +
  geom_col(show.legend = FALSE) +
  geom_hline(yintercept = 0, colour = "black", linewidth = 0.5) +
  scale_fill_manual(values = c("TRUE" = "#ef4444",
                                "FALSE" = "#3b82f6")) +
  labs(
    title    = "Efectos estacionales — nottem (ref = diciembre)",
    subtitle = "δ̂ᵢ: diferencia de temperatura respecto a diciembre (°F)",
    x = NULL, y = "δ̂ᵢ (°F)"
  ) +
  theme_bw(base_size = 12)

# ── Ajuste vs observado ───────────────────────────────────
df_fit <- data.frame(
  t      = t,
  Año    = as.numeric(time(yt)),
  Obs    = as.numeric(yt),
  Ajuste = fitted(mod_est)
)

ggplot(df_fit, aes(x = Año)) +
  geom_line(aes(y = Obs,    colour = "Observado"),
            linewidth = 0.7, alpha = 0.8) +
  geom_line(aes(y = Ajuste, colour = "Ajustado"),
            linewidth = 1.2) +
  scale_colour_manual(
    values = c("Observado" = "#78716c", "Ajustado" = "#1d4ed8")
  ) +
  labs(title    = "Temperatura Nottingham — ajuste sólo estacional",
       subtitle = paste0("R² adj = ",
         round(summary(mod_est)$adj.r.squared, 4)),
       x = "Año", y = "Temperatura (°F)", colour = NULL) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Con 11 indicadoras mensuales el modelo captura >97% de la variación de nottem, confirmando que la estacionalidad es la componente dominante."
      />

      <CodeBlock
        executable={true}
        packages={["forecast"]}
        title="▶ interpdeltas() — efectos estacionales con IC 95% (nottem)"
        code={`library(forecast)

# ── Setup (autocontenido) ─────────────────────────────────
yt      <- nottem
n       <- length(yt)
t       <- 1:n
dum_not <- seasonaldummy(yt)
mod_est <- lm(as.numeric(yt) ~ dum_not)

# ── Función interpdeltas ──────────────────────────────────
interpdeltas <- function(modelo, s, nombres_est = NULL) {
  co     <- summary(modelo)$coefficients
  idx    <- (nrow(co) - s + 2):nrow(co)
  deltas <- co[idx, 1]
  se_d   <- co[idx, 2]
  df_out <- data.frame(
    Estacion  = if (!is.null(nombres_est)) nombres_est[-s]
                else paste0("S", 1:(s-1)),
    delta_hat = round(deltas, 4),
    exp_delta = round(exp(deltas), 4),
    IC_inf    = round(deltas - 1.96 * se_d, 4),
    IC_sup    = round(deltas + 1.96 * se_d, 4)
  )
  print(df_out)
  invisible(df_out)
}

# ── Aplicar a nottem ──────────────────────────────────────
meses <- c("Ene","Feb","Mar","Abr","May","Jun",
           "Jul","Ago","Sep","Oct","Nov","Dic")
interpdeltas(mod_est, s = 12, nombres_est = meses)`}
        caption="interpdeltas() extrae δ̂ᵢ, exp(δ̂ᵢ) y el IC 95% de cada estación. exp(δ̂ᵢ) es el factor multiplicativo (útil para modelos log)."
      />

      {/* ── 3.3 Funciones trigonométricas ───────────────── */}
      <h2 id="trigonometricas">3.3 Estacionalidad con funciones trigonométricas (armónicos)</h2>
      <p>
        Cuando el patrón estacional tiene una forma suave o se quiere una
        representación más <strong>parsimoniosa</strong>, se usan sumas de
        senos y cosenos (series de Fourier):
      </p>
      <D c="S_t = \sum_{j=1}^{k} \left[\alpha_j \sin(2\pi F_j t) + \gamma_j \cos(2\pi F_j t)\right]" />
      <p>
        donde <I c="F_j" /> son las frecuencias identificadas en el
        periodograma de la serie diferenciada. Para series mensuales, las
        frecuencias naturales son <I c="F_j = j/12" /> con{" "}
        <I c="j = 1, \ldots, 6" />.
      </p>

      <h3 id="periodograma">El periodograma</h3>
      <p>
        El periodograma estima la densidad espectral de potencia de la serie
        en cada frecuencia discreta <I c="\omega_j = j/n" /> con{" "}
        <I c="j = 1, \ldots, \lfloor n/2 \rfloor" />. Para la serie{" "}
        <I c="Y_1, \ldots, Y_n" />, se define:
      </p>
      <D c="I(\omega_j) = \frac{1}{n}\left|\sum_{t=1}^{n} Y_t \, e^{-2\pi i \omega_j t}\right|^2 = \frac{1}{n}\!\left[\left(\sum_{t=1}^n Y_t \cos 2\pi\omega_j t\right)^{\!2} + \left(\sum_{t=1}^n Y_t \sin 2\pi\omega_j t\right)^{\!2}\right]" />
      <p>
        Un pico en <I c="\omega_j = F_j" /> indica que la serie contiene un
        ciclo de periodo <I c="1/F_j" /> observaciones. Por ejemplo, en una
        serie mensual con ciclo anual, el pico dominante aparece en{" "}
        <I c="\omega = 1/12 \approx 0.083" />. Los picos dominantes
        identifican las frecuencias <I c="F_j" /> que se usan en{" "}
        <code>Mytrigon()</code>.
      </p>
      <CodeBlock
        executable={true}
        packages={["forecast"]}
        title="▶ Periodograma para identificar frecuencias dominantes (nottem)"
        code={`# ── Diferenciar para remover tendencia ───────────────────
dyt <- diff(nottem, differences = 1)

# ── Calcular el periodograma ──────────────────────────────
espectro <- spec.pgram(dyt, taper = 0, log = "no",
                       main = "Periodograma de diff(nottem)")
# Para nottem: el pico dominante está en F = 1/12 ≈ 0.083 (ciclo anual)
# y armónicos en F = 2/12, 3/12, ...

# ── Frecuencias más importantes ───────────────────────────
idx_top   <- order(espectro$spec, decreasing = TRUE)[1:6]
freq_dom  <- espectro$freq[idx_top]
cat("Frecuencias dominantes:", round(freq_dom, 4), "\n")
cat("Períodos (en meses):", round(1 / freq_dom, 1), "\n")`}
      />

      {/* ── Ejemplo USAccDeaths ─────────────────────────── */}
      <h2 id="ejemplo-usacc">3.4 Ejemplo B — USAccDeaths: modelo trigonométrico</h2>
      <p>
        El dataset <code>USAccDeaths</code> (base R) contiene el número mensual
        de muertes accidentales en EE.UU. de 1973 a 1978 (<I c="n = 72" />,{" "}
        <I c="s = 12" />). Usamos funciones trigonométricas para modelar la
        estacionalidad — la serie tiene un pico claro en verano (julio) y un
        mínimo en invierno.
      </p>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ USAccDeaths — dummies vs armónicos de Fourier"
        code={`# ── Función auxiliar Mytrigon (autocontenida) ─────────────
Mytrigon <- function(tiempo, Frecuencias) {
  n  <- length(tiempo)
  df <- data.frame(matrix(nrow = n, ncol = 2 * length(Frecuencias)))
  k  <- 0
  for (j in seq_along(Frecuencias)) {
    k <- k + 1; df[, k] <- sin(2 * pi * Frecuencias[j] * tiempo)
    k <- k + 1; df[, k] <- cos(2 * pi * Frecuencias[j] * tiempo)
  }
  names(df) <- paste0(rep(c("sen", "cos"), length(Frecuencias)),
                      rep(seq_along(Frecuencias), each = 2))
  df
}

# ── Dataset ───────────────────────────────────────────────
# USAccDeaths disponible directamente en el entorno de R
yt3 <- USAccDeaths
n3  <- length(yt3)            # 72
t3  <- 1:n3

# ── Modelo con 3 armónicos (parsimonia) ───────────────────
trig3 <- Mytrigon(t3, Frecuencias = (1:3) / 12)
mod_trig <- lm(as.numeric(yt3) ~ ., data = trig3)
summary(mod_trig)

# ── Modelo con dummies (referencia) ───────────────────────
library(forecast)
dum3    <- seasonaldummy(yt3)
mod_dum <- lm(as.numeric(yt3) ~ ., data = data.frame(dum3))

# ── Comparar AIC ──────────────────────────────────────────
cat("AIC trigonométrico (k=3):", round(AIC(mod_trig), 2), "\n")
cat("AIC dummies (s-1=11):    ", round(AIC(mod_dum),  2), "\n")

# ── Gráfico comparativo con ggplot2 ──────────────────────
library(ggplot2)

df3 <- data.frame(
  t        = t3,
  Año      = as.numeric(time(yt3)),
  Obs      = as.numeric(yt3),
  Trig3    = fitted(mod_trig),
  Dummies  = fitted(mod_dum)
)

ggplot(df3, aes(x = Año)) +
  geom_line(aes(y = Obs,     colour = "Observado"),
            linewidth = 0.8, alpha = 0.8) +
  geom_line(aes(y = Trig3,   colour = "Trigon. k=3"),
            linewidth = 1.3, linetype = "solid") +
  geom_line(aes(y = Dummies, colour = "Dummies s-1=11"),
            linewidth = 1.1, linetype = "dashed") +
  scale_colour_manual(
    values = c("Observado" = "#78716c",
               "Trigon. k=3"    = "#1d4ed8",
               "Dummies s-1=11" = "#dc2626")
  ) +
  labs(
    title    = "USAccDeaths — Dummies vs Trigonométricas (k=3)",
    subtitle = "6 parámetros de Fourier vs 11 dummies — ajuste muy similar",
    x = "Año", y = "Muertes accidentales", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Con solo 3 armónicos (6 parámetros) se obtiene un ajuste comparable al de 11 dummies. La clave es que el patrón estacional es suave, lo que favorece la representación trigonométrica."
      />

      {/* ── 3.5 Comparación ─────────────────────────────── */}
      <h2 id="comparacion">3.5 Comparación: dummies vs trigonométricas</h2>
      <p>
        Ambas aproximaciones son equivalentes cuando <I c="k = \lfloor s/2 \rfloor" />{" "}
        (el máximo de armónicos), pero las trigonométricas con pocos armónicos
        ofrecen mayor parsimonia.
      </p>

      <table>
        <thead>
          <tr>
            <th>Aspecto</th>
            <th>Indicadoras (dummies)</th>
            <th>Trigonométricas</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Número de parámetros</td>
            <td><I c="s - 1" /></td>
            <td><I c="2k" /> (con <I c="k \leq \lfloor s/2 \rfloor" />)</td>
          </tr>
          <tr>
            <td>Interpretación directa</td>
            <td>✓ Efecto por estación</td>
            <td>✗ No directa</td>
          </tr>
          <tr>
            <td>Patrón suave</td>
            <td>✗ Discontinuo</td>
            <td>✓ Continuo</td>
          </tr>
          <tr>
            <td>Selección automática</td>
            <td>Se incluyen todas</td>
            <td>Se eligen frecuencias por periodograma</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info" title="Ventajas de las funciones trigonométricas">
        <ul className="mt-1 space-y-1">
          <li>
            <strong>Parsimonia:</strong> con <I c="k" /> armónicos se usan{" "}
            <I c="2k" /> parámetros en lugar de <I c="s - 1" />. Para{" "}
            <I c="s = 12" /> y <I c="k = 3" />: 6 vs 11 parámetros.
          </li>
          <li>
            <strong>Suavidad:</strong> el patrón estimado es continuo y suave,
            sin discontinuidades entre meses.
          </li>
          <li>
            <strong>Flexibilidad:</strong> se pueden incluir solo las
            frecuencias estadísticamente significativas.
          </li>
        </ul>
      </Callout>

      {/* ── SVG periodograma ────────────────────────────── */}
      <div className="my-6 rounded-xl border border-stone-200 bg-white p-4 overflow-x-auto">
        <svg viewBox="0 0 680 200" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <text x="340" y="20" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="600" fontFamily="Inter">
            Periodograma — Serie mensual (periodo s = 12)
          </text>
          <line x1="60" y1="160" x2="640" y2="160" stroke="#94a3b8" strokeWidth="1.5"/>
          <line x1="60" y1="30"  x2="60"  y2="160" stroke="#94a3b8" strokeWidth="1.5"/>
          {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((f, i) => (
            <g key={f}>
              <line x1={60 + i * 116} y1="160" x2={60 + i * 116} y2="164" stroke="#94a3b8" strokeWidth="1"/>
              <text x={60 + i * 116} y="174" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="mono">{f}</text>
            </g>
          ))}
          <text x="350" y="192" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="Inter">Frecuencia</text>
          <text x="20" y="100" fill="#6b7280" fontSize="10" transform="rotate(-90,20,100)" fontFamily="Inter">Potencia</text>
          {[7,5,9,6,8,5,7,6,9,5,8,7,6,9,5,8,6,7,9,5,6,8,7,5,9,6,8,5,7,9,
            6,8,5,7,6,9,8,5,7,6,9,5,8,7,6,9,5,8,6,7,9,5,6,8,7,5,9,6].map((h, i) => {
            const x = 60 + i * 10;
            return <rect key={i} x={x} y={160-h} width={8} height={h} fill="#93c5fd" opacity="0.5" rx="1"/>;
          })}
          {/* F=1/12 ≈ 0.083 — primer armónico (ciclo anual) */}
          <rect x={60+116*0.83-4} y={42} width={12} height={118} fill="#1d4ed8" rx="2"/>
          <text x={60+116*0.83} y={36} textAnchor="middle" fill="#1d4ed8" fontSize="10" fontWeight="600" fontFamily="Inter">F=1/12</text>
          {/* F=2/12=1/6 — segundo armónico */}
          <rect x={60+116*1.67-4} y={88} width={12} height={72} fill="#7c3aed" rx="2"/>
          <text x={60+116*1.67} y={82} textAnchor="middle" fill="#7c3aed" fontSize="10" fontWeight="600" fontFamily="Inter">F=2/12</text>
          {/* F=3/12=1/4 — tercer armónico */}
          <rect x={60+116*2.5-4} y={110} width={12} height={50} fill="#0891b2" rx="2"/>
          <text x={60+116*2.5} y={104} textAnchor="middle" fill="#0891b2" fontSize="10" fontWeight="600" fontFamily="Inter">F=3/12</text>
        </svg>
        <p className="text-xs text-stone-400 text-center mt-2">
          Figura 3.1 — Periodograma con picos dominantes en F = 1/12 (ciclo anual) y sus armónicos. Los primeros 3 armónicos capturan la mayor parte de la potencia estacional.
        </p>
      </div>
    </div>
  );
}
