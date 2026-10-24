import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Panel de Administración",
  description: "Panel de administración institucional para gestionar reclamaciones y objetos",
  alternates: { canonical: "/admin" },
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  // Verificar que el usuario tiene rol de admin
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, institution_id")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const isAdmin = memberships?.some(m =>
    ["institution_admin", "custody_staff", "reviewer"].includes(m.role)
  );

  if (!isAdmin) {
    notFound();
  }

  const adminInstitutionId = memberships?.find(m =>
    ["institution_admin", "custody_staff", "reviewer"].includes(m.role)
  )?.institution_id;

  // Obtener reclamaciones pendientes de revisión
  const { data: pendingReviews } = await supabase
    .from("recovery_requests")
    .select(`
      id,
      object_id,
      claimant_id,
      claimed_at,
      description,
      state,
      object:objects!recovery_requests_object_id_fkey (
        id,
        title,
        kind,
        state,
        reference_code
      )
    `)
    .eq("state", "pending")
    .eq("object.institution_id", adminInstitutionId)
    .order("claimed_at", { ascending: true });

  // Obtener reclamaciones que necesitan más información
  const { data: needsMoreInfo } = await supabase
    .from("recovery_requests")
    .select(`
      id,
      object_id,
      claimant_id,
      claimed_at,
      description,
      state,
      object:objects!recovery_requests_object_id_fkey (
        id,
        title,
        kind,
        state,
        reference_code
      )
    `)
    .eq("state", "needs_more_info")
    .eq("object.institution_id", adminInstitutionId)
    .order("claimed_at", { ascending: true });

  // Obtener entregas pendientes de preparación
  const { data: pendingDeliveries } = await supabase
    .from("deliveries")
    .select(`
      id,
      recovery_request_id,
      prepared_at,
      delivery_point,
      qr_expires_at,
      recovery_request:recovery_requests!deliveries_recovery_request_id_fkey (
        id,
        claimant_id,
        object_id,
        object:objects!recovery_requests_object_id_fkey (
          id,
          title,
          reference_code
        )
      )
    `)
    .eq("prepared_by", user.id)
    .is("delivered_at", null)
    .order("prepared_at", { ascending: true });

  return (
    <>
      <Navbar />

      <main id="contenido">
        <div className="container-page pb-20 pt-8 sm:pt-10">
          <header className="max-w-2xl">
            <p className="eyebrow">
              <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
              Panel de Administración
            </p>

            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.7rem]">
              Panel de Administración
            </h1>

            <p className="mt-2 text-[16px] leading-[1.7] text-muted">
              Gestión de reclamaciones, objetos y entregas para tu institución.
            </p>
          </header>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
            <div className="space-y-8">
              {/* Reclamaciones pendientes de revisión */}
              <section aria-labelledby="pendientes-titulo">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
                  <div>
                    <h2 id="pendientes-titulo" className="text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[1.9rem]">
                      Reclamaciones pendientes de revisión
                    </h2>
                    <p className="mt-1 text-[15px] leading-[1.7] text-muted">
                      {pendingReviews?.length ?? 0} reclamación{pendingReviews?.length !== 1 ? "es" : ""} pendiente{pendingReviews?.length !== 1 ? "s" : ""} de revisión
                    </p>
                  </div>
                </header>

                {pendingReviews && pendingReviews.length > 0 ? (
                  <ul className="mt-6 space-y-4">
                    {pendingReviews.map((claim) => (
                      <li key={claim.id} className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                              claim.state === "pending" ? "badge-info" :
                              claim.state === "needs_more_info" ? "badge-warning" :
                              "badge-default"
                            }`}>
                              {claim.state === "pending" && (
                                <span className="h-1.5 w-1.5 rounded-full bg-info-text" />
                              )}
                              {claim.state === "pending" ? "Pendiente" : "Necesita más info"}
                            </span>
                            <Link
                              href={`/objetos/${claim.object?.[0]?.id}`}
                              className="text-[14px] font-medium text-ink hover:text-forest-700"
                            >
                              {claim.object?.[0]?.title ?? "Objeto #" + claim.object_id.slice(0, 8)}
                            </Link>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <time className="text-[13px] text-muted shrink-0">
                              {claim.claimed_at ? new Date(claim.claimed_at).toLocaleDateString("es-ES", {
                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                              }) : "—"}
                            </time>
                            <button
                              className="btn btn-primary shrink-0"
                              onClick={() => {
                                // TODO: Abrir modal de revisión
                              }}
                            >
                              Revisar
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-4 text-[1.1rem] font-semibold text-ink">
                      No hay reclamaciones pendientes
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.7] text-muted">
                      Todas las reclamaciones han sido revisadas.
                    </p>
                  </div>
                )}
              </section>

              {/* Solicitudes que necesitan más información */}
              {needsMoreInfo && needsMoreInfo.length > 0 && (
                <section className="mt-10" aria-labelledby="necesitan-titulo">
                  <header className="mb-6">
                    <h2 id="necesitan-titulo" className="text-[1.1rem] font-semibold text-ink">
                      Necesitan más información ({needsMoreInfo.length})
                    </h2>
                  </header>
                  <ul className="space-y-4">
                    {needsMoreInfo.map((claim) => (
                      <li key={claim.id} className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold badge-warning">
                              <span className="h-1.5 w-1.5 rounded-full bg-warning-text" />
                              Necesita más info
                            </span>
                            <Link
                              href={`/objetos/${claim.object?.[0]?.id}`}
                              className="text-[14px] font-medium text-ink hover:text-forest-700"
                            >
                              {claim.object?.[0]?.title ?? "Objeto #" + claim.object_id.slice(0, 8)}
                            </Link>
                          </div>
                          <button
                            className="btn btn-primary shrink-0"
                            onClick={() => {
                              // TODO: Abrir modal para responder
                            }}
                          >
                            Responder
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Entregas pendientes */}
              <section aria-labelledby="entregas-titulo" className="mt-10">
                <header className="mb-6">
                  <h2 id="entregas-titulo" className="text-[1.35rem] font-semibold text-ink">
                    Entregas pendientes de preparación ({pendingDeliveries?.length ?? 0})
                  </h2>
                </header>

                {pendingDeliveries && pendingDeliveries.length > 0 ? (
                  <ul className="space-y-4">
                    {pendingDeliveries.map((delivery) => (
                      <li key={delivery.id} className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold badge-info">
                              <span className="h-1.5 w-1.5 rounded-full bg-info-text" />
                              Preparada
                            </span>
                            <Link
                              href={`/objetos/${delivery.recovery_request?.[0]?.object?.[0]?.id}`}
                              className="text-[14px] font-medium text-ink hover:text-forest-700"
                            >
                              {delivery.recovery_request?.[0]?.object?.[0]?.title ?? "Objeto #" + delivery.recovery_request?.[0]?.object_id?.slice(0, 8)}
                            </Link>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2 text-[13px] text-muted">
                              <svg className="h-4 w-4 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Expira: {delivery.qr_expires_at ? new Date(delivery.qr_expires_at).toLocaleString("es-ES", {
                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                              }) : "—"}</span>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <button
                                type="button"
                                className="btn btn-primary w-full sm:w-auto"
                                onClick={() => {
                                  // TODO: Confirmar entrega
                                }}
                              >
                                Confirmar entrega
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary w-full sm:w-auto"
                                onClick={() => {
                                  // TODO: Revocar QR
                                }}
                              >
                                Revocar QR
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-4 text-[1.1rem] font-semibold text-ink">
                      No hay entregas pendientes
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-muted">
                      Cuando prepares entregas, aparecerán aquí.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  <svg className="h-4 w-4 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Acciones rápidas
                </h2>

                <ul className="mt-4 space-y-2">
                  <Link
                    href="/publicar"
                    className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-semibold text-ink transition-colors duration-200 hover:bg-canvas"
                  >
                    <svg className="h-4 w-4 text-forest-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Publicar objeto
                  </Link>

                  <Link
                    href="/objetos"
                    className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
                  >
                    <svg className="h-5 w-5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m4-10l4-4m0 0l4 4m-4-4l-4-4" />
                    </svg>
                    Ver catálogo
                  </Link>

                  <Link
                    href="/perfil"
                    className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
                  >
                    <svg className="h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Mi perfil
                  </Link>

                  <Link
                    href="/perfil/configuracion"
                    className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
                  >
                    <svg className="h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.92-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.92 0 3.35a1.724 1.724 0 00-1.066 2.573c1.543.426 1.756 2.92 0 3.35a1.724 1.724 0 00-1.066 2.573c-1.543.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.426 1.756-2.92 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543-.426-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                    Configuración
                  </Link>

                  <Link
                    href="/perfil/notificaciones"
                    className="flex items-center gap-3 rounded-xl p-3 text-[14px] font-medium text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
                  >
                    <svg className="h-5 w-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 21l4.243-4.243A12.062 12.062 0 0010.555 21c2.34 0 4.378-.883 5.842-2.36 1.464-1.46 2.297-3.54 2.297-5.74z" />
                    </svg>
                    Notificaciones
                  </Link>

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
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}