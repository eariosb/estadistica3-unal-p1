import { notFound } from "next/navigation";
import { getModule, modules } from "@/lib/modules";
import { ModuleHeader } from "@/components/ModuleHeader";
import { Modulo1Content } from "@/lib/content/modulo1";
import { Modulo2Content } from "@/lib/content/modulo2";
import { Modulo3Content } from "@/lib/content/modulo3";
import { Modulo4Content } from "@/lib/content/modulo4";
import { Modulo5Content } from "@/lib/content/modulo5";
import { Modulo6Content } from "@/lib/content/modulo6";
import { Modulo7Content } from "@/lib/content/modulo7";
import { Modulo8Content } from "@/lib/content/modulo8";

const contentMap: Record<string, React.ComponentType> = {
  fundamentos: Modulo1Content,
  tendencia: Modulo2Content,
  estacionalidad: Modulo3Content,
  "modelos-completos": Modulo4Content,
  "ajustes-locales": Modulo5Content,
  sintesis: Modulo6Content,
  ejemplos: Modulo7Content,
  "pruebas-diagnostico": Modulo8Content,
};

// Generate static params for all modules
export function generateStaticParams() {
  return modules.map((m) => ({ id: m.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const mod = getModule(params.id);
  if (!mod) return { title: "Módulo no encontrado" };
  return {
    title: `Módulo ${mod.number}: ${mod.title} — Series de Tiempo`,
    description: mod.description,
  };
}

export default function ModulePage({ params }: { params: { id: string } }) {
  const mod = getModule(params.id);
  if (!mod) notFound();

  const Content = contentMap[params.id];
  if (!Content) notFound();

  return (
    <div>
      <ModuleHeader module={mod} />
      <Content />
    </div>
  );
}
