import { BookOpen, ExternalLink } from "@/components/Icons";

const refs = [
  {
    key: "gonzalez2024",
    authors: "González, N.",
    year: "2024",
    title: "Notas de Clase Estadística III 3009137",
    source: "Universidad Nacional de Colombia",
    note: "Capítulos 3, 5, 6 y material complementario. Fuente principal del curso.",
    url: null,
    type: "notes",
  },
  {
    key: "hyndman2021",
    authors: "Hyndman, R. J. & Athanasopoulos, G.",
    year: "2021",
    title: "Forecasting: Principles and Practice",
    source: "OTexts, 3.ª edición",
    note: "Referencia estándar en pronóstico de series de tiempo con R. Disponible gratis en línea.",
    url: "https://otexts.com/fpp3",
    type: "book",
  },
  {
    key: "pena2010",
    authors: "Peña, D.",
    year: "2010",
    title: "Análisis de series temporales",
    source: "Alianza Editorial",
    note: "Texto clásico en español con sólida base teórica y ejemplos de economía española.",
    url: null,
    type: "book",
  },
  {
    key: "cryer2008",
    authors: "Cryer, J. D. & Chan, K.-S.",
    year: "2008",
    title: "Time Series Analysis with Applications in R",
    source: "Springer, 2.ª edición",
    note: "Tratamiento completo con código R. Cubre modelos ARIMA, regresión con errores y análisis espectral.",
    url: null,
    type: "book",
  },
  {
    key: "diebold2001",
    authors: "Diebold, F. X.",
    year: "2001",
    title: "Elementos de Pronósticos",
    source: "Thomson Learning",
    note: "Enfocado en aplicaciones econométricas de pronóstico. Buena cobertura de criterios de evaluación.",
    url: null,
    type: "book",
  },
  {
    key: "shumway2017",
    authors: "Shumway, R. H. & Stoffer, D. S.",
    year: "2017",
    title: "Time Series Analysis and Its Applications",
    source: "Springer, 4.ª edición",
    note: "Referencia técnica avanzada. Cubre modelos de espacio-estado, ARIMA y análisis espectral.",
    url: "https://www.stat.pitt.edu/stoffer/tsa4/",
    type: "book",
  },
  {
    key: "cleveland1990",
    authors: "Cleveland, R. B., Cleveland, W. S., McRae, J. E. & Terpenning, I.",
    year: "1990",
    title: "STL: A Seasonal-Trend Decomposition Procedure Based on Loess",
    source: "Journal of Official Statistics, 6(1), 3–73",
    note: "Artículo original que describe el algoritmo STL. Lectura recomendada para entender s.window y t.window.",
    url: null,
    type: "article",
  },
  {
    key: "cleveland1979",
    authors: "Cleveland, W. S.",
    year: "1979",
    title: "Robust Locally Weighted Regression and Smoothing Scatterplots",
    source: "Journal of the American Statistical Association, 74(368), 829–836",
    note: "Artículo seminal que introduce LOESS/LOWESS y el kernel tricúbico.",
    url: null,
    type: "article",
  },
];

const typeConfig = {
  notes: { label: "Notas de clase", color: "bg-purple-100 text-purple-700 border-purple-200" },
  book: { label: "Libro", color: "bg-blue-100 text-blue-700 border-blue-200" },
  article: { label: "Artículo", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function ReferencesPage() {
  return (
    <div>
      <div className="mb-8 pb-8 border-b border-stone-200">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={20} className="text-stone-400" />
          <h1 className="text-3xl font-bold text-stone-900">Bibliografía</h1>
        </div>
        <p className="text-stone-500 leading-relaxed max-w-2xl">
          Fuentes primarias y complementarias del curso. Las notas de la
          Profesora Nelfi González constituyen la referencia central; los libros
          y artículos listados profundizan en los aspectos teóricos y
          computacionales.
        </p>
      </div>

      <div className="space-y-4">
        {refs.map((ref) => {
          const cfg = typeConfig[ref.type as keyof typeof typeConfig];
          return (
            <div
              key={ref.key}
              className="p-5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Authors + year */}
                  <p className="text-sm text-stone-500 mb-1">
                    <span className="font-medium text-stone-700">{ref.authors}</span>
                    {" "}({ref.year}).
                  </p>

                  {/* Title */}
                  <p className="font-semibold text-stone-900 mb-1">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                      >
                        {ref.title}
                        <ExternalLink size={13} className="flex-shrink-0" />
                      </a>
                    ) : (
                      ref.title
                    )}
                  </p>

                  {/* Source */}
                  <p className="text-sm text-stone-500 italic mb-2">{ref.source}</p>

                  {/* Note */}
                  <p className="text-sm text-stone-600">{ref.note}</p>
                </div>

                {/* Type badge */}
                <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* R packages */}
      <div className="mt-10 p-5 rounded-xl bg-stone-50 border border-stone-200">
        <h2 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
          <span className="font-mono text-blue-600">R</span>
          Paquetes de R utilizados
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { pkg: "forecast", desc: "seasonaldummy(), stlf(), autoplot()" },
            { pkg: "stats", desc: "lm(), decompose(), stl(), loess()" },
            { pkg: "ggplot2", desc: "Visualizaciones avanzadas" },
            { pkg: "lmtest", desc: "dwtest() — Durbin-Watson" },
            { pkg: "tseries", desc: "Tests de raíz unitaria" },
            { pkg: "fANCOVA", desc: "loess.as() — selección automática de span" },
          ].map(({ pkg, desc }) => (
            <div key={pkg} className="bg-white border border-stone-200 rounded-lg p-3">
              <p className="font-mono font-semibold text-sm text-blue-700">{pkg}</p>
              <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

  );
}
