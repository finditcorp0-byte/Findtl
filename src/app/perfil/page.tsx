import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ObjectCard } from "@/components/ObjectCard";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getUserClaims, getUserPublishedObjects } from "@/lib/supabase/queries";
import type { DemoObject } from "@/lib/demo-objects";

export const metadata: Metadata = {
  title: "Mi Perfil",
  description: "Gestiona tu perfil, historial de reclamaciones y objetos publicados",
  alternates: { canonical: "/perfil" },
};

/**
 * Convierte un objeto de la BD al formato DemoObject para ObjectCard.
 */
function toDemoObject(obj: {
  id: string;
  title: string;
  description: string;
  kind: string;
  state: string;
  zone: string | null;
  location: string | null;
  reported_at: string;
  published_at: string | null;
  reference_code: string;
  custody_point: string | null;
  institution_id: string;
  category_id: string | null;
  created_at: string;
}): DemoObject {
  const publishedAt = obj.published_at ?? obj.created_at;
  const publishedDate = publishedAt ? new Date(publishedAt) : new Date();
  const today = new Date();
  const diffTime = today.getTime() - publishedDate.getTime();
  const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const kind = obj.kind === "lost" ? "perdido" : "encontrado";

  return {
    id: obj.id,
    title: obj.title,
    description: obj.description,
    kind: kind as "perdido" | "encontrado",
    category: "otros" as const, // Placeholder
    zone: obj.zone ?? "",
    location: obj.location ?? "",
    publishedOn: publishedAt ? publishedAt.split("T")[0] : new Date().toISOString().split("T")[0],
    daysAgo: Math.max(0, daysAgo),
    images: [],
    custodyPoint: obj.custody_point ?? "",
    reference: obj.reference_code,
    campus: obj.institution_id,
  };
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/perfil");
  }

  const [profile, claims, publishedObjects] = await Promise.all([
    getUserProfile(user.id),
    getUserClaims(user.id),
    getUserPublishedObjects(user.id),
  ]);

  if (!profile) {
    notFound();
  }

  const [activeClaims, resolvedClaims] = claims.reduce(
    (acc, claim) => {
      if (["pending", "needs_more_info"].includes(claim.state)) {
        acc[0].push(claim);
      } else {
        acc[1].push(claim);
      }
      return acc;
    },
    [[] as typeof claims, [] as typeof claims]
  );

  return (
    <>
      <Navbar />

      <main id="contenido">
        <div className="container-page pb-20 pt-8 sm:pt-10">
          <header className="max-w-2xl">
            <p className="eyebrow">
              <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
              Mi perfil
            </p>

            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.7rem]">
              {profile.full_name ?? "Usuario"}
            </h1>

            <p className="mt-2 text-[16px] leading-[1.7] text-muted">
              {profile.email ?? "Sin correo registrado"}
            </p>
          </header>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:gap-14">
            <div className="space-y-8">
              {/* Mis objetos publicados */}
              <section aria-labelledby="mis-objetos-titulo">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 id="mis-objetos-titulo" className="text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[1.9rem]">
                      Mis objetos publicados
                    </h2>
                    <p className="mt-1 text-[15px] leading-[1.7] text-muted">
                      {publishedObjects.length} objeto{publishedObjects.length !== 1 ? "s" : ""} publicado{publishedObjects.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <a
                    href="/publicar"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-1 py-2 text-[14.5px] font-semibold text-forest-700 transition-colors duration-200 hover:text-forest-900"
                  >
                    Publicar objeto
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </a>
                </header>

                {publishedObjects.length > 0 ? (
                  <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {publishedObjects.map((obj) => (
                      <li key={obj.id}>
                        <ObjectCard object={toDemoObject(obj)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8-4m0-10L4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-4 text-[1.1rem] font-semibold text-ink">
                      No tienes objetos publicados
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-muted max-w-xs mx-auto">
                      Publica tu primer objeto perdido o encontrado para que aparezca aquí.
                    </p>
                    <a
                      href="/publicar"
                      className="mt-6 inline-flex items-center gap-1.5 rounded-xl px-1 py-2 text-[14.5px] font-semibold text-forest-700 transition-colors duration-200 hover:text-forest-900"
                    >
                      Publicar mi primer objeto
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </a>
                  </div>
                )}
              </section>

              {/* Historial de reclamaciones */}
              <section aria-labelledby="mis-reclamaciones-titulo" className="mt-10">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 id="mis-reclamaciones-titulo" className="text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[1.9rem]">
                      Mis reclamaciones
                    </h2>
                    <p className="mt-1 text-[15px] leading-[1.7] text-muted">
                      {claims.length} reclamación{claims.length !== 1 ? "es" : ""} en total
                    </p>
                  </div>
                </header>

                {/* Reclamaciones activas */}
                {activeClaims.length > 0 && (
                  <section className="mt-6" aria-labelledby="activas-titulo">
                    <h3 id="activas-titulo" className="text-[1.1rem] font-semibold text-ink">
                      En curso ({activeClaims.length})
                    </h3>
                    <ul className="mt-4 space-y-4">
                      {activeClaims.map((claim) => (
                        <li key={claim.id} className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                                claim.state === "needs_more_info" ? "badge-warning" :
                                claim.state === "pending" ? "badge-info" :
                                "badge-default"
                              }`}>
                                {claim.state === "needs_more_info" && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-warning-text" />
                                )}
                                {claim.state === "pending" && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-info-text" />
                                )}
                                {claim.state === "needs_more_info" ? "Necesita más info" :
                                 claim.state === "pending" ? "Pendiente" :
                                 claim.state}
                            </span>
                            <span className="text-[14px] font-medium text-ink">
                              {claim.object?.[0]?.title ?? "Objeto #" + claim.object_id.slice(0, 8)}
                            </span>
                          </div>

                          {claim.state === "needs_more_info" && (
                            <button
                              onClick={() => {
                                // TODO: Abrir modal para responder
                              }}
                              className="btn btn-primary shrink-0"
                            >
                              Responder
                            </button>
                          )}

                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {/* Reclamaciones resueltas */}
              {resolvedClaims.length > 0 && (
                <section className="mt-10" aria-labelledby="resueltas-titulo">
                  <h3 id="resueltas-titulo" className="text-[1.1rem] font-semibold text-ink">
                    Resueltas ({resolvedClaims.length})
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {resolvedClaims.map((claim) => (
                      <li key={claim.id} className="rounded-[1.25rem] border border-line bg-white p-4 shadow-soft">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                              claim.state === "approved" ? "badge-success" :
                              claim.state === "rejected" ? "badge-danger" :
                              claim.state === "delivered" ? "badge-success" :
                              "badge-default"
                            }`}>
                              {claim.state === "approved" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-success-text" />
                              )}
                              {claim.state === "rejected" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-danger-text" />
                              )}
                              {claim.state === "delivered" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-success-text" />
                              )}
                              {claim.state === "cancelled" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                              )}
                              {claim.state === "approved" ? "Aprobada" :
                               claim.state === "rejected" ? "Rechazada" :
                               claim.state === "delivered" ? "Entregada" :
                               claim.state === "cancelled" ? "Cancelada" :
                               claim.state}
                            </span>
                            <span className="text-[14px] font-medium text-ink">
                              {claim.object?.[0]?.title ?? "Objeto #" + claim.object_id.slice(0, 8)}
                            </span>
                          </div>
                          <time className="text-[13px] text-muted shrink-0">
                            {claim.reviewed_at ? new Date(claim.reviewed_at).toLocaleDateString("es-ES", {
                              day: "2-digit", month: "2-digit", year: "numeric"
                            }) : "—"}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {claims.length === 0 && (
                <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-[1.1rem] font-semibold text-ink">
                    No tienes reclamaciones
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-muted max-w-xs mx-auto">
                    Cuando reclames un objeto o alguien reclame uno tuyo, aparecerá aquí.
                  </p>
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">
                    {profile.full_name ?? "Usuario"}
                  </h3>
                  <p className="mt-2 text-[13px] text-muted">
                    {profile.email ?? "Sin correo"}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-line space-y-3">
                <a
                  href="/perfil/editar"
                  className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-ink transition-colors duration-200 hover:bg-canvas"
                >
                  <svg className="h-5 w-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar perfil
                </a>

                <a
                  href="/perfil/configuracion"
                  className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
                >
                  <svg className="h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.92-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.92 0 3.35a1.724 1.724 0 00-1.066 2.573c1.543.426 1.756 2.92 0 3.35a1.724 1.724 0 00-1.066 2.573c-1.543.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  Configuración
                </a>

                <a
                  href="/perfil/notificaciones"
                  className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
                >
                  <svg className="h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 21l4.243-4.243A12.062 12.062 0 0010.555 21c2.34 0 4.378-.883 5.842-2.36 1.464-1.46 2.297-3.54 2.297-5.74z" />
                  </svg>
                  Notificaciones
                </a>

                <button
                  type="button"
                  onClick={() => {
                    // TODO: Implementar logout
                  }}
                  className="w-full flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-lost-text transition-colors duration-200 hover:bg-lost-surface"
                >
                  <svg className="h-5 w-5 text-lost-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a2 2 0 012-2h2a2 2 0 012 2v2h2a2 2 0 012 2v2h2a2 2 0 002-2V9a2 2 0 00-2-2h-4" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
        </aside>
      </div>
      </div>
      </main>

      <Footer />
    </>
  );
}