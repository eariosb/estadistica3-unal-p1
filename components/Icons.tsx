// ── Icons.tsx — Iconos SVG inline (reemplaza lucide-react sin npm) ────────────

interface IconProps {
  size?: number;
  className?: string;
}

type IconComponent = (props: IconProps) => JSX.Element;

function icon(paths: string[], viewBox = "0 0 24 24"): IconComponent {
  return function Icon({ size = 16, className = "" }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  };
}

function iconEl(children: React.ReactNode): IconComponent {
  return function Icon({ size = 16, className = "" }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {children}
      </svg>
    );
  };
}

export const BookOpen = icon([
  "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z",
  "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
]);

export const Home = icon([
  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  "M9 22V12h6v10",
]);

export const ChevronRight = icon(["M9 18l6-6-6-6"]);
export const ChevronLeft  = icon(["M15 18l-6-6 6-6"]);
export const ChevronDown  = icon(["M6 9l6 6 6-6"]);
export const ChevronUp    = icon(["M18 15l-6-6-6 6"]);

export const ArrowRight = icon([
  "M5 12h14",
  "M12 5l7 7-7 7",
]);

export const X = icon(["M18 6L6 18", "M6 6l12 12"]);

export const Check = icon(["M20 6L9 17l-5-5"]);

export const Copy = icon([
  "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z",
  "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
]);

export const Download = icon([
  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
  "M7 10l5 5 5-5",
  "M12 15V3",
]);

export const Play = iconEl(
  <polygon points="5 3 19 12 5 21 5 3" />
);

export const RotateCcw = icon([
  "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
  "M3 3v5h5",
]);

export const ZoomIn = icon([
  "M11 8v6M8 11h6",
  "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  "M21 21l-4.35-4.35",
]);

export const ZoomOut = icon([
  "M8 11h6",
  "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  "M21 21l-4.35-4.35",
]);

export const Maximize2 = icon([
  "M15 3h6v6",
  "M9 21H3v-6",
  "M21 3l-7 7",
  "M3 21l7-7",
]);

export const Info = iconEl(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </>
);

export const AlertCircle = iconEl(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </>
);

export const AlertTriangle = icon([
  "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  "M12 9v4",
  "M12 17h.01",
]);

export const Clock = iconEl(
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>
);

export const Terminal = icon([
  "M4 17l6-6-6-6",
  "M12 19h8",
]);

export const Lightbulb = icon([
  "M9 18h6",
  "M10 22h4",
  "M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14",
]);

export const Code2 = icon([
  "M18 16l4-4-4-4",
  "M6 8l-4 4 4 4",
  "M14.5 4l-5 16",
]);

export const TrendingUp = icon([
  "M23 6l-9.5 9.5-5-5L1 18",
  "M17 6h6v6",
]);

export const GraduationCap = iconEl(
  <>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </>
);

export const ExternalLink = icon([
  "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  "M15 3h6v6",
  "M10 14L21 3",
]);
