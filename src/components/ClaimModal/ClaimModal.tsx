import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { createRecoveryRequest } from "@/app/actions/createRecoveryRequest";

const MIN_LENGTH = 20;

interface ClaimModalProps {
  objectId: string;
  objectKind: "perdido" | "encontrado";
  open: boolean;
  onClose: () => void;
}

export function ClaimModal({
  objectId,
  objectKind,
  open,
  onClose,
}: ClaimModalProps) {
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      fieldRef.current?.focus();
    }

    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    triggerRef.current?.focus();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCancel = () => {
      onClose();
    };

    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (description.trim().length < MIN_LENGTH) {
      setError(
        `Describe el objeto con al menos ${MIN_LENGTH} caracteres para que el personal pueda verificarlo.`
      );
      fieldRef.current?.focus();
      return;
    }

    setError(null);
    setStatus("sending");

    try {
      const result = await createRecoveryRequest({
        object_id: objectId,
        description: description.trim(),
        contact_preference: "email",
      });

      if (result.success) {
        setStatus("sent");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setStatus("error");
      const errorMessage = error instanceof Error ? error.message : "Error al crear la reclamación.";
      setError(errorMessage);
    }
  };

  const isFound = objectKind === "encontrado";
  const actionLabel = isFound ? "Iniciar recuperación" : "Reportar coincidencia";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-primary w-full sm:w-auto"
      >
        {actionLabel}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4" />
        </svg>
      </button>

      <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>
          Ninguna entrega se realiza sin la revisión del personal autorizado.
          La reclamación queda registrada y en espera.
        </span>
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby="claim-titulo"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => triggerRef.current?.focus()}
        className="panel-in m-auto w-[calc(100%-1.5rem)] max-w-lg rounded-3xl border border-line bg-white p-0 text-left shadow-deep backdrop:bg-forest-950/45 backdrop:backdrop-blur-[3px] sm:w-[calc(100%-3rem)]"
      >
        <div className="px-6 pb-6 pt-7 sm:px-7">
          <button
            type="button"
            onClick={close}
            className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-muted transition-colors duration-200 hover:border-forest-300 hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="sr-only">Cerrar</span>
          </button>

          {status === "sent" ? (
            <div role="status">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-found-surface text-found-text">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>

              <h2
                id="claim-titulo"
                className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink"
              >
                Solicitud registrada
              </h2>

              <p className="mt-2.5 text-[14.5px] leading-[1.7] text-muted">
                Tu descripción quedó registrada. El personal
                autorizado del campus la revisará y, si coincide con el
                expediente, te contactará para coordinar la entrega en el punto
                de custodia.
              </p>

              <button
                type="button"
                onClick={close}
                className="btn btn-primary mt-6 w-full"
              >
                Entendido
              </button>
            </div>
          ) : (
            <>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>

              <h2
                id="claim-titulo"
                className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink"
              >
                {isFound
                  ? "Iniciar la recuperación de este objeto"
                  : "Reportar una posible coincidencia"}
              </h2>

              <p className="mt-2.5 text-[14.5px] leading-[1.7] text-muted">
                {isFound
                  ? "Cuenta cómo es el objeto y dónde lo viste por última vez. La reclamación se revisa en el punto de custodia antes de aprobar cualquier entrega."
                  : "Si crees que encontraste este objeto, entrégalo en el punto de custodia y describe aquí dónde lo viste para que el personal pueda verificarlo."}
              </p>

              <form onSubmit={handleSubmit} className="mt-5" noValidate>
                <label
                  htmlFor="descripcion-reclamo"
                  className="block text-[13.5px] font-semibold text-ink"
                >
                  Descripción del objeto y del lugar
                </label>

                <textarea
                  id="descripcion-reclamo"
                  ref={fieldRef}
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    if (error) setError(null);
                  }}
                  rows={4}
                  required
                  minLength={MIN_LENGTH}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "error-reclamo" : "ayuda-reclamo"}
                  placeholder="Por ejemplo: carcasa negra con una sticker blanco, lo vi en la sala de estudio del segundo piso."
                  className={`mt-2 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-[14.5px] leading-[1.6] text-ink transition-colors duration-200 placeholder:text-muted ${
                    error
                      ? "border-lost-text focus:border-lost-text"
                      : "border-line focus:border-forest-500"
                  }`}
                />

                {error ? (
                  <p
                    id="error-reclamo"
                    role="alert"
                    className="mt-2 text-[13px] font-medium text-lost-text"
                  >
                    {error}
                  </p>
                ) : (
                  <p id="ayuda-reclamo" className="mt-2 text-[12.5px] text-muted">
                    Mínimo {MIN_LENGTH} caracteres.
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary w-full sm:w-auto">
                    Enviar solicitud
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="btn btn-secondary w-full sm:w-auto"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}