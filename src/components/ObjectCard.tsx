import { IconArrowRight, IconPin } from "@/components/icons";
import { ObjectArt } from "@/components/illustrations";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type DemoObject,
} from "@/lib/demo-objects";

export function ObjectCard({
  object,
  onSelect,
}: {
  object: DemoObject;
  onSelect: (object: DemoObject) => void;
}) {
  const isAvailable = object.status === "disponible";

  return (
    <article className="group surface flex h-full flex-col p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lift focus-within:border-brand/40">
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-canvas transition-colors duration-300 group-hover:bg-brand/10">
            <ObjectArt art={object.art} className="h-16 w-16 text-ink" />
          </div>
          <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            {CATEGORY_LABELS[object.category]}
          </span>
        </div>

        <h3 className="mt-4 text-[15.5px] font-semibold tracking-[-0.01em] text-ink">
          {object.name}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
          {object.description}
        </p>

        <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
          <IconPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-strong" />
          {object.location}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
            isAvailable
              ? "bg-brand/10 text-brand-strong"
              : "bg-canvas text-muted"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              isAvailable ? "bg-brand" : "bg-muted"
            }`}
          />
          {STATUS_LABELS[object.status]}
        </span>

        <button
          type="button"
          onClick={() => onSelect(object)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2.5 text-[13px] font-semibold text-brand-strong transition-colors duration-200 hover:bg-brand/10"
        >
          Ver detalles
          <IconArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
