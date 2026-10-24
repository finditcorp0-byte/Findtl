import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Accede a tu cuenta institucional para publicar y recuperar objetos en FindIt Campus.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage() {
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
              Iniciar sesión
            </h1>
            <p className="mt-2 text-[15px] leading-[1.7] text-muted">
              Accede con tu cuenta institucional para publicar y recuperar objetos.
            </p>
          </div>

          <div className="space-y-4">
            <form action="/api/auth/login" method="POST" className="space-y-4">
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
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted focus:border-forest-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
              >
                Iniciar sesión
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-muted">
                  O continúa con
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                }
              })}
              className="btn btn-secondary w-full"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.29H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.7c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23c4.42 0 7.99-2.93 9.02-6.99z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.79 1 4.5 3.09 3.17 5.5l.27.38c.96.96 2.37 1.44 3.9 1.44z"/>
              </svg>
              <span>Continuar con Google</span>
            </button>

            <p className="text-center text-sm text-muted mt-4">
              Al continuar, aceptas nuestros
              <a href="/terminos" className="underline hover:text-forest-700"> T&eacute;rminos de servicio </a>
              y
              <a href="/privacidad" className="underline hover:text-forest-700"> Pol&iacute;tica de privacidad </a>
            </p>
          </div>

          <p className="mt-8 text-center text-sm text-muted">
            ¿No tienes cuenta?
            <Link href="/registro" className="ml-1 font-semibold text-forest-700 hover:text-forest-800">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";