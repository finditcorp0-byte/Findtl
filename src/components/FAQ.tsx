"use client";

import { useState } from "react";

import { IconChevronDown } from "@/components/icons";
import { Reveal } from "@/components/Reveal";

const FAQ_ITEMS = [
  {
    id: "encontrado",
    question: "¿Qué debo hacer si encuentro un objeto?",
    answer:
      "Los objetos encontrados deben seguir el procedimiento institucional y entregarse en el punto oficial de custodia. Allí el personal autorizado registra el objeto y decide cuándo puede publicarse.",
  },
  {
    id: "reclamacion",
    question: "¿Cómo puedo reclamar un objeto que me pertenece?",
    answer:
      "La persona interesada debe presentar una reclamación describiendo el objeto y su ubicación aproximada. La reclamación queda a la espera de revisión por parte del personal autorizado.",
  },
  {
    id: "entrega-directa",
    question: "¿Puedo recoger el objeto directamente de otro estudiante?",
    answer:
      "No. Dentro del flujo propuesto no se permite la entrega directa entre estudiantes: toda entrega se realiza desde el punto de custodia institucional.",
  },
  {
    id: "doble-reclamacion",
    question: "¿Qué sucede si dos personas reclaman el mismo objeto?",
    answer:
      "El personal autorizado revisará las solicitudes y determinará cómo proceder, verificando la descripción y los datos aportados en cada reclamación.",
  },
  {
    id: "publicacion",
    question: "¿Quién puede publicar los objetos encontrados?",
    answer:
      "La publicación se realiza después de la recepción y el registro oficial. Solo el personal autorizado, conforme a los roles de cada institución, puede publicar un objeto en el explorador.",
  },
];

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section id="faq" className="scroll-mt-24 bg-canvas py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <Reveal>
            <div>
              <p className="eyebrow">
                <span className="h-px w-8 bg-brand" aria-hidden="true" />
                Preguntas frecuentes
              </p>
              <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.35rem]">
                Lo primero que conviene saber
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-muted">
                Un resumen del proceso institucional que sostiene FindIt Campus.
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              {FAQ_ITEMS.map((item) => {
                const isOpen = openId === item.id;

                return (
                  <div
                    key={item.id}
                    className="border-b border-line last:border-b-0"
                  >
                    <h3>
                      <button
                        type="button"
                        id={`faq-boton-${item.id}`}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${item.id}`}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors duration-200 hover:bg-canvas/70 sm:px-6"
                      >
                        <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink sm:text-[15.5px]">
                          {item.question}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-transform duration-300 ${
                            isOpen
                              ? "rotate-180 border-brand/40 bg-brand/10 text-brand-strong"
                              : ""
                          }`}
                        >
                          <IconChevronDown className="h-4 w-4" />
                        </span>
                      </button>
                    </h3>

                    <div
                      id={`faq-panel-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-boton-${item.id}`}
                      hidden={!isOpen}
                    >
                      <p className="faq-panel px-5 pb-5 pr-12 text-[14.5px] leading-[1.75] text-muted sm:px-6">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
