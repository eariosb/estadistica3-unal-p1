import { Math as MathComponent } from "@/components/Math";
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

const D = ({ c }: { c: string }) => <MathComponent math={c} display />;
const I = ({ c }: { c: string }) => <MathComponent math={c} />;

export function Modulo5Content() {
  return (
    <div className="prose-content">

      {/* ── 5.1 LOESS ───────────────────────────────────── */}
      <h2 id="loess">5.1 LOESS — Regresión Localmente Estimada</h2>
      <p>
        <strong>LOESS</strong> (Locally Estimated Scatterplot Smoothing) es un
        método no paramétrico que estima la tendencia <I c="T_t" /> ajustando
        un polinomio <em>local</em> en cada punto del tiempo, usando únicamente
        las observaciones vecinas dentro de una ventana.
      </p>

      <h3 id="idea">La idea central</h3>
      <p>
        Para estimar <I c="T_{t_0}" /> en el punto <I c="t_0" />:
      </p>
      <ul>
        <li>
          Se selecciona una fracción <I c="\alpha" /> (span) de los datos más
          cercanos a <I c="t_0" />.
        </li>
        <li>
          Se calculan pesos para cada observación mediante el{" "}
          <strong>kernel tricúbico</strong>. Definiendo la distancia
          relativa <I c="u_t = (t - t_0)\,/\,d(t_0)" />, donde{" "}
          <I c="d(t_0)" /> es la distancia euclidiana al{" "}
          <I c="\lceil \alpha n \rceil" />-ésimo vecino más cercano de{" "}
          <I c="t_0" />, los pesos son:
          <D c="w(u_t) = \bigl(1 - |u_t|^3\bigr)^3 \cdot \mathbf{1}\!\left[|u_t| < 1\right]" />
          El kernel garantiza <I c="w = 1" /> en <I c="t = t_0" />,
          decaimiento suave hasta <I c="w = 0" /> en el borde de la ventana,
          y peso nulo fuera de ella.
        </li>
        <li>
          Se minimiza la suma de cuadrados ponderada — es decir, se resuelve
          un problema de{" "}
          <strong>mínimos cuadrados ponderados (WLS)</strong> localmente en{" "}
          <I c="t_0" />:
          <D c="\hat{\boldsymbol{\beta}}(t_0) = \arg\min_{\boldsymbol{\beta}} \sum_{t=1}^{n} w(u_t)\left(Y_t - \sum_{j=0}^{d} \beta_j\, t^j\right)^{\!2}" />
          con <I c="d \in \{1, 2\}" /> (parámetro <code>degree</code> en R).
        </li>
        <li>
          <I c="\hat{T}_{t_0} = \hat{\beta}_0(t_0)" /> — el valor ajustado
          del polinomio local evaluado en el punto <I c="t_0" /> mismo. El
          proceso se repite para cada <I c="t_0 \in \{1, \ldots, n\}" />.
        </li>
      </ul>

      <h3 id="span">El parámetro span (α)</h3>
      <p>
        El parámetro <I c="\alpha \in (0, 1]" /> controla el suavizamiento:
      </p>
      <div className="grid grid-cols-3 gap-3 my-4">
        {[
          { alpha: "α pequeño\n(ej. 0.2)", desc: "Curva muy flexible, sigue los datos de cerca. Riesgo de sobreajuste y capturar ruido.", color: "border-rose-200 bg-rose-50", tc: "text-rose-700" },
          { alpha: "α medio\n(ej. 0.5)", desc: "Balance entre sesgo y varianza. Punto de partida recomendado.", color: "border-emerald-200 bg-emerald-50", tc: "text-emerald-700" },
          { alpha: "α grande\n(ej. 0.9)", desc: "Curva muy suave, cercana a una recta. Puede perder estructura real.", color: "border-blue-200 bg-blue-50", tc: "text-blue-700" },
        ].map(({ alpha, desc, color, tc }) => (
          <div key={alpha} className={`p-3 rounded-lg border ${color}`}>
            <p className={`font-mono text-xs font-bold ${tc} mb-1 whitespace-pre`}>{alpha}</p>
            <p className="text-xs text-stone-600">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Ejemplo LOESS con AirPassengers ─────────────── */}
      <h2 id="ejemplo-loess">5.2 Ejemplo — LOESS sobre AirPassengers</h2>
      <p>
        Aplicamos LOESS a <code>AirPassengers</code> para estimar la tendencia
        de largo plazo, comparando distintos valores de span. Al trabajar con
        la serie completa (incluyendo estacionalidad), un span pequeño
        "sigue" también los picos estacionales — por eso se recomienda
        trabajar sobre la serie previamente suavizada o usar STL (sección 5.3).
      </p>

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ LOESS sobre AirPassengers — efecto del span"
        code={`library(ggplot2)

# ── Dataset ───────────────────────────────────────────────
yt <- AirPassengers    # disponible directamente en el entorno del curso
n  <- length(yt)
t  <- 1:n
df <- data.frame(t = t, Año = as.numeric(time(yt)),
                 yt = as.numeric(yt))

# ── Ajuste con 3 valores de span ─────────────────────────
lo20 <- loess(yt ~ t, data = df, span = 0.20, degree = 2)
lo50 <- loess(yt ~ t, data = df, span = 0.50, degree = 2)
lo80 <- loess(yt ~ t, data = df, span = 0.80, degree = 2)

df$T_lo20 <- predict(lo20)
df$T_lo50 <- predict(lo50)
df$T_lo80 <- predict(lo80)

# ── Gráfico ggplot2 ───────────────────────────────────────
ggplot(df, aes(x = Año)) +
  geom_line(aes(y = yt),    colour = "#d6d3d1",
            linewidth = 0.9, alpha = 0.9) +
  geom_line(aes(y = T_lo20, colour = "α = 0.20"),
            linewidth = 1.2) +
  geom_line(aes(y = T_lo50, colour = "α = 0.50"),
            linewidth = 1.4) +
  geom_line(aes(y = T_lo80, colour = "α = 0.80"),
            linewidth = 1.2) +
  scale_colour_manual(
    values = c("α = 0.20" = "#ef4444",
               "α = 0.50" = "#1d4ed8",
               "α = 0.80" = "#16a34a")
  ) +
  labs(
    title    = "LOESS sobre AirPassengers — efecto del span",
    subtitle = "Span pequeño: sigue picos estacionales · Span grande: suaviza tendencia pura",
    x = "Año", y = "Pasajeros (miles)", colour = "Span"
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")

# ── Selección automática del span por validación cruzada ──
# ── Selección automática del span (aproximación sin paquetes externos) ───
spans   <- seq(0.20, 0.90, by = 0.10)
rmse_sp <- sapply(spans, function(s)
  sqrt(mean(residuals(loess(yt ~ t, data = df, span = s, degree = 2))^2))
)
cat("Span   RMSE\\n")
print(data.frame(span = spans, RMSE = round(rmse_sp, 3)))
cat("Span óptimo (menor RMSE):", spans[which.min(rmse_sp)], "\\n")`}
        caption="Un span de 0.80 sobre AirPassengers revela la tendencia exponencial subyacente, ignorando el ruido estacional. El span de 0.20 sobreajusta y sigue los ciclos anuales."
      />

      {/* ── 5.3 STL ─────────────────────────────────────── */}
      <h2 id="stl">5.3 Descomposición STL</h2>
      <p>
        <strong>STL</strong> (Seasonal-Trend decomposition using LOESS),
        propuesto por Cleveland et al. (1990), descompone la serie en tres
        componentes aditivas usando LOESS de forma iterativa:
      </p>
      <D c="Y_t = T_t + S_t + R_t" />
      <p>
        donde <I c="T_t" /> es la tendencia estimada por LOESS de largo plazo,{" "}
        <I c="S_t" /> es la componente estacional (periódica con periodo{" "}
        <I c="s" />, con restricción <I c="\sum_{j=1}^s S_{t-s+j} = 0" /> en
        cada ciclo completo para garantizar identificabilidad) y{" "}
        <I c="R_t = Y_t - T_t - S_t" /> es el <strong>residuo</strong> o
        componente irregular.
      </p>

      <h3 id="algoritmo">Algoritmo de STL (versión simplificada)</h3>
      <ol className="list-decimal pl-5 space-y-2 text-sm text-stone-700">
        <li>
          <strong>Inicializar:</strong> se parte de una tendencia inicial
          (media móvil centrada de orden <I c="s" />).
        </li>
        <li>
          <strong>Loop interno (inner loop):</strong>
          <ul className="list-disc pl-4 mt-1">
            <li>Remover la tendencia: <I c="Y_t - T_t" />.</li>
            <li>
              Para cada estación <I c="i" />, agrupar las observaciones de la
              misma estación a lo largo de los años y suavizarlas con LOESS
              (ventana <code>s.window</code>).
            </li>
            <li>
              Normalizar la estacionalidad para que sume cero en cada periodo.
            </li>
            <li>
              Remover la estacionalidad: <I c="Y_t - S_t" /> y suavizar con
              LOESS de largo plazo (ventana <code>t.window</code>) para
              obtener <I c="T_t" /> actualizada.
            </li>
          </ul>
        </li>
        <li>
          <strong>Loop externo (outer loop):</strong> calcula pesos robustos
          basados en los residuos para reducir la influencia de valores atípicos.
        </li>
        <li>
          <strong>Repetir</strong> hasta convergencia.
        </li>
      </ol>

      <Callout type="formula" title="Ventanas clave de STL">
        <ul className="mt-1 space-y-1">
          <li>
            <code>s.window</code>: controla la suavidad de la estacionalidad.{" "}
            <code>"periodic"</code> fija la estacionalidad igual cada año.
            Valores numéricos impares (ej. 7, 11, 13) permiten que evolucione.
          </li>
          <li>
            <code>t.window</code>: controla la suavidad de la tendencia.
            Por defecto se elige automáticamente como{" "}
            <I c="\lceil 1.5s / (1 - 1.5/s.\text{window}) \rceil" />.
          </li>
          <li>
            <code>robust = TRUE</code>: activa el loop externo para
            resistencia a atípicos.
          </li>
        </ul>
      </Callout>

      {/* ── Ejemplo STL con co2 ─────────────────────────── */}
      <h2 id="ejemplo-stl">5.4 Ejemplo — STL sobre co2 (Mauna Loa)</h2>
      <p>
        El dataset <code>co2</code> es ideal para STL: tiene una tendencia
        monotóna creciente y un patrón estacional anual muy regular. STL
        separa ambas con precisión, dejando un residuo pequeño.
      </p>

      <CodeBlock
        executable={true}
        packages={["forecast","ggplot2"]}
        title="▶ STL sobre co2 — estacionalidad fija vs evolutiva"
        code={`library(ggplot2)

# ── Dataset ───────────────────────────────────────────────
yt2   <- co2        # mensual 1959–1997, s=12
n_co2 <- length(yt2)

# ── STL con estacionalidad periódica (fija) ───────────────
stl_fijo <- stl(yt2, s.window = "periodic", robust = TRUE)

# ── STL con estacionalidad evolutiva ─────────────────────
stl_evol <- stl(yt2, s.window = 13, t.window = 25, robust = TRUE)

# ── Extraer componentes del modelo fijo ───────────────────
comp_fijo <- as.data.frame(stl_fijo$time.series)
df_stl <- data.frame(
  Año        = as.numeric(time(yt2)),
  Obs        = as.numeric(yt2),
  Tendencia  = comp_fijo$trend,
  Estacional = comp_fijo$seasonal,
  Residuo    = comp_fijo$remainder
)

# ── Fuerza estacional y de tendencia ─────────────────────
Fs <- var(comp_fijo$seasonal) /
      (var(comp_fijo$seasonal) + var(comp_fijo$remainder))
Ft <- 1 - var(comp_fijo$remainder) /
      var(comp_fijo$trend + comp_fijo$remainder)
cat(sprintf("Fuerza estacional  Fs = %.4f\\n", Fs))
cat(sprintf("Fuerza de tendencia Ft = %.4f\\n", Ft))
# Fs, Ft > 0.64 → estacionalidad / tendencia fuertes

# ── Panel de 4 componentes — formato largo ────────────────
df_long <- data.frame(
  Año       = rep(df_stl$Año, 4),
  Valor     = c(df_stl$Obs, df_stl$Tendencia,
                df_stl$Estacional, df_stl$Residuo),
  Componente = factor(rep(c("Observado","Tendencia","Estacional","Residuo"),
                          each = n_co2),
                      levels = c("Observado","Tendencia","Estacional","Residuo"))
)

colores <- c("Observado"   = "#78716c",
             "Tendencia"   = "#1d4ed8",
             "Estacional"  = "#7c3aed",
             "Residuo"     = "#dc2626")

ggplot(df_long, aes(x = Año, y = Valor, colour = Componente)) +
  geom_line(linewidth = 0.7) +
  geom_hline(data = data.frame(Componente = factor(c("Estacional","Residuo"),
               levels = c("Observado","Tendencia","Estacional","Residuo")),
               y = 0),
             aes(yintercept = y), linetype = "dashed",
             colour = "#94a3b8", linewidth = 0.5) +
  scale_colour_manual(values = colores, guide = "none") +
  facet_wrap(~ Componente, ncol = 1, scales = "free_y") +
  labs(title    = "Descomposición STL — CO₂ Mauna Loa (1959–1997)",
       subtitle = paste0("Fs = ", round(Fs, 3),
                         "  |  Ft = ", round(Ft, 3)),
       x = "Año", y = NULL) +
  theme_bw(base_size = 10) +
  theme(strip.background = element_rect(fill = "#f1f5f9"),
        strip.text = element_text(face = "bold", size = 9))`}
        caption="El residuo de STL para co2 es muy pequeño (~0.5 ppm), confirmando que tendencia + estacionalidad explican casi toda la variación. Ft y Fs cercanos a 1 indican ambas componentes fuertes."
      />

      <CodeBlock
        executable={true}
        packages={["ggplot2"]}
        title="▶ STL sobre AirPassengers — estacionalidad fija vs evolutiva"
        code={`# ── AirPassengers con STL ─────────────────────────────────
stl_ap_fijo <- stl(AirPassengers, s.window = "periodic", robust = TRUE)
stl_ap_evol <- stl(AirPassengers, s.window = 7, robust = TRUE)

# ── Componentes estacionales de ambos modelos ─────────────
est_fijo <- stl_ap_fijo$time.series[, "seasonal"]
est_evol <- stl_ap_evol$time.series[, "seasonal"]

df_est <- data.frame(
  Año        = as.numeric(time(AirPassengers)),
  Fija       = as.numeric(est_fijo),
  Evolutiva  = as.numeric(est_evol)
)

ggplot(df_est, aes(x = Año)) +
  geom_line(aes(y = Fija,      colour = "Fija (s.window='periodic')"),
            linewidth = 1.1) +
  geom_line(aes(y = Evolutiva, colour = "Evolutiva (s.window=7)"),
            linewidth = 1.1, linetype = "dashed") +
  scale_colour_manual(
    values = c("Fija (s.window='periodic')" = "#1d4ed8",
               "Evolutiva (s.window=7)"      = "#dc2626")
  ) +
  labs(
    title    = "AirPassengers — Componente estacional STL",
    subtitle = "Con s.window='periodic' la amplitud es fija. Con s.window=7 puede crecer.",
    x = "Año", y = "Componente estacional", colour = NULL
  ) +
  theme_bw(base_size = 12) +
  theme(legend.position = "top")`}
        caption="Para AirPassengers, la estacionalidad evolutiva (rojo) captura el crecimiento gradual de la amplitud estacional, algo que el modelo fijo no puede hacer."
      />

      <CodeBlock
        executable={true}
        packages={["forecast"]}
        title="▶ Pronóstico post-STL con stlf() — AirPassengers"
        code={`library(forecast)

# ── Pronóstico con stlf() ─────────────────────────────────
# Descompone con STL y aplica ETS o ARIMA al componente resto
pronostico_stl <- stlf(AirPassengers,
                        h            = 24,
                        s.window     = "periodic",
                        method       = "ets",
                        level        = 95)

# ── Gráfico autoplot ──────────────────────────────────────
autoplot(pronostico_stl) +
  labs(
    title    = "Pronóstico STL + ETS — AirPassengers",
    subtitle = "24 meses (1961–1962) · IC 80% y 95%",
    x = "Año", y = "Pasajeros (miles)"
  ) +
  theme_bw(base_size = 12)

# ── RMSE y MAPE del pronóstico (periodo histórico) ──────
ythat_tr <- as.numeric(pronostico_stl$fitted)
y_tr     <- as.numeric(AirPassengers)
ok       <- !is.na(ythat_tr)
RMSE_tr  <- sqrt(mean((y_tr[ok] - ythat_tr[ok])^2))
MAPE_tr  <- mean(abs((y_tr[ok] - ythat_tr[ok]) / y_tr[ok])) * 100
cat(sprintf("RMSE = %.2f  |  MAPE = %.2f%%\\n", RMSE_tr, MAPE_tr)))`}
        caption="stlf() es conveniente porque combina STL + un modelo automático para el residuo. El resultado incluye bandas de incertidumbre que se amplían con el horizonte."
      />

      {/* ── 5.5 Comparación ─────────────────────────────── */}
      <h2 id="comparacion">5.5 Comparación: modelos globales vs ajustes locales</h2>

      <table>
        <thead>
          <tr>
            <th>Criterio</th>
            <th>Modelos globales (Mód. 2–4)</th>
            <th>LOESS / STL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Interpretabilidad</td>
            <td>Alta — coeficientes con significado</td>
            <td>Baja — sin ecuación cerrada</td>
          </tr>
          <tr>
            <td>Flexibilidad</td>
            <td>Limitada por el grado elegido</td>
            <td>Alta — se adapta a cambios locales</td>
          </tr>
          <tr>
            <td>Estacionalidad cambiante</td>
            <td>No captura cambios</td>
            <td>Sí (con s.window numérico)</td>
          </tr>
          <tr>
            <td>Pronóstico</td>
            <td>Directo (ecuación)</td>
            <td>Requiere método adicional (ETS/ARIMA)</td>
          </tr>
          <tr>
            <td>Sensibilidad a atípicos</td>
            <td>Moderada</td>
            <td>Robusta (con outer loop)</td>
          </tr>
          <tr>
            <td>Uso recomendado</td>
            <td>Estacionalidad estable, interpretación</td>
            <td>Análisis exploratorio, estacionalidad cambiante</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info" title="Uso combinado — práctica recomendada">
        <p>
          Una estrategia efectiva es <strong>ajustar primero un modelo global</strong>{" "}
          (tendencia + estacionalidad con indicadoras) y luego{" "}
          <strong>aplicar LOESS a los residuos</strong> para capturar ciclos
          no modelados. También se puede usar STL como paso exploratorio
          previo para identificar qué componentes son relevantes antes de
          especificar el modelo paramétrico.
        </p>
      </Callout>

      {/* ── SVG LOESS ───────────────────────────────────── */}
      <div className="my-6 rounded-xl border border-stone-200 bg-white p-4 overflow-x-auto">
        <svg viewBox="0 0 680 230" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <text x="340" y="20" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="600" fontFamily="Inter">
            LOESS: efecto del parámetro span
          </text>
          <line x1="50" y1="190" x2="640" y2="190" stroke="#94a3b8" strokeWidth="1.5"/>
          <line x1="50" y1="30"  x2="50"  y2="190" stroke="#94a3b8" strokeWidth="1.5"/>
          <text x="345" y="208" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="Inter">t</text>
          {[55,105,155,205,255,305,355,405,455,505,555,605].map((x, i) => {
            const noises = [-8,12,-5,18,-10,8,-12,15,-6,10,-14,9];
            const trend = 160 - i * 8;
            const season = [0,20,-15,25,-20,15,-10,22,-18,12,-16,8][i];
            const y = trend + season + noises[i];
            return <circle key={i} cx={x} cy={y} r="3" fill="#a8a29e" opacity="0.7"/>;
          })}
          <path
            d="M55,152 C80,130 105,145 155,138 S210,158 255,135 S310,148 355,130 S410,140 455,122 S510,132 555,115 S605,108 635,105"
            fill="none" stroke="#ef4444" strokeWidth="2.5"
          />
          <path
            d="M55,148 C120,142 180,138 240,133 S310,128 370,122 S440,116 500,110 S575,105 635,100"
            fill="none" stroke="#1d4ed8" strokeWidth="2.5"
          />
          <path
            d="M55,145 L635,98"
            fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 3"
          />
          <circle cx="90" cy="222" r="3" fill="#a8a29e"/>
          <text x="98" y="226" fill="#57534e" fontSize="10" fontFamily="Inter">Datos</text>
          <line x1="135" y1="222" x2="155" y2="222" stroke="#ef4444" strokeWidth="2.5"/>
          <text x="160" y="226" fill="#57534e" fontSize="10" fontFamily="Inter">LOESS α=0.2</text>
          <line x1="255" y1="222" x2="275" y2="222" stroke="#1d4ed8" strokeWidth="2.5"/>
          <text x="280" y="226" fill="#57534e" fontSize="10" fontFamily="Inter">LOESS α=0.8</text>
          <line x1="375" y1="222" x2="395" y2="222" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 3"/>
          <text x="400" y="226" fill="#57534e" fontSize="10" fontFamily="Inter">Tendencia real</text>
        </svg>
        <p className="text-xs text-stone-400 text-center mt-2">
          Figura 5.1 — Un span pequeño sobreajusta (rojo), un span mayor suaviza apropiadamente (azul).
        </p>
      </div>
    </div>
  );
}

      </div>
    </div>
  );
}
