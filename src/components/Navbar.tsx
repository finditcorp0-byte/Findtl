"use client";

import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/Logo";
import { IconClose, IconInfo, IconMenu } from "@/components/icons";

const LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#objetos", label: "Explorar objetos" },
  { href: "#faq", label: "Preguntas frecuentes" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Fondo y borde sutiles al desplazar la página.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape cierra el menú móvil y devuelve el foco al botón.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
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
      if (event.matches) setMenuOpen(false);
    };

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // El aviso informativo se retira solo.
  useEffect(() => {
    if (!noticeOpen) return;
    const timer = window.setTimeout(() => setNoticeOpen(false), 9000);
    return () => window.clearTimeout(timer);
  }, [noticeOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled
            ? "border-b border-line bg-white/85 shadow-[0_1px_0_rgba(16,24,40,0.03)] backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
          <a
            href="#inicio"
            className="rounded-lg transition-opacity hover:opacity-80"
          >
            <Logo />
          </a>

          <nav aria-label="Navegación principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="relative rounded-lg px-3.5 py-2 text-[14.5px] font-medium text-ink/75 transition-colors duration-200 hover:text-brand-strong"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden lg:block">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setNoticeOpen(true)}
            >
              Acceder
            </button>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-ink transition-colors duration-200 hover:border-brand/40 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            onClick={() => setMenuOpen((open) => !open)}
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

        {menuOpen && (
          <div
            id="menu-movil"
            className="border-t border-line bg-white lg:hidden"
          >
            <nav
              aria-label="Navegación móvil"
              className="mx-auto max-w-6xl px-5 pb-6 pt-3 sm:px-8"
            >
              <ul className="flex flex-col">
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-3 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-canvas"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-primary mt-3 w-full"
                onClick={() => {
                  setMenuOpen(false);
                  setNoticeOpen(true);
                }}
              >
                Acceder
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Región viva: el texto se anuncia cuando se inserta. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-5 z-[60] sm:left-auto sm:right-6 sm:max-w-sm"
      >
        {noticeOpen && (
          <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-night p-4 text-white shadow-deep">
            <IconInfo className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-[13.5px] leading-relaxed text-white/80">
              El acceso estará disponible cuando se habilite la autenticación
              de la plataforma.
            </p>
            <button
              type="button"
              onClick={() => setNoticeOpen(false)}
              className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <IconClose className="h-4 w-4" />
              <span className="sr-only">Cerrar aviso</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
