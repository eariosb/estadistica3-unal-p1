import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo3Content() {
  return (
    <div className="prose-content">

      {/* ── Motivación ──────────────────────────────────────── */}
      <Callout type="info" title="¿Por qué modelar la estacionalidad?">
        <p>
          Piensa en el consumo de energía eléctrica en Colombia. Es más alto en
          diciembre (iluminación navideña, fin de año) y más bajo en septiembre.
          Eso es estacionalidad: un patrón que se repite cada año. Si tienes un
          modelo de tendencia pero ignoras la estacionalidad, los residuos
          mostrarán el mismo ciclo cada año —estructura visible que el modelo no
          está aprovechando.
        </p>
        <p className="mt-2">
          En este módulo aprenderás <strong>dos formas de modelar ese
          patrón</strong>: con variables indicadoras (dummies) —una por cada
          período del año— y con funciones trigonométricas (armónicos de
          Fourier). Son equivalentes cuando se usan todos los armónicos, pero
          las funciones trigonométricas permiten una representación más
          parsimoniosa cuando el patrón es suave.
        </p>
      </Callout>

      {/* ── 3.1 Variables indicadoras ───────────────────── */}
      <h2 id="indicadoras">3.1 Estacionalidad con variables indicadoras (dummies)</h2>
      <p>
        Cuando el patrón estacional es <strong>regular y se repite
        idénticamente</strong> de año en año, lo modelamos con un conjunto de
        variables binarias —una por cada período del año, excepto uno que sirve
        de referencia. Para una serie con periodo <I c="s" />, se definen{" "}
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
        <strong>estación de referencia</strong>, y cada <I c="\delta_i" />{" "}
        mide la desviación del nivel medio de la estación <I c="i" /> respecto
        a esa referencia. Al incorporar tendencia polinomial en el Módulo 4,{" "}
        <I c="\mu" /> queda absorbido en el intercepto <I c="\beta_0" />.
      </p>

      <Callout type="info" title="¿Por qué s − 1 indicadoras y no s?">
        <p>
          Incluir las <I c="s" /> indicadoras genera colinealidad perfecta con
          el intercepto (multicolinealidad exacta), pues{" "}
          <I c="\sum_{i=1}^s I_{i,t} = 1" /> para todo <I c="t" />. Se omite
          una (la categoría de referencia) para que el sistema sea
          identificable. Todas las comparaciones se expresan entonces
          relativamente a esa categoría omitida.
        </p>
        <p className="mt-2">
          La elección de la categoría de referencia <strong>no cambia el
          ajuste del modelo</strong> —el R², AIC y los residuos son idénticos—
          pero sí cambia la interpretación de los coeficientes. En R,{" "}
          <code>seasonaldummy(yt)</code> omite por defecto la última estación
          (diciembre para datos mensuales); en nuestros ejemplos usamos{" "}
          <code>relevel()</code> para fijar <strong>enero</strong> como
          referencia, que es la convención más intuitiva en un ciclo anual
          (la primera temporada como punto de comparación).
        </p>
      </Callout>

      <h3 id="interpretacion-deltas">Interpretación de los coeficientes <I c="\hat{\delta}_i" /></h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <p className="font-semibold text-blue-800 text-sm mb-2">Modelo aditivo</p>
          <D c="\delta_i = E[Y_t \mid \text{estación } i] - E[Y_t \mid \text{estación ref}]" />
          <p className="text-sm text-stone-600 mt-2">
            Diferencia <em>absoluta</em> en el nivel medio entre la estación i
            y la estación de referencia (enero). Si{" "}
            <I c="\hat{\delta}_{\text{Jul}} = 14.2" />{" "}
            con datos de temperatura, julio es en promedio 14.2°F más cálido
            que enero.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
          <p className="font-semibold text-emerald-800 text-sm mb-2">Modelo multiplicativo (log)</p>
          <D c="\exp(\delta_i) = \frac{E[Y_t \mid \text{estación } i]}{E[Y_t \mid \text{estación ref}]}" />
          <p className="text-sm text-stone-600 mt-2">
            Razón entre el nivel medio de la estación i y el de referencia.
            Si <I c="\exp(\hat{\delta}_i) = 1.35" /> → la estación i tiene un
            nivel 35% mayor. Si <I c="\exp(\hat{\delta}_i) = 0.88" /> → 12%
            menor.
          </p>
        </div>
      </div>

      {/* ── Diagnóstico visual de la estacionalidad ─────── */}
      <h2 id="diagnostico-visual">3.2 Antes de modelar: tres gráficos diagnósticos</h2>
      <p>
        Antes de elegir el tipo de modelo estacional —aditivo o multiplicativo,
        dummies o Fourier— hay tres gráficos que deberías producir siempre.
        Juntos responden dos preguntas críticas: ¿la amplitud estacional es
        constante o crece con el nivel de la serie? ¿El patrón se repite
        fielmente año tras año o evoluciona?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {[
          {
            n: "1", title: "Season plot",
            desc: "Cada año como línea independiente. Si las líneas recientes están muy por encima de las antiguas → amplitud creciente → modelo multiplicativo (usar log).",
            color: "border-blue-300 bg-blue-50", tc: "text-blue-800",
          },
          {
            n: "2", title: "Subseries plot",
            desc: "Cada período en su propio panel vertical. La línea azul = promedio histórico del período. Si la secuencia de años sube dentro de cada panel → nivel del período crece → multiplicativo.",
            color: "border-violet-300 bg-violet-50", tc: "text-violet-800",
          },
          {
            n: "3", title: "Boxplot por período",
            desc: "La altura de cada caja = dispersión a lo largo de los años. Cajas más grandes en los meses pico que en los valles → varianza heterogénea → multiplicativo.",
            color: "border-emerald-300 bg-emerald-50", tc: "text-emerald-800",
          },
        ].map(({ n, title, desc, color, tc }) => (
          <div key={n} className={`p-3 rounded-lg border ${color}`}>
            <p className={`text-xs font-bold ${tc} mb-1`}>Gráfico {n}: {title}</p>
            <p className="text-xs text-stone-600">{desc}</p>
          </div>
        ))}
      </div>

      <Callout type="formula" title="Regla de decisión rápida">
        <p>
          Si los tres gráficos coinciden en mostrar amplitud creciente →{" "}
          <strong>modelo multiplicativo: aplicar <code>log()</code></strong>{" "}
          a la serie antes de ajustar. Si la amplitud es constante →{" "}
          <strong>modelo aditivo: trabajar con la serie original</strong>.
          Si los gráficos muestran señales mixtas, el AIC comparando ambos
          modelos es el árbitro final.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast"]}
        title="▶ AirPassengers — Season plot · Subseries · Boxplot"
        code={`library(forecast)

yt  <- AirPassengers
mes <- cycle(yt)
mes_labels <- c("Ene","Feb","Mar","Abr","May","Jun",
                "Jul","Ago","Sep","Oct","Nov","Dic")

# ── 1. Season plot: cada año como línea ──────────────────
n_years <- 12
cols_yr  <- colorRampPalette(
  c("#3b82f6","#8b5cf6","#ec4899","#f97316"))(n_years)

mat_ap <- matrix(as.numeric(yt), nrow = 12)   # 12 meses × 12 años
{
  matplot(mat_ap, type = "l", lty = 1, lwd = 1.8, col = cols_yr,
          xaxt = "n",
          main = "Patrón estacional por año — ¿crece la amplitud?",
          xlab = "Mes", ylab = "Pasajeros (miles)", bty = "l")
  axis(1, at = 1:12, labels = mes_labels, las = 2, cex.axis = 0.8)
  legend("topleft", legend = 1949:1960, col = cols_yr, lty = 1,
         cex = 0.6, ncol = 3, bty = "n")
  grid(col = "#e7e5e4")
}
# Las líneas de 1958–1960 están muy por encima de 1949 → multiplicativo

# ── 2. Subseries plot: evolución histórica por mes ────────
{
  monthplot(yt,
            labels   = mes_labels,
            col      = "#374151", lwd = 1.2,
            col.base = "#1d4ed8", lwd.base = 2.5,
            main     = "Subseries — media horizontal = promedio del mes",
            xlab     = "Mes", ylab = "Pasajeros (miles)", bty = "l")
  grid(col = "#e7e5e4")
}
# Todos los paneles suben → el nivel promedio crece → multiplicativo

# ── 3. Boxplot: ¿la dispersión es proporcional al nivel? ─
{
  boxplot(as.numeric(yt) ~ mes,
          names = mes_labels, col = "#dbeafe", border = "#1d4ed8",
          main  = "Distribución por mes (AirPassengers)",
          xlab  = "Mes", ylab = "Pasajeros (miles)")
  grid(col = "#e7e5e4")
}
# Cajas de jul/ago son mucho más grandes que ene/feb → multiplicativo

# ── Verificación numérica de la amplitud ─────────────────
amp_1 <- diff(range(tapply(as.numeric(yt)[1:72],   cycle(yt)[1:72],   mean)))
amp_2 <- diff(range(tapply(as.numeric(yt)[73:144], cycle(yt)[73:144], mean)))
cat(sprintf("Amplitud 1ª mitad: %.1f  |  2ª mitad: %.1f  |  ratio: %.2f\\n",
            amp_1, amp_2, amp_2 / amp_1))
# ratio > 1.5 → amplitud creció → confirma usar modelo log`}
        caption="Los tres gráficos para AirPassengers confirman multiplicativo: season plot con líneas separándose, subseries con pendientes positivas en todos los meses, boxplot con cajas más grandes en los meses pico."
      />

      {/* ── Ejemplo nottem ──────────────────────────────── */}
      <h2 id="ejemplo-nottem">3.3 Ejemplo A — nottem: temperatura mensual de Nottingham</h2>
      <p>
        El dataset <code>nottem</code> (base R) registra la temperatura media
        mensual en grados Fahrenheit en Nottingham Castle, de enero de 1920 a
        diciembre de 1939 (<I c="n = 240" /> observaciones, <I c="s = 12" />
        ). No hay tendencia apreciable —el nivel medio es estable a lo largo
        de 20 años— por lo que el modelo es solo estacional con intercepto:
      </p>
      <D c="Y_t = \mu + \sum_{i=1}^{11} \delta_i I_{i,t} + E_t" />

      <Callout type="info" title="¿Qué vas a ver al ejecutar el código?">
        <ol className="mt-1 list-decimal list-inside space-y-1 text-sm">
          <li>
            El <code>summary(mod_est)</code> con los 11 coeficientes{" "}
            <I c="\hat{\delta}_i" /> para los meses de febrero a diciembre
            (enero = referencia). Todos deberían ser significativos.
          </li>
          <li>
            Un gráfico de barras con los efectos estacionales: barras rojas
            (temperatura sobre enero) vs azules (bajo enero).
          </li>
          <li>
            La serie observada vs la curva ajustada: debería estar muy cerca
            dado que la estacionalidad explica &gt;97% de la variación.
          </li>
        </ol>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ nottem — modelo de estacionalidad con dummies y ggplot2"
        code={`library(forecast)
library(ggplot2)

# ── Dataset ───────────────────────────────────────────────
yt <- nottem
n  <- length(yt)             # 240
t  <- 1:n

# ── s-1 = 11 indicadoras; referencia = enero (mes 1) ──────
# Creamos un factor con etiquetas de mes y relevamos enero
meses_lab  <- c("Ene","Feb","Mar","Abr","May","Jun",
                "Jul","Ago","Sep","Oct","Nov","Dic")
mes_factor <- factor(cycle(yt), levels = 1:12, labels = meses_lab)
mes_factor <- relevel(mes_factor, ref = "Ene")  # enero = categoría de referencia
datos      <- data.frame(yt = as.numeric(yt), mes = mes_factor)
mod_est    <- lm(yt ~ mes, data = datos)
cat("R² ajustado:", round(summary(mod_est)$adj.r.squared, 4), "\\n")
cat("RMSE:", round(sqrt(mean(residuals(mod_est)^2)), 3), "°F\\n\\n")
summary(mod_est)
# Intercepto = nivel medio de ENERO
# mesFeb, mesMar, ..., mesDic = diferencia respecto a enero

# ── Efectos estacionales: δ̂ᵢ ─────────────────────────────
coefs     <- coef(mod_est)
meses     <- c("Ene","Feb","Mar","Abr","May","Jun",
               "Jul","Ago","Sep","Oct","Nov","Dic")
delta_est <- c(0, coefs[-1])   # δ₁ = 0 (enero = referencia)
df_delta  <- data.frame(
  Mes   = factor(meses, levels = meses),
  delta = delta_est
)

ggplot(df_delta, aes(x = Mes, y = delta, fill = delta > 0)) +
  geom_col(show.legend = FALSE) +
  geom_hline(yintercept = 0, colour = "black", linewidth = 0.5) +
  scale_fill_manual(values = c("TRUE" = "#ef4444", "FALSE" = "#3b82f6")) +
  labs(
    title    = "Efectos estacionales — nottem (ref = enero)",
    subtitle = "δ̂ᵢ: diferencia de temperatura respecto a enero (°F)",
    x = NULL, y = "δ̂ᵢ (°F)"
  ) +
  theme_bw(base_size = 12)

# ── Ajuste vs observado ───────────────────────────────────
df_fit <- data.frame(
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
  labs(title    = "Temperatura Nottingham — ajuste solo estacional",
       subtitle = paste0("R² adj = ",
         round(summary(mod_est)$adj.r.squared, 4)),
       x = "Año", y = "Temperatura (°F)", colour = NULL) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Con 11 indicadoras el modelo captura >97% de la variación de nottem. El intercepto es la temperatura media de enero (~39°F). Julio y agosto tendrán los δ̂ más positivos (~+14°F respecto a enero); diciembre y noviembre los más negativos (~−11°F). La línea ajustada debería seguir casi perfectamente la serie observada."
      />

      <Callout type="example" title="Cómo leer el summary() en un modelo estacional">
        <p>
          El intercepto (<code>Intercept</code>) es el nivel medio de{" "}
          <strong>enero</strong> (la categoría de referencia). Cada
          coeficiente <code>mesFeb</code>, <code>mesMar</code>, …,{" "}
          <code>mesDic</code> es la diferencia media de temperatura de ese
          mes respecto a enero. Todos deberían aparecer con p-valor ≈ 0
          (tres asteriscos) porque el patrón estacional de nottem es muy claro.
        </p>
        <p className="mt-2">
          Si un coeficiente no es significativo (p-valor grande), significa que
          ese mes no difiere estadísticamente del mes de referencia —podría
          colapsarse con él para reducir el número de parámetros.
        </p>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast"]}
        title="▶ interpdeltas() — efectos estacionales con IC 95%"
        code={`library(forecast)

yt <- nottem

# ── Modelo con enero como referencia ─────────────────────
meses_lab  <- c("Ene","Feb","Mar","Abr","May","Jun",
                "Jul","Ago","Sep","Oct","Nov","Dic")
mes_factor <- factor(cycle(yt), levels = 1:12, labels = meses_lab)
mes_factor <- relevel(mes_factor, ref = "Ene")
mod_est    <- lm(as.numeric(yt) ~ mes_factor)

# ── Función interpdeltas ──────────────────────────────────
# ref_idx: posición del mes de referencia en nombres_est (1 = enero)
interpdeltas <- function(modelo, s, nombres_est = NULL, ref_idx = 1) {
  co     <- summary(modelo)$coefficients
  idx    <- (nrow(co) - s + 2):nrow(co)
  deltas <- co[idx, 1]
  se_d   <- co[idx, 2]
  df_out <- data.frame(
    Estacion  = if (!is.null(nombres_est)) nombres_est[-ref_idx]
                else paste0("S", seq_len(s - 1)),
    delta_hat = round(deltas, 3),
    exp_delta = round(exp(deltas), 4),
    IC_inf    = round(deltas - 1.96 * se_d, 3),
    IC_sup    = round(deltas + 1.96 * se_d, 3),
    signif    = ifelse(abs(deltas) > 1.96 * se_d, "***", "ns")
  )
  cat(sprintf("Efectos estacionales con IC 95%%  (ref = %s):\\n",
              if (!is.null(nombres_est)) nombres_est[ref_idx] else "S1"))
  print(df_out)
  cat("\\nNota: exp_delta = factor multiplicativo",
      "(útil cuando el modelo es log(Y))\\n")
  invisible(df_out)
}

# ref_idx = 1 → enero es la referencia; la tabla muestra Feb–Dic
interpdeltas(mod_est, s = 12, nombres_est = meses_lab, ref_idx = 1)`}
        caption="exp_delta: si el modelo estuviera en escala log, este sería el factor por el que se multiplica el nivel en la estación i respecto a la de referencia. En el modelo aditivo (nottem), delta_hat es directamente el efecto en °F."
      />

      {/* ── 3.3 Funciones trigonométricas ───────────────── */}
      <h2 id="trigonometricas">3.3 Estacionalidad con funciones trigonométricas (armónicos)</h2>
      <p>
        Las variables dummy tienen una limitación: modelan cada estación de
        forma <em>independiente</em>, sin asumir suavidad entre períodos
        adyacentes. Enero puede ser muy diferente de febrero sin que el modelo
        "sepa" que son meses consecutivos. Cuando el patrón estacional es suave
        —como una ola que sube en verano y baja en invierno— las{" "}
        <strong>funciones trigonométricas</strong> (series de Fourier) ofrecen
        una representación más parsimoniosa:
      </p>
      <D c="S_t = \sum_{j=1}^{k} \left[\alpha_j \sin(2\pi F_j t) + \gamma_j \cos(2\pi F_j t)\right]" />
      <p>
        donde <I c="F_j = j/s" /> son las frecuencias armónicas y{" "}
        <I c="k \leq \lfloor s/2 \rfloor" /> es el número de armónicos a
        incluir. Cada armónico captura un ciclo a una frecuencia específica.
        Con <I c="k = 1" /> se tiene la onda fundamental (período = s);{" "}
        con <I c="k = 2" /> se añade el primer armónico (período = s/2), y
        así sucesivamente.
      </p>

      <Callout type="formula" title="¿Cuántos armónicos usar? — Selección por periodograma">
        <p>
          El <strong>periodograma</strong> descompone la potencia de la serie
          en cada frecuencia. Los armónicos con picos altos en el periodograma
          son los que más contribuyen al patrón estacional.
        </p>
        <p className="mt-2">
          Procedimiento práctico:
        </p>
        <ol className="mt-1 list-decimal list-inside space-y-1 text-sm">
          <li>Diferencia la serie para remover la tendencia.</li>
          <li>Calcula el periodograma con <code>spec.pgram()</code>.</li>
          <li>Identifica los picos más altos: esas son las frecuencias a incluir.</li>
          <li>Empieza con los <I c="k" /> armónicos principales y usa AIC/BIC para
          confirmar si más armónicos mejoran el ajuste.</li>
        </ol>
      </Callout>

      <h3 id="periodograma">El periodograma</h3>
      <p>
        El periodograma estima la densidad espectral de potencia en cada
        frecuencia discreta <I c="\omega_j = j/n" />. Para la serie{" "}
        <I c="Y_1, \ldots, Y_n" />, el valor en la frecuencia <I c="\omega_j" /> es:
      </p>
      <D c="I(\omega_j) = \frac{1}{n}\left[\left(\sum_{t=1}^n Y_t \cos 2\pi\omega_j t\right)^{\!2} + \left(\sum_{t=1}^n Y_t \sin 2\pi\omega_j t\right)^{\!2}\right]" />
      <p>
        Un pico en <I c="\omega_j = F_j" /> indica que la serie contiene un
        ciclo de período <I c="1/F_j" /> observaciones. En una serie mensual
        con ciclo anual, el pico dominante aparece en{" "}
        <I c="\omega = 1/12 \approx 0.083" />. Frecuencias{" "}
        <I c="2/12, 3/12, \ldots" /> son los <em>armónicos superiores</em> del
        ciclo anual.
      </p>

      <CodeBlock
        executable={true}
        packages={["forecast"]}
        title="▶ Periodograma — identificar frecuencias dominantes (nottem)"
        code={`# ── Diferenciar para remover tendencia antes del periodograma
# (si no se hace, el pico en frecuencia 0 domina todo)
dyt <- diff(nottem, differences = 1)

# ── Calcular el periodograma ──────────────────────────────
espectro <- spec.pgram(dyt, taper = 0, log = "no",
                       main = "Periodograma de diff(nottem)")

# ── Frecuencias más importantes ───────────────────────────
idx_top  <- order(espectro$spec, decreasing = TRUE)[1:6]
freq_dom <- espectro$freq[idx_top]
pow_dom  <- espectro$spec[idx_top]
periodo  <- round(1 / freq_dom, 2)

df_pico <- data.frame(
  Frecuencia = round(freq_dom, 4),
  Periodo    = periodo,
  Potencia   = round(pow_dom, 1)
)
cat("Top 6 frecuencias dominantes:\\n")
print(df_pico)
cat("\\nInterpretación: pico en F≈0.083 = ciclo de 12 meses (anual)\\n")
cat("Pico en F≈0.167 = ciclo de 6 meses (semi-anual, 2do armónico)\\n")`}
        caption="El pico más alto debería estar en F ≈ 0.083 (período de 12 meses = ciclo anual). El segundo pico estará en F ≈ 0.167 (período de 6 meses = segundo armónico). Esas son las frecuencias que incluirás en Mytrigon()."
      />

      {/* ── Ejemplo USAccDeaths ─────────────────────────── */}
      <h2 id="ejemplo-usacc">3.4 Ejemplo B — USAccDeaths: dummies vs armónicos de Fourier</h2>
      <p>
        El dataset <code>USAccDeaths</code> (base R) contiene el número mensual
        de muertes accidentales en EE.UU. de 1973 a 1978 (<I c="n = 72" />,{" "}
        <I c="s = 12" />). La serie tiene un pico claro en verano (julio) y un
        mínimo en invierno. Compararemos dos enfoques para modelar ese patrón:
        dummies (11 parámetros) y armónicos de Fourier (con solo 3 armónicos =
        6 parámetros).
      </p>

      <Callout type="info" title="¿Qué vas a ver al ejecutar el código?">
        <ul className="mt-1 space-y-1 text-sm">
          <li>
            Los AIC de los dos modelos: trigonométrico (k=3) y dummies (s-1=11).
            Si son similares, el modelo trigonométrico es mejor por parsimonia.
          </li>
          <li>
            Un gráfico con tres curvas: observado, ajuste trigonométrico y ajuste
            con dummies. Deberían ser casi indistinguibles para el patrón suave
            de USAccDeaths.
          </li>
        </ul>
      </Callout>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ USAccDeaths — dummies vs armónicos de Fourier (parsimonia)"
        code={`# ── Función auxiliar Mytrigon (autocontenida) ─────────────
# Genera columnas sen1, cos1, sen2, cos2, ... para lm()
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

library(forecast)
library(ggplot2)

yt3 <- USAccDeaths
n3  <- length(yt3)            # 72
t3  <- 1:n3

# ── Modelo trigonométrico: probar k = 1, 2, 3, 4 armónicos ─
cat("── Selección del número de armónicos por AIC ──\\n")
for (k in 1:4) {
  trig_k <- Mytrigon(t3, Frecuencias = (1:k) / 12)
  mod_k  <- lm(as.numeric(yt3) ~ ., data = trig_k)
  cat(sprintf("k=%d  AIC=%.2f  R²adj=%.4f  paráms=%d\\n",
              k, AIC(mod_k), summary(mod_k)$adj.r.squared, 2*k+1))
}

# ── Modelo seleccionado: k=3 armónicos ─────────────────────
trig3    <- Mytrigon(t3, Frecuencias = (1:3) / 12)
mod_trig <- lm(as.numeric(yt3) ~ ., data = trig3)

# ── Modelo con dummies (referencia) ───────────────────────
dum3    <- seasonaldummy(yt3)
mod_dum <- lm(as.numeric(yt3) ~ ., data = data.frame(dum3))

cat("\\n── Comparación final ──\\n")
cat(sprintf("AIC dummies (11 paráms): %.2f\\n", AIC(mod_dum)))
cat(sprintf("AIC trig k=3 (6 paráms): %.2f  ← más parsimonioso\\n", AIC(mod_trig)))

# ── Gráfico comparativo ───────────────────────────────────
df3 <- data.frame(
  Año     = as.numeric(time(yt3)),
  Obs     = as.numeric(yt3),
  Trig3   = fitted(mod_trig),
  Dummies = fitted(mod_dum)
)

ggplot(df3, aes(x = Año)) +
  geom_line(aes(y = Obs,     colour = "Observado"),
            linewidth = 0.8, alpha = 0.8) +
  geom_line(aes(y = Trig3,   colour = "Fourier k=3 (6 paráms)"),
            linewidth = 1.3) +
  geom_line(aes(y = Dummies, colour = "Dummies (11 paráms)"),
            linewidth = 1.1, linetype = "dashed") +
  scale_colour_manual(
    values = c("Observado"              = "#78716c",
               "Fourier k=3 (6 paráms)" = "#1d4ed8",
               "Dummies (11 paráms)"    = "#dc2626")
  ) +
  labs(
    title    = "USAccDeaths — Dummies vs Trigonométricas",
    subtitle = "Ajuste similar con casi la mitad de parámetros → ventaja de Fourier",
    x = "Año", y = "Muertes accidentales", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Si el AIC del modelo trigonométrico (k=3) es similar o menor al de dummies, el enfoque de Fourier es mejor: mismo ajuste con menos parámetros. Eso es parsimonia en acción."
      />

      <Callout type="example" title="Cómo interpretar la tabla de armónicos">
        <p>
          Al probar k = 1, 2, 3, 4 armónicos, busca el punto donde el AIC deja
          de bajar significativamente. Para USAccDeaths, es típico que:
        </p>
        <ul className="mt-1 space-y-1 text-sm">
          <li>k=1: captura la onda principal (verano alto, invierno bajo)</li>
          <li>k=2: añade detalle al inicio y fin del año</li>
          <li>k=3: ajuste muy cercano al de dummies con 6 parámetros vs 11</li>
          <li>k=4: el AIC casi no cambia → k=3 es suficiente</li>
        </ul>
      </Callout>

      {/* ── 3.5 Comparación ─────────────────────────────── */}
      <h2 id="comparacion">3.5 Comparación: dummies vs trigonométricas</h2>
      <p>
        Ambas aproximaciones son equivalentes cuando{" "}
        <I c="k = \lfloor s/2 \rfloor" /> (el máximo de armónicos), pero las
        trigonométricas con pocos armónicos ofrecen mayor parsimonia. La
        elección depende de la naturaleza del patrón estacional:
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
            <td>✓ Efecto de cada estación en sus unidades</td>
            <td>✗ No directa (amplitud y fase)</td>
          </tr>
          <tr>
            <td>Patrón suave</td>
            <td>✗ Discontinuo por estación</td>
            <td>✓ Continuo y diferenciable</td>
          </tr>
          <tr>
            <td>Cuándo elegir</td>
            <td>Patrón irregular, efecto estacional sin suavidad</td>
            <td>Patrón en forma de ola, variaciones suaves</td>
          </tr>
        </tbody>
      </table>

      <Callout type="warning" title="Error frecuente: usar dummies con series de alta frecuencia">
        <p>
          Para datos semanales (<I c="s = 52" />) o diarios (<I c="s = 365" />),
          el enfoque de dummies requiere 51 o 364 parámetros solo para la
          estacionalidad —computacionalmente costoso y estadísticamente
          ineficiente. En esos casos, las funciones trigonométricas con pocos
          armónicos son prácticamente la única opción razonable.
        </p>
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
          Figura 3.1 — Periodograma con picos en F = 1/12 (ciclo anual, primer armónico), F = 2/12 (semi-anual, segundo armónico) y F = 3/12 (cuatrimestral, tercer armónico). Incluir los tres primeros armónicos en Mytrigon() captura la mayor parte de la potencia estacional.
        </p>
      </div>

      <Callout type="info" title="Conexión con el Módulo 4">
        <p>
          Hasta aquí has modelado tendencia sola (Módulo 2) y estacionalidad
          sola (este módulo). En el <strong>Módulo 4</strong> los combinarás en
          un único modelo que incluye ambas componentes simultáneamente:{" "}
          <I c="Y_t = T_t + S_t + E_t" /> (o la versión multiplicativa en
          escala log). También aprenderás a comparar múltiples especificaciones
          con AIC/BIC y a aplicar la corrección de sesgo para pronósticos en
          escala original.
        </p>
      </Callout>
    </div>
  );
}
