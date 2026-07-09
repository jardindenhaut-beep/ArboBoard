import { supabase } from "@/lib/supabaseClient";

export type ParametresEntrepriseClient = {
  tva_defaut: number;
  delai_paiement_defaut: number;
  conditions_generales_devis: string;
  conditions_generales_factures: string;
  prefixe_devis: string;
  prefixe_facture: string;
  prefixe_avoir: string;
};

export async function chargerParametresEntrepriseClient(
  entrepriseId: string
): Promise<ParametresEntrepriseClient> {
  const valeursDefaut: ParametresEntrepriseClient = {
    tva_defaut: 20,
    delai_paiement_defaut: 30,
    conditions_generales_devis: "",
    conditions_generales_factures: "",
    prefixe_devis: "DEV",
    prefixe_facture: "FAC",
    prefixe_avoir: "AV",
  };

  if (!entrepriseId) {
    return valeursDefaut;
  }

  const { data, error } = await supabase
    .from("entreprise_parametres")
    .select(
      `
      tva_defaut,
      delai_paiement_defaut,
      conditions_generales_devis,
      conditions_generales_factures,
      prefixe_devis,
      prefixe_facture,
      prefixe_avoir
    `
    )
    .eq("entreprise_id", entrepriseId)
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement paramètres entreprise :", error);
    return valeursDefaut;
  }

  return {
    tva_defaut: Number(data?.tva_defaut) || valeursDefaut.tva_defaut,
    delai_paiement_defaut:
      Number(data?.delai_paiement_defaut) ||
      valeursDefaut.delai_paiement_defaut,
    conditions_generales_devis: data?.conditions_generales_devis || "",
    conditions_generales_factures: data?.conditions_generales_factures || "",
    prefixe_devis: data?.prefixe_devis || "DEV",
    prefixe_facture: data?.prefixe_facture || "FAC",
    prefixe_avoir: data?.prefixe_avoir || "AV",
  };
}