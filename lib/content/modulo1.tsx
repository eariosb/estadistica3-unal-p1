import { Math as MathComponent } from "@/components/Math";
const M = ({ math }: { math: string }) => <MathComponent math={math} />;
const D = ({ math }: { math: string }) => <MathComponent math={math} display />;
import { CodeBlock } from "@/components/CodeBlock";
import { Callout } from "@/components/Callout";

export function Modulo1Content() {
  return (
    <div className="prose-content">

      {/* ── Motivación ──────────────────────────────────────── */}
      <Callout type="info" title="¿Por qué estudiar series de tiempo?">
        <p>
          Imagina que eres el analista de datos de una aerolínea y tu jefe te
          pregunta cuántos pasajeros esperar el próximo diciembre. Tienes
          registros mensuales de los últimos diez años. ¿Cómo respondes?
        </p>
        <p className="mt-2">
          Los métodos estadísticos clásicos —regresión ordinaria, pruebas t,
          ANOVA— asumen que las observaciones son <em>independientes</em>.
          Pero en una serie de tiempo, el valor de diciembre pasado
          <strong> sí contiene información</strong> sobre el de diciembre
          próximo. Ignorar eso equivale a tirar información valiosa a la basura.
        </p>
        <p className="mt-2">
          Las series de tiempo tienen su propio lenguaje: tendencia,
          estacionalidad, correlación serial, raíces unitarias.{" "}
          <strong>Este módulo te enseña ese lenguaje desde cero.</strong> En los
          módulos siguientes lo usarás para construir modelos que predicen,
          descomponen y comunican el comportamiento de datos reales.
        </p>
      </Callout>

      {/* ── 1.1 Definición ─────────────────────────────────── */}
      <h2 id="definicion">1.1 Definición de serie de tiempo</h2>
      <p>
        Una <strong>serie de tiempo</strong> es una secuencia de observaciones
        registradas en momentos <em>equidistantes</em>. La notamos como{" "}
        <M math="Y_t" />, donde <M math="t = 1, 2, \ldots, n" /> indexa el
        tiempo. La clave no es solo que los datos estén ordenados: es que{" "}
        <strong>la dependencia entre observaciones cercanas encierra
        información</strong> que un modelo bien construido puede aprovechar.
      </p>

      <Callout type="example" title="Ejemplos que encontrarás en el curso">
        <ul className="mt-1 space-y-1 text-sm">
          <li>
            <strong>AirPassengers</strong> — pasajeros aéreos mensuales
            (1949–1960). Tendencia creciente + estacionalidad multiplicativa.
          </li>
          <li>
            <strong>co2</strong> — concentración de CO₂ atmosférico (Mauna
            Loa). Tendencia lineal + ciclo anual casi perfecto.
          </li>
          <li>
            <strong>nottem</strong> — temperaturas medias mensuales en
            Nottingham. Estacionalidad pura, sin tendencia.
          </li>
          <li>
            <strong>JohnsonJohnson</strong> — ventas trimestrales de J&J.
            Crecimiento exponencial + estacionalidad multiplicativa.
          </li>
          <li>
            <strong>Ventas de licor (EE.UU.)</strong> — series mensuales usadas
            en los apuntes de la profesora Nelfi González (cap. 3): oscilaciones
            de diciembre que crecen con el nivel → modelo multiplicativo.
          </li>
        </ul>
      </Callout>

      <p>
        La característica esencial que distingue una serie de tiempo de un
        conjunto de datos transversal es que las observaciones{" "}
        <strong>no son independientes</strong>: el valor de ayer contiene
        información sobre el de hoy, y el de hoy sobre el de mañana. Esta
        dependencia se mide con la <em>función de autocorrelación</em> (ACF),
        herramienta que explorarás en los módulos siguientes.
      </p>

      {/* ── 1.2 Componentes ─────────────────────────────────── */}
      <h2 id="componentes">1.2 Componentes clásicas</h2>
      <p>
        Antes de ajustar cualquier modelo conviene <em>descomponer</em> la serie
        en capas interpretables. La idea central es que lo que observas,{" "}
        <M math="Y_t" />, es la superposición de fenómenos con naturaleza
        distinta. Identificarlos por separado permite modelarlos con las
        herramientas adecuadas.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
        {[
          {
            sym: "T_t",
            name: "Tendencia",
            desc: "Movimiento suave y sostenido de largo plazo. Captura si la serie crece, decrece o permanece estable en el tiempo. Se modela con polinomios, logaritmos o suavizamiento.",
            color: "border-blue-300 bg-blue-50",
            tc: "text-blue-800",
          },
          {
            sym: "S_t",
            name: "Estacionalidad",
            desc: "Patrón periódico que se repite dentro del año. El periodo s = 12 para datos mensuales, s = 4 para trimestrales, s = 52 para semanales. Se modela con variables dummy o series de Fourier.",
            color: "border-emerald-300 bg-emerald-50",
            tc: "text-emerald-800",
          },
          {
            sym: "C_t",
            name: "Ciclo",
            desc: "Fluctuaciones de largo plazo no periódicas, asociadas a ciclos económicos. Su duración es variable (2–10 años). En este curso se incorpora al término de error.",
            color: "border-violet-300 bg-violet-50",
            tc: "text-violet-800",
          },
          {
            sym: "E_t",
            name: "Error / Irregular",
            desc: "Componente aleatoria residual. En un buen modelo debe comportarse como ruido blanco: Et ~ iid N(0, σ²). Si no lo es, hay estructura que el modelo aún no capturó.",
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
          Nos concentramos en <strong>tendencia</strong> y{" "}
          <strong>estacionalidad</strong>. El ciclo se absorbe en{" "}
          <M math="E_t" />. Si los residuos muestran correlación serial
          —visible en el correlograma— es señal de que hay estructura cíclica
          que el modelo aún no capturó. Eso lo resolveremos con modelos
          ARIMA/SARIMA en módulos avanzados.
        </p>
      </Callout>

      {/* ── 1.3 Modelos de descomposición ──────────────────── */}
      <h2 id="descomposicion">1.3 Modelos de descomposición</h2>
      <p>
        La manera en que se combinan las componentes define el tipo de modelo.
        Elegir correctamente entre aditivo y multiplicativo no es un detalle
        menor: <strong>afecta la interpretación de cada parámetro y la forma
        en que se recuperan las predicciones</strong>. El primer paso para
        decidir es siempre <em>graficar la serie</em> y mirar si las
        oscilaciones estacionales crecen proporcionalmente con el nivel.
      </p>

      <h3 id="aditivo">Modelo aditivo</h3>
      <p>
        Apropiado cuando la <strong>variabilidad estacional es constante</strong>{" "}
        —las oscilaciones no se amplían aunque la tendencia suba:
      </p>
      <D math="Y_t = T_t + S_t + E_t, \quad E_t \overset{\text{iid}}{\sim} N(0, \sigma^2)" />
      <p>
        Aquí <M math="T_t" />, <M math="S_t" /> y <M math="E_t" /> están en
        las mismas unidades que <M math="Y_t" />. Si la serie mide toneladas,
        la tendencia y la estacionalidad también se interpretan en toneladas.
      </p>

      <h3 id="multiplicativo">Modelo completamente multiplicativo</h3>
      <p>
        Cuando la <strong>amplitud estacional crece</strong> proporcionalmente
        con el nivel de la serie (caso típico: ventas, producción industrial,
        pasajeros aéreos):
      </p>
      <D math="Y_t = T_t \times S_t \times E_t" />
      <p>
        Tomando logaritmo natural se obtiene un modelo aditivo equivalente en
        escala log, lo que permite usar todos los métodos de regresión lineal:
      </p>
      <D math="\log(Y_t) = T_t^* + S_t^* + E_t^*, \quad \text{donde } T_t^* = \log(T_t),\; S_t^* = \log(S_t)" />

      <Callout type="formula" title="⚠️ Corrección por sesgo al volver a escala original">
        <p>
          Al tomar <M math="\log(Y_t)" /> y ajustar el modelo, las predicciones
          quedan en escala logarítmica. Para volver a la escala original{" "}
          <strong>no basta con</strong> aplicar <M math="\exp(\hat{y}^*)" />.
          El operador de esperanza es no lineal:{" "}
          <M math="E[\exp(X)] \neq \exp(E[X])" /> cuando <M math="X" /> es
          normal. La corrección correcta —conocida como{" "}
          <strong>corrección de Duan</strong> o <em>smearing estimator</em>—
          es:
        </p>
        <D math="\hat{Y}_t = \exp\!\bigl(\widehat{\log Y_t}\bigr) \cdot \exp\!\!\left(\frac{MSE}{2}\right)" />
        <p className="mt-2 text-sm">
          El factor <M math="\exp(MSE/2)" /> corrige el sesgo introducido por la
          transformación. Si <M math="MSE = 0.04" />, el factor es{" "}
          <M math="\exp(0.02) \approx 1.02" />: una corrección del 2%. Si{" "}
          <M math="MSE = 0.25" />, el factor es{" "}
          <M math="\approx 1.13" />: un 13% —ya no es despreciable. En el
          Módulo 4 verás cómo implementar esto automáticamente en R.
        </p>
      </Callout>

      <h3 id="parcialmente-multiplicativo">Modelo parcialmente multiplicativo</h3>
      <p>
        Cuando tendencia y estacionalidad interactúan multiplicativamente pero
        el error es aditivo:
      </p>
      <D math="Y_t = T_t \times S_t + E_t" />
      <p>
        Este modelo es útil cuando la varianza del error es estable pero la
        amplitud estacional sí escala con la tendencia. Es menos común pero
        aparece en series de consumo energético y producción agrícola.
      </p>

      <Callout type="formula" title="Regla práctica para elegir el tipo de modelo">
        <p>
          <strong>Paso 1 —</strong> Grafique la serie original. ¿Las
          oscilaciones de verano (o diciembre, o el pico que sea) se ven
          iguales de altas a lo largo del tiempo, o van creciendo?
        </p>
        <p className="mt-2">
          <strong>Paso 2 —</strong> Si crecen proporcionalmente → trabaje con{" "}
          <code>log(Y)</code>. Si son constantes → trabaje con <code>Y</code>{" "}
          directamente.
        </p>
        <p className="mt-2">
          <strong>Paso 3 —</strong> Después de ajustar el modelo, grafique los
          residuos. Si la varianza de los residuos cambia con el tiempo (más
          dispersos al final), la transformación logarítmica probablemente era
          necesaria.
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Este es el ciclo que repetirás en cada módulo: graficar → decidir
          transformación → ajustar → revisar residuos → iterar.
          <strong> Modelar es esencialmente un proceso visual.</strong>
        </p>
      </Callout>

      {/* ── 1.4 Análisis descriptivo en R ─────────────────── */}
      <h2 id="r-descriptivo">1.4 Análisis descriptivo con R</h2>
      <p>
        El primer paso de cualquier análisis de series de tiempo es siempre el
        mismo: <strong>graficar</strong>. Antes de correr una prueba de
        hipótesis, antes de estimar un parámetro, antes de elegir un modelo —
        grafica la serie y déjala hablar. La función <code>decompose()</code>{" "}
        hace eso de manera automática: descompone la serie en sus cuatro
        componentes usando medias móviles para la tendencia y promedios por
        período para la estacionalidad.
      </p>

      <Callout type="info" title="¿Qué vas a ver al ejecutar el código?">
        <p>
          El siguiente bloque produce <strong>tres gráficos</strong>:
        </p>
        <ol className="mt-1 list-decimal list-inside space-y-1 text-sm">
          <li>
            <strong>Serie original</strong> — identifica tendencia y
            estacionalidad a ojo.
          </li>
          <li>
            <strong>Descomposición multiplicativa</strong> — cuatro paneles:
            serie observada, tendencia suavizada, índices estacionales
            (factores que multiplican la tendencia cada mes), y residuos.
          </li>
          <li>
            <strong>log(serie)</strong> — observa cómo la transformación
            estabiliza la varianza: las oscilaciones se vuelven de amplitud
            constante.
          </li>
        </ol>
      </Callout>

      <CodeBlock
        title="▶ Descomposición exploratoria con decompose() — Ejecuta este ejemplo"
        executable={true}
        packages={["forecast", "ggplot2"]}
        code={`# ══════════════════════════════════════════════════════
# EJEMPLO INTERACTIVO — Módulo 1
# Serie: AirPassengers (pasajeros aéreos mensuales, 1949-1960)
# Tendencia creciente + estacionalidad multiplicativa
# ══════════════════════════════════════════════════════
library(forecast)
library(ggplot2)

# 1. El dataset ya viene incluido en R como objeto ts
serie <- AirPassengers
cat("Periodo:", frequency(serie), "observaciones/año (mensual)\\n")
cat("Inicio:", start(serie), "  Fin:", end(serie), "\\n")
cat("Total de obs:", length(serie), "\\n\\n")

# 2. Estadísticas descriptivas básicas
cat("Mínimo:", min(serie), "   Máximo:", max(serie), "\\n")
cat("Media:", round(mean(serie), 1), "\\n")

# 3. Graficar la serie original
# → Observa: ¿las oscilaciones de julio crecen cada año? → multiplicativa
plot(serie,
     main = "Pasajeros aéreos internacionales (1949-1960)",
     ylab = "Miles de pasajeros",
     xlab = "Año",
     col  = "#1d4ed8",
     lwd  = 1.8)

# 4. Descomposición multiplicativa
# → El panel 'seasonal' mostrará factores: julio ~ 1.35 (35% más que promedio)
descom <- decompose(serie, type = "multiplicative")
plot(descom)

# 5. Comparar original vs log(serie)
# → ¿Ves cómo las oscilaciones se vuelven de tamaño constante?
plot(log(serie),
     main = "log(AirPassengers) — varianza estabilizada",
     col  = "#7c3aed",
     lwd  = 1.8,
     ylab = "log(miles de pasajeros)")`}
        caption="💡 Cambia 'multiplicative' por 'additive' y observa la diferencia en el panel seasonal: en el aditivo verás valores absolutos (ej. +60 pasajeros en julio), en el multiplicativo verás factores relativos (ej. ×1.35). También prueba con nottem, co2 o JohnsonJohnson."
      />

      <Callout type="example" title="¿Qué deberías ver en los resultados?">
        <p>
          En <code>decompose(AirPassengers, type="multiplicative")</code>:
        </p>
        <ul className="mt-1 space-y-1 text-sm">
          <li>
            <strong>Tendencia (trend):</strong> curva suavizada que crece de
            ~125 a ~430. Los primeros y últimos 6 valores serán{" "}
            <code>NA</code> —esto es normal, es el costo de usar medias móviles.
          </li>
          <li>
            <strong>Estacionalidad (seasonal):</strong> un patrón que se repite
            igual cada año. Los valores en julio serán cerca de 1.35 (35% sobre
            la tendencia); en noviembre cerca de 0.88 (12% bajo la tendencia).
          </li>
          <li>
            <strong>Residuos (random):</strong> deben oscilar alrededor de 1.0
            sin patrón visible. Si ves una curva en los residuos, el modelo de
            tendencia no capturó algo.
          </li>
        </ul>
      </Callout>

      <Callout type="warning" title="Error frecuente: confundir aditivo y multiplicativo">
        <p>
          Si usas <code>type="additive"</code> en una serie multiplicativa como
          AirPassengers, los residuos mostrarán un patrón en forma de embudo:
          serán pequeños al inicio y grandes al final. Eso es evidencia de que
          la descomposición es incorrecta —hay varianza no capturada. La
          corrección es cambiar a <code>type="multiplicative"</code> o
          trabajar con <code>log(serie)</code>.
        </p>
      </Callout>

      <p>
        Hay una serie que ilustra el caso multiplicativo de manera aún más
        dramática que AirPassengers: las <strong>ventas mensuales de licor
        en Estados Unidos</strong>. En los apuntes de la profesora Nelfi
        González (Figura 3.11, Capítulo 3) puedes ver cómo las oscilaciones
        de diciembre —el mes pico— se hacen progresivamente más grandes a
        medida que crece el nivel de ventas. Aplicando <code>log()</code>, la
        serie se transforma en un patrón aditivo perfectamente tratable con
        regresión lineal. Ese es el poder de la transformación logarítmica.
      </p>

      <CodeBlock
        title="▶ Visualización estacional avanzada con ggseasonplot — Ejecuta este ejemplo"
        executable={true}
        packages={["forecast", "ggplot2"]}
        code={`# ══════════════════════════════════════════════════════
# VISUALIZACIÓN ESTACIONAL — AirPassengers
# autoplot() y ggseasonplot son más informativos que plot.ts
# ══════════════════════════════════════════════════════
library(forecast)
library(ggplot2)

serie <- AirPassengers

# 1. Serie completa: tendencia + estacionalidad de un vistazo
autoplot(serie) +
  labs(
    title    = "Pasajeros aéreos internacionales",
    subtitle = "Tendencia creciente + estacionalidad multiplicativa",
    y        = "Miles de pasajeros",
    x        = "Año"
  ) +
  theme_minimal(base_size = 12) +
  theme(plot.title = element_text(face = "bold"))

# 2. Gráfico estacional: cada año como una línea separada
# → ¿Qué mes es consistentemente el más alto? ¿El patrón es estable?
ggseasonplot(serie,
             year.labels      = TRUE,
             year.labels.left = TRUE) +
  labs(title = "Patrón estacional por año — ¿crece la amplitud?",
       y     = "Miles de pasajeros") +
  theme_minimal()

# 3. Subseries: evolución de cada mes a lo largo del tiempo
# → ¿Julio siempre sube? ¿Enero siempre baja?
ggsubseriesplot(serie) +
  labs(title = "Subseries por mes — media horizontal = promedio del mes",
       y     = "Miles de pasajeros") +
  theme_minimal()`}
        caption="💡 En el ggseasonplot observa si las líneas de distintos años son paralelas (aditivo) o si se van separando (multiplicativo). En el ggsubseriesplot la línea horizontal de cada mes es su media histórica — una 'guía de lo normal' para ese mes."
      />

      <Callout type="info" title="Cómo interpretar el ggseasonplot">
        <p>
          Cada línea de color representa un año. Si las líneas son{" "}
          <strong>paralelas</strong> —misma forma, distintas alturas— la
          estacionalidad es <em>aditiva</em>: el efecto de julio es siempre{" "}
          +60 pasajeros, sin importar el año. Si las líneas se van{" "}
          <strong>separando</strong> hacia los meses pico, la estacionalidad es{" "}
          <em>multiplicativa</em>: el efecto de julio en 1960 es proporcional
          al nivel de 1960, que es mayor que el de 1950.
        </p>
        <p className="mt-2">
          Esta es la lectura que harás en cada nueva serie que analices:{" "}
          <strong>graficar primero, decidir transformación después.</strong>
        </p>
      </Callout>

      {/* ── SVG ilustrativo ──────────────────────────────── */}
      <h2 id="visualizacion">1.5 Visualización conceptual</h2>
      <p>
        El siguiente diagrama ilustra cómo las componentes se combinan en la
        serie observada bajo el modelo aditivo{" "}
        <M math="Y_t = T_t + S_t + E_t" />. La clave para leer una serie de
        tiempo es aprender a separar mentalmente estas capas antes de modelar.
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
          <line x1="60" y1="46" x2="70" y2="46" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6 3"/>
          <text x="75" y="50" fill="#57534e" fontSize="11" fontFamily="Inter">Tendencia (T_t)</text>
          <line x1="180" y1="46" x2="190" y2="46" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 3"/>
          <text x="195" y="50" fill="#57534e" fontSize="11" fontFamily="Inter">Estacionalidad (S_t)</text>
          <line x1="340" y1="46" x2="350" y2="46" stroke="#1c1917" strokeWidth="2.5"/>
          <text x="355" y="50" fill="#57534e" fontSize="11" fontFamily="Inter">Serie observada Y_t = T_t + S_t + E_t</text>

          {/* Axis labels */}
          <text x="350" y="292" fill="#a8a29e" fontSize="11" textAnchor="middle" fontFamily="Inter">Tiempo (t)</text>
          <text x="18" y="160" fill="#a8a29e" fontSize="11" transform="rotate(-90, 18, 160)" fontFamily="Inter">Valor</text>
        </svg>
        <p className="text-xs text-stone-400 text-center mt-2">
          Figura 1.1 — Descomposición aditiva: la serie observada es la suma de tendencia (azul),
          estacionalidad (verde) y error (la diferencia entre la curva negra y la suma de azul+verde).
        </p>
      </div>

      <Callout type="warning" title="Limitación de decompose(): los NA en los extremos">
        <p>
          <code>decompose()</code> estima la tendencia con una <em>media móvil
          centrada</em> de longitud <M math="s" /> (el período estacional). Eso
          significa que necesita <M math="\lfloor s/2 \rfloor" /> observaciones
          a cada lado de cada punto para calcular la media. El resultado: los
          primeros y últimos <M math="\lfloor s/2 \rfloor" /> valores de la
          tendencia son <code>NA</code>. Para datos mensuales (s=12) pierdes 6
          observaciones en cada extremo.
        </p>
        <p className="mt-2">
          Esto <strong>no es un error</strong> —es una limitación matemática
          inherente a las medias móviles. Para estimaciones completas hasta el
          último dato disponible, usa <code>stl()</code> (Módulo 5) o modela
          directamente con regresión (Módulos 2–4).
        </p>
      </Callout>

      {/* ── Cierre del módulo ───────────────────────────── */}
      <h2 id="resumen">1.6 Resumen y conexión con los módulos siguientes</h2>
      <p>
        En este módulo estableciste el vocabulario fundamental: serie de tiempo,
        tendencia, estacionalidad, modelo aditivo vs multiplicativo, y
        descomposición exploratoria. Estos conceptos son los cimientos sobre
        los que se construyen todos los modelos del curso.
      </p>
      <p>
        El camino que seguiremos es siempre el mismo ciclo:
      </p>
      <div className="flex flex-wrap gap-2 my-4 items-center justify-center text-sm font-medium">
        {["Graficar", "→", "Decidir transformación", "→", "Ajustar modelo", "→", "Revisar residuos", "→", "Iterar"].map((s, i) => (
          s === "→"
            ? <span key={i} className="text-stone-400 text-lg">{s}</span>
            : <span key={i} className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">{s}</span>
        ))}
      </div>
      <p>
        En el <strong>Módulo 2</strong> modelarás la tendencia con polinomios y
        funciones logarítmicas. En el <strong>Módulo 3</strong> añadirás la
        estacionalidad con variables dummy y series de Fourier. En el{" "}
        <strong>Módulo 4</strong> ensamblarás el modelo completo, aprenderás a
        comparar alternativas con AIC/BIC, y aplicarás la corrección de sesgo
        al predecir en escala original. El diagnóstico de residuos —el paso más
        importante y el más omitido— lo profundizarás en el{" "}
        <strong>Módulo 8</strong>.
      </p>
      <Callout type="info" title="La pregunta que guía cada módulo">
        <p>
          Antes de ajustar un modelo nuevo, hazte siempre esta pregunta:{" "}
          <strong>¿los residuos del modelo anterior tienen estructura?</strong>{" "}
          Si tienen tendencia, falta modelar la tendencia. Si tienen patrón
          estacional, falta modelar la estacionalidad. Si tienen
          autocorrelación, falta un componente ARIMA. Un buen modelo es aquel
          cuyos residuos son — finalmente — ruido blanco.
        </p>
      </Callout>
    </div>
  );
}
