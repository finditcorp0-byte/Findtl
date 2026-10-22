import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { IconClipboard, IconInfo, IconShield } from "@/components/icons";
import { Navbar } from "@/components/Navbar";
import { ReportForm } from "@/components/ReportForm";

export const metadata: Metadata = {
  title: "Publicar un objeto",
  description:
    "Reporta un objeto perdido o encontrado en tu campus. Formulario de demostración: los datos no se envían a ningún servidor.",
  alternates: { canonical: "/publicar" },
  openGraph: {
    title: "Publicar un objeto | FindIt Campus",
    description:
      "Reporta un objeto perdido o encontrado en tu campus. Formulario de demostración: los datos no se envían a ningún servidor.",
    url: "/publicar",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Describe el objeto",
    description:
      "Nombre, categoría, zona y fecha aproximada son los datos que hacen posible reconocerlo.",
  },
  {
    title: "Entrégalo en recepción",
    description:
      "El reporte no reemplaza la recepción física: el objeto llega al punto de custodia institucional.",
  },
  {
    title: "El personal lo publica",
    description:
      "Personal autorizado revisa el registro antes de que aparezca en el catálogo.",
  },
];

export default function PublicarPage() {
  return (
    <>
      <Navbar />

      <main id="contenido">
        <div className="container-page pb-20 pt-10 sm:pt-14">
          <header className="max-w-2xl">
            <p className="eyebrow">
              <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
              Reporte de objeto
            </p>

            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.7rem]">
              Publica un objeto perdido o encontrado
            </h1>

            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              Completa el formulario con los datos que recuerdas. Mientras más
              específico seas, más fácil será reconocer el objeto.
            </p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-14">
            <div className="rounded-[1.25rem] border border-line bg-white p-6 shadow-soft sm:p-8">
              <ReportForm />
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  <IconClipboard className="h-4 w-4 text-forest-700" />
                  Qué pasa después
                </h2>

                <ol className="mt-4 space-y-4">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-[12px] font-semibold text-forest-700">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-[14px] font-semibold text-ink">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-[13px] leading-[1.65] text-muted">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-4 flex items-start gap-2.5 rounded-[1.25rem] border border-line bg-canvas px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
                <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                <span>
                  Nadie entrega un objeto a un desconocido ni se intercambian
                  datos de contacto en el catálogo. La entrega la realiza el
                  personal autorizado.
                </span>
              </p>

              <p className="mt-4 flex items-start gap-2.5 rounded-[1.25rem] border border-line bg-canvas px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
                <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                <span>
                  Formulario de demostración: valida lo que escribes y muestra
                  el resultado, pero no envía ni almacena información.
                </span>
              </p>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
