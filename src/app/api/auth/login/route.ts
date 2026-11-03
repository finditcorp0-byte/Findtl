import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isGlobalAdminEmail } from "@/lib/supabase/tenant";

function getSafeNext(next: string | null): string {
  if (!next) return "/";
  // Prevenir open redirects: solo rutas internas
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = getSafeNext((formData.get("next") as string) || request.nextUrl.searchParams.get("next"));

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(`/login?error=missing_fields&next=${encodeURIComponent(next)}`, request.url)
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error en login:", error);
    return NextResponse.redirect(
      new URL(`/login?error=invalid_credentials&next=${encodeURIComponent(next)}`, request.url)
    );
  }

  // Priorizar /admin para administradores globales
  let finalNext = next;
  if (isGlobalAdminEmail(data.user?.email) && (next === "/" || !next)) {
    finalNext = "/admin";
  }

  return NextResponse.redirect(new URL(finalNext, request.url));
}
