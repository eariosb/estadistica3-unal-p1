import { ReactNode } from "react";
import { Info, Lightbulb, AlertTriangle, BookOpen } from "@/components/Icons";

interface CalloutProps {
  type?: "info" | "example" | "warning" | "formula";
  title?: string;
  children: ReactNode;
}

const config = {
  info: {
    icon: Info,
    cls: "callout-info",
    titleColor: "text-blue-800",
    iconColor: "text-blue-500",
    defaultTitle: "Nota",
  },
  example: {
    icon: BookOpen,
    cls: "callout-example",
    titleColor: "text-green-800",
    iconColor: "text-green-500",
    defaultTitle: "Ejemplo",
  },
  warning: {
    icon: AlertTriangle,
    cls: "callout-warning",
    titleColor: "text-amber-800",
    iconColor: "text-amber-500",
    defaultTitle: "Atención",
  },
  formula: {
    icon: Lightbulb,
    cls: "callout-formula",
    titleColor: "text-purple-800",
    iconColor: "text-purple-500",
    defaultTitle: "Fórmula clave",
  },
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const { icon: Icon, cls, titleColor, iconColor, defaultTitle } = config[type];

  return (
    <div className={cls}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={`${iconColor} mt-0.5 flex-shrink-0`} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${titleColor} mb-1`}>
            {title || defaultTitle}
          </p>
          <div className="text-sm text-stone-700 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
