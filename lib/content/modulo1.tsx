import { Math as MathComponent } from "@/components/Math";
const M = ({ math }: { math: string }) => <MathComponent math={math} />;
const D = ({ math }: { math: string }) => <MathComponent math={math} display />;
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

export function Modulo1Content() {
  return (
    <div className="prose-content">

      {/* ── 1.1 Definición ─────────────────────────────────── */}
      <h2 id="definicion">1.1 Definición de serie de tiempo</h2>
      <p>
        Una <strong>serie de tiempo</strong> es una secuencia de observaciones
        registradas en momentos equidistantes. La denotamos como{" "}
        <M math="Y_t" /> = valor de la variable en el instante <M math="t" />,
        con <M math="t = 1, 2, \ldots, n" />.
      </p>
      <Callout type="example" title="Ejemplos típicos">
        <ul className="mt-1 space-y-1">
          <li>Producción trimestral de cemento Portland (toneladas)</li>
          <li>Temperatura mensual en una ciudad (°C)</li>
          <li>Ventas semanales de un producto (millones de pesos)</li>
          <li>Consumo eléctrico horario (kWh)</li>
          <li>PIB trimestral del sector agrícola (Colombia)</li>
        </ul>
      </Callout>

      <p>
        La característica esencial que distingue una serie de tiempo de otros
        conjuntos de datos es que las observaciones están{" "}
        <strong>ordenadas en el tiempo</strong> y, por tanto, no son
        independientes entre sí: el valor de ayer contiene información sobre el
        de hoy.
      </p>

      {/* ── 1.2 Componentes ─────────────────────────────────── */}
      <h2 id="componentes">1.2 Componentes clásicas</h2>
      <p>
        Toda serie de tiempo puede descomponerse conceptualmente en cuatro
        componentes:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
        {[
          {
            sym: "T_t",
            name: "Tendencia",
            desc: "Movimiento suave y sostenido de largo plazo. Captura si la serie crece, decrece o permanece estable en el tiempo.",
            color: "border-blue-300 bg-blue-50",
            tc: "text-blue-800",
          },
          {
            sym: "S_t",
            name: "Estacionalidad",
            desc: "Patrón periódico que se repite dentro del año calendario. El periodo s = 12 para datos mensuales, s = 4 para trimestrales.",
            color: "border-emerald-300 bg-emerald-50",
            tc: "text-emerald-800",
          },
          {
            sym: "C_t",
            name: "Ciclo",
            desc: "Fluctuaciones de largo plazo no periódicas, asociadas a ciclos económicos. Inicialmente se incorpora al error.",
            color: "border-violet-300 bg-violet-50",
            tc: "text-violet-800",
          },
          {
            sym: "E_t",
            name: "Error / Irregular",
            desc: "Componente aleatoria residual, idealmente ruido blanco: Et ~ iid N(0, σ²). Todo lo que no explican las otras componentes.",
            color: "border-rose-300 bg-rose-50",
            tc: "text-rose-800",
          },
        ].map(({ sym, name, desc, color, tc }) => (
          <div key={name} className={`p-4 rounded-lg border ${color}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-lg">
                <M math={sym} />
              </span>
              <span className={`font-semibold text-sm ${tc}`}>{name}</span>
            </div>
            <p className="text-sm text-stone-600 leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      <Callout type="info" title="Convención del curso">
        <p>
          En este curso nos concentramos en <strong>tendencia</strong> y{" "}
          <strong>estacionalidad</strong>. El ciclo se incorpora al término de
          error <M math="E_t" />. La presencia de correlación serial en los
          residuos —visible en el correlograma— indica que el ciclo no fue
          modelado.
        </p>
      </Callout>

      {/* ── 1.3 Modelos de descomposición ──────────────────── */}
      <h2 id="descomposicion">1.3 Modelos de descomposición</h2>
      <p>
        La manera en que se combinan las componentes define el tipo de modelo.
        La elección entre aditivo y multiplicativo depende del comportamiento
        de la variabilidad alrededor de la tendencia.
      </p>

      <h3 id="aditivo">Modelo aditivo</h3>
      <p>
        Apropiado cuando la <strong>variabilidad es constante</strong> (las
        oscilaciones estacionales no aumentan al crecer la tendencia):
      </p>
      <D math="Y_t = T_t + S_t + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />

      <h3 id="multiplicativo">Modelo completamente multiplicativo</h3>
      <p>
        Cuando la <strong>amplitud de la estacionalidad crece</strong>{" "}
        proporcionalmente con el nivel de la serie:
      </p>
      <D math="Y_t = T_t \times S_t \times E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        Tomando logaritmo natural se obtiene un modelo aditivo equivalente:
      </p>
      <D math="\log(Y_t) = T_t^* + S_t^* + E_t" />
      <p>
        donde <M math="T_t^* = \log(T_t)" /> y <M math="S_t^* = \log(S_t)" />.
        Las predicciones en escala original se recuperan con la corrección:
      </p>
      <D math="\hat{Y}_t = \exp(\widehat{\log Y_t}) \cdot \exp\!\left(\frac{MSE}{2}\right)" />

      <h3 id="parcialmente-multiplicativo">Modelo parcialmente multiplicativo</h3>
      <p>
        Cuando la tendencia y la estacionalidad interactúan multiplicativamente
        pero el error es aditivo:
      </p>
      <D math="Y_t = T_t \times S_t + E_t" />

      <Callout type="formula" title="¿Cómo elegir el tipo de modelo?">
        <p>
          Grafique la serie original. Si las oscilaciones estacionales se
          mantienen constantes → <strong>aditivo</strong>. Si crecen con el
          nivel → <strong>multiplicativo</strong> (trabaje con{" "}
          <M math="\log(Y_t)" />
          ). La transformación logarítmica también estabiliza la varianza, lo
          que facilita el cumplimiento de supuestos del modelo de regresión.
        </p>
      </Callout>

      {/* ── 1.4 Análisis descriptivo en R ─────────────────── */}
      <h2 id="r-descriptivo">1.4 Análisis descriptivo con R</h2>
      <p>
        El primer paso siempre es graficar la serie y obtener una descomposición
        exploratoria con <code>decompose()</code>. Esta función utiliza medias
        móviles para estimar la tendencia y promedios estacionales para la
        componente estacional.
      </p>

      <CodeBlock
        title="▶ Descomposición exploratoria con decompose() — Ejecuta este ejemplo"
        executable={true}
        packages={["forecast", "ggplot2"]}
        code={`# ══════════════════════════════════════════════════════
# EJEMPLO INTERACTIVO — Módulo 1
# Serie: AirPassengers (pasajeros aéreos mensuales, 1949-1960)
# Es un clásico: tendencia creciente + estacionalidad multiplicativa
# ══════════════════════════════════════════════════════
library(forecast)
library(ggplot2)

# 1. El dataset ya está disponible en R como objeto ts
serie <- AirPassengers
cat("Periodo:", frequency(serie), "observaciones/año (mensual)\\n")
cat("Inicio:", start(serie), "  Fin:", end(serie), "\\n")
cat("Total de obs:", length(serie), "\\n\\n")

# 2. Estadísticas descriptivas básicas
cat("Mínimo:", min(serie), "   Máximo:", max(serie), "\\n")
cat("Media:", round(mean(serie), 1), "\\n")

# 3. Graficar la serie original
plot(serie,
     main = "Pasajeros aéreos internacionales (1949-1960)",
     ylab = "Miles de pasajeros",
     xlab = "Año",
     col  = "#1d4ed8",
     lwd  = 1.8)

# 4. Descomposición multiplicativa (la amplitud crece → multiplicativo)
descom <- decompose(serie, type = "multiplicative")
plot(descom)

# 5. Comparar original vs log(serie): ¿se estabiliza la varianza?
plot(log(serie),
     main = "log(AirPassengers) — varianza estabilizada",
     col  = "#7c3aed",
     lwd  = 1.8,
     ylab = "log(miles de pasajeros)")`}
        caption="💡 Modifica 'multiplicative' por 'additive' y observa la diferencia en la componente estacional. También prueba con otras series: nottem, co2, JohnsonJohnson."
      />

      <Callout type="example" title="Serie de ventas de licor en EE.UU.">
        <p>
          La serie de ventas mensuales de licor (Figura 3.11 de las notas) es
          claramente <strong>multiplicativa</strong>: las oscilaciones de
          diciembre se hacen cada vez más grandes. Aplicando{" "}
          <code>log()</code>, la varianza se estabiliza y el patrón se vuelve
          aditivo, permitiendo usar modelos de regresión lineal estándar.
        </p>
      </Callout>

      <CodeBlock
        title="▶ Gráficos avanzados con autoplot y ggseasonplot — Ejecuta este ejemplo"
        executable={true}
        packages={["forecast", "ggplot2"]}
        code={`# ══════════════════════════════════════════════════════
# VISUALIZACIÓN ESTACIONAL — AirPassengers
# autoplot() produce gráficos más elegantes que plot.ts
# ══════════════════════════════════════════════════════
library(forecast)
library(ggplot2)

serie <- AirPassengers

# 1. Serie completa con autoplot
autoplot(serie) +
  labs(
    title    = "Pasajeros aéreos internacionales",
    subtitle = "Serie AirPassengers — tendencia creciente + estacionalidad multiplicativa",
    y        = "Miles de pasajeros",
    x        = "Año"
  ) +
  theme_minimal(base_size = 12) +
  theme(plot.title = element_text(face = "bold"))

# 2. Gráfico estacional: ¿qué mes es el más alto?
ggseasonplot(serie,
             year.labels      = TRUE,
             year.labels.left = TRUE) +
  labs(title = "Patrón estacional por año",
       y     = "Miles de pasajeros") +
  theme_minimal()

# 3. Subseries: media por mes a lo largo del tiempo
ggsubseriesplot(serie) +
  labs(title = "Subseries por mes",
       y     = "Miles de pasajeros") +
  theme_minimal()`}
        caption="💡 Prueba cambiar AirPassengers por nottem (temperaturas en Nottingham) o co2 (CO₂ mensual). Observa cómo cambia el patrón estacional."
      />

      {/* ── SVG ilustrativo ──────────────────────────────── */}
      <h2 id="visualizacion">1.5 Visualización conceptual</h2>
      <p>
        El siguiente diagrama ilustra cómo las cuatro componentes se combinan
        en la serie observada bajo el modelo aditivo:
      </p>
      <div className="my-6 rounded-xl border border-stone-200 bg-white p-4 overflow-x-auto">
        <svg viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg" className="w-full">
          {/* Grid */}
          {[60, 120, 180, 240].map((y) => (
            <line key={y} x1="50" y1={y} x2="650" y2={y} stroke="#f0eee9" strokeWidth="1" />
          ))}
          {[50, 170, 290, 410, 530, 650].map((x) => (
            <line key={x} x1={x} y1="40" x2={x} y2="270" stroke="#f0eee9" strokeWidth="1" />
          ))}

          {/* Axes */}
          <line x1="50" y1="270" x2="650" y2="270" stroke="#d6d3d1" strokeWidth="1.5" />
          <line x1="50" y1="40" x2="50" y2="270" stroke="#d6d3d1" strokeWidth="1.5" />

          {/* Tendencia – smooth rising curve */}
          <path
            d="M50,220 C130,215 210,200 290,180 S450,150 650,120"
            fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6 3"
          />

          {/* Estacionalidad – sine wave around mid */}
          <path
            d="M50,170 C80,140 110,110 140,140 S200,200 230,170 S290,110 320,140 S380,200 410,170 S470,110 500,140 S560,200 590,170 S630,130 650,140"
            fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 3"
          />

          {/* Observed series – T + S + small noise */}
          <path
            d="M50,200 C70,168 100,138 130,165 S180,225 210,198 S260,148 290,170 S340,205 370,178 S420,138 450,162 S500,195 530,165 S580,138 620,148 S640,138 650,130"
            fill="none" stroke="#1c1917" strokeWidth="2.5"
          />

          {/* Labels */}
          <text x="660" y="124" fill="#3b82f6" fontSize="11" fontFamily="Inter">T_t</text>
          <text x="660" y="143" fill="#22c55e" fontSize="11" fontFamily="Inter">S_t</text>
          <text x="660" y="162" fill="#1c1917" fontSize="11" fontFamily="Inter">Y_t</text>

          {/* Legend */}
          <rect x="60" y="44" width="10" height="3" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6 3" rx="1"/>
          <text x="75" y="50" fill="#57534e" fontSize="11" fontFamily="Inter">Tendencia (T_t)</text>
          <rect x="180" y="44" width="10" height="3" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 3" rx="1"/>
          <text x="195" y="50" fill="#57534e" fontSize="11" fontFamily="Inter">Estacionalidad (S_t)</text>
          <line x1="340" y1="46" x2="350" y2="46" stroke="#1c1917" strokeWidth="2.5"/>
          <text x="355" y="50" fill="#57534e" fontSize="11" fontFamily="Inter">Serie observada Y_t = T_t + S_t + E_t</text>

          {/* Axis labels */}
          <text x="350" y="292" fill="#a8a29e" fontSize="11" textAnchor="middle" fontFamily="Inter">Tiempo (t)</text>
          <text x="18" y="160" fill="#a8a29e" fontSize="11" transform="rotate(-90, 18, 160)" fontFamily="Inter">Valor</text>
        </svg>
        <p className="text-xs text-stone-400 text-center mt-2">
          Figura 1.1 — Descomposición aditiva: la serie observada es la suma de tendencia, estacionalidad y error.
        </p>
      </div>

      <Callout type="warning" title="Limitación de decompose()">
        <p>
          <code>decompose()</code> estima la tendencia con una media móvil
          centrada, lo que genera valores faltantes (<code>NA</code>) en ambos
          extremos de la serie —los primeros y últimos{" "}
          <M math="\lfloor s/2 \rfloor" /> valores. Para extraer estimaciones
          completas use <code>stl()</code> (Módulo 5) o ajuste directamente el
          modelo de regresión (Módulos 2–4).
        </p>
      </Callout>
    </div>
  );
}
