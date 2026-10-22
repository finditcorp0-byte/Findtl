import { IconClock, IconClipboard, IconLayers, IconShield } from "@/components/icons";
import { Reveal } from "@/components/Reveal";

const BENEFITS = [
  {
    title: "Reporta un objeto",
    description:
      "Publica en minutos lo que perdiste o lo que encontraste, con los datos que ayudan a identificarlo.",
    icon: IconClipboard,
  },
  {
    title: "Conexión segura",
    description:
      "El flujo sigue la custodia institucional: cada entrega se revisa antes de realizarse.",
    icon: IconShield,
  },
  {
    title: "Recuperación organizada",
    description:
      "Los registros se filtran por categoría, zona y fecha para acotar la búsqueda.",
    icon: IconLayers,
  },
  {
    title: "Disponible a cualquier hora",
    description:
      "Consulta el catálogo desde el campus, sin trámites ni horarios de atención.",
    icon: IconClock,
  },
];

export function QuickBenefits() {
  return (
    <section className="border-y border-line bg-canvas" aria-labelledby="beneficios-titulo">
      <div className="container-page">
        <h2 id="beneficios-titulo" className="sr-only">
          Qué ofrece FindIt Campus
        </h2>

        <ul className="grid gap-x-8 gap-y-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-14">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <li key={benefit.title}>
                <Reveal delay={index * 70} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-forest-700 shadow-soft">
                    <Icon className="h-5 w-5" />
                  </span>

                  <div>
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                      {benefit.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-[1.65] text-muted">
                      {benefit.description}
                    </p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
