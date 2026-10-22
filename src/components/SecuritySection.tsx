import { IconClipboard, IconInfo, IconLock, IconQr, IconShield } from "@/components/icons";
import { Reveal } from "@/components/Reveal";

const PRINCIPLES = [
  {
    title: "Custodia institucional",
    description:
      "Los objetos se reciben en un punto oficial y permanecen bajo responsabilidad de la institución.",
    icon: IconShield,
  },
  {
    title: "Revisión de reclamaciones",
    description:
      "Las solicitudes son revisadas por personal autorizado antes de aprobar cualquier entrega.",
    icon: IconClipboard,
  },
  {
    title: "Entrega confirmada",
    description:
      "Un código QR permite confirmar y dejar constancia del proceso de entrega.",
    icon: IconQr,
  },
  {
    title: "Acceso controlado",
    description:
      "Los permisos se definirán de acuerdo con los roles institucionales de cada institución.",
    icon: IconLock,
  },
];

export function SecuritySection() {
  return (
    <section id="confianza" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:gap-16">
          <Reveal>
            <div>
              <p className="eyebrow">
                <span className="h-px w-8 bg-brand" aria-hidden="true" />
                Confianza y seguridad
              </p>
              <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.35rem]">
                Cada objeto con un responsable claro
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-muted">
                El modelo de FindIt Campus se apoya en la estructura de la propia
                institución: un punto de custodia, personal autorizado y un
                registro verificable de cada entrega.
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <ul className="grid gap-5 sm:grid-cols-2">
              {PRINCIPLES.map((principle) => {
                const Icon = principle.icon;

                return (
                  <li
                    key={principle.title}
                    className="group rounded-2xl border border-line bg-canvas p-5 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-white"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand-strong transition-colors duration-300 group-hover:bg-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-[15.5px] font-semibold tracking-[-0.01em] text-ink">
                      {principle.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-[1.65] text-muted">
                      {principle.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>

        <p className="mt-10 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" />
          <span>
            Esta interfaz es una demostración de un producto en desarrollo. Los
            mecanismos descritos corresponden al modelo previsto: todavía no
            están desplegados ni han sido auditados.
          </span>
        </p>
      </div>
    </section>
  );
}
