"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";

import {
  IconCheck,
  IconImage,
  IconInfo,
  IconSend,
  IconShield,
  IconTrash,
} from "@/components/icons";
import { createObject } from "@/app/actions/createObject";
import { uploadObjectImageAction } from "@/app/actions/uploadImage";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  zone?: string;
  date?: string;
  photo?: string;
  reference_code?: string;
}

type ObjectKind = "lost" | "found";

/** Fecha máxima permitida: hoy, en la zona horaria local. */
const getMaxDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

interface ReportFormProps {
  categories: { id: string; name: string; slug: string }[];
}

/**
 * Formulario de publicación real (conectado a Supabase).
 *
 * Envía los datos a la Server Action `createObject` que llama a `fn_create_object` en la BD.
 * Requiere usuario autenticado con membresía activa (verificado en la página padre).
 */
export function ReportForm({ categories }: ReportFormProps) {
  const [kind, setKind] = useState<ObjectKind>("lost");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [zone, setZone] = useState<string>("");
  const [date, setDate] = useState("");

  // referenceCode se genera en useEffect y se almacena en state
  const [referenceCode, setReferenceCode] = useState<string>("");

  // Generar reference_code cuando cambie el tipo
  useEffect(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const kindPrefix = kind === "lost" ? "LST" : "FND";
    setReferenceCode(`FIC-${dateStr}-${kindPrefix}-${random}`); // eslint-disable-line react-hooks/set-state-in-effect
  }, [kind]);

  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [announcement, setAnnouncement] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  // La URL temporal de la previsualización se libera al desmontar el componente.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  /** Libera la previsualización actual, si la hay. */
  const clearPreview = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
  };

/** Libera la previsualización actual, si la hay. */
  const validate = (): FormErrors => {
    const next: FormErrors = {};

    if (title.trim().length < 4) {
      next.title = "Escribe un nombre de al menos 4 caracteres.";
    } else if (title.trim().length > 80) {
      next.title = "El nombre no puede superar los 80 caracteres.";
    }

    if (description.trim().length < 15) {
      next.description =
        "Describe el objeto con al menos 15 caracteres para que se pueda identificar.";
    }

    if (!category) {
      next.category = "Selecciona una categoría.";
    }

    if (!zone) {
      next.zone = "Selecciona la zona del campus.";
    }

    if (date) {
      const today = new Date();
      const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
      if (date > local.toISOString().slice(0, 10)) {
        next.date = "La fecha no puede ser posterior a hoy.";
      }
    }

    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate();
    setErrors(found);

    const invalidCount = Object.keys(found).length;

    if (invalidCount > 0) {
      setAnnouncement(
        `El formulario tiene ${invalidCount} ${invalidCount === 1 ? "error" : "errores"} por corregir.`,
      );
      titleRef.current?.focus();
      return;
    }

    setStatus("sending");
    setAnnouncement("Enviando el reporte...");
    setErrorMessage(null);

    try {
      // 1. Generar UUID para el objeto (para la ruta de la imagen)
      const objectId = crypto.randomUUID();
      
      // 1. Subir imagen si existe
      let imagePath: string | undefined;
      if (photo) {
        const uploadResult = await uploadObjectImageAction(photo, objectId, false);
        if (!uploadResult.success) {
          setStatus("error");
          setErrorMessage(uploadResult.error ?? "Error al subir imagen");
          setAnnouncement(uploadResult.error ?? "Error al subir imagen");
          setStatus("idle");
          return;
        }
        imagePath = uploadResult.path;
      }

      // 2. Llamar a la Server Action
      const result = await createObject({
        kind,
        title: title.trim(),
        description: description.trim(),
        zone,
        location: zone,
        category_id: category,
        reference_code: referenceCode,
        image_path: imagePath,
      });

      if (result.success) {
        setStatus("sent");
        setAnnouncement("Reporte registrado correctamente.");
      } else {
        setStatus("error");
        setErrorMessage(result.error ?? "Error al crear el objeto.");
        setAnnouncement(result.error ?? "Error al crear el objeto.");
        setStatus("idle"); // Permitir reintentar
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setStatus("error");
      setErrorMessage("Error inesperado. Inténtalo de nuevo más tarde.");
      setAnnouncement("Error inesperado. Inténtalo de nuevo más tarde.");
      setStatus("idle");
    }
  };

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    clearPreview();
    setPhoto(null);

    if (!file) {
      setErrors((current) => ({ ...current, photo: undefined }));
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        photo: "Usa una imagen JPG, PNG o WebP.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((current) => ({
        ...current,
        photo: "La imagen no puede superar los 5 MB.",
      }));
      event.target.value = "";
      return;
    }

    setErrors((current) => ({ ...current, photo: undefined }));

    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setPhoto(file);
  };

  const handleReset = () => {
    setKind("lost");
    setTitle("");
    setDescription("");
    setCategory("");
    setZone("");
    setDate("");
    clearPreview();
    setPhoto(null);
    setErrors({});
    setStatus("idle");
    setAnnouncement("");
    setErrorMessage(null);
    titleRef.current?.focus();
  };

  if (status === "sent") {
    return (
      <div className="rounded-[1.25rem] border border-line bg-white p-7 shadow-soft sm:p-9">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-found-surface text-found-text">
          <IconCheck className="h-6 w-6" />
        </span>

        <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-ink">
          Reporte registrado
        </h2>

        <p className="mt-3 max-w-xl text-[15px] leading-[1.75] text-muted">
          Tu reporte de <strong className="font-semibold text-ink">{title.trim()}</strong>{" "}
          quedó registrado. El personal de custodia lo revisará y, si coincide con el
          expediente, te contactará para coordinar la entrega en el punto
          de custodia.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleReset} className="btn btn-primary">
            Registrar otro objeto
          </button>
          <Link href="/objetos" className="btn btn-secondary">
            Ver el catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Tipo de reporte ---------------------------------------------------- */}
      <fieldset>
        <legend className="text-[14px] font-semibold text-ink">
          ¿Qué pasó con el objeto?
        </legend>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: "lost", title: "Lo perdí", hint: "Quiero recuperarlo." },
              {
                value: "found",
                title: "Lo encontré",
                hint: "Quiero entregarlo.",
              },
            ] as const
          ).map((option) => {
            const id = `tipo-${option.value}`;
            const checked = kind === option.value;

            return (
              <label
                key={option.value}
                htmlFor={id}
                className={`flex cursor-pointer items-start gap-3 rounded-[1rem] border p-4 transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-600 ${
                  checked
                    ? "border-forest-700 bg-forest-50"
                    : "border-line bg-white hover:border-forest-300"
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name="tipo-reporte"
                  value={option.value}
                  checked={checked}
                  onChange={() => setKind(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    checked ? "border-forest-700" : "border-line-strong"
                  }`}
                >
                  {checked && (
                    <span className="h-2.5 w-2.5 rounded-full bg-forest-700" />
                  )}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {option.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Descripción del objeto --------------------------------------------- */}
      <div>
        <label
          htmlFor="titulo-objeto"
          className="block text-[14px] font-semibold text-ink"
        >
          Nombre del objeto
        </label>
        <p id="ayuda-titulo" className="mt-1 text-[13px] text-muted">
          Describe el objeto como lo verían otras personas: marca, color y tipo.
        </p>
        <input
          ref={titleRef}
          id="titulo-objeto"
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (errors.title) setErrors((c) => ({ ...c, title: undefined }));
          }}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "error-titulo" : "ayuda-titulo"}
          placeholder="Por ejemplo: Audífonos inalámbricos con estuche gris"
          className={`mt-2 h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted ${
            errors.title ? "border-lost-text" : "border-line focus:border-forest-500"
          }`}
        />
        {errors.title && (
          <p id="error-titulo" role="alert" className="mt-2 text-[13px] font-medium text-lost-text">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="descripcion-objeto"
          className="block text-[14px] font-semibold text-ink"
        >
          Descripción
        </label>
        <p id="ayuda-descripcion" className="mt-1 text-[13px] text-muted">
          Los detalles ayudan a confirmar que se trata del mismo objeto.
        </p>
        <textarea
          id="descripcion-objeto"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (errors.description) setErrors((c) => ({ ...c, description: undefined }));
          }}
          rows={4}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? "error-descripcion" : "ayuda-descripcion"
          }
          placeholder="Por ejemplo: estuche de carga gris, un cable corto y dos audífonos intraurales."
          className={`mt-2 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-[15px] leading-[1.6] text-ink transition-colors duration-200 placeholder:text-muted ${
            errors.description
              ? "border-lost-text"
              : "border-line focus:border-forest-500"
          }`}
        />
        {errors.description && (
          <p
            id="error-descripcion"
            role="alert"
            className="mt-2 text-[13px] font-medium text-lost-text"
          >
            {errors.description}
          </p>
        )}
      </div>

      {/* Metadatos ---------------------------------------------------------- */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="categoria-objeto"
            className="block text-[14px] font-semibold text-ink"
          >
            Categoría
          </label>
          <select
            id="categoria-objeto"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 hover:border-forest-300 focus:border-forest-500"
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? "error-categoria" : "ayuda-categoria"}
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <p id="error-categoria" role="alert" className="mt-2 text-[13px] font-medium text-lost-text">
              {errors.category}
            </p>
          )}
          <p id="ayuda-categoria" className="mt-1 text-[13px] text-muted">
            Selecciona la categoría que mejor describa el objeto.
          </p>
        </div>

        <div>
          <label
            htmlFor="zona-objeto"
            className="block text-[14px] font-semibold text-ink"
          >
            Zona del campus
          </label>
          <select
            id="zona-objeto"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 hover:border-forest-300 focus:border-forest-500"
            aria-invalid={errors.zone ? true : undefined}
            aria-describedby={errors.zone ? "error-zona" : "ayuda-zona"}
          >
            <option value="">Selecciona una zona</option>
            <option value="Biblioteca central">Biblioteca central</option>
            <option value="Cafetería principal">Cafetería principal</option>
            <option value="Edificio de ingeniería">Edificio de ingeniería</option>
            <option value="Laboratorios">Laboratorios</option>
            <option value="Auditorio central">Auditorio central</option>
            <option value="Centro deportivo">Centro deportivo</option>
            <option value="Recepción principal">Recepción principal</option>
            <option value="Estacionamiento occidental">Estacionamiento occidental</option>
            <option value="Sala de cómputo">Sala de cómputo</option>
          </select>
          {errors.zone && (
            <p id="error-zona" role="alert" className="mt-2 text-[13px] font-medium text-lost-text">
              {errors.zone}
            </p>
          )}
          <p id="ayuda-zona" className="mt-1 text-[13px] text-muted">
            Selecciona la zona general del campus.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="fecha-objeto"
            className="block text-[14px] font-semibold text-ink"
          >
            Fecha aproximada
          </label>
          <p id="ayuda-fecha" className="mt-1 text-[13px] text-muted">
            Aproximadamente cuándo se perdió o se encontró.
          </p>
          <input
            id="fecha-objeto"
            type="date"
            value={date}
            max={getMaxDate()}
            onChange={(event) => {
              setDate(event.target.value);
              if (errors.date) setErrors((c) => ({ ...c, date: undefined }));
            }}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? "error-fecha" : "ayuda-fecha"}
            className={`mt-2 h-12 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 ${
              errors.date ? "border-lost-text" : "border-line focus:border-forest-500"
            }`}
          />
          {errors.date && (
            <p id="error-fecha" role="alert" className="mt-2 text-[13px] font-medium text-lost-text">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      {/* Código de referencia ----------------------------------------------- */}
      <div>
        <label
          htmlFor="reference-code"
          className="block text-[14px] font-semibold text-ink"
        >
          Código de referencia
        </label>
        <p id="ayuda-reference" className="mt-1 text-[13px] text-muted">
          Código único para identificar tu reporte. Se genera automáticamente.
        </p>
        <input
          id="reference-code"
          type="text"
          value={referenceCode}
          readOnly
          className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-3.5 text-[15px] text-ink font-mono text-sm"
        />
      </div>

      {/* Fotografía opcional ------------------------------------------------ */}
      <div>
        <span className="block text-[14px] font-semibold text-ink">
          Fotografía{" "}
          <span className="font-normal text-muted">(opcional)</span>
        </span>
        <p id="ayuda-foto" className="mt-1 text-[13px] text-muted">
          JPG, PNG o WebP de hasta 5 MB. Si no tienes una, el registro funciona
          igual.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label
            htmlFor="foto-objeto"
            className="btn btn-secondary cursor-pointer"
          >
            <IconImage className="h-4 w-4" />
            {photo ? "Cambiar imagen" : "Elegir imagen"}
          </label>
          <input
            id="foto-objeto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhoto}
            aria-describedby={errors.photo ? "error-foto" : "ayuda-foto"}
            className="sr-only"
          />

          {photo && (
            <button
              type="button"
              onClick={() => {
                clearPreview();
                setPhoto(null);
                setErrors((current) => ({ ...current, photo: undefined }));
              }}
              className="inline-flex items-center gap-1.5 rounded-lg text-[13.5px] font-semibold text-muted transition-colors duration-200 hover:text-ink"
            >
              <IconTrash className="h-4 w-4" />
              Quitar imagen
            </button>
          )}
        </div>

        {preview && (
          <div className="relative mt-4 aspect-[4/3] w-40 overflow-hidden rounded-xl border border-line bg-canvas">
            <Image
              src={preview}
              alt="Previsualización de la imagen seleccionada"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        {errors.photo && (
          <p id="error-foto" role="alert" className="mt-2 text-[13px] font-medium text-lost-text">
            {errors.photo}
          </p>
        )}
      </div>

      {/* Avisos y envío ----------------------------------------------------- */}
      <div className="space-y-3">
        <p className="flex items-start gap-2.5 rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[13px] leading-relaxed text-muted">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
          <span>
            Publicar este reporte no reemplaza la recepción física del objeto:
            sigue llevándolo al punto de custodia institucional.
          </span>
        </p>

        <p className="flex items-start gap-2.5 rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[13px] leading-relaxed text-muted">
          <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
          <span>
            No incluyas documentos, número de cédula ni datos de contacto en la
            descripción. El personal autorizado gestionará la entrega de forma segura.
          </span>
        </p>
      </div>

      {/* Mensajes de error/estado */}
      {errorMessage && (
        <p role="alert" className="rounded-xl border border-lost-text bg-lost-surface px-4 py-3 text-[13px] text-lost-text">
          <strong>Error:</strong> {errorMessage}
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn btn-primary w-full sm:w-auto"
        >
          {status === "sending" ? (
            "Enviando…"
          ) : (
            <>
              <IconSend className="h-4 w-4" />
              Enviar reporte
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={status === "sending"}
          className="btn btn-secondary w-full sm:w-auto"
        >
          Cancelar
        </button>

        <Link
          href="/objetos"
          className="inline-flex items-center justify-center rounded-xl px-2 py-3 text-[14px] font-semibold text-muted transition-colors duration-200 hover:text-ink"
        >
          Volver al catálogo
        </Link>
      </div>
    </form>
  );
}