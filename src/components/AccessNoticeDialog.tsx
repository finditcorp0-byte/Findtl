"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";

import { IconArrowRight, IconClose, IconInfo } from "@/components/icons";

/**
 * Aviso honesto sobre el acceso a la plataforma.
 *
 * FindIt Campus todavía no tiene autenticación. En lugar de simular una sesión
 * iniciada, este diálogo explica qué habrá y qué se puede hacer mientras tanto.
 *
 * Se apoya en el elemento `<dialog>` nativo: el foco queda atrapado dentro
 * del panel, Escape lo cierra y el foco vuelve al botón que lo abrió.
 */
export function AccessNoticeDialog({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: "sesion" | "registro";
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "acceso-titulo";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = useCallback(() => {
    onClose();
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, [onClose]);

  const isRegistro = mode === "registro";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={close}
      onClose={onClose}
      className="panel-in m-auto w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-line bg-white p-0 text-left shadow-deep backdrop:bg-forest-950/45 backdrop:backdrop-blur-[3px] sm:w-[calc(100%-3rem)]"
    >
      <div className="px-6 pb-6 pt-7 sm:px-7">
        <button
          type="button"
          onClick={close}
          className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-muted transition-colors duration-200 hover:border-forest-300 hover:text-ink"
        >
          <IconClose className="h-4 w-4" />
          <span className="sr-only">Cerrar aviso</span>
        </button>

        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
          <IconInfo className="h-5 w-5" />
        </span>

        <h2
          id={titleId}
          className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink"
        >
          {isRegistro
            ? "El registro estará disponible pronto"
            : "Todavía no hay acceso con cuenta"}
        </h2>

        <p className="mt-2.5 text-[14.5px] leading-[1.7] text-muted">
          {isRegistro
            ? "La creación de cuentas se habilita junto con la integración institucional. Mientras tanto, FindIt Campus funciona sin registro: puedes explorar el catálogo y reportar objetos de demostración."
            : "FindIt Campus se conecta con la cuenta institucional en una etapa posterior. Por ahora puedes explorar el catálogo y reportar objetos de demostración sin iniciar sesión."}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
          <Link href="/objetos" onClick={close} className="btn btn-primary w-full sm:w-auto">
            Explorar objetos
            <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/publicar" onClick={close} className="btn btn-secondary w-full sm:w-auto">
            Reportar un objeto
          </Link>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          Esta interfaz es una demostración: no se crean cuentas ni se guardan
          datos personales.
        </p>
      </div>
    </dialog>
  );
}
