import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Modelos de Regresión para Series de Tiempo",
  description:
    "Curso completo: Tendencia, Estacionalidad y Ajustes Locales. Basado en las notas de clase de la Profesora Nelfi González – Universidad Nacional de Colombia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" />
      </head>
      <body>
        <div className="flex min-h-screen">
          {/* Fixed sidebar */}
          <Sidebar />

          {/* Main content, offset by sidebar width */}
          <main className="flex-1 ml-64 min-h-screen">
            <div className="max-w-4xl mx-auto px-8 py-10">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
