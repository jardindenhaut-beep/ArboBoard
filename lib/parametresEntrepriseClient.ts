import { supabase } from "@/lib/supabaseClient";
import {
  DESIGN_DOCUMENTS_DEFAUT,
  normaliserDesignDocuments,
  type DesignDocuments,
} from "@/lib/documents/designDocuments";

export type ParametresEntrepriseClient = {
  nom_entreprise: string;
  adresse: string;
  code_postal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
  numero_tva_intracommunautaire: string;
  forme_juridique: string;
  logo_url: string;
  assurance_professionnelle: string;
  mentions_legales: string;
  tva_defaut: number;
  delai_paiement_defaut: number;
  conditions_generales_devis: string;
  conditions_generales_factures: string;
  prefixe_devis: string;
  prefixe_facture: string;
  prefixe_avoir: string;
} & DesignDocuments;

const VALEURS_DEFAUT: ParametresEntrepriseClient = {
  nom_entreprise: "",
  adresse: "",
  code_postal: "",
  ville: "",
  telephone: "",
  email: "",
  siret: "",
  numero_tva_intracommunautaire: "",
  forme_juridique: "",
  logo_url: "",
  assurance_professionnelle: "",
  mentions_legales: "",
  tva_defaut: 20,
  delai_paiement_defaut: 30,
  conditions_generales_devis: "",
  conditions_generales_factures: "",
  prefixe_devis: "DEV",
  prefixe_facture: "FAC",
  prefixe_avoir: "AV",
  ...DESIGN_DOCUMENTS_DEFAUT,
};

function texte(valeur: unknown) {
  return typeof valeur === "string" ? valeur : "";
}

function nombreOuDefaut(valeur: unknown, defaut: number) {
  const resultat = Number(valeur);
  return Number.isFinite(resultat) ? resultat : defaut;
}

export async function chargerParametresEntrepriseClient(
  entrepriseId: string
): Promise<ParametresEntrepriseClient> {
  if (!entrepriseId) {
    return VALEURS_DEFAUT;
  }

  const { data, error } = await supabase
    .from("entreprise_parametres")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .maybeSingle();

  if (error || !data) {
    return VALEURS_DEFAUT;
  }

  return {
    nom_entreprise: texte(data.nom_entreprise),
    adresse: texte(data.adresse),
    code_postal: texte(data.code_postal),
    ville: texte(data.ville),
    telephone: texte(data.telephone),
    email: texte(data.email),
    siret: texte(data.siret),
    numero_tva_intracommunautaire: texte(
      data.numero_tva_intracommunautaire
    ),
    forme_juridique: texte(data.forme_juridique),
    logo_url: texte(data.logo_url),
    assurance_professionnelle: texte(
      data.assurance_professionnelle
    ),
    mentions_legales: texte(data.mentions_legales),
    tva_defaut: nombreOuDefaut(data.tva_defaut, 20),
    delai_paiement_defaut: nombreOuDefaut(
      data.delai_paiement_defaut,
      30
    ),
    conditions_generales_devis: texte(
      data.conditions_generales_devis
    ),
    conditions_generales_factures: texte(
      data.conditions_generales_factures
    ),
    prefixe_devis: texte(data.prefixe_devis) || "DEV",
    prefixe_facture: texte(data.prefixe_facture) || "FAC",
    prefixe_avoir: texte(data.prefixe_avoir) || "AV",
    ...normaliserDesignDocuments(data),
  };
}