import "server-only";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin pages 404 for everyone else, so they don't reveal that they exist.
 * The database independently refuses non-admin writes (RLS).
 */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) notFound();
  return { profile, supabase: await createClient() };
}
