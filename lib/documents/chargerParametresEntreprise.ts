import { createClient } from "@supabase/supabase-js";
import {
  normaliserDesignDocuments,
  type DesignDocuments,
} from "@/lib/documents/designDocuments";

export type ParametresEntrepriseDocument = {
  nom_entreprise: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siret: string | null;
  numero_tva_intracommunautaire: string | null;
  forme_juridique: string | null;
  logo_url: string | null;
  assurance_professionnelle: string | null;
  mentions_legales: string | null;
  conditions_generales_devis: string | null;
  conditions_generales_factures: string | null;
} & DesignDocuments;

export async function chargerParametresEntrepriseDocument(
  entrepriseId: string
): Promise<ParametresEntrepriseDocument | null> {
  if (!entrepriseId) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabaseAdmin
    .from("entreprise_parametres")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    nom_entreprise: data.nom_entreprise || null,
    adresse: data.adresse || null,
    code_postal: data.code_postal || null,
    ville: data.ville || null,
    telephone: data.telephone || null,
    email: data.email || null,
    siret: data.siret || null,
    numero_tva_intracommunautaire:
      data.numero_tva_intracommunautaire || null,
    forme_juridique: data.forme_juridique || null,
    logo_url: data.logo_url || null,
    assurance_professionnelle:
      data.assurance_professionnelle || null,
    mentions_legales: data.mentions_legales || null,
    conditions_generales_devis:
      data.conditions_generales_devis || null,
    conditions_generales_factures:
      data.conditions_generales_factures || null,
    ...normaliserDesignDocuments(data),
  };
}