import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const GLOBAL_ADMIN_EMAILS = [
  "roberpar9@gmail.com",
  "juansilgadomarrugo@gmail.com",
];

const PROTECTED_PATHS = ["/admin", "/publicar", "/perfil"];
const ADMIN_ROLES = ["institution_admin", "custody_staff", "reviewer"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refrescar la sesión - esto mantiene la sesión activa
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Protección de rutas de administración: validar rol
  if (path.startsWith("/admin") && user) {
    const isGlobalAdmin = GLOBAL_ADMIN_EMAILS.includes((user.email ?? "").toLowerCase());
    let hasAdminRole = false;

    if (!isGlobalAdmin) {
      const { data: memberships } = await supabase
        .from("memberships")
        .select("role")
        .eq("profile_id", user.id)
        .eq("is_active", true);

      hasAdminRole = (memberships ?? []).some((m) =>
        ADMIN_ROLES.includes(m.role)
      );
    }

    if (!isGlobalAdmin && !hasAdminRole) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
