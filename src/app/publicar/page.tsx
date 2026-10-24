import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { IconClipboard, IconShield } from "@/components/icons";
import { Navbar } from "@/components/Navbar";
import { ReportForm } from "@/components/ReportForm";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Publicar un objeto",
  description:
    "Reporta un objeto perdido o encontrado en tu campus. Requiere autenticación y membresía institucional activa.",
  alternates: { canonical: "/publicar" },
  openGraph: {
    title: "Publicar un objeto | FindIt Campus",
    description:
      "Reporta un objeto perdido o encontrado en tu campus. Requiere autenticación y membresía institucional activa.",
    url: "/publicar",
    type: "website",
  },
};

const STEPS = [
  {
    title: "Describe el objeto",
    description:
      "Nombre, categoría, zona y fecha aproximada son los datos que hacen posible reconocerlo.",
  },
  {
    title: "Entrégalo en recepción",
    description:
      "El reporte no reemplaza la recepción física: el objeto llega al punto de custodia institucional.",
  },
  {
    title: "El personal lo publica",
    description:
      "Personal autorizado revisa el registro antes de que aparezca en el catálogo.",
  },
];

export default async function PublicarPage() {
  const supabase = await createClient();

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();

  // Obtener categorías para el formulario
  const categories = await getCategories();

  // Verificar membresía activa si hay usuario
  let hasActiveMembership = false;
  if (user) {
    const { data: memberships } = await supabase
      .from("memberships")
      .select("institution_id, role, is_active")
      .eq("profile_id", user.id)
      .eq("is_active", true);
    hasActiveMembership = (memberships ?? []).length > 0;
  }

  return (
    <>
      <Navbar />

      <main id="contenido">
        <div className="container-page pb-20 pt-10 sm:pt-14">
          <header className="max-w-2xl">
            <p className="eyebrow">
              <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
              Reporte de objeto
            </p>

            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.7rem]">
              Publica un objeto perdido o encontrado
            </h1>

            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              Completa el formulario con los datos que recuerdas. Mientras más
              específico seas, más fácil será reconocer el objeto.
            </p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-14">
            <div className="rounded-[1.25rem] border border-line bg-white p-6 shadow-soft sm:p-8">
              {/* Si no hay usuario autenticado */}
              {!user && (
                <div className="rounded-2xl border-2 border-forest-200 bg-forest-50 p-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h10m-6-10V6a2 2 0 012-2h2a2 2 0 012 2v4" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-ink">
                        Inicio de sesión requerido
                      </h3>
                      <p className="mt-2 text-muted">
                        Para publicar un objeto, debes iniciar sesión con tu cuenta institucional.
                        Tu membresía activa en una institución es necesaria para crear el reporte.
                      </p>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <a
                          href="/api/auth/login"
                          className="btn btn-primary"
                        >
                          Iniciar sesión
                        </a>
                        <Link
                          href="/objetos"
                          className="btn btn-secondary"
                        >
                          Ver catálogo sin publicar
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Usuario autenticado pero sin membresía activa */}
              {user && !hasActiveMembership && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-ink">
                        Membresía institucional requerida
                      </h3>
                      <p className="mt-2 text-muted">
                        Tu cuenta está autenticada, pero no tienes una membresía activa en ninguna institución.
                        Contacta al administrador de tu campus para que te asocie una membresía activa
                        (rol: estudiante, personal de custodia, revisor o administrador).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de reporte - solo si hay usuario y membresía activa */}
              {user && hasActiveMembership && (
                <>
                  <ReportForm categories={categories} />
                  <p className="mt-4 flex items-start gap-2.5 rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
                    <span className="font-semibold text-ink">Importante:</span>{" "}
                    {"Este reporte crea el registro en estado "}
                    {"\""}
                    reportado{"\""}
                    {" El objeto solo se publicará en el catálogo después de que el personal de custodia lo reciba físicamente y el personal autorizado lo revise."}
                  </p>
                </>
              )}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  <IconClipboard className="h-4 w-4 text-forest-700" />
                  Qué pasa después
                </h2>

                <ol className="mt-4 space-y-4">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-[12px] font-semibold text-forest-700">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-[14px] font-semibold text-ink">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-[13px] leading-[1.65] text-muted">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-4 flex items-start gap-2.5 rounded-[1.25rem] border border-line bg-canvas px-4 py-3.5 text-[12.5px] leading-relaxed text-muted">
                <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                <span>
                  Nadie entrega un objeto a un desconocido ni se intercambian
                  datos de contacto en el catálogo. La entrega la realiza el
                  personal autorizado.
                </span>
              </p>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}