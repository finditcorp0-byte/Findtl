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
import { ObjectGallery } from "@/components/ObjectGallery";
import { ClaimModalTrigger } from "@/components/ClaimModalWrapper/ClaimModalWrapper";
import { getObjectById } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const object = await getObjectById(id);

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

export async function generateStaticParams() {
  // No generamos rutas estáticas para datos dinámicos
  return [];
}

export default async function DetalleObjetoPage({ params }: PageProps) {
  const { id } = await params;
  const object = await getObjectById(id);

  if (!object) notFound();

  // Verificar si hay usuario autenticado
  const supabase = await createClient();
  await supabase.auth.getUser();
  
  const isPerdido = object.kind === "perdido";

  const facts = [
    {
      icon: IconPin,
      label: "Zona",
      value: object.zone ?? "—",
    },
    {
      icon: IconTag,
      label: "Ubicación exacta",
      value: object.location ?? "—",
    },
    {
      icon: IconCalendar,
      label: "Publicado",
      value: object.publishedOn
        ? `${object.publishedOn} · ${object.daysAgo === 0 ? "Hoy" : object.daysAgo === 1 ? "Ayer" : `Hace ${object.daysAgo} días`}`
        : "—",
    },
    {
      icon: IconShield,
      label: "Punto de custodia",
      value: object.custodyPoint ?? "—",
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
                  {object.kind === "perdido" ? "Perdido" : "Encontrado"}
                </span>

                <span className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-medium text-muted">
                  {object.category}
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
                <ClaimModalTrigger
                  objectId={object.id}
                  objectKind={object.kind === "perdido" ? "perdido" : "encontrado"}
                />
              </div>

              <p className="mt-8 rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
                <strong className="font-semibold text-ink">Registro público.</strong>{" "}
                Este objeto está publicado en el catálogo oficial. El expediente
                <span className="font-medium text-ink">{object.reference}</span> y
                el punto de custodia <span className="font-medium text-ink">{object.campusName}</span>{" "}
                forman parte del registro institucional.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}