import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Validaciones básicas
  if (!email || !password || !confirmPassword) {
    return NextResponse.redirect(
      new URL("/registro?error=missing_fields", request.url)
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(
      new URL("/registro?error=password_mismatch", request.url)
    );
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      new URL("/registro?error=password_short", request.url)
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("Error en registro:", error);
    return NextResponse.redirect(
      new URL("/registro?error=registration_failed", request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/login?message=check_email", request.url)
  );
}