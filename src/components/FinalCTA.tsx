import Link from "next/link";

import { BrandMark } from "@/components/Logo";
import { IconArrowRight } from "@/components/icons";
import { Reveal } from "@/components/Reveal";

export function FinalCTA() {
  return (
    <section className="bg-white pb-16 pt-4 sm:pb-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-forest-900 px-6 py-14 sm:px-12 sm:py-16 lg:px-16">
          {/* Ambiente del panel: retícula tenue en el verde de marca. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_10%_0%,rgba(167,206,58,0.16),transparent_62%)]" />
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_70%_at_30%_10%,black,transparent_78%)]" />
            <BrandMark className="absolute -right-10 -top-12 h-56 w-56 opacity-[0.07]" />
          </div>

          <Reveal className="relative max-w-2xl">
            <p className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-lime-300">
              <span className="h-px w-8 bg-lime-400/60" aria-hidden="true" />
              Juntos
            </p>

            <h2 className="mt-5 text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-[2.5rem]">
              Ayudemos a que cada objeto encuentre el camino de vuelta
            </h2>

            <p className="mt-5 text-[16px] leading-[1.7] text-white/70">
              Un proceso más organizado para quienes encuentran, quienes buscan
              y las instituciones que los acompañan.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/objetos" className="btn btn-accent">
                Explorar objetos
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/publicar" className="btn btn-ghost-dark">
                Reportar un objeto
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
