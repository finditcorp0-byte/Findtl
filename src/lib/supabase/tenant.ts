/**
 * Helpers multi-tenant para FindIt Campus.
 * Identifica administradores globales por correo y valida membresías.
 */

export const GLOBAL_ADMIN_EMAILS = [
  "roberpar9@gmail.com",
  "juansilgadomarrugo@gmail.com",
] as const;

export function isGlobalAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (GLOBAL_ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());
}
