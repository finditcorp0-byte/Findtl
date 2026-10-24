import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para el servidor (Server Components, Server Actions, Route Handlers).
 * Usa la clave pública (anon) y respeta RLS.
 * Lee/escribe cookies de autenticación desde `next/headers`.
 * No expone la clave service_role.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components pueden fallar al escribir cookies.
            // La sesión se mantiene igual; el navegador sincronizará en la siguiente petición.
          }
        },
      },
    }
  );
}

/**
 * Variante para Server Actions / Route Handlers donde sí se pueden escribir cookies.
 */
export async function createClientForServerAction() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}