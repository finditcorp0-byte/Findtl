import { Logo } from "@/components/Logo";

const SECTION_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#objetos", label: "Explorar objetos" },
  { href: "#confianza", label: "Confianza y seguridad" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-night">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-16">
          <div>
            <Logo tone="dark" />
            <p className="mt-5 max-w-sm text-[13.5px] leading-[1.7] text-white/55">
              Plataforma institucional para registrar, encontrar y recuperar
              objetos perdidos dentro de comunidades educativas, con custodia
              centralizada y trazabilidad.
            </p>
          </div>

          <nav aria-label="Secciones del sitio">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              Secciones
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[14px] text-white/65 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Ayuda">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              Ayuda
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="#faq"
                  className="text-[14px] text-white/65 transition-colors duration-200 hover:text-white"
                >
                  Preguntas frecuentes
                </a>
              </li>
              <li>
                <a
                  href="#objetos"
                  className="text-[14px] text-white/65 transition-colors duration-200 hover:text-white"
                >
                  Objetos de demostración
                </a>
              </li>
              <li>
                <a
                  href="#como-funciona"
                  className="text-[14px] text-white/65 transition-colors duration-200 hover:text-white"
                >
                  Proceso de reclamación
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-white/10 py-6 text-[12.5px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} FindIt Campus. Plataforma en desarrollo.</p>
          <p>
            Interfaz de demostración: los objetos y sus datos son ficticios.
          </p>
        </div>
      </div>
    </footer>
  );
}
