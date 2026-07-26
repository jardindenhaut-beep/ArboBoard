export const TYPES_DOCUMENTS_JURIDIQUES = [
  "mentions_legales",
  "politique_confidentialite",
  "cgu",
  "cgv",
] as const;

export type TypeDocumentJuridique =
  (typeof TYPES_DOCUMENTS_JURIDIQUES)[number];

export const TYPES_DOCUMENTS_AVEC_ACCEPTATION = [
  "politique_confidentialite",
  "cgu",
  "cgv",
] as const;

export type TypeDocumentAvecAcceptation =
  (typeof TYPES_DOCUMENTS_AVEC_ACCEPTATION)[number];

export type DocumentJuridiquePlateforme = {
  id: string;
  type_document: TypeDocumentJuridique;
  titre_brouillon: string;
  contenu_brouillon: string;
  version_brouillon: string;
  titre_publie?: string | null;
  contenu_publie?: string | null;
  version_publie?: string | null;
  publie_at?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentJuridiquePublie = {
  id: string;
  type_document: TypeDocumentJuridique;
  titre: string;
  contenu: string;
  version: string;
  publie_at: string;
};

export type StatutAcceptationJuridique = {
  acceptation_requise: boolean;
  portee_acceptation: "aucune" | "utilisateur" | "entreprise";
  utilisateurs_concernes: number;
  utilisateurs_a_jour: number;
  utilisateurs_a_mettre_a_jour: number;
  entreprise_a_jour: boolean | null;
};

export type StatutDocumentJuridiquePublic =
  StatutAcceptationJuridique & {
    type_document: TypeDocumentJuridique;
    titre?: string | null;
    version?: string | null;
    publie_at?: string | null;
    publie: boolean;
  };

export const INFORMATIONS_DOCUMENTS_JURIDIQUES: Record<
  TypeDocumentJuridique,
  {
    label: string;
    description: string;
    cheminPublic: string;
  }
> = {
  mentions_legales: {
    label: "Mentions légales",
    description:
      "Identification de l’éditeur, direction de publication et hébergement.",
    cheminPublic: "/mentions-legales",
  },
  politique_confidentialite: {
    label: "Politique de confidentialité",
    description:
      "Information sur les traitements, prestataires, durées et droits.",
    cheminPublic: "/politique-confidentialite",
  },
  cgu: {
    label: "CGU",
    description:
      "Règles d’accès et d’utilisation du logiciel Arboboard.",
    cheminPublic: "/cgu",
  },
  cgv: {
    label: "CGV",
    description:
      "Offres, prix, paiement, durée, résiliation et responsabilités.",
    cheminPublic: "/cgv",
  },
};

export function estTypeDocumentJuridique(
  valeur: unknown
): valeur is TypeDocumentJuridique {
  return (
    typeof valeur === "string" &&
    TYPES_DOCUMENTS_JURIDIQUES.includes(
      valeur as TypeDocumentJuridique
    )
  );
}

export function estTypeDocumentAvecAcceptation(
  valeur: unknown
): valeur is TypeDocumentAvecAcceptation {
  return (
    typeof valeur === "string" &&
    TYPES_DOCUMENTS_AVEC_ACCEPTATION.includes(
      valeur as TypeDocumentAvecAcceptation
    )
  );
}