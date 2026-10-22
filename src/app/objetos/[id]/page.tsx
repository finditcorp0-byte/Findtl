import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import {
  IconCalendar,
  IconChevronLeft,
  IconPin,
  IconShield,
  IconTag,
} from "@/components/icons";
import { Navbar } from "@/components/Navbar";
import { ObjectActions } from "@/components/ObjectActions";
import { ObjectCard } from "@/components/ObjectCard";
import { ObjectGallery } from "@/components/ObjectGallery";
import {
  CATEGORY_LABELS,
  DEMO_OBJECTS,
  KIND_LABELS,
  campusName,
  findDemoObject,
  formatAge,
  formatDate,
} from "@/lib/demo-objects";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return DEMO_OBJECTS.map((object) => ({ id: object.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const object = findDemoObject(id);

  if (!object) {
    return {
      title: "Objeto no encontrado",
      robots: { index: false },
    };
  }

  return {
    title: object.title,
    description: object.description,
    openGraph: {
      title: `${object.title} | FindIt Campus`,
      description: object.description,
      type: "article",
    },
  };
}

export default async function DetalleObjetoPage({ params }: PageProps) {
  const { id } = await params;
  const object = findDemoObject(id);

  if (!object) notFound();

  const isPerdido = object.kind === "perdido";
  const related = DEMO_OBJECTS.filter(
    (candidate) => candidate.category === object.category && candidate.id !== object.id,
  ).slice(0, 3);

  const facts = [
    {
      icon: IconPin,
      label: "Zona",
      value: object.zone,
    },
    {
      icon: IconTag,
      label: "Ubicación exacta",
      value: object.location,
    },
    {
      icon: IconCalendar,
      label: "Publicado",
      value: `${formatDate(object.publishedOn)} · ${formatAge(object.daysAgo)}`,
    },
    {
      icon: IconShield,
      label: "Punto de custodia",
      value: object.custodyPoint,
    },
  ];

  return (
    <>
      <Navbar />

      <main id="contenido">
        <div className="container-page pb-20 pt-8 sm:pt-10">
          <Link
            href="/objetos"
            className="inline-flex items-center gap-1.5 rounded-lg text-[13.5px] font-semibold text-muted transition-colors duration-200 hover:text-forest-800"
          >
            <IconChevronLeft className="h-4 w-4" />
            Volver al catálogo
          </Link>

          <div className="mt-7 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <ObjectGallery images={object.images} title={object.title} />

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
                    isPerdido ? "badge-perdido" : "badge-encontrado"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      isPerdido ? "bg-lost-text" : "bg-found-text"
                    }`}
                  />
                  {KIND_LABELS[object.kind]}
                </span>

                <span className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-medium text-muted">
                  {CATEGORY_LABELS[object.category]}
                </span>
              </div>

              <h1 className="mt-5 text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[2.4rem]">
                {object.title}
              </h1>

              <p className="mt-5 text-[16px] leading-[1.75] text-muted">
                {object.description}
              </p>

              <dl className="mt-8 grid gap-x-8 gap-y-5 border-y border-line py-6 sm:grid-cols-2">
                {facts.map((fact) => {
                  const Icon = fact.icon;

                  return (
                    <div key={fact.label} className="flex gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                      <div>
                        <dt className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                          {fact.label}
                        </dt>
                        <dd className="mt-1 text-[14.5px] leading-snug text-ink">
                          {fact.value}
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>

              <div className="mt-8">
                <ObjectActions object={object} />
              </div>

              <p className="mt-8 rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
                <strong className="font-semibold text-ink">Registro de demostración.</strong>{" "}
                Este objeto y sus datos son ficticios. La institución, el
                expediente <span className="font-medium text-ink">{object.reference}</span> y
                el punto de custodia <span className="font-medium text-ink">{campusName(object.campus)}</span>{" "}
                forman parte del contenido de ejemplo del producto.
              </p>
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-20" aria-labelledby="relacionados-titulo">
              <h2
                id="relacionados-titulo"
                className="text-[1.35rem] font-semibold tracking-[-0.02em] text-ink"
              >
                Objetos de la misma categoría
              </h2>

              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((candidate) => (
                  <li key={candidate.id}>
                    <ObjectCard object={candidate} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
