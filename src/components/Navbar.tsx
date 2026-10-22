"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccessNoticeDialog } from "@/components/AccessNoticeDialog";
import { CampusPicker } from "@/components/CampusPicker";
import { Logo } from "@/components/Logo";
import { IconClose, IconMenu } from "@/components/icons";
import { DEFAULT_CAMPUS } from "@/lib/campuses";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/objetos?tipo=perdido", label: "Objetos perdidos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#sobre-nosotros", label: "Sobre nosotros" },
];

export function Navbar() {
  const pathname = usePathname();
  // El menú se abre "en" una ruta concreta: al navegar, deja de coincidir con
  // la ruta actual y se cierra solo, sin necesidad de un efecto.
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const menuOpen = menuRoute === pathname;
  const [campus, setCampus] = useState(DEFAULT_CAMPUS.id);
  const [notice, setNotice] = useState<"sesion" | "registro" | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Escape cierra el menú móvil y devuelve el foco al botón.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuRoute(null);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Al volver a escritorio el menú móvil se cierra solo.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuRoute(null);
    };

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const isActive = (href: string) => {
    const [base] = href.split("?");
    if (base === "/") return pathname === "/";
    return pathname === base;
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="container-page">
          <div className="flex h-[72px] items-center justify-between gap-4">
            <Link href="/" className="rounded-lg transition-opacity hover:opacity-80">
              <Logo />
            </Link>

            <nav aria-label="Navegación principal" className="hidden lg:block">
              <ul className="flex items-center gap-0.5">
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      className={`rounded-lg px-3.5 py-2 text-[14.5px] font-medium transition-colors duration-200 ${
                        isActive(link.href)
                          ? "text-forest-800"
                          : "text-muted hover:text-forest-800"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <CampusPicker
                value={campus}
                onChange={setCampus}
                className="w-[15.5rem]"
              />

              <button
                type="button"
                onClick={() => setNotice("sesion")}
                className="btn btn-secondary"
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                onClick={() => setNotice("registro")}
                className="btn btn-primary"
              >
                Registrarse
              </button>
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-ink transition-colors duration-200 hover:border-forest-300 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              onClick={() => setMenuRoute(menuOpen ? null : pathname)}
            >
              {menuOpen ? (
                <IconClose className="h-5 w-5" />
              ) : (
                <IconMenu className="h-5 w-5" />
              )}
              <span className="sr-only">
                {menuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
              </span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="menu-movil" className="border-t border-line bg-white lg:hidden">
            <nav
              aria-label="Navegación móvil"
              className="container-page max-h-[calc(100dvh-72px)] overflow-y-auto pb-6 pt-3"
            >
              <ul className="flex flex-col">
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuRoute(null)}
                      className="block rounded-lg px-1 py-3 text-[15.5px] font-medium text-ink transition-colors duration-200 hover:text-forest-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Institución
                </p>
                <CampusPicker
                  value={campus}
                  onChange={setCampus}
                  className="mt-2"
                />
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  Datos de demostración: FindIt Campus todavía no está
                  integrado con sistemas institucionales.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuRoute(null);
                    setNotice("registro");
                  }}
                  className="btn btn-primary w-full"
                >
                  Registrarse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuRoute(null);
                    setNotice("sesion");
                  }}
                  className="btn btn-secondary w-full"
                >
                  Iniciar sesión
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <AccessNoticeDialog
        open={notice !== null}
        mode={notice ?? "sesion"}
        onClose={() => setNotice(null)}
      />
    </>
  );
}
