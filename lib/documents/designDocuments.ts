export type ModeleDocument = "moderne" | "classique" | "compact";
export type PositionLogoDocument = "gauche" | "centre" | "droite";
export type TailleLogoDocument = "petit" | "moyen" | "grand";
export type DispositionEnteteDocument = "horizontale" | "empilee";
export type StyleTableauDocument = "doux" | "lignes" | "minimal";
export type PositionTotauxDocument = "gauche" | "droite";

export type DesignDocuments = {
  design_modele_document: ModeleDocument;
  design_couleur_principale: string;
  design_couleur_secondaire: string;
  design_position_logo: PositionLogoDocument;
  design_taille_logo: TailleLogoDocument;
  design_disposition_entete: DispositionEnteteDocument;
  design_style_tableau: StyleTableauDocument;
  design_lignes_compactes: boolean;
  design_position_totaux: PositionTotauxDocument;
  design_afficher_adresse: boolean;
  design_afficher_contact: boolean;
  design_afficher_siret: boolean;
  design_afficher_tva: boolean;
  design_afficher_assurance: boolean;
  design_pied_page: string;
};

export const DESIGN_DOCUMENTS_DEFAUT: DesignDocuments = {
  design_modele_document: "moderne",
  design_couleur_principale: "#059669",
  design_couleur_secondaire: "#ECFDF5",
  design_position_logo: "gauche",
  design_taille_logo: "moyen",
  design_disposition_entete: "horizontale",
  design_style_tableau: "doux",
  design_lignes_compactes: false,
  design_position_totaux: "droite",
  design_afficher_adresse: true,
  design_afficher_contact: true,
  design_afficher_siret: true,
  design_afficher_tva: true,
  design_afficher_assurance: true,
  design_pied_page: "",
};

function objet(valeur: unknown): Record<string, unknown> {
  if (valeur && typeof valeur === "object") {
    return valeur as Record<string, unknown>;
  }

  return {};
}

function texte(valeur: unknown) {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function couleurHex(valeur: unknown, defaut: string) {
  const resultat = texte(valeur).toUpperCase();

  if (/^#[0-9A-F]{6}$/.test(resultat)) {
    return resultat;
  }

  return defaut;
}

function booleen(valeur: unknown, defaut: boolean) {
  if (typeof valeur === "boolean") return valeur;

  if (typeof valeur === "string") {
    const normalisee = valeur.trim().toLowerCase();

    if (["true", "1", "oui", "yes"].includes(normalisee)) return true;
    if (["false", "0", "non", "no"].includes(normalisee)) return false;
  }

  return defaut;
}

function valeurEnum<T extends string>(
  valeur: unknown,
  valeurs: readonly T[],
  defaut: T
): T {
  const resultat = texte(valeur) as T;
  return valeurs.includes(resultat) ? resultat : defaut;
}

export function normaliserDesignDocuments(
  valeur: unknown
): DesignDocuments {
  const source = objet(valeur);

  return {
    design_modele_document: valeurEnum(
      source.design_modele_document,
      ["moderne", "classique", "compact"] as const,
      DESIGN_DOCUMENTS_DEFAUT.design_modele_document
    ),
    design_couleur_principale: couleurHex(
      source.design_couleur_principale,
      DESIGN_DOCUMENTS_DEFAUT.design_couleur_principale
    ),
    design_couleur_secondaire: couleurHex(
      source.design_couleur_secondaire,
      DESIGN_DOCUMENTS_DEFAUT.design_couleur_secondaire
    ),
    design_position_logo: valeurEnum(
      source.design_position_logo,
      ["gauche", "centre", "droite"] as const,
      DESIGN_DOCUMENTS_DEFAUT.design_position_logo
    ),
    design_taille_logo: valeurEnum(
      source.design_taille_logo,
      ["petit", "moyen", "grand"] as const,
      DESIGN_DOCUMENTS_DEFAUT.design_taille_logo
    ),
    design_disposition_entete: valeurEnum(
      source.design_disposition_entete,
      ["horizontale", "empilee"] as const,
      DESIGN_DOCUMENTS_DEFAUT.design_disposition_entete
    ),
    design_style_tableau: valeurEnum(
      source.design_style_tableau,
      ["doux", "lignes", "minimal"] as const,
      DESIGN_DOCUMENTS_DEFAUT.design_style_tableau
    ),
    design_lignes_compactes: booleen(
      source.design_lignes_compactes,
      DESIGN_DOCUMENTS_DEFAUT.design_lignes_compactes
    ),
    design_position_totaux: valeurEnum(
      source.design_position_totaux,
      ["gauche", "droite"] as const,
      DESIGN_DOCUMENTS_DEFAUT.design_position_totaux
    ),
    design_afficher_adresse: booleen(
      source.design_afficher_adresse,
      DESIGN_DOCUMENTS_DEFAUT.design_afficher_adresse
    ),
    design_afficher_contact: booleen(
      source.design_afficher_contact,
      DESIGN_DOCUMENTS_DEFAUT.design_afficher_contact
    ),
    design_afficher_siret: booleen(
      source.design_afficher_siret,
      DESIGN_DOCUMENTS_DEFAUT.design_afficher_siret
    ),
    design_afficher_tva: booleen(
      source.design_afficher_tva,
      DESIGN_DOCUMENTS_DEFAUT.design_afficher_tva
    ),
    design_afficher_assurance: booleen(
      source.design_afficher_assurance,
      DESIGN_DOCUMENTS_DEFAUT.design_afficher_assurance
    ),
    design_pied_page: texte(source.design_pied_page).slice(0, 500),
  };
}

export function tailleLogoPdf(
  taille: TailleLogoDocument
) {
  if (taille === "petit") return 38;
  if (taille === "grand") return 76;
  return 56;
}

export function tailleLogoApercu(
  taille: TailleLogoDocument
) {
  if (taille === "petit") return "h-10 w-10";
  if (taille === "grand") return "h-20 w-20";
  return "h-14 w-14";
}