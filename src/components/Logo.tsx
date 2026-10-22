/**
 * Identidad de FindIt Campus.
 *
 * El símbolo es un pin de localización abstracto que contiene un rombo
 * geométrico: la referencia al objeto recuperado dentro del lugar donde se
 * custodia. Es deliberadamente simple para poder reutilizarse como favicon
 * o en materiales impressos.
 */

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 2.4c-4.83 0-8.75 3.92-8.75 8.75 0 6.42 7.42 12.9 7.74 13.16a1.36 1.36 0 0 0 1.93 0c.32-.26 7.83-6.74 7.83-13.16 0-4.83-3.92-8.75-8.75-8.75Z"
        fill="#4F7CFF"
      />
      <path d="M16 8.05 20.25 12 16 15.95 11.75 12 16 8.05Z" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span
          className={`text-[15px] font-semibold tracking-[-0.015em] ${
            tone === "dark" ? "text-white" : "text-ink"
          }`}
        >
          FindIt
        </span>
        {/* El espacio mantiene el nombre accesible completo ("FindIt Campus"). */}
        {" "}
        <span
          className={`mt-[3px] text-[9.5px] font-medium uppercase tracking-[0.2em] ${
            tone === "dark" ? "text-white/55" : "text-muted"
          }`}
        >
          Campus
        </span>
      </span>
    </span>
  );
}
