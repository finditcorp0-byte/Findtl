import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Regístrate en FindIt Campus con tu cuenta institucional para publicar y recuperar objetos.",
  alternates: { canonical: "/registro" },
};

export default async function RegistroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si ya hay sesión, redirigir a la página de inicio
  if (user) {
    return <script dangerouslySetInnerHTML={{ __html: 'window.location.href = "/"' }} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-[1.5rem] border border-line bg-white p-7 shadow-soft sm:p-9">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <svg className="mx-auto h-10 w-10 text-forest-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </Link>
            <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-ink">
              Crear cuenta
            </h1>
            <p className="mt-2 text-[15px] leading-[1.7] text-muted">
              Regístrate con tu correo institucional para acceder a FindIt Campus.
            </p>
          </div>

          <div className="space-y-4">
            <form action="/api/auth/register" method="POST" className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[14px] font-semibold text-ink"
                >
                  Correo institucional
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tu@universidad.edu"
                  className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted focus:border-forest-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[14px] font-semibold text-ink"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted focus:border-forest-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[14px] font-semibold text-ink"
                >
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Repite la contraseña"
                  className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted focus:border-forest-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
              >
                Crear cuenta
              </button>
            </form>

            <p className="text-center text-sm text-muted mt-4">
              Al registrarte, aceptas nuestros
              <a href="/terminos" className="underline hover:text-forest-700"> T&eacute;rminos de servicio </a>
              y
              <a href="/privacidad" className="underline hover:text-forest-700"> Pol&iacute;tica de privacidad </a>
            </p>
          </div>

          <p className="mt-8 text-center text-sm text-muted">
            ¿Ya tienes cuenta?
            <Link href="/login" className="ml-1 font-semibold text-forest-700 hover:text-forest-800">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";