export interface Module {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  topics: string[];
  color: string;
  accent: string;
}

export const modules: Module[] = [
  {
    id: "fundamentos",
    number: 1,
    title: "Fundamentos y Descomposición",
    subtitle: "Bases conceptuales de las series de tiempo",
    description:
      "Definición formal, componentes clásicas (tendencia, estacionalidad, ciclo, error) y modelos de descomposición aditiva y multiplicativa. Análisis descriptivo con R.",
    topics: [
      "Definición y notación",
      "Componentes: Tt, St, Ct, Et",
      "Modelos aditivo y multiplicativo",
      "decompose() en R",
      "Transformación logarítmica",
    ],
    color: "bg-blue-50",
    accent: "text-blue-700",
  },
  {
    id: "tendencia",
    number: 2,
    title: "Modelos de Tendencia Determinística",
    subtitle: "Regresión polinomial, logarítmica y exponencial",
    description:
      "Modelos polinomiales, log-polinomiales y exponencial-polinomiales para capturar la tendencia de largo plazo. Estimación por MCO, inferencia y diagnóstico de residuos.",
    topics: [
      "Modelos polinomiales grado p",
      "Modelo log-polinomial",
      "Modelo exponencial-polinomial",
      "Estimación por MCO (lm)",
      "Diagnóstico de residuos",
    ],
    color: "bg-emerald-50",
    accent: "text-emerald-700",
  },
  {
    id: "estacionalidad",
    number: 3,
    title: "Modelos de Estacionalidad Determinística",
    subtitle: "Variables indicadoras y funciones trigonométricas",
    description:
      "Modelado global del patrón estacional con s−1 variables dummy o con series de Fourier (armónicos). Interpretación de efectos estacionales y periodograma.",
    topics: [
      "Variables indicadoras (dummies)",
      "Interpretación de δᵢ",
      "Funciones trigonométricas (armónicos)",
      "Periodograma",
      "seasonaldummy() y Mytrigon()",
    ],
    color: "bg-violet-50",
    accent: "text-violet-700",
  },
  {
    id: "modelos-completos",
    number: 4,
    title: "Modelos Completos Tendencia + Estacionalidad",
    subtitle: "Regresión combinada y pronósticos con intervalos",
    description:
      "Los tres modelos principales: polinomial estacional, log-polinomial y exponencial-polinomial. Pronósticos puntuales e intervalos de predicción. Ejemplo completo: cemento Portland.",
    topics: [
      "Ecuación general aditiva",
      "Modelo log-polinomial estacional",
      "Corrección por transformación",
      "Intervalos de predicción",
      "Ejemplo: Cemento Portland",
    ],
    color: "bg-amber-50",
    accent: "text-amber-700",
  },
  {
    id: "ajustes-locales",
    number: 5,
    title: "Ajustes Locales: LOESS y STL",
    subtitle: "Suavizamiento no paramétrico con regresión local",
    description:
      "Regresión local ponderada (LOESS) como alternativa flexible a los polinomios globales. Descomposición STL para capturar estacionalidad que evoluciona en el tiempo.",
    topics: [
      "Principio de LOESS",
      "Parámetro span (α)",
      "Kernel tricúbico",
      "Descomposición STL",
      "Estacionalidad cambiante",
    ],
    color: "bg-rose-50",
    accent: "text-rose-700",
  },
  {
    id: "sintesis",
    number: 6,
    title: "Síntesis Metodológica",
    subtitle: "Guía práctica de aplicación y funciones R clave",
    description:
      "Flujo de trabajo recomendado paso a paso: del análisis exploratorio al pronóstico. Tabla completa de funciones R del repositorio de la profesora Nelfi González.",
    topics: [
      "Flujo de análisis paso a paso",
      "Elección del modelo",
      "AIC, BIC, MAE, RMSE, MAPE",
      "Tabla de funciones R",
      "Errores comunes y consejos",
    ],
    color: "bg-cyan-50",
    accent: "text-cyan-700",
  },
  {
    id: "ejemplos",
    number: 7,
    title: "Ejemplos Completos de Aplicación",
    subtitle: "Ingeniería, economía y ciencias ambientales",
    description:
      "Tres casos de uso detallados con código R completo: demanda eléctrica horaria, PIB trimestral agrícola de Colombia y temperatura mensual de Nottingham Castle.",
    topics: [
      "Demanda eléctrica horaria",
      "PIB trimestral (agricultura)",
      "Temperatura Nottingham Castle",
      "Código R reproducible",
      "Interpretación de resultados",
    ],
    color: "bg-orange-50",
    accent: "text-orange-700",
  },
  {
    id: "pruebas-diagnostico",
    number: 8,
    title: "Pruebas de Hipótesis y Gráficos Diagnósticos",
    subtitle: "Validación completa del modelo de regresión",
    description:
      "Siete pruebas formales (t, F, Shapiro-Wilk, Jarque-Bera, Durbin-Watson, Ljung-Box, Breusch-Pagan, ADF) y nueve gráficos diagnósticos. Código R autocontenido con AirPassengers, nottem, UKDriverDeaths y más.",
    topics: [
      "Pruebas t para βₚ, δᵢ, αⱼ/γⱼ",
      "Prueba F global (ANOVA)",
      "Normalidad: Shapiro-Wilk, Jarque-Bera",
      "Autocorrelación: DW, Ljung-Box",
      "Homocedasticidad: Breusch-Pagan",
      "Estacionariedad: ADF",
      "9 gráficos diagnósticos con ggplot2",
    ],
    color: "bg-teal-50",
    accent: "text-teal-700",
  },
];

export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}
