import {
  IconBox,
  IconClipboard,
  IconInfo,
  IconQr,
} from "@/components/icons";
import { Reveal } from "@/components/Reveal";

const STEPS = [
  {
    number: "01",
    title: "Se encuentra un objeto",
    description:
      "Una persona encuentra un objeto perdido y lo comunica a través del procedimiento establecido por la institución.",
    icon: IconBox,
  },
  {
    number: "02",
    title: "Recepción y registro oficial",
    description:
      "El personal autorizado recibe el objeto en el punto institucional de custodia y registra su información antes de que se publique.",
    icon: IconClipboard,
  },
  {
    number: "03",
    title: "Reclamación y entrega segura",
    description:
      "El propietario presenta una reclamación. El personal autorizado la revisa y, si la aprueba, confirma la entrega mediante un código QR.",
    icon: IconQr,
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="scroll-mt-24 bg-canvas py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">
              <span className="h-px w-8 bg-brand" aria-hidden="true" />
              Cómo funciona
            </p>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.35rem]">
              Del hallazgo al reencuentro, en tres pasos
            </h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              Cada objeto sigue una ruta definida y verificable. Ninguno se
              publica ni se entrega sin la intervención del personal autorizado
              de la institución.
            </p>
          </div>
        </Reveal>

        <ol className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;

            return (
              <li key={step.number} className="relative">
                <Reveal delay={index * 90} className="relative flex gap-5 lg:block">
                  {/* Conector vertical (móvil) y horizontal (escritorio). */}
                  {index < STEPS.length - 1 && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[-2.25rem] left-[27px] top-[3.75rem] w-px bg-line lg:hidden"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute left-[4.5rem] right-[-1.5rem] top-7 hidden h-px bg-line lg:block"
                      />
                    </>
                  )}

                  <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-brand-strong shadow-soft">
                    <Icon className="h-6 w-6" />
                  </span>

                  <div className="lg:mt-7">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Paso {step.number}
                    </p>
                    <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-[14.5px] leading-[1.7] text-muted">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>

        <Reveal>
          <p className="mt-12 flex items-start gap-2.5 rounded-2xl border border-line bg-white px-4 py-3.5 text-[13px] leading-relaxed text-muted">
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" />
            <span>
              La entrega entre estudiantes no está permitida dentro del flujo
              propuesto: toda entrega se realiza desde el punto de custodia y con
              confirmación del personal autorizado. Estos pasos describen el
              proceso previsto para la plataforma, hoy en desarrollo.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
