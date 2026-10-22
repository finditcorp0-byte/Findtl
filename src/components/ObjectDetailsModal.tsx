"use client";

import { useCallback, useEffect, useRef, type MouseEvent } from "react";

import { IconClose, IconInfo } from "@/components/icons";
import { ObjectArt } from "@/components/illustrations";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type DemoObject,
} from "@/lib/demo-objects";

/**
 * Panel de detalles de un registro de demostración.
 *
 * Se usa el elemento `<dialog>` nativo: el foco queda atrapado dentro del
 * panel, Escape lo cierra y el foco vuelve al elemento que lo abrió, sin
 * depender de librerías ni de JavaScript adicional.
 */
export function ObjectDetailsModal({
  object,
  onClose,
}: {
  object: DemoObject | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Apertura y cierre sincronizados con el estado del explorador.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (object && !dialog.open) {
      dialog.showModal();
    } else if (!object && dialog.open) {
      dialog.close();
    }
  }, [object]);

  // Escape y el cierre nativo terminan en el mismo flujo: se avisa al padre.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => onClose();
    dialog.addEventListener("close", handleNativeClose);
    return () => dialog.removeEventListener("close", handleNativeClose);
  }, [onClose]);

  // Escape emite "cancel" antes de que el navegador cierre el panel: permite
  // vaciar el estado del padre de forma sincrona.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = () => onClose();
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  /**
   * Cierre sincrono.
   *
   * El evento "close" del elemento nativo se entrega de forma asincrona: si
   * solo avisaramos ahi, el estado del padre quedaria apuntando a un objeto
   * con el panel ya cerrado y volver a elegir ese mismo objeto no abriria
   * nada. Avisando primero al padre el estado nunca se desincroniza.
   */
  const closeModal = useCallback(() => {
    onClose();

    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      closeModal();
    }
  };

  const handleVerProceso = () => {
    const section = document.getElementById("como-funciona");

    // El modal debe cerrarse antes de desplazar: mientras esta abierto el
    // resto del documento queda inerte y el navegador ignora el scroll.
    closeModal();

    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    section.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="detalle-titulo"
      className="modal-panel m-auto w-[calc(100%-1.5rem)] max-w-lg overflow-hidden rounded-3xl border border-line bg-white p-0 text-left shadow-deep backdrop:bg-night/45 backdrop:backdrop-blur-[3px] sm:w-[calc(100%-3rem)]"
    >
      {/* Botón de cierre: primer elemento enfocable del panel. */}
      <button
        type="button"
        onClick={closeModal}
        className="absolute right-3.5 top-3.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/90 text-muted transition-colors duration-200 hover:border-brand/40 hover:text-ink"
      >
        <IconClose className="h-4 w-4" />
        <span className="sr-only">Cerrar detalles del objeto</span>
      </button>

      {object && (
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-center bg-canvas px-6 pb-6 pt-8">
            <ObjectArt art={object.art} className="h-28 w-28 text-ink" />
          </div>

          <div className="px-6 pb-6 pt-5">
            <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              {CATEGORY_LABELS[object.category]}
            </span>

            <h2
              id="detalle-titulo"
              className="mt-3 text-[21px] font-semibold tracking-[-0.02em] text-ink"
            >
              {object.name}
            </h2>

            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
              {object.description}
            </p>

            <dl className="mt-5 divide-y divide-line border-y border-line text-[13.5px]">
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted">Estado del registro</dt>
                <dd className="text-right font-medium text-ink">
                  {STATUS_LABELS[object.status]}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted">Ubicación de demostración</dt>
                <dd className="text-right font-medium text-ink">
                  {object.location}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted">Fecha de registro</dt>
                <dd className="text-right font-medium text-ink">
                  {object.registeredOn}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted">Punto de custodia</dt>
                <dd className="text-right font-medium text-ink">
                  {object.custodyPoint}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-muted">Referencia</dt>
                <dd className="text-right font-mono text-[12.5px] font-medium text-ink">
                  {object.reference}
                </dd>
              </div>
            </dl>

            <p className="mt-4 flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted">
              <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" />
              <span>
                <span className="font-semibold text-ink">
                  Registro de demostración.
                </span>{" "}
                Describe un objeto ficticio para mostrar cómo funcionará el
                expediente de custodia.
              </span>
            </p>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={closeModal}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleVerProceso}
                className="btn btn-primary w-full sm:w-auto"
              >
                Ver el proceso de reclamación
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
