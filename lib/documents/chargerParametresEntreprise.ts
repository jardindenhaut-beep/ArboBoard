import { createClient } from "@supabase/supabase-js";

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
};

export async function chargerParametresEntrepriseDocument(
  entrepriseId: string
): Promise<ParametresEntrepriseDocument | null> {
  if (!entrepriseId) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Variables Supabase serveur manquantes.");
    return null;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabaseAdmin
    .from("entreprise_parametres")
    .select(
      `
      nom_entreprise,
      adresse,
      code_postal,
      ville,
      telephone,
      email,
      siret,
      numero_tva_intracommunautaire,
      forme_juridique,
      logo_url,
      assurance_professionnelle,
      mentions_legales,
      conditions_generales_devis,
      conditions_generales_factures
    `
    )
    .eq("entreprise_id", entrepriseId)
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement paramètres entreprise PDF :", error);
    return null;
  }

  return data;
}