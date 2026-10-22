import Link from "next/link";

import { Logo } from "@/components/Logo";
import { DEMO_CAMPUSES } from "@/lib/campuses";

const SECTION_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/objetos?tipo=perdido", label: "Objetos perdidos" },
  { href: "/objetos", label: "Explorar objetos" },
  { href: "/publicar", label: "Publicar un objeto" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#sobre-nosotros", label: "Sobre nosotros" },
];

const HELP_LINKS = [
  { href: "/#faq", label: "Preguntas frecuentes" },
  { href: "/#confianza", label: "Confianza y seguridad" },
  { href: "/#como-funciona", label: "Proceso de reclamación" },
  { href: "/credits.txt", label: "Créditos de imágenes" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-forest-950">
      <div className="container-page">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <Logo tone="dark" />
            <p className="mt-5 max-w-sm text-[13.5px] leading-[1.7] text-white/60">
              Plataforma institucional para registrar, encontrar y recuperar
              objetos perdidos dentro de comunidades educativas, con custodia
              centralizada y trazabilidad.
            </p>
          </div>

          <nav aria-label="Secciones del sitio">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Secciones
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-white/70 transition-colors duration-200 hover:text-lime-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Ayuda">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Ayuda
            </h2>
            <ul className="mt-4 space-y-2.5">
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-white/70 transition-colors duration-200 hover:text-lime-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Instituciones
            </h2>
            <ul className="mt-4 space-y-2.5">
              {DEMO_CAMPUSES.map((campus) => (
                <li key={campus.id}>
                  <Link
                    href={`/objetos?campus=${campus.id}`}
                    className="text-[14px] text-white/70 transition-colors duration-200 hover:text-lime-300"
                  >
                    {campus.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-white/10 py-6 text-[12.5px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} FindIt Campus. Plataforma en desarrollo.</p>
          <p>
            Interfaz de demostración: los objetos y sus datos son ficticios.
          </p>
        </div>
      </div>
    </footer>
  );
}
