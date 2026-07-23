import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrlEnv =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKeyEnv =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv || !supabaseAnonKeyEnv) {
  throw new Error(
    "Configuration Supabase publique manquante."
  );
}

/*
 * Après le contrôle ci-dessus, on crée des constantes
 * explicitement typées pour que TypeScript sache qu’elles
 * ne peuvent plus être undefined.
 */
const supabaseUrl: string = supabaseUrlEnv;
const supabaseAnonKey: string = supabaseAnonKeyEnv;

const referenceProjet = new URL(
  supabaseUrl
).hostname.split(".")[0];

const cleStockage = `sb-${referenceProjet}-auth-token`;

type GlobalSupabaseArboboard = typeof globalThis & {
  __supabaseArboboard?: SupabaseClient;
};

const globalSupabase =
  globalThis as GlobalSupabaseArboboard;

function creerClientSupabase(): SupabaseClient {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: cleStockage,
      },
    }
  );
}

export const supabase: SupabaseClient =
  globalSupabase.__supabaseArboboard ||
  creerClientSupabase();

if (process.env.NODE_ENV !== "production") {
  globalSupabase.__supabaseArboboard = supabase;
}