# TimeSight Course Platform

**Curso de Análisis de Series de Tiempo · Estadística III**
Universidad Nacional de Colombia – Sede Medellín

Plataforma unificada de enseñanza y análisis estadístico en tiempo real, donde **cada línea de código R se ejecuta directamente en el navegador** mediante WebR, integrada a lecciones diseñadas para formar una mirada analítica experta.

---

## 🎯 Propósito estratégico

TimeSight no es un simple conjunto de apuntes. Es un **entorno de aprendizaje completo** que entrena al estudiante de ingeniería en:

- **Profunda interpretación de gráficos** y estadísticos (no solo mirar, sino leer).
- **Dominio de pruebas de hipótesis** (ADF, Ljung‑Box, Breusch‑Pagan, etc.) y su significado práctico.
- **Modelamiento riguroso** y comparación de modelos con criterio (AIC, BIC, errores de pronóstico).
- **Visualización aguda** de estructuras de correlación, estacionalidad y residuos.

Cada lección, gráfico y componente ha sido diseñado estratégicamente para que el dato sea el protagonista y el estudiante construya **criterio propio**, no dependencia de menús automáticos.

---

## ⚙️ Arquitectura técnica (todo integrado)

| Componente          | Tecnología                                 | Rol                                                                 |
|---------------------|--------------------------------------------|----------------------------------------------------------------------|
| Frontend del curso  | Next.js 14 + TypeScript + Tailwind CSS     | Interfaz, navegación y renderizado de contenido                     |
| Ejecución de R      | **WebR** (R en WebAssembly)                | Todos los ejemplos y simulaciones corren en el cliente, sin servidor |
| Estilizado          | Sistema de tokens CSS (geométrico oscuro)  | Consistencia visual, paleta funcional, sombras duras                |
| Gráficos dinámicos  | Plotly.js + tema personalizado             | Visualizaciones reactivas que reflejan resultados en tiempo real    |
| Despliegue          | **Railway + Docker**                       | Contenedor de Next.js listo para producción                         |

**No hay servidor R aparte.** El intérprete de R viaja dentro del bundle de la aplicación gracias a WebR, lo que permite:

- Ejecutar los mismos scripts que aparecen en las lecciones.
- Modificar parámetros y ver cómo cambian los resultados.
- Compartir sesiones de análisis de forma instantánea, sin configuraciones.

---

## 📦 Estructura del proyecto
src/
├── app/ # Rutas y layouts (App Router)
│ ├── modulo-0/leccion-0-1/ # Cada módulo con sus lecciones
│ └── ...
├── components/
│ ├── ui/ # Botones, tooltips, métricas, semáforos
│ ├── charts/ # Wrappers de Plotly con tema aplicado
│ ├── course/ # Simuladores, asistentes, tarjetas de interpretación
│ └── shared/ # Cajas de resultado, código embebido
├── lib/
│ ├── webr.ts # Inicialización de WebR y comunicación con R
│ ├── theme.ts # Tokens de diseño y colores funcionales
│ └── plotly-theme.ts # Tema geométrico para todos los gráficos
├── hooks/ # useWebR, useSeries, useModel
└── styles/globals.css # Variables CSS, reset, estilos base

text

---

## 🚀 Cómo ponerlo en marcha localmente

### Requisitos
- Node.js ≥ 18
- Docker (opcional para desarrollo con contenedores)

### Instalación rápida
```bash
git clone https://github.com/tu-usuario/time-sight-course.git
cd time-sight-course
npm install
npm run dev
Abre http://localhost:3000. Todo R se carga automáticamente en el navegador; no se necesita instalar R ni paquetes adicionales.

Usando Docker (idéntico a producción en Railway)
bash
docker build -t timesight .
docker run -p 3000:3000 timesight
🧪 Características destacadas

Ejecución real de R en cada módulo: todos los ejemplos de regresión, ACF, tests de hipótesis y pronósticos se pueden ejecutar, modificar y volver a lanzar sin salir de la lección.

Gráficos anotados automáticamente: picos estacionales en el ACF, heterocedasticidad en residuos, resultados de tests expresados visualmente y con lenguaje natural.

Asistente de interpretación integrado: texto que lee los resultados y los traduce a decisiones prácticas (“Considera diferenciar la serie”, “Posible efecto estacional en el trimestre 1”).

Diseño geométrico y oscuro: pensado para reducir ruido visual, donde cada color tiene un significado estadístico (verde = supuesto OK, dorado = atención, rojo = violación).

Carga de datos del curso con un clic: series emblemáticas (Cemento Portland, Licor, AirPassengers) precargadas para que el estudiante se concentre en la interpretación.

📚 Contenido del curso
Módulo	Tema principal
1	Fundamentos de descomposición
2	Modelos de tendencia determinística
3	Estacionalidad con variables dummy y armónicos
4	Modelos completos T+S y pronóstico
5	LOESS y descomposición STL
6	Síntesis metodológica y funciones de R
7	Aplicaciones completas con datos reales
Cada módulo incluye fórmulas (KaTeX), código R ejecutable, visualizaciones reactivas y preguntas de verificación que exigen razonar, no solo calcular.

🧠 ¿Por qué este curso es distinto?
Porque el objetivo no es que el estudiante sepa qué botón apretar, sino que entienda qué está pasando realmente detrás de cada resultado. TimeSight elimina la fricción técnica (todo está integrado) para que el foco esté en la construcción de una intuición estadística sólida, la que distingue al analista experto del que solo sigue recetas.

📄 Créditos académicos
Basado en las notas de clase de la Prof. Nelfi González, Universidad Nacional de Colombia, y en referencias fundamentales como Forecasting: Principles and Practice (Hyndman & Athanasopoulos) y Análisis de series temporales (Peña, D.).

Desarrollado con R en el navegador, Next.js y el firme propósito de formar profesionales que sepan leer series de tiempo con pericia.