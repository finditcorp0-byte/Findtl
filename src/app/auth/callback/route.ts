import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isGlobalAdminEmail } from "@/lib/supabase/tenant";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      let finalNext = next;
      if (isGlobalAdminEmail(user?.email) && (next === "/" || !next)) {
        finalNext = "/admin";
      }
      return NextResponse.redirect(new URL(finalNext, request.url));
    }
  }

  // Si hay error, redirigir a login con mensaje de error
  return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
}