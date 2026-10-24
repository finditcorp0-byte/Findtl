/**
 * Tipos TypeScript derivados del esquema SQL real (migraciones 001-008).
 * No inventar columnas: cada campo corresponde a una columna real en la BD.
 * Sincronizar manualmente cuando cambien las migraciones.
 */

/* ============================================================
 * Tablas base
 * ============================================================ */

export interface Institution {
  id: string;                    // uuid PK
  name: string;                  // text NOT NULL
  legal_name: string | null;     // text
  city: string;                  // text NOT NULL
  country: string;               // text NOT NULL (ej. "CO")
  email_domain: string | null;   // text
  logo_url: string | null;       // text
  settings: Record<string, unknown>; // jsonb NOT NULL (default '{}')
  is_active: boolean;            // boolean NOT NULL
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export interface Campus {
  id: string;                    // uuid PK
  institution_id: string;        // uuid FK -> institutions
  name: string;                  // text NOT NULL
  address: string | null;        // text
  city: string;                  // text NOT NULL
  is_active: boolean;            // boolean NOT NULL
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export interface Profile {
  id: string;                    // uuid PK (referencia auth.users)
  full_name: string | null;      // text
  avatar_url: string | null;     // text
  is_active: boolean;            // boolean NOT NULL
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export interface ProfilePrivate {
  profile_id: string;            // uuid PK FK -> profiles
  email: string;                 // text NOT NULL
  phone: string | null;          // text
  document_type: string | null;  // text (ej. "CC", "TI", "PA")
  document_number: string | null;// text
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export type MembershipRole =
  | "student"
  | "custody_staff"
  | "reviewer"
  | "institution_admin";

export interface Membership {
  id: string;                    // uuid PK
  profile_id: string;            // uuid FK -> profiles
  institution_id: string;        // uuid FK -> institutions
  campus_id: string | null;      // uuid FK -> campuses
  role: MembershipRole;          // text NOT NULL
  is_primary: boolean;           // boolean NOT NULL
  is_active: boolean;            // boolean NOT NULL
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export interface Category {
  id: string;                    // uuid PK
  institution_id: string | null; // uuid FK -> institutions (NULL = global)
  name: string;                  // text NOT NULL
  slug: string;                  // text NOT NULL (unique por institución)
  description: string | null;    // text
  sort_order: number | null;     // integer
  is_active: boolean;            // boolean NOT NULL
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export type ObjectKind = "lost" | "found";

export type ObjectState =
  | "reported"
  | "published"
  | "in_custody"
  | "delivery_prepared"
  | "delivered"
  | "closed";

export interface Object {
  id: string;                    // uuid PK
  institution_id: string;        // uuid FK -> institutions
  campus_id: string | null;      // uuid FK -> campuses
  category_id: string | null;    // uuid FK -> categories
  reporter_id: string;           // uuid FK -> profiles
  kind: ObjectKind;              // text NOT NULL ('lost' | 'found')
  title: string;                 // text NOT NULL
  description: string;           // text NOT NULL
  zone: string | null;           // text
  location: string | null;       // text
  reported_at: string;           // timestamptz NOT NULL
  state: ObjectState;            // text NOT NULL
  custody_point: string | null;  // text
  reference_code: string;        // text NOT NULL (unique por institución)
  custody_received_at: string | null; // timestamptz
  custody_received_by: string | null; // uuid FK -> profiles
  published_at: string | null;   // timestamptz
  published_by: string | null;   // uuid FK -> profiles
  closed_at: string | null;      // timestamptz
  closed_reason: string | null;  // text
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export type RecoveryState =
  | "pending"
  | "needs_more_info"
  | "approved"
  | "rejected"
  | "cancelled"
  | "delivered";

export interface RecoveryRequest {
  id: string;                    // uuid PK
  object_id: string;             // uuid FK -> objects
  claimant_id: string;           // uuid FK -> profiles
  claimed_at: string;            // timestamptz NOT NULL
  description: string;           // text NOT NULL
  contact_preference: string | null; // text
  state: RecoveryState;          // text NOT NULL
  reviewed_by: string | null;    // uuid FK -> profiles
  reviewed_at: string | null;    // timestamptz
  review_notes: string | null;   // text
  decision_reason: string | null;// text
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export interface CustodyRecord {
  id: string;                    // uuid PK
  object_id: string;             // uuid FK -> objects
  received_by: string;           // uuid FK -> profiles
  received_at: string;           // timestamptz NOT NULL
  custody_point: string;         // text NOT NULL
  condition_notes: string | null;// text
  received_from: string | null;  // text
  created_at: string;            // timestamptz
}

export interface Delivery {
  id: string;                    // uuid PK
  recovery_request_id: string;   // uuid FK -> recovery_requests
  prepared_by: string;           // uuid FK -> profiles
  prepared_at: string;           // timestamptz NOT NULL
  delivery_point: string;        // text NOT NULL
  qr_token_hash: string;         // text NOT NULL (sha256 hex)
  qr_expires_at: string;         // timestamptz NOT NULL
  qr_revoked_at: string | null;  // timestamptz
  delivered_at: string | null;   // timestamptz
  delivered_by: string | null;   // uuid FK -> profiles
  delivery_confirmed_at: string | null; // timestamptz
  confirmation_notes: string | null; // text
  created_at: string;            // timestamptz
  updated_at: string;            // timestamptz
}

export interface PlatformAdmin {
  id: string;                    // uuid PK
  profile_id: string;            // uuid FK -> profiles
  is_active: boolean;            // boolean NOT NULL
  created_at: string;            // timestamptz
}

export interface AuditLog {
  id: string;                    // uuid PK
  institution_id: string | null; // uuid FK -> institutions
  actor_id: string | null;       // uuid FK -> profiles
  action: string;                // text NOT NULL
  entity_type: string;           // text NOT NULL
  entity_id: string;             // text NOT NULL
  old_values: Record<string, unknown> | null; // jsonb
  new_values: Record<string, unknown> | null; // jsonb
  created_at: string;            // timestamptz
}

/* ============================================================
 * Tipos compuestos / vistas útiles para el frontend
 * ============================================================ */

export interface ObjectWithRelations extends Object {
  category?: Category;
  campus?: Campus;
  institution?: Institution;
  reporter?: Profile;
}

export interface RecoveryRequestWithRelations extends RecoveryRequest {
  object?: ObjectWithRelations;
  claimant?: Profile;
  reviewer?: Profile;
}

export interface DeliveryWithRelations extends Delivery {
  recovery_request?: RecoveryRequestWithRelations;
  preparer?: Profile;
  deliverer?: Profile;
}

export interface MembershipWithProfile extends Membership {
  profile?: Profile;
}

/* ============================================================
 * Enums TypeScript para usar en código (valores literales)
 * ============================================================ */

export const OBJECT_KINDS = ["lost", "found"] as const;
export const OBJECT_STATES = [
  "reported",
  "published",
  "in_custody",
  "delivery_prepared",
  "delivered",
  "closed",
] as const;
export const RECOVERY_STATES = [
  "pending",
  "needs_more_info",
  "approved",
  "rejected",
  "cancelled",
  "delivered",
] as const;
export const MEMBERSHIP_ROLES = [
  "student",
  "custody_staff",
  "reviewer",
  "institution_admin",
] as const;