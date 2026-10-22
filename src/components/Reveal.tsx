"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Revela un bloque cuando entra en el área visible.
 *
 * El contenido se renderiza siempre: si JavaScript no está disponible, el
 * bloque simplemente queda visible (sin animación). El estado inicial
 * "idle" no tiene reglas CSS asociadas, de modo que nunca se oculta nada
 * de forma irreversible.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      element.dataset.state = "visible";
      return;
    }

    const show = () => {
      element.dataset.state = "visible";
    };

    const { top } = element.getBoundingClientRect();

    // Ya está en pantalla: se reproduce la entrada de inmediato.
    if (top < window.innerHeight * 0.92) {
      element.dataset.state = "hidden";
      requestAnimationFrame(() => requestAnimationFrame(show));
      return;
    }

    element.dataset.state = "hidden";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    observer.observe(element);

    // Red de seguridad: si el observador no llegara a deliverarse (navegador
    // sin soporte real o documento sin ciclos de render), el bloque que ya
    // esta en pantalla se muestra igualmente. Nunca deja contenido oculto.
    const fallback = window.setTimeout(() => {
      if (element.dataset.state !== "visible") {
        const { top: currentTop } = element.getBoundingClientRect();
        if (currentTop < window.innerHeight) show();
      }
    }, 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-reveal=""
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
