import { ObjectArt } from "@/components/illustrations";
import { IconArrowRight, IconCheck, IconPin, IconQr, IconShield } from "@/components/icons";

/**
 * Hero: texto a la izquierda y una composición visual propia a la derecha.
 * La visual no es un dashboard pegado: es una tarjeta de objeto en custodia,
 * una señal de ubicación y una vista resumida de cómo se organiza una
 * reclamación.
 */
export function Hero() {
  return (
    <section
      id="inicio"
      className="relative overflow-x-clip pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20"
    >
      {/* Fondo ambiental: degradados discretos y retícula tenue. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_16%_0%,rgba(79,124,255,0.12),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(42%_38%_at_94%_14%,rgba(101,228,255,0.12),transparent_66%)]" />
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(23,32,51,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,32,51,0.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(72%_60%_at_50%_0%,black,transparent_78%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10">
        {/* Texto ---------------------------------------------------------- */}
        <div>
          <p className="hero-in hero-in-1 eyebrow">
            <span className="h-px w-8 bg-brand" aria-hidden="true" />
            Gestión inteligente de objetos perdidos
          </p>

          <h1 className="hero-in hero-in-2 mt-5 text-[2.1rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.9rem] lg:text-[3.35rem]">
            Perdiste algo.
            <br />
            <span className="text-brand">
              Aquí puede comenzar el reencuentro
            </span>
          </h1>

          <p className="hero-in hero-in-3 mt-6 max-w-xl text-[16.5px] leading-[1.7] text-muted sm:text-[17.5px]">
            Una forma más organizada y segura de conectar los objetos
            encontrados con sus propietarios, con el acompañamiento de la
            institución.
          </p>

          <div className="hero-in hero-in-4 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href="#objetos" className="btn btn-primary">
              Explorar objetos
              <IconArrowRight className="h-4 w-4" />
            </a>
            <a href="#como-funciona" className="btn btn-secondary">
              Encontré un objeto
            </a>
          </div>

          <p className="hero-in hero-in-5 mt-8 flex items-center gap-2.5 text-[13.5px] font-medium text-muted">
            <IconShield className="h-4.5 w-4.5 shrink-0 text-brand-strong" />
            Un proceso institucional, organizado de principio a fin
          </p>
        </div>

        {/* Composición visual -------------------------------------------- */}
        <div className="hero-in hero-in-4 relative mx-auto w-full max-w-[500px] lg:max-w-none">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-8 -z-10 rounded-[56px] bg-[radial-gradient(58%_58%_at_62%_18%,rgba(79,124,255,0.20),transparent_72%)] blur-xl"
          />

          {/* Tarjeta principal: objeto en custodia */}
          <div className="relative rounded-3xl border border-line bg-white p-5 shadow-lift sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                <IconPin className="h-3.5 w-3.5 text-brand-strong" />
                En custodia
              </span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted">
                Vista de demostración
              </span>
            </div>

            <div className="mt-4 flex items-center justify-center rounded-2xl bg-canvas px-4 py-7">
              <ObjectArt art="headphones" className="h-36 w-36 text-ink sm:h-40 sm:w-40" />
            </div>

            {/* No es un encabezado de sección: es el título de un registro de
                ejemplo, por eso se marca como texto y no como heading. */}
            <p className="mt-5 text-[19px] font-semibold tracking-[-0.015em] text-ink">
              Audífonos inalámbricos
            </p>

            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                  Ubicación
                </dt>
                <dd className="mt-1 font-medium text-ink">Biblioteca central</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                  Registrado
                </dt>
                <dd className="mt-1 font-medium text-ink">14 de marzo</dd>
              </div>
            </dl>

            <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand/10 px-3 py-2 text-[13px] font-medium text-brand-strong">
              <IconCheck className="h-4 w-4" />
              Disponible para reclamación
            </p>
          </div>

          {/* Señal de ubicación */}
          <div className="float-slow absolute -left-2 top-12 hidden items-center gap-2.5 rounded-2xl border border-line bg-white/95 px-3.5 py-2.5 shadow-soft backdrop-blur sm:flex sm:-left-8 sm:top-16">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10">
              <IconPin className="h-4 w-4 text-brand-strong" />
            </span>
            <span className="text-[12.5px] leading-tight">
              <span className="block font-semibold text-ink">
                Punto de custodia
              </span>
              <span className="block text-muted">Entrega centralizada</span>
            </span>
          </div>

          {/* Vista de una reclamación */}
          <div className="float-slower absolute -bottom-9 -right-2 hidden w-[248px] rounded-2xl border border-line bg-white p-4 shadow-lift sm:block sm:-right-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Reclamación
            </p>
            <ol className="mt-3 space-y-2.5">
              <li className="flex items-center gap-2.5 text-[12.5px] text-ink">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/12 text-brand-strong">
                  <IconCheck className="h-3 w-3" />
                </span>
                Registrada por el propietario
              </li>
              <li className="flex items-center gap-2.5 text-[12.5px] text-ink">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                  <IconShield className="h-3 w-3" />
                </span>
                Revisión del personal autorizado
              </li>
              <li className="flex items-center gap-2.5 text-[12.5px] text-ink">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
                  <IconQr className="h-3 w-3" />
                </span>
                Entrega confirmada con QR
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
