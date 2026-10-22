import { BrandMark } from "@/components/Logo";
import { IconArrowRight } from "@/components/icons";
import { Reveal } from "@/components/Reveal";

export function FinalCTA() {
  return (
    <section className="bg-canvas pb-16 pt-4 sm:pb-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-[28px] bg-night px-6 py-14 sm:px-12 sm:py-16 lg:px-16">
          {/* Ambiente del panel: mismo lenguaje visual que el hero. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(70%_90%_at_12%_0%,rgba(79,124,255,0.28),transparent_62%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(50%_70%_at_88%_100%,rgba(101,228,255,0.14),transparent_64%)]" />
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_70%_at_30%_10%,black,transparent_78%)]" />
            <BrandMark className="absolute -right-10 -top-12 h-56 w-56 opacity-5" />
          </div>

          <Reveal className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent/90">
              <span className="h-px w-8 bg-accent/50" aria-hidden="true" />
              Juntos
            </p>

            <h2 className="mt-5 text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-[2.5rem]">
              Ayudemos a que cada objeto encuentre el camino de vuelta
            </h2>

            <p className="mt-5 text-[16px] leading-[1.7] text-white/65">
              Un proceso más organizado para quienes encuentran, quienes buscan
              y las instituciones que los acompañan.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#objetos" className="btn btn-primary">
                Explorar objetos
                <IconArrowRight className="h-4 w-4" />
              </a>
              <a href="#como-funciona" className="btn btn-ghost-dark">
                Conocer cómo funciona
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
