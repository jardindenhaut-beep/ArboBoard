"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type CategorieArticle =
  | "type_intervention"
  | "travaux"
  | "materiel"
  | "materiaux"
  | "consigne_securite"
  | "consigne_chantier";

type ArticleIntervention = {
  id: string;
  entreprise_id: string;
  nom: string;
  categorie: CategorieArticle | string;
  unite: string | null;
  description: string | null;
  icone: string | null;
  couleur: string | null;
  actif: boolean | null;
  ordre: number | null;
};

type Client = {
  id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  adresse_chantier?: string | null;
  code_postal_chantier?: string | null;
  ville_chantier?: string | null;
  notes_chantier?: string | null;
  statut?: string | null;
};

type Salarie = {
  id: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  statut?: string | null;
};

type Devis = {
  id: string;
  entreprise_id: string;
  client_id: string | null;
  client_nom: string | null;
  numero: string | null;
  objet: string | null;
  description: string | null;
  statut: string | null;
  date_devis: string | null;
  total_ht: number | null;
  total_tva: number | null;
  total_ttc: number | null;
  adresse_chantier?: string | null;
  code_postal_chantier?: string | null;
  ville_chantier?: string | null;
  notes_chantier?: string | null;
};

type DevisLigne = {
  id: string;
  devis_id: string;
  designation: string | null;
  description: string | null;
  quantite: number | null;
  unite: string | null;
  ordre: number | null;
  prestation_tarif_id?: string | null;
  prestation_code?: string | null;
  prestation_categorie_id?: string | null;
  prestation_categorie_nom?: string | null;
};

type ProfilPreselectionAutomatique = {
  id: string;
  libelle: string;
  detection: string[];
  types: string[];
  besoins: Partial<Record<CategorieArticle, string[]>>;
};

type ResumePreselectionAutomatique = {
  profils: string[];
  typeIntervention: string | null;
  nombreElements: number;
  nombreLignesDevis: number;
};

type FicheIntervention = {
  id: string;
  entreprise_id: string;
  numero: string | null;
  devis_id: string | null;
  facture_id: string | null;
  client_id: string | null;
  client_nom: string | null;
  salarie_id: string | null;
  salarie_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  statut: string | null;

  date_intervention: string | null;
  heure_debut: string | null;
  heure_fin: string | null;

  date_prevue: string | null;
  date_fin_prevue: string | null;
  heure_debut_prevue: string | null;
  heure_fin_prevue: string | null;
  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;

  adresse: string | null;
  code_postal: string | null;
  ville: string | null;

  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;
  notes_chantier: string | null;

  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;

  etape_materiel_statut: string | null;
  etape_arrivee_statut: string | null;
  etape_fin_statut: string | null;

  materiel_valide_at: string | null;
  arrivee_validee_at: string | null;
  fin_validee_at: string | null;

  commentaire_preparation: string | null;
  commentaire_arrivee: string | null;
  commentaire_fin: string | null;

  probleme_signale: boolean | null;
  description_probleme: string | null;
  pv_fin_chantier_id: string | null;

  created_at: string | null;
  updated_at: string | null;
};

type FicheElement = {
  id: string;
  fiche_id: string;
  article_id: string | null;
  nom: string;
  categorie: string;
  icone: string | null;
  couleur: string | null;
  quantite_prevue: number | null;
  quantite_reelle: number | null;
  unite: string | null;
  obligatoire: boolean | null;
  coche_prepare: boolean | null;
  commentaire_chef: string | null;
  commentaire_salarie: string | null;
  ordre: number | null;
};

type FicheSalarie = {
  id: string;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
};

type FormulaireCreation = {
  devis_id: string;
  type_intervention_id: string;
  titre: string;
  date_prevue: string;
  date_fin_prevue: string;
  heure_debut_prevue: string;
  heure_fin_prevue: string;
  adresse_chantier: string;
  code_postal_chantier: string;
  ville_chantier: string;
  notes_chantier: string;
  notes_internes: string;
};

type EtapeCreation = 1 | 2 | 3;

type OngletElementsCreation =
  | "travaux"
  | "materiel"
  | "materiaux"
  | "consignes";

type AffectationCreation = {
  role_chantier: string;
  heure_arrivee_prevue: string;
  heure_depart_prevue: string;
};

const FORMULAIRE_VIDE: FormulaireCreation = {
  devis_id: "",
  type_intervention_id: "",
  titre: "",
  date_prevue: "",
  date_fin_prevue: "",
  heure_debut_prevue: "",
  heure_fin_prevue: "",
  adresse_chantier: "",
  code_postal_chantier: "",
  ville_chantier: "",
  notes_chantier: "",
  notes_internes: "",
};

const CATEGORIES_ELEMENTS: {
  categorie: CategorieArticle;
  titre: string;
  description: string;
  icone: string;
}[] = [
  {
    categorie: "travaux",
    titre: "Travaux à réaliser",
    description: "Tâches prévues sur le chantier.",
    icone: "✅",
  },
  {
    categorie: "materiel",
    titre: "Matériel à charger",
    description: "Machines, outils, véhicules, EPI.",
    icone: "🧰",
  },
  {
    categorie: "materiaux",
    titre: "Matériaux / fournitures",
    description: "Fournitures à prévoir pour le chantier.",
    icone: "🪨",
  },
  {
    categorie: "consigne_securite",
    titre: "Consignes sécurité",
    description: "Sécurité, EPI, balisage, risques.",
    icone: "🦺",
  },
  {
    categorie: "consigne_chantier",
    titre: "Consignes chantier / client",
    description: "Accès, client, voisinage, évacuation.",
    icone: "🏠",
  },
];

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function normaliserTexteMetier(valeur: unknown) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PROFILS_PRESELECTION_AUTOMATIQUE: ProfilPreselectionAutomatique[] = [
  {
    id: "elagage",
    libelle: "Élagage",
    detection: [
      "elagage",
      "elaguer",
      "taille arbre",
      "taille d arbre",
      "taille de soins",
      "taille sanitaire",
      "reduction de couronne",
      "reduction couronne",
      "bois mort",
      "haubanage",
    ],
    types: ["elagage", "taille d arbre", "taille arbre", "arboriculture"],
    besoins: {
      travaux: [
        "elagage",
        "taille",
        "reduction",
        "bois mort",
        "branche",
        "evacuation",
        "broyage",
      ],
      materiel: [
        "tronconneuse",
        "elagueuse",
        "harnais",
        "corde",
        "longe",
        "casque",
        "broyeur",
        "souffleur",
        "camion",
        "remorque",
        "retention",
        "poulie",
        "fausse fourche",
        "nacelle",
      ],
      materiaux: ["carburant", "huile de chaine", "huile chaine", "chaine"],
      consigne_securite: [
        "epi",
        "casque",
        "anticoupure",
        "protection auditive",
        "balisage",
        "zone de chute",
        "ligne electrique",
        "travail en hauteur",
        "harnais",
        "grimpe",
        "retention",
      ],
      consigne_chantier: [
        "acces",
        "stationnement",
        "voisinage",
        "evacuation",
        "broyage",
      ],
    },
  },
  {
    id: "abattage",
    libelle: "Abattage / démontage",
    detection: [
      "abattage",
      "abattre",
      "demontage",
      "demontage arbre",
      "suppression arbre",
      "suppression d arbre",
      "arbre a supprimer",
    ],
    types: ["abattage", "demontage", "demontage d arbre", "suppression d arbre"],
    besoins: {
      travaux: [
        "abattage",
        "demontage",
        "debitage",
        "evacuation",
        "broyage",
        "retention",
      ],
      materiel: [
        "tronconneuse",
        "elagueuse",
        "coin",
        "merlin",
        "masse",
        "corde",
        "retention",
        "treuil",
        "tire fort",
        "poulie",
        "broyeur",
        "camion",
        "remorque",
        "nacelle",
        "casque",
      ],
      materiaux: ["carburant", "huile de chaine", "huile chaine", "chaine"],
      consigne_securite: [
        "epi",
        "casque",
        "anticoupure",
        "protection auditive",
        "balisage",
        "zone de chute",
        "direction de chute",
        "ligne electrique",
        "retention",
        "travail en hauteur",
      ],
      consigne_chantier: [
        "acces",
        "stationnement",
        "voisinage",
        "evacuation",
        "broyage",
        "bois",
      ],
    },
  },
  {
    id: "taille_haie",
    libelle: "Taille de haie / arbustes",
    detection: [
      "taille de haie",
      "taille haie",
      "taille arbuste",
      "taille d arbuste",
      "taille de thuya",
      "taille de cypres",
      "taille de laurier",
      "taille de charmille",
      "taille de troene",
    ],
    types: ["taille de haie", "taille haie", "taille", "entretien"],
    besoins: {
      travaux: ["taille", "ramassage", "evacuation", "broyage"],
      materiel: [
        "taille haie",
        "taille-haie",
        "perche",
        "escabeau",
        "echelle",
        "plateforme",
        "souffleur",
        "broyeur",
        "camion",
        "remorque",
      ],
      materiaux: ["carburant", "sac"],
      consigne_securite: [
        "epi",
        "casque",
        "protection auditive",
        "balisage",
        "travail en hauteur",
      ],
      consigne_chantier: ["acces", "evacuation", "broyage", "voisinage"],
    },
  },
  {
    id: "tonte",
    libelle: "Tonte",
    detection: ["tonte", "tondre", "gazon", "pelouse"],
    types: ["tonte", "entretien de jardin", "entretien"],
    besoins: {
      travaux: ["tonte", "finition", "ramassage", "soufflage"],
      materiel: [
        "tondeuse",
        "autoportee",
        "debroussailleuse",
        "coupe bordure",
        "souffleur",
        "camion",
        "remorque",
      ],
      materiaux: ["carburant", "fil"],
      consigne_securite: ["epi", "protection auditive", "projection", "balisage"],
      consigne_chantier: ["acces", "portail", "animal", "chien"],
    },
  },
  {
    id: "debroussaillage",
    libelle: "Débroussaillage",
    detection: [
      "debroussaillage",
      "debroussailler",
      "ronce",
      "ronces",
      "herbes hautes",
      "vegetation haute",
    ],
    types: ["debroussaillage", "entretien", "fauchage"],
    besoins: {
      travaux: ["debroussaillage", "fauchage", "ramassage", "evacuation"],
      materiel: [
        "debroussailleuse",
        "lame",
        "fil",
        "souffleur",
        "broyeur",
        "camion",
        "remorque",
      ],
      materiaux: ["carburant", "fil", "lame"],
      consigne_securite: [
        "epi",
        "visiere",
        "protection auditive",
        "projection",
        "balisage",
      ],
      consigne_chantier: ["acces", "dechet", "evacuation"],
    },
  },
  {
    id: "rognage_dessouchage",
    libelle: "Rognage / dessouchage",
    detection: [
      "rognage",
      "rogner souche",
      "dessouchage",
      "dessoucher",
      "suppression souche",
    ],
    types: ["rognage", "dessouchage", "souche"],
    besoins: {
      travaux: ["rognage", "dessouchage", "souche", "evacuation"],
      materiel: [
        "rogneuse",
        "mini pelle",
        "mini-pelle",
        "pelle",
        "pioche",
        "camion",
        "remorque",
      ],
      materiaux: ["carburant", "terre", "terre vegetale"],
      consigne_securite: [
        "epi",
        "balisage",
        "reseau",
        "reseaux",
        "projection",
      ],
      consigne_chantier: ["acces", "reseau", "reseaux", "evacuation"],
    },
  },
  {
    id: "plantation_creation",
    libelle: "Plantation / création",
    detection: [
      "plantation",
      "planter",
      "creation",
      "amenagement",
      "massif",
      "engazonnement",
      "gazon",
      "paillage",
    ],
    types: ["plantation", "creation", "amenagement paysager", "paysagisme"],
    besoins: {
      travaux: [
        "plantation",
        "terrassement",
        "preparation",
        "nivellement",
        "engazonnement",
        "paillage",
      ],
      materiel: [
        "mini pelle",
        "mini-pelle",
        "motoculteur",
        "brouette",
        "pelle",
        "rateau",
        "rouleau",
        "camion",
        "remorque",
      ],
      materiaux: [
        "terreau",
        "terre vegetale",
        "terre",
        "tuteur",
        "lien",
        "paillage",
        "mulch",
        "compost",
        "gazon",
        "semence",
      ],
      consigne_securite: ["epi", "reseau", "reseaux", "balisage"],
      consigne_chantier: ["acces", "arrosage", "reseau", "reseaux"],
    },
  },
  {
    id: "entretien",
    libelle: "Entretien",
    detection: [
      "entretien",
      "nettoyage jardin",
      "ramassage feuilles",
      "desherbage",
      "desherbage",
    ],
    types: ["entretien", "entretien de jardin", "paysagisme"],
    besoins: {
      travaux: ["entretien", "nettoyage", "ramassage", "desherbage"],
      materiel: [
        "souffleur",
        "debroussailleuse",
        "taille haie",
        "taille-haie",
        "camion",
      ],
      materiaux: ["sac"],
      consigne_securite: ["epi"],
      consigne_chantier: ["acces", "dechet", "evacuation"],
    },
  },
];

function contientExpression(texteNormalise: string, expression: string) {
  const cherche = normaliserTexteMetier(expression);
  return Boolean(cherche) && texteNormalise.includes(cherche);
}

function scoreProfilPourLigne(
  ligne: DevisLigne,
  profil: ProfilPreselectionAutomatique
) {
  const categorie = normaliserTexteMetier(ligne.prestation_categorie_nom);
  const designation = normaliserTexteMetier(ligne.designation);
  const description = normaliserTexteMetier(ligne.description);

  let score = 0;

  for (const expression of profil.detection) {
    if (contientExpression(categorie, expression)) score += 12;
    if (contientExpression(designation, expression)) score += 7;
    if (contientExpression(description, expression)) score += 2;
  }

  return score;
}

function profilsDepuisLignes(lignes: DevisLigne[]) {
  const scores = new Map<string, number>();

  for (const profil of PROFILS_PRESELECTION_AUTOMATIQUE) {
    const score = lignes.reduce(
      (total, ligne) => total + scoreProfilPourLigne(ligne, profil),
      0
    );

    if (score > 0) scores.set(profil.id, score);
  }

  return PROFILS_PRESELECTION_AUTOMATIQUE
    .filter((profil) => scores.has(profil.id))
    .sort(
      (a, b) =>
        Number(scores.get(b.id) || 0) - Number(scores.get(a.id) || 0)
    );
}

function scoreTypeIntervention(
  article: ArticleIntervention,
  expressions: string[]
) {
  const nom = normaliserTexteMetier(article.nom);
  const description = normaliserTexteMetier(article.description);

  let meilleurScore = 0;

  for (const expression of expressions) {
    const cherche = normaliserTexteMetier(expression);
    if (!cherche) continue;

    if (nom === cherche) meilleurScore = Math.max(meilleurScore, 100);
    else if (nom.startsWith(cherche)) meilleurScore = Math.max(meilleurScore, 85);
    else if (nom.includes(cherche)) meilleurScore = Math.max(meilleurScore, 70);
    else if (cherche.includes(nom) && nom.length >= 4) {
      meilleurScore = Math.max(meilleurScore, 45);
    }

    if (description.includes(cherche)) {
      meilleurScore = Math.max(meilleurScore, 25);
    }
  }

  return meilleurScore;
}

function trouverTypeInterventionAutomatique(
  articles: ArticleIntervention[],
  profils: ProfilPreselectionAutomatique[],
  lignes: DevisLigne[]
) {
  const typesDisponibles = articles.filter(
    (article) => article.categorie === "type_intervention"
  );

  if (typesDisponibles.length === 0) return null;

  const expressions = [
    ...profils.flatMap((profil) => profil.types),
    ...lignes
      .map((ligne) => ligne.prestation_categorie_nom || "")
      .filter(Boolean),
  ];

  const classes = typesDisponibles
    .map((article) => ({
      article,
      score: scoreTypeIntervention(article, expressions),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return classes[0]?.article || null;
}

function articleCorrespondAuxBesoins(
  article: ArticleIntervention,
  profils: ProfilPreselectionAutomatique[]
) {
  if (
    article.categorie === "type_intervention" ||
    ![
      "travaux",
      "materiel",
      "materiaux",
      "consigne_securite",
      "consigne_chantier",
    ].includes(String(article.categorie))
  ) {
    return false;
  }

  const contenu = normaliserTexteMetier(
    `${article.nom || ""} ${article.description || ""}`
  );

  return profils.some((profil) => {
    const expressions =
      profil.besoins[article.categorie as CategorieArticle] || [];

    return expressions.some((expression) =>
      contientExpression(contenu, expression)
    );
  });
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Non planifiée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "Non planifiée";
  }
}

function formatPeriodeFiche(
  dateDebut: string | null | undefined,
  dateFin: string | null | undefined
) {
  if (!dateDebut) return "Non planifiée";
  if (!dateFin || dateFin === dateDebut) return formatDate(dateDebut);

  return `${formatDate(dateDebut)} → ${formatDate(dateFin)}`;
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function nomClient(client: Client | null | undefined) {
  if (!client) return "Client non renseigné";

  if (client.type_client === "particulier") {
    const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return complet || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    "Client professionnel"
  );
}

function nomSalarie(salarie: Salarie | null | undefined) {
  if (!salarie) return "Salarié";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();
  return complet || salarie.email || "Salarié";
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "en_cours")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (statut === "terminee")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annulee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archivee")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function bordureCarteStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "border-l-blue-500";
  if (statut === "en_cours") return "border-l-amber-500";
  if (statut === "terminee") return "border-l-emerald-500";
  if (statut === "annulee") return "border-l-red-500";
  if (statut === "archivee") return "border-l-slate-400";
  return "border-l-slate-300";
}

function nombreEtapesValidees(fiche: FicheIntervention) {
  return [
    fiche.etape_materiel_statut,
    fiche.etape_arrivee_statut,
    fiche.etape_fin_statut,
  ].filter((statut) => statut === "valide").length;
}

function libelleEtape(statut: string | null | undefined) {
  if (statut === "valide") return "Validée";
  if (statut === "en_cours") return "En cours";
  if (statut === "probleme") return "Problème";
  if (statut === "a_preparer") return "À préparer";
  return "En attente";
}

function classeEtape(statut: string | null | undefined) {
  if (statut === "valide")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (statut === "en_cours")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (statut === "probleme") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function iconeType(article: ArticleIntervention | null | undefined) {
  return article?.icone || "🛠️";
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || fiche.type_intervention || "Fiche d’intervention";
}

function adresseFiche(fiche: FicheIntervention) {
  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const cp = fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";

  const ligneVille = [cp, ville].filter(Boolean).join(" ");

  if (!adresse && !ligneVille) return "Adresse non renseignée";
  return [adresse, ligneVille].filter(Boolean).join(", ");
}

export default function FichesInterventionPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [lignesDevis, setLignesDevis] = useState<DevisLigne[]>([]);
  const [articles, setArticles] = useState<ArticleIntervention[]>([]);

  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [elementsFiches, setElementsFiches] = useState<FicheElement[]>([]);
  const [salariesFiches, setSalariesFiches] = useState<FicheSalarie[]>([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | StatutFiche>(
    "tous"
  );

  const [modalCreationOuverte, setModalCreationOuverte] = useState(false);
  const [etapeCreation, setEtapeCreation] = useState<EtapeCreation>(1);
  const [ongletElementsCreation, setOngletElementsCreation] =
    useState<OngletElementsCreation>("travaux");
  const [affectationsCreation, setAffectationsCreation] = useState<
    Record<string, AffectationCreation>
  >({});

  const [formulaire, setFormulaire] =
    useState<FormulaireCreation>(FORMULAIRE_VIDE);

  const [elementsSelectionnes, setElementsSelectionnes] = useState<string[]>(
    []
  );

  const [salariesSelectionnes, setSalariesSelectionnes] = useState<string[]>(
    []
  );

  const [creationRapideCategorie, setCreationRapideCategorie] =
    useState<CategorieArticle | null>(null);
  const [creationRapideNom, setCreationRapideNom] = useState("");
  const [creationRapideIcone, setCreationRapideIcone] = useState("🛠️");

  const [devisIdDepuisUrl, setDevisIdDepuisUrl] = useState("");
  const [devisIdUrlTraite, setDevisIdUrlTraite] = useState("");

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");
  const [resumePreselectionAutomatique, setResumePreselectionAutomatique] =
    useState<ResumePreselectionAutomatique | null>(null);
  const [ficheDeplieeId, setFicheDeplieeId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDevisIdDepuisUrl(params.get("devisId") || "");
  }, []);

  useEffect(() => {
    initialiserPage();
  }, []);

  useEffect(() => {
    if (!devisIdDepuisUrl) return;
    if (!entrepriseId) return;
    if (devis.length === 0) return;
    if (devisIdUrlTraite === devisIdDepuisUrl) return;

    ouvrirCreationDepuisDevisUrl(devisIdDepuisUrl);
    setDevisIdUrlTraite(devisIdDepuisUrl);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devisIdDepuisUrl, entrepriseId, devis, devisIdUrlTraite]);

  async function initialiserPage() {
    try {
      setChargement(true);
      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

      if (resultat.erreur || !resultat.contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const idEntreprise = resultat.contexte.entreprise.id;
      setEntrepriseId(idEntreprise);

      await Promise.all([
        chargerClients(idEntreprise),
        chargerSalaries(idEntreprise),
        chargerDevis(idEntreprise),
        chargerArticles(idEntreprise),
        chargerFiches(idEntreprise),
      ]);
    } catch (error) {
      console.error("Erreur initialisation fiches intervention :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerClients(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .neq("statut", "archive")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement clients :", error);
      setMessageErreur(error.message || "Impossible de charger les clients.");
      return;
    }

    setClients((data || []) as Client[]);
  }

  async function chargerSalaries(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise);

    if (error) {
      console.error("Erreur chargement salariés :", error);
      setSalaries([]);
      return;
    }

    const actifs = ((data || []) as Salarie[]).filter(
      (salarie) => salarie.statut !== "archive" && salarie.statut !== "inactif"
    );

    setSalaries(actifs);
  }

  async function chargerDevis(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("statut", ["accepte", "envoye", "brouillon", "facture"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement devis :", error);
      setDevis([]);
      return;
    }

    setDevis((data || []) as Devis[]);
  }

  async function chargerLignesDevis(devisId: string): Promise<DevisLigne[]> {
    if (!entrepriseId || !devisId) {
      setLignesDevis([]);
      return [];
    }

    const { data, error } = await supabase
      .from("devis_lignes")
      .select("*")
      .eq("entreprise_id", entrepriseId)
      .eq("devis_id", devisId)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Erreur chargement lignes devis :", error);
      setLignesDevis([]);
      return [];
    }

    const lignesChargees = (data || []) as DevisLigne[];
    setLignesDevis(lignesChargees);
    return lignesChargees;
  }

  async function chargerArticles(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("articles_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("actif", true)
      .order("categorie", { ascending: true })
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });

    if (error) {
      console.error("Erreur chargement bibliothèque intervention :", error);
      setArticles([]);
      return;
    }

    setArticles((data || []) as ArticleIntervention[]);
  }

  async function chargerFiches(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("date_prevue", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement fiches :", error);
      setMessageErreur(
        error.message || "Impossible de charger les fiches d’intervention."
      );
      return;
    }

    const fichesData = (data || []) as FicheIntervention[];
    setFiches(fichesData);

    const ids = fichesData.map((fiche) => fiche.id);

    if (ids.length === 0) {
      setElementsFiches([]);
      setSalariesFiches([]);
      return;
    }

    await Promise.all([
      chargerElementsFiches(idEntreprise, ids),
      chargerSalariesFiches(idEntreprise, ids),
    ]);
  }

  async function chargerElementsFiches(idEntreprise: string, ficheIds: string[]) {
    const { data, error } = await supabase
      .from("fiches_intervention_elements")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("fiche_id", ficheIds)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Erreur chargement éléments fiches :", error);
      setElementsFiches([]);
      return;
    }

    setElementsFiches((data || []) as FicheElement[]);
  }

  async function chargerSalariesFiches(idEntreprise: string, ficheIds: string[]) {
    const { data, error } = await supabase
      .from("fiches_intervention_salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("fiche_id", ficheIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erreur chargement salariés fiches :", error);
      setSalariesFiches([]);
      return;
    }

    setSalariesFiches((data || []) as FicheSalarie[]);
  }

  const articlesParCategorie = useMemo(() => {
    const resultat: Record<string, ArticleIntervention[]> = {};

    for (const article of articles) {
      if (!resultat[article.categorie]) resultat[article.categorie] = [];
      resultat[article.categorie].push(article);
    }

    return resultat;
  }, [articles]);

  const devisSelectionne = useMemo(() => {
    if (!formulaire.devis_id) return null;
    return devis.find((item) => item.id === formulaire.devis_id) || null;
  }, [devis, formulaire.devis_id]);

  const typeSelectionne = useMemo(() => {
    if (!formulaire.type_intervention_id) return null;
    return (
      articles.find(
        (article) => article.id === formulaire.type_intervention_id
      ) || null
    );
  }, [articles, formulaire.type_intervention_id]);

  const statistiques = useMemo(() => {
    const fichesNonArchivees = fiches.filter(
      (fiche) => fiche.statut !== "archivee"
    );

    return {
      total: fichesNonArchivees.length,
      brouillons: fichesNonArchivees.filter(
        (fiche) => (fiche.statut || "brouillon") === "brouillon"
      ).length,
      planifiees: fichesNonArchivees.filter(
        (fiche) => fiche.statut === "planifiee"
      ).length,
      enCours: fichesNonArchivees.filter(
        (fiche) => fiche.statut === "en_cours"
      ).length,
      terminees: fichesNonArchivees.filter(
        (fiche) => fiche.statut === "terminee"
      ).length,
      archivees: fiches.filter((fiche) => fiche.statut === "archivee").length,
    };
  }, [fiches]);

  const fichesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return fiches.filter((fiche) => {
      const statutFiche = fiche.statut || "brouillon";

      const correspondStatut =
        filtreStatut === "tous"
          ? statutFiche !== "archivee"
          : statutFiche === filtreStatut;

      const elements = elementsFiches
        .filter((element) => element.fiche_id === fiche.id)
        .map((element) => element.nom)
        .join(" ");

      const salariesAssocies = salariesFiches
        .filter((item) => item.fiche_id === fiche.id)
        .map((item) => item.salarie_nom)
        .join(" ");

      const zoneRecherche = [
        fiche.numero,
        fiche.titre,
        fiche.client_nom,
        fiche.salarie_nom,
        salariesAssocies,
        fiche.type_intervention,
        fiche.adresse_chantier,
        fiche.code_postal_chantier,
        fiche.ville_chantier,
        fiche.travaux_prevus,
        fiche.materiel_prevu,
        fiche.consignes_securite,
        fiche.notes_internes,
        elements,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        texte.length === 0 || zoneRecherche.includes(texte);

      return correspondStatut && correspondRecherche;
    });
  }, [fiches, recherche, filtreStatut, elementsFiches, salariesFiches]);

  function trouverClient(clientId: string | null | undefined) {
    if (!clientId) return null;
    return clients.find((client) => client.id === clientId) || null;
  }

  function trouverSalarie(salarieId: string | null | undefined) {
    if (!salarieId) return null;
    return salaries.find((salarie) => salarie.id === salarieId) || null;
  }

  function elementsDeFiche(ficheId: string) {
    return elementsFiches.filter((element) => element.fiche_id === ficheId);
  }

  function salariesDeFiche(ficheId: string) {
    return salariesFiches.filter((item) => item.fiche_id === ficheId);
  }

  function devisDeFiche(fiche: FicheIntervention) {
    if (!fiche.devis_id) return null;
    return devis.find((item) => item.id === fiche.devis_id) || null;
  }

  function ouvrirCreation() {
    setEtapeCreation(1);
    setOngletElementsCreation("travaux");
    setAffectationsCreation({});
    setFormulaire(FORMULAIRE_VIDE);
    setElementsSelectionnes([]);
    setSalariesSelectionnes([]);
    setLignesDevis([]);
    setResumePreselectionAutomatique(null);
    setCreationRapideCategorie(null);
    setCreationRapideNom("");
    setCreationRapideIcone("🛠️");
    setMessageErreur("");
    setMessageSucces("");
    setModalCreationOuverte(true);
  }

  async function ouvrirCreationDepuisDevisUrl(devisId: string) {
    const devisTrouve = devis.find((item) => item.id === devisId);

    if (!devisTrouve) {
      setMessageErreur(
        "Le devis demandé n’a pas été trouvé dans la liste des devis disponibles."
      );
      return;
    }

    setEtapeCreation(1);
    setOngletElementsCreation("travaux");
    setAffectationsCreation({});
    setFormulaire(FORMULAIRE_VIDE);
    setElementsSelectionnes([]);
    setSalariesSelectionnes([]);
    setLignesDevis([]);
    setResumePreselectionAutomatique(null);
    setCreationRapideCategorie(null);
    setCreationRapideNom("");
    setCreationRapideIcone("🛠️");
    setMessageErreur("");
    setMessageSucces(
      `Devis ${devisTrouve.numero || ""} chargé pour créer une fiche intervention.`
    );
    setModalCreationOuverte(true);

    await selectionnerDevis(devisId);
  }

  function reinitialiserCreation() {
    setEtapeCreation(1);
    setOngletElementsCreation("travaux");
    setAffectationsCreation({});
    setFormulaire(FORMULAIRE_VIDE);
    setElementsSelectionnes([]);
    setSalariesSelectionnes([]);
    setLignesDevis([]);
    setCreationRapideCategorie(null);
    setCreationRapideNom("");
    setCreationRapideIcone("🛠️");
  }

  function fermerCreation() {
    if (enregistrement) return;

    setModalCreationOuverte(false);
    reinitialiserCreation();
  }

  function modifierChamp(champ: keyof FormulaireCreation, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function modifierDateDebutPrevue(valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      date_prevue: valeur,
      date_fin_prevue:
        !ancien.date_fin_prevue ||
        ancien.date_fin_prevue < valeur
          ? valeur
          : ancien.date_fin_prevue,
    }));
  }

  async function selectionnerDevis(devisId: string) {
    modifierChamp("devis_id", devisId);
    setElementsSelectionnes([]);

    const item = devis.find((devisItem) => devisItem.id === devisId);

    if (!item) {
      setFormulaire((ancien) => ({
        ...ancien,
        devis_id: devisId,
        titre: "",
        adresse_chantier: "",
        code_postal_chantier: "",
        ville_chantier: "",
        notes_chantier: "",
      }));
      setLignesDevis([]);
      setResumePreselectionAutomatique(null);
      return;
    }

    const client = trouverClient(item.client_id);

    const adresse =
      item.adresse_chantier ||
      client?.adresse_chantier ||
      client?.adresse ||
      "";

    const codePostal =
      item.code_postal_chantier ||
      client?.code_postal_chantier ||
      client?.code_postal ||
      "";

    const ville =
      item.ville_chantier || client?.ville_chantier || client?.ville || "";

    const notes = item.notes_chantier || client?.notes_chantier || "";

    setFormulaire((ancien) => ({
      ...ancien,
      devis_id: devisId,
      titre: item.objet || `Intervention ${item.numero || ""}`.trim(),
      adresse_chantier: adresse,
      code_postal_chantier: codePostal,
      ville_chantier: ville,
      notes_chantier: notes,
    }));

    const lignesChargees = await chargerLignesDevis(devisId);
    appliquerPreselectionAutomatique(lignesChargees);
  }

  function appliquerPreselectionAutomatique(lignes: DevisLigne[]) {
    if (lignes.length === 0) {
      setResumePreselectionAutomatique(null);
      return;
    }

    const profilsDetectes = profilsDepuisLignes(lignes);
    const typeAutomatique = trouverTypeInterventionAutomatique(
      articles,
      profilsDetectes,
      lignes
    );

    const idsLignesDevis = lignes.map((ligne) => `ligne-devis-${ligne.id}`);

    const articlesAutomatiques = articles.filter((article) =>
      articleCorrespondAuxBesoins(article, profilsDetectes)
    );

    const idsArticlesAutomatiques = articlesAutomatiques.map(
      (article) => article.id
    );

    // Les lignes du devis deviennent les travaux de base. Les besoins métier
    // trouvés dans la bibliothèque sont seulement proposés : le chef peut tout
    // retirer ou ajouter ensuite avant la validation.
    setElementsSelectionnes(
      Array.from(new Set([...idsLignesDevis, ...idsArticlesAutomatiques]))
    );

    if (typeAutomatique) {
      setFormulaire((ancien) => ({
        ...ancien,
        type_intervention_id: typeAutomatique.id,
      }));
    }

    setResumePreselectionAutomatique({
      profils: profilsDetectes.map((profil) => profil.libelle),
      typeIntervention: typeAutomatique?.nom || null,
      nombreElements: idsArticlesAutomatiques.length,
      nombreLignesDevis: idsLignesDevis.length,
    });
  }

  function basculerElement(articleId: string) {
    setElementsSelectionnes((anciens) => {
      if (anciens.includes(articleId)) {
        return anciens.filter((id) => id !== articleId);
      }

      return [...anciens, articleId];
    });
  }

  function idsArticlesCategorie(categorie: CategorieArticle) {
    return (articlesParCategorie[categorie] || []).map((article) => article.id);
  }

  function nombreSelectionneCategorie(categorie: CategorieArticle) {
    const idsCategorie = idsArticlesCategorie(categorie);

    return idsCategorie.filter((id) => elementsSelectionnes.includes(id)).length;
  }

  function selectionnerTousCategorie(categorie: CategorieArticle) {
    const idsCategorie = idsArticlesCategorie(categorie);

    setElementsSelectionnes((anciens) =>
      Array.from(new Set([...anciens, ...idsCategorie]))
    );
  }

  function deselectionnerCategorie(categorie: CategorieArticle) {
    const idsCategorie = new Set(idsArticlesCategorie(categorie));

    setElementsSelectionnes((anciens) =>
      anciens.filter((id) => !idsCategorie.has(id))
    );
  }

  function idsVirtuelsLignesDevis() {
    return lignesDevis.map((ligne) => `ligne-devis-${ligne.id}`);
  }

  function nombreLignesDevisSelectionnees() {
    const ids = idsVirtuelsLignesDevis();

    return ids.filter((id) => elementsSelectionnes.includes(id)).length;
  }

  function selectionnerToutesLignesDevis() {
    const ids = idsVirtuelsLignesDevis();

    setElementsSelectionnes((anciens) =>
      Array.from(new Set([...anciens, ...ids]))
    );
  }

  function deselectionnerToutesLignesDevis() {
    const ids = new Set(idsVirtuelsLignesDevis());

    setElementsSelectionnes((anciens) =>
      anciens.filter((id) => !ids.has(id))
    );
  }

  function basculerSalarie(salarieId: string) {
    setSalariesSelectionnes((anciens) => {
      const dejaSelectionne = anciens.includes(salarieId);

      if (dejaSelectionne) {
        setAffectationsCreation((ancienne) => {
          const copie = { ...ancienne };
          delete copie[salarieId];
          return copie;
        });

        return anciens.filter((id) => id !== salarieId);
      }

      setAffectationsCreation((ancienne) => ({
        ...ancienne,
        [salarieId]: {
          role_chantier: "Intervenant",
          heure_arrivee_prevue:
            formulaire.heure_debut_prevue || "08:00",
          heure_depart_prevue:
            formulaire.heure_fin_prevue || "17:00",
        },
      }));

      return [...anciens, salarieId];
    });
  }

  function modifierAffectationCreation(
    salarieId: string,
    champ: keyof AffectationCreation,
    valeur: string
  ) {
    setAffectationsCreation((ancienne) => ({
      ...ancienne,
      [salarieId]: {
        role_chantier:
          ancienne[salarieId]?.role_chantier || "Intervenant",
        heure_arrivee_prevue:
          ancienne[salarieId]?.heure_arrivee_prevue ||
          formulaire.heure_debut_prevue ||
          "08:00",
        heure_depart_prevue:
          ancienne[salarieId]?.heure_depart_prevue ||
          formulaire.heure_fin_prevue ||
          "17:00",
        [champ]: valeur,
      },
    }));
  }

  function selectionnerLigneDevisCommeTravail(ligne: DevisLigne) {
    if (!ligne.designation) return;

    const idVirtuel = `ligne-devis-${ligne.id}`;

    setElementsSelectionnes((anciens) => {
      if (anciens.includes(idVirtuel)) {
        return anciens.filter((id) => id !== idVirtuel);
      }

      return [...anciens, idVirtuel];
    });
  }

  async function creerElementRapide() {
    if (!entrepriseId || !creationRapideCategorie) return;

    const nom = creationRapideNom.trim();

    if (!nom) {
      setMessageErreur("Renseignez le nom de l’élément à créer.");
      return;
    }

    try {
      setMessageErreur("");

      const ordreMax = articles
        .filter((item) => item.categorie === creationRapideCategorie)
        .reduce((max, item) => Math.max(max, Number(item.ordre || 0)), 0);

      const { data, error } = await supabase
        .from("articles_intervention")
        .insert({
          entreprise_id: entrepriseId,
          nom,
          categorie: creationRapideCategorie,
          unite: "u",
          description: null,
          icone: creationRapideIcone || "🛠️",
          couleur: "emerald",
          actif: true,
          ordre: ordreMax + 10,
        })
        .select("*")
        .single();

      if (error) throw error;

      const nouvelArticle = data as ArticleIntervention;

      setArticles((anciens) => [...anciens, nouvelArticle]);

      if (creationRapideCategorie === "type_intervention") {
        setFormulaire((ancien) => ({
          ...ancien,
          type_intervention_id: nouvelArticle.id,
        }));
      } else {
        setElementsSelectionnes((anciens) =>
          Array.from(new Set([...anciens, nouvelArticle.id]))
        );
      }

      setCreationRapideNom("");
      setCreationRapideIcone("🛠️");
      setCreationRapideCategorie(null);
      setMessageSucces(
        creationRapideCategorie === "type_intervention"
          ? "Nouveau type d’intervention ajouté et sélectionné."
          : "Nouvel élément ajouté à la bibliothèque et sélectionné."
      );
    } catch (error: any) {
      console.error("Erreur création rapide élément :", error);
      setMessageErreur(
        error?.message || "Impossible de créer cet élément pour le moment."
      );
    }
  }

  function formulaireValide() {
    if (!formulaire.devis_id) return false;
    if (!formulaire.titre.trim()) return false;
    if (!formulaire.type_intervention_id) return false;
    if (!formulaire.date_prevue) return false;
    if (!formulaire.date_fin_prevue) return false;
    if (!formulaire.heure_debut_prevue) return false;
    if (!formulaire.heure_fin_prevue) return false;
    if (!formulaire.adresse_chantier.trim()) return false;
    if (!formulaire.code_postal_chantier.trim()) return false;
    if (!formulaire.ville_chantier.trim()) return false;
    return true;
  }

  function verifierEtapeInformations() {
    if (!formulaireValide()) {
      setMessageErreur(
        "Complétez le devis, le type d’intervention, le titre, les dates de début et de fin, les horaires et l’adresse complète du chantier."
      );
      return false;
    }

    if (formulaire.date_fin_prevue < formulaire.date_prevue) {
      setMessageErreur(
        "La date de fin prévue doit être égale ou postérieure à la date de début."
      );
      return false;
    }

    if (
      formulaire.heure_fin_prevue <=
      formulaire.heure_debut_prevue
    ) {
      setMessageErreur(
        "L’heure de fin prévue doit être postérieure à l’heure de début."
      );
      return false;
    }

    setMessageErreur("");
    return true;
  }

  function verifierEtapeEquipeElements() {
    if (salariesSelectionnes.length === 0) {
      setMessageErreur(
        "Sélectionnez au moins un salarié à affecter à cette fiche d’intervention."
      );
      return false;
    }

    for (const salarieId of salariesSelectionnes) {
      const affectation = affectationsCreation[salarieId];
      const heureArrivee =
        affectation?.heure_arrivee_prevue || formulaire.heure_debut_prevue;
      const heureDepart =
        affectation?.heure_depart_prevue || formulaire.heure_fin_prevue;

      if (!heureArrivee || !heureDepart) {
        setMessageErreur(
          "Renseignez les horaires prévus de chaque salarié affecté."
        );
        return false;
      }

      if (heureDepart <= heureArrivee) {
        const salarie = trouverSalarie(salarieId);
        setMessageErreur(
          `L’heure de départ prévue de ${nomSalarie(salarie)} doit être postérieure à son heure d’arrivée.`
        );
        return false;
      }
    }

    setMessageErreur("");
    return true;
  }

  function continuerCreation() {
    if (etapeCreation === 1 && !verifierEtapeInformations()) {
      return;
    }

    if (etapeCreation === 2 && !verifierEtapeEquipeElements()) {
      return;
    }

    setMessageErreur("");
    setEtapeCreation((ancienne) =>
      Math.min(3, ancienne + 1) as EtapeCreation
    );
  }

  function revenirCreation() {
    setMessageErreur("");
    setEtapeCreation((ancienne) =>
      Math.max(1, ancienne - 1) as EtapeCreation
    );
  }

  async function enregistrerFiche() {
    if (!entrepriseId) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!formulaireValide()) {
      setMessageErreur(
        "Sélectionnez un devis, un type d’intervention, un titre, une date et les horaires prévus."
      );
      return;
    }

    if (!devisSelectionne) {
      setMessageErreur("Devis sélectionné introuvable.");
      return;
    }

    if (!verifierEtapeInformations() || !verifierEtapeEquipeElements()) {
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const client = trouverClient(devisSelectionne.client_id);
      const type = typeSelectionne;

      const articlesSelectionnes = articles.filter((article) =>
        elementsSelectionnes.includes(article.id)
      );

      const lignesSelectionnees = lignesDevis.filter((ligne) =>
        elementsSelectionnes.includes(`ligne-devis-${ligne.id}`)
      );

      const travauxTexte = [
        ...lignesSelectionnees.map((ligne) => ligne.designation || ""),
        ...articlesSelectionnes
          .filter((article) => article.categorie === "travaux")
          .map((article) => article.nom),
      ]
        .filter(Boolean)
        .join("\n");

      const materielTexte = articlesSelectionnes
        .filter((article) => article.categorie === "materiel")
        .map((article) => article.nom)
        .join("\n");

      const materiauxTexte = articlesSelectionnes
        .filter((article) => article.categorie === "materiaux")
        .map((article) => article.nom)
        .join("\n");

      const consignesTexte = articlesSelectionnes
        .filter(
          (article) =>
            article.categorie === "consigne_securite" ||
            article.categorie === "consigne_chantier"
        )
        .map((article) => article.nom)
        .join("\n");

      // Recharge les salariés sélectionnés directement depuis Supabase au moment
      // de l'enregistrement. Cela évite qu'un état React devenu obsolète crée
      // une fiche sans affectation alors que le salarié était bien coché.
      const { data: salariesSelectionnesDb, error: erreurSalariesSelectionnes } =
        await supabase
          .from("salaries")
          .select("*")
          .eq("entreprise_id", entrepriseId)
          .in("id", salariesSelectionnes);

      if (erreurSalariesSelectionnes) throw erreurSalariesSelectionnes;

      const salariesAssocies =
        (salariesSelectionnesDb || []) as Salarie[];

      if (salariesAssocies.length !== salariesSelectionnes.length) {
        throw new Error(
          "Un salarié sélectionné est introuvable ou n'appartient plus à l'entreprise. Revenez à l'étape Équipe et sélectionnez-le de nouveau."
        );
      }

      // Respecte l'ordre de sélection pour conserver le salarié principal.
      const salariesParId = new Map(
        salariesAssocies.map((salarie) => [salarie.id, salarie])
      );
      const salariesOrdonnes = salariesSelectionnes
        .map((id) => salariesParId.get(id))
        .filter(Boolean) as Salarie[];

      const premierSalarie = salariesOrdonnes[0] || null;

      const payloadFiche = {
        entreprise_id: entrepriseId,
        devis_id: devisSelectionne.id,
        facture_id: null,
        client_id: devisSelectionne.client_id,
        client_nom: devisSelectionne.client_nom || nomClient(client),
        salarie_id: premierSalarie?.id || null,
        salarie_nom: premierSalarie ? nomSalarie(premierSalarie) : null,

        titre: nettoyerTexte(formulaire.titre),
        type_intervention: type?.nom || "Intervention",
        statut: "planifiee",

        date_intervention: formulaire.date_prevue,
        heure_debut: formulaire.heure_debut_prevue,
        heure_fin: formulaire.heure_fin_prevue,

        date_prevue: formulaire.date_prevue,
        date_fin_prevue: formulaire.date_fin_prevue,
        heure_debut_prevue: formulaire.heure_debut_prevue,
        heure_fin_prevue: formulaire.heure_fin_prevue,

        adresse: nettoyerTexte(formulaire.adresse_chantier),
        code_postal: nettoyerTexte(formulaire.code_postal_chantier),
        ville: nettoyerTexte(formulaire.ville_chantier),

        adresse_chantier: nettoyerTexte(formulaire.adresse_chantier),
        code_postal_chantier: nettoyerTexte(formulaire.code_postal_chantier),
        ville_chantier: nettoyerTexte(formulaire.ville_chantier),
        notes_chantier: nettoyerTexte(formulaire.notes_chantier),

        travaux_prevus:
          nettoyerTexte(travauxTexte) ||
          nettoyerTexte(devisSelectionne.description || ""),

        materiel_prevu: nettoyerTexte(
          [materielTexte, materiauxTexte].filter(Boolean).join("\n")
        ),

        consignes_securite: nettoyerTexte(consignesTexte),
        notes_internes: nettoyerTexte(formulaire.notes_internes),

        etape_materiel_statut: "a_preparer",
        etape_arrivee_statut: "en_attente",
        etape_fin_statut: "en_attente",

        probleme_signale: false,
      };

      const { data: ficheCreee, error: erreurFiche } = await supabase
        .from("fiches_intervention")
        .insert(payloadFiche)
        .select("*")
        .single();

      if (erreurFiche) throw erreurFiche;

      const fiche = ficheCreee as FicheIntervention;

      const elementsAInserer = [
        ...lignesSelectionnees.map((ligne, index) => ({
          entreprise_id: entrepriseId,
          fiche_id: fiche.id,
          article_id: null,
          devis_ligne_id: ligne.id,
          nom: ligne.designation || "Ligne du devis",
          categorie: "travaux",
          icone: "📄",
          couleur: "blue",
          quantite_prevue: Number(ligne.quantite || 1),
          unite: ligne.unite || "u",
          obligatoire: true,
          coche_prepare: false,
          commentaire_chef: ligne.description || null,
          ordre: index + 1,
        })),

        ...articlesSelectionnes.map((article, index) => ({
          entreprise_id: entrepriseId,
          fiche_id: fiche.id,
          article_id: article.id,
          devis_ligne_id: null,
          nom: article.nom,
          categorie: article.categorie,
          icone: article.icone,
          couleur: article.couleur,
          quantite_prevue: 1,
          unite: article.unite || "u",
          obligatoire: true,
          coche_prepare: false,
          commentaire_chef: article.description,
          ordre: index + 100,
        })),
      ];

      if (elementsAInserer.length > 0) {
        const { error: erreurElements } = await supabase
          .from("fiches_intervention_elements")
          .insert(elementsAInserer);

        if (erreurElements) throw erreurElements;
      }

      const salariesAInserer = salariesOrdonnes.map((salarie) => {
        const affectation = affectationsCreation[salarie.id];

        return {
          entreprise_id: entrepriseId,
          fiche_id: fiche.id,
          salarie_id: salarie.id,
          salarie_nom: nomSalarie(salarie),
          role_chantier:
            affectation?.role_chantier || "Intervenant",
          heure_arrivee_prevue:
            affectation?.heure_arrivee_prevue ||
            formulaire.heure_debut_prevue,
          heure_depart_prevue:
            affectation?.heure_depart_prevue ||
            formulaire.heure_fin_prevue,
        };
      });

      if (salariesAInserer.length === 0) {
        throw new Error(
          "Aucun salarié n’a été préparé pour l’affectation. La fiche n’a pas été finalisée."
        );
      }

      const {
        data: affectationsCreees,
        error: erreurSalaries,
      } = await supabase
        .from("fiches_intervention_salaries")
        .upsert(salariesAInserer, {
          onConflict: "fiche_id,salarie_id",
        })
        .select("id, fiche_id, salarie_id");

      if (erreurSalaries) throw erreurSalaries;

      if (
        !affectationsCreees ||
        affectationsCreees.length !== salariesAInserer.length
      ) {
        throw new Error(
          "L’affectation de l’équipe n’a pas été enregistrée correctement. La fiche n’a pas été finalisée."
        );
      }

      const idsAffectes = new Set(
        affectationsCreees
          .map((item) => String(item.salarie_id || ""))
          .filter(Boolean)
      );

      const affectationsCompletes = salariesAInserer.every((item) =>
        idsAffectes.has(String(item.salarie_id))
      );

      if (!affectationsCompletes) {
        throw new Error(
          "Un salarié sélectionné n’a pas été rattaché à la fiche. Revenez à l’étape Équipe et recommencez."
        );
      }

      // Vérification finale en relisant la base : la fiche ne sera annoncée comme
      // créée que si toutes les affectations sont réellement visibles en base.
      const { data: affectationsVerifiees, error: erreurVerificationAffectations } =
        await supabase
          .from("fiches_intervention_salaries")
          .select("id, fiche_id, salarie_id")
          .eq("entreprise_id", entrepriseId)
          .eq("fiche_id", fiche.id)
          .in(
            "salarie_id",
            salariesAInserer.map((item) => item.salarie_id)
          );

      if (erreurVerificationAffectations) {
        throw erreurVerificationAffectations;
      }

      const idsVerifies = new Set(
        (affectationsVerifiees || []).map((item) => String(item.salarie_id || ""))
      );

      const toutesLesAffectationsSontEnBase = salariesAInserer.every((item) =>
        idsVerifies.has(String(item.salarie_id))
      );

      if (!toutesLesAffectationsSontEnBase) {
        throw new Error(
          "La fiche a été créée mais l'affectation salarié n'est pas visible en base. La fiche n'est pas finalisée."
        );
      }

      await chargerFiches(entrepriseId);

      setModalCreationOuverte(false);
      reinitialiserCreation();

      setMessageSucces(
        `Fiche d’intervention ${fiche.numero || ""} créée et planifiée.`
      );

      router.push(`/chef/interventions/${fiche.id}`);
    } catch (error: any) {
      console.error("Erreur création fiche intervention :", error);
      setMessageErreur(
        error?.message ||
          "Impossible de créer la fiche d’intervention pour le moment."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function changerStatutFiche(
    fiche: FicheIntervention,
    statut: StatutFiche
  ) {
    if (!entrepriseId) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update({ statut })
        .eq("id", fiche.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerFiches(entrepriseId);

      setMessageSucces(`Statut mis à jour : ${libelleStatut(statut)}.`);
    } catch (error: any) {
      console.error("Erreur changement statut fiche :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier le statut de la fiche."
      );
    }
  }

  function renduElementsMini(fiche: FicheIntervention) {
    const elements = elementsDeFiche(fiche.id);

    if (elements.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          Aucun élément sélectionné sur cette fiche.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {elements.slice(0, 8).map((element) => (
          <span
            key={element.id}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
          >
            <span>{element.icone || "•"}</span>
            <span>{element.nom}</span>
          </span>
        ))}

        {elements.length > 8 && (
          <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            +{elements.length - 8}
          </span>
        )}
      </div>
    );
  }

  function renduEtapes(fiche: FicheIntervention) {
    const etapesValidees = nombreEtapesValidees(fiche);
    const progression = Math.round((etapesValidees / 3) * 100);

    const etapes = [
      {
        numero: "1",
        titre: "Matériel",
        statut: fiche.etape_materiel_statut,
      },
      {
        numero: "2",
        titre: "Arrivée",
        statut: fiche.etape_arrivee_statut,
      },
      {
        numero: "3",
        titre: "Fin / PV",
        statut: fiche.etape_fin_statut,
      },
    ];

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Progression terrain
          </p>

          <p className="text-xs font-semibold text-slate-600">
            {etapesValidees}/3 étape(s)
          </p>
        </div>

        <div
          className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200"
          aria-label={`Progression de la fiche : ${progression} %`}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progression}%` }}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {etapes.map((etape) => (
            <div
              key={etape.numero}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${classeEtape(
                etape.statut
              )}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-[10px] font-black">
                  {etape.statut === "valide" ? "✓" : etape.numero}
                </span>

                <span>{etape.titre}</span>
              </div>

              <p className="mt-1 pl-7 font-normal">
                {libelleEtape(etape.statut)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renduCreationRapide() {
    if (!creationRapideCategorie) return null;

    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-950">
              {creationRapideCategorie === "type_intervention"
                ? "Créer un type d’intervention"
                : creationRapideCategorie === "materiaux"
                  ? "Créer un matériau"
                  : "Créer un nouvel élément"}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Il sera enregistré dans la bibliothèque et sélectionné sur cette
              fiche.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreationRapideCategorie(null)}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            Fermer
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[100px_1fr_auto]">
          <input
            value={creationRapideIcone}
            onChange={(event) => setCreationRapideIcone(event.target.value)}
            placeholder="🌳"
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <input
            value={creationRapideNom}
            onChange={(event) => setCreationRapideNom(event.target.value)}
            placeholder="Nom du nouvel élément"
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <button
            type="button"
            onClick={creerElementRapide}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ajouter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50 shadow-sm">
        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-sm">
                📋
              </span>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Organisation des chantiers
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Fiches d’intervention
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              Préparez chaque chantier depuis le devis, affectez l’équipe et
              suivez les trois étapes terrain jusqu’au PV de fin de chantier.
            </p>
          </div>

          <button
            type="button"
            onClick={ouvrirCreation}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            <span className="text-lg">＋</span>
            Créer depuis un devis
          </button>
        </div>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-200 sm:grid-cols-6">
          {[
            ["tous", "Toutes", statistiques.total],
            ["brouillon", "Brouillons", statistiques.brouillons],
            ["planifiee", "Planifiées", statistiques.planifiees],
            ["en_cours", "En cours", statistiques.enCours],
            ["terminee", "Terminées", statistiques.terminees],
            ["archivee", "Archivées", statistiques.archivees],
          ].map(([filtre, label, valeur]) => {
            const actif = filtreStatut === filtre;

            return (
              <button
                key={String(filtre)}
                type="button"
                onClick={() =>
                  setFiltreStatut(filtre as "tous" | StatutFiche)
                }
                className={`px-3 py-3 text-left transition sm:px-4 ${
                  actif
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide sm:text-xs">
                  {label}
                </span>
                <span className="mt-1 block text-xl font-black">
                  {Number(valeur)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>
            <input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un client, une ville, un salarié ou une tâche…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "tous" | StatutFiche)
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts actifs</option>
            <option value="brouillon">Brouillons</option>
            <option value="planifiee">Planifiées</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminées</option>
            <option value="annulee">Annulées</option>
            <option value="archivee">Archivées</option>
          </select>

          <div className="flex items-center justify-between gap-2 lg:justify-end">
            <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              {fichesFiltrees.length} fiche(s)
            </span>
            {(recherche || filtreStatut !== "tous") && (
              <button
                type="button"
                onClick={() => {
                  setRecherche("");
                  setFiltreStatut("tous");
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {chargement ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">
            Chargement des fiches…
          </div>
        ) : fichesFiltrees.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-slate-900">
              Aucune fiche d’intervention
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Aucune fiche ne correspond à la recherche ou au statut choisi.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(230px,1.35fr)_150px_150px_minmax(170px,0.9fr)_125px_52px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400 lg:grid">
              <span>Intervention / client</span>
              <span>Date et heure</span>
              <span>Équipe</span>
              <span>Progression</span>
              <span>Statut</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100">
              {fichesFiltrees.map((fiche) => {
                const devisLie = devisDeFiche(fiche);
                const equipe = salariesDeFiche(fiche.id);
                const typeArticle =
                  articles.find(
                    (article) => article.nom === fiche.type_intervention
                  ) || null;
                const ouverte = ficheDeplieeId === fiche.id;
                const nomsEquipe =
                  equipe
                    .map((membre) => membre.salarie_nom)
                    .filter(Boolean)
                    .join(", ") ||
                  fiche.salarie_nom ||
                  "Non affectée";
                const etapesValidees = nombreEtapesValidees(fiche);

                return (
                  <article
                    key={fiche.id}
                    className={`border-l-4 bg-white ${bordureCarteStatut(
                      fiche.statut
                    )}`}
                  >
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() =>
                          setFicheDeplieeId(ouverte ? null : fiche.id)
                        }
                        aria-expanded={ouverte}
                        className="min-w-0 flex-1 px-3 py-3 text-left transition hover:bg-slate-50 sm:px-4"
                      >
                        <div className="grid gap-2 lg:grid-cols-[minmax(230px,1.35fr)_150px_150px_minmax(170px,0.9fr)_125px] lg:items-center lg:gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                              {iconeType(typeArticle)}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-black text-slate-950">
                                  {titreFiche(fiche)}
                                </span>
                                <span className="shrink-0 text-xs text-slate-400">
                                  {ouverte ? "⌃" : "⌄"}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-600">
                                {fiche.client_nom || "Client non renseigné"}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-slate-400 lg:hidden">
                                📍 {adresseFiche(fiche)}
                              </span>
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 lg:block">
                            <span className="font-semibold">
                              {formatPeriodeFiche(
                                fiche.date_prevue || fiche.date_intervention,
                                fiche.date_fin_prevue ||
                                  fiche.date_prevue ||
                                  fiche.date_intervention
                              )}
                            </span>
                            <span className="lg:mt-1 lg:block">
                              {formatHeure(
                                fiche.heure_debut_prevue || fiche.heure_debut
                              )}{" "}
                              →{" "}
                              {formatHeure(
                                fiche.heure_fin_prevue || fiche.heure_fin
                              )}
                            </span>
                          </div>

                          <div className="truncate text-xs font-semibold text-slate-600">
                            👥 {nomsEquipe}
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                              <span>{etapesValidees}/3 étapes</span>
                              <span>{Math.round((etapesValidees / 3) * 100)} %</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${Math.round(
                                    (etapesValidees / 3) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 lg:block">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeStatut(
                                fiche.statut
                              )}`}
                            >
                              {libelleStatut(fiche.statut)}
                            </span>
                            {fiche.probleme_signale && (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                                ⚠ Problème
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      <details className="relative flex w-14 shrink-0 items-center justify-center border-l border-slate-100">
                        <summary
                          className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl text-lg font-black text-slate-500 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
                          aria-label="Actions de la fiche"
                        >
                          ⋮
                        </summary>
                        <div className="absolute right-2 top-11 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                          <Link
                            href={`/chef/interventions/${fiche.id}`}
                            className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Ouvrir la fiche
                          </Link>
                          {devisLie && (
                            <Link
                              href={`/chef/devis?devisId=${devisLie.id}`}
                              className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Voir le devis
                            </Link>
                          )}
                          {(fiche.statut === "brouillon" ||
                            fiche.statut === "planifiee") && (
                            <button
                              type="button"
                              onClick={() =>
                                void changerStatutFiche(fiche, "en_cours")
                              }
                              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50"
                            >
                              Passer en cours
                            </button>
                          )}
                          {fiche.statut === "en_cours" && (
                            <button
                              type="button"
                              onClick={() =>
                                void changerStatutFiche(fiche, "terminee")
                              }
                              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              Terminer
                            </button>
                          )}
                        </div>
                      </details>
                    </div>

                    {ouverte && (
                      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4">
                        <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              Adresse
                            </p>
                            <p className="mt-1 font-semibold text-slate-700">
                              {adresseFiche(fiche)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              Préparation
                            </p>
                            <p className="mt-1 font-semibold text-slate-700">
                              {libelleEtape(fiche.etape_materiel_statut)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              Arrivée / fin
                            </p>
                            <p className="mt-1 font-semibold text-slate-700">
                              {libelleEtape(fiche.etape_arrivee_statut)} ·{" "}
                              {libelleEtape(fiche.etape_fin_statut)}
                            </p>
                          </div>
                          <div className="flex items-end gap-2 xl:justify-end">
                            <Link
                              href={`/chef/interventions/${fiche.id}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Ouvrir la fiche complète
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {modalCreationOuverte && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-modal-creation-fiche"
            className="mx-auto flex w-full max-w-[1500px] flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl sm:max-h-[96vh]"
          >
            <div className="shrink-0 border-b border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                    <span>Interventions</span>
                    <span>›</span>
                    <span className="text-emerald-700">
                      Créer une fiche d’intervention
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-700">
                      📄
                    </span>
                    <div>
                      <h2
                        id="titre-modal-creation-fiche"
                        className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl"
                      >
                        Créer une fiche d’intervention
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        Préparez le chantier, affectez l’équipe puis validez avant la planification.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fermerCreation}
                  aria-label="Fermer la fenêtre de création"
                  className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 border-t border-slate-100 px-4 sm:px-6">
                {[
                  [1, "Informations", "Détails du chantier"],
                  [2, "Équipe & éléments", "Assignation et matériel"],
                  [3, "Validation", "Vérification finale"],
                ].map(([numero, titre, sousTitre]) => {
                  const n = Number(numero) as EtapeCreation;
                  const active = etapeCreation === n;
                  const terminee = etapeCreation > n;

                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        if (n === 1 || n < etapeCreation) {
                          setEtapeCreation(n);
                          setMessageErreur("");
                          return;
                        }

                        if (n === 2 && verifierEtapeInformations()) {
                          setEtapeCreation(2);
                          return;
                        }

                        if (
                          n === 3 &&
                          verifierEtapeInformations() &&
                          verifierEtapeEquipeElements()
                        ) {
                          setEtapeCreation(3);
                        }
                      }}
                      className={`relative flex min-w-0 items-center gap-2 border-b-2 px-1 py-4 text-left transition sm:gap-3 sm:px-3 ${
                        active
                          ? "border-emerald-600"
                          : "border-transparent"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          active
                            ? "bg-emerald-600 text-white"
                            : terminee
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {terminee ? "✓" : n}
                      </span>

                      <span className="min-w-0">
                        <span
                          className={`block truncate text-xs font-black sm:text-sm ${
                            active ? "text-slate-950" : "text-slate-600"
                          }`}
                        >
                          {titre}
                        </span>
                        <span className="hidden truncate text-[11px] text-slate-400 sm:block">
                          {sousTitre}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <main className="min-w-0 space-y-5">
                  {etapeCreation === 1 && (
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                            🗂️
                          </span>
                          <div>
                            <h3 className="font-black text-slate-950">
                              Informations générales
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Renseignez les données principales du chantier.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Devis associé <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formulaire.devis_id}
                            onChange={(event) =>
                              void selectionnerDevis(event.target.value)
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          >
                            <option value="">Sélectionner un devis</option>
                            {devis.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.numero || "Sans numéro"} —{" "}
                                {item.client_nom || "Client"}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Client <span className="text-red-500">*</span>
                          </label>
                          <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                            {devisSelectionne?.client_nom ||
                              "Sélectionné avec le devis"}
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Titre de la fiche <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={formulaire.titre}
                            onChange={(event) =>
                              modifierChamp("titre", event.target.value)
                            }
                            placeholder="Ex. Élagage d’un chêne — Réduction de couronne"
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Type d’intervention <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formulaire.type_intervention_id}
                            onChange={(event) =>
                              modifierChamp(
                                "type_intervention_id",
                                event.target.value
                              )
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          >
                            <option value="">Sélectionner un type</option>
                            {(articlesParCategorie.type_intervention || []).map(
                              (article) => (
                                <option key={article.id} value={article.id}>
                                  {article.icone || "🌳"} {article.nom}
                                </option>
                              )
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setCreationRapideCategorie("type_intervention");
                              setCreationRapideNom("");
                              setCreationRapideIcone("🌳");
                            }}
                            className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                          >
                            + Créer un type d’intervention
                          </button>
                        </div>

                        {resumePreselectionAutomatique && (
                          <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-black text-emerald-950">
                                  ✨ Présélection automatique depuis le devis
                                </p>
                                {resumePreselectionAutomatique.profils.length > 0 ? (
                                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                                    Catégorie(s) reconnue(s) :{" "}
                                    <strong>
                                      {resumePreselectionAutomatique.profils.join(", ")}
                                    </strong>
                                    {resumePreselectionAutomatique.typeIntervention
                                      ? ` · Type proposé : ${resumePreselectionAutomatique.typeIntervention}`
                                      : " · Aucun type correspondant trouvé dans votre bibliothèque"}
                                    {" · "}
                                    {resumePreselectionAutomatique.nombreLignesDevis} ligne(s)
                                    du devis +{" "}
                                    {resumePreselectionAutomatique.nombreElements} besoin(s)
                                    métier présélectionné(s).
                                  </p>
                                ) : (
                                  <p className="mt-1 text-xs leading-5 text-amber-800">
                                    Les lignes du devis ont été reprises comme travaux, mais
                                    aucune catégorie métier n’a été reconnue automatiquement.
                                    Vous pouvez sélectionner le type et les besoins manuellement.
                                  </p>
                                )}
                                <p className="mt-1 text-[11px] text-emerald-700">
                                  Rien n’est imposé : vous pourrez tout modifier à l’étape
                                  « Équipe & éléments ».
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  appliquerPreselectionAutomatique(lignesDevis)
                                }
                                className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                              >
                                ↻ Réappliquer
                              </button>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Date de début <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={formulaire.date_prevue}
                            onChange={(event) =>
                              modifierDateDebutPrevue(event.target.value)
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Date de fin <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            min={formulaire.date_prevue || undefined}
                            value={formulaire.date_fin_prevue}
                            onChange={(event) =>
                              modifierChamp(
                                "date_fin_prevue",
                                event.target.value
                              )
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                          <p className="mt-1 text-[11px] text-slate-400">
                            Pour un chantier d’une journée, mettez la même date.
                          </p>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Heure début prévue <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={formulaire.heure_debut_prevue}
                            onChange={(event) =>
                              modifierChamp(
                                "heure_debut_prevue",
                                event.target.value
                              )
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Heure fin prévue <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={formulaire.heure_fin_prevue}
                            onChange={(event) =>
                              modifierChamp(
                                "heure_fin_prevue",
                                event.target.value
                              )
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Adresse du chantier <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={formulaire.adresse_chantier}
                            onChange={(event) =>
                              modifierChamp(
                                "adresse_chantier",
                                event.target.value
                              )
                            }
                            placeholder="Adresse"
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Code postal <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={formulaire.code_postal_chantier}
                            onChange={(event) =>
                              modifierChamp(
                                "code_postal_chantier",
                                event.target.value
                              )
                            }
                            placeholder="03000"
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Ville <span className="text-red-500">*</span>
                          </label>
                          <input
                            value={formulaire.ville_chantier}
                            onChange={(event) =>
                              modifierChamp("ville_chantier", event.target.value)
                            }
                            placeholder="Ville"
                            className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Notes chantier / accès
                          </label>
                          <textarea
                            value={formulaire.notes_chantier}
                            onChange={(event) =>
                              modifierChamp(
                                "notes_chantier",
                                event.target.value
                              )
                            }
                            placeholder="Accès, portail, stationnement, contraintes particulières…"
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-sm font-bold text-slate-700">
                            Notes internes chef
                          </label>
                          <textarea
                            value={formulaire.notes_internes}
                            onChange={(event) =>
                              modifierChamp(
                                "notes_internes",
                                event.target.value
                              )
                            }
                            placeholder="Priorité, rappel interne, informations de préparation…"
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>

                        {creationRapideCategorie === "type_intervention" && (
                          <div className="sm:col-span-2">
                            {renduCreationRapide()}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {etapeCreation === 2 && (
                    <>
                      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-black text-slate-950">
                              👥 Équipe affectée
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              Sélectionnez les salariés puis ajustez leur rôle et leurs horaires.
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            {salariesSelectionnes.length} salarié(s)
                          </span>
                        </div>

                        <div className="p-5">
                          {salaries.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                              Aucun salarié actif n’est disponible.
                            </div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                              {salaries.map((salarie) => {
                                const actif =
                                  salariesSelectionnes.includes(salarie.id);
                                const affectation =
                                  affectationsCreation[salarie.id];

                                return (
                                  <div
                                    key={salarie.id}
                                    className={`rounded-2xl border p-4 transition ${
                                      actif
                                        ? "border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-100"
                                        : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        basculerSalarie(salarie.id)
                                      }
                                      className="flex w-full items-start justify-between gap-3 text-left"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate font-black text-slate-950">
                                          {nomSalarie(salarie)}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-slate-500">
                                          {salarie.email ||
                                            salarie.telephone ||
                                            "Salarié"}
                                        </p>
                                      </div>
                                      <span
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                                          actif
                                            ? "border-emerald-600 bg-emerald-600 text-white"
                                            : "border-slate-300 bg-white text-transparent"
                                        }`}
                                      >
                                        ✓
                                      </span>
                                    </button>

                                    {actif && (
                                      <div className="mt-4 space-y-3 border-t border-emerald-100 pt-4">
                                        <div>
                                          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            Rôle chantier
                                          </label>
                                          <select
                                            value={
                                              affectation?.role_chantier ||
                                              "Intervenant"
                                            }
                                            onChange={(event) =>
                                              modifierAffectationCreation(
                                                salarie.id,
                                                "role_chantier",
                                                event.target.value
                                              )
                                            }
                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-emerald-500"
                                          >
                                            <option value="Intervenant">Intervenant</option>
                                            <option value="Chef d’équipe">Chef d’équipe</option>
                                            <option value="Élagueur grimpeur">Élagueur grimpeur</option>
                                            <option value="Homme de pied">Homme de pied</option>
                                            <option value="Paysagiste">Paysagiste</option>
                                            <option value="Conducteur d’engin">Conducteur d’engin</option>
                                          </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                              Arrivée
                                            </label>
                                            <input
                                              type="time"
                                              value={
                                                affectation?.heure_arrivee_prevue ||
                                                formulaire.heure_debut_prevue
                                              }
                                              onChange={(event) =>
                                                modifierAffectationCreation(
                                                  salarie.id,
                                                  "heure_arrivee_prevue",
                                                  event.target.value
                                                )
                                              }
                                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none focus:border-emerald-500"
                                            />
                                          </div>

                                          <div>
                                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                              Départ
                                            </label>
                                            <input
                                              type="time"
                                              value={
                                                affectation?.heure_depart_prevue ||
                                                formulaire.heure_fin_prevue
                                              }
                                              onChange={(event) =>
                                                modifierAffectationCreation(
                                                  salarie.id,
                                                  "heure_depart_prevue",
                                                  event.target.value
                                                )
                                              }
                                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none focus:border-emerald-500"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="font-black text-slate-950">
                                📋 Éléments de la fiche
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Tâches du devis, matériel, matériaux et consignes de chantier.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCreationRapideCategorie(
                                    ongletElementsCreation === "consignes"
                                      ? "consigne_securite"
                                      : ongletElementsCreation
                                  );
                                  setCreationRapideNom("");
                                  setCreationRapideIcone("＋");
                                }}
                                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                              >
                                + Ajouter un élément
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOngletElementsCreation("materiaux");
                                  setCreationRapideCategorie("materiaux");
                                  setCreationRapideNom("");
                                  setCreationRapideIcone("🪨");
                                }}
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                + Créer un matériau
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                            {[
                              ["travaux", "Tâches"],
                              ["materiel", "Matériel"],
                              ["materiaux", "Matériaux"],
                              ["consignes", "Consignes"],
                            ].map(([id, label]) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() =>
                                  setOngletElementsCreation(
                                    id as OngletElementsCreation
                                  )
                                }
                                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition ${
                                  ongletElementsCreation === id
                                    ? "bg-white text-emerald-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          {creationRapideCategorie !== "type_intervention" &&
                            renduCreationRapide()}

                          {ongletElementsCreation === "travaux" &&
                            lignesDevis.length > 0 && (
                              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-black text-blue-950">
                                      Travaux issus du devis
                                    </p>
                                    <p className="mt-1 text-xs text-blue-700">
                                      {nombreLignesDevisSelectionnees()} /{" "}
                                      {lignesDevis.length} ligne(s) reprise(s)
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={selectionnerToutesLignesDevis}
                                      className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700"
                                    >
                                      Tout sélectionner
                                    </button>
                                    <button
                                      type="button"
                                      onClick={deselectionnerToutesLignesDevis}
                                      className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                                    >
                                      Tout retirer
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-white">
                                  {lignesDevis.map((ligne) => {
                                    const idVirtuel = `ligne-devis-${ligne.id}`;
                                    const actif =
                                      elementsSelectionnes.includes(idVirtuel);

                                    return (
                                      <button
                                        key={ligne.id}
                                        type="button"
                                        onClick={() =>
                                          selectionnerLigneDevisCommeTravail(
                                            ligne
                                          )
                                        }
                                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-blue-50/60"
                                      >
                                        <span
                                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                                            actif
                                              ? "border-blue-600 bg-blue-600 text-white"
                                              : "border-slate-300 bg-white text-transparent"
                                          }`}
                                        >
                                          ✓
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block text-sm font-bold text-slate-900">
                                            {ligne.designation ||
                                              "Ligne du devis"}
                                          </span>
                                          <span className="mt-1 block text-xs text-slate-500">
                                            {Number(ligne.quantite || 1)}{" "}
                                            {ligne.unite || "u"}
                                            {ligne.description
                                              ? ` · ${ligne.description}`
                                              : ""}
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          {(() => {
                            const categories =
                              ongletElementsCreation === "consignes"
                                ? [
                                    "consigne_securite",
                                    "consigne_chantier",
                                  ]
                                : [ongletElementsCreation];

                            const liste = categories.flatMap(
                              (categorie) =>
                                articlesParCategorie[categorie] || []
                            );

                            if (liste.length === 0) {
                              return (
                                <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                                  Aucun élément enregistré dans cette catégorie.
                                </div>
                              );
                            }

                            return (
                              <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <div className="hidden grid-cols-[minmax(0,1fr)_130px_100px_minmax(180px,0.8fr)] gap-3 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400 md:grid">
                                  <span>Élément</span>
                                  <span>Catégorie</span>
                                  <span>Prévu</span>
                                  <span>Commentaire chef</span>
                                </div>

                                <div className="divide-y divide-slate-100">
                                  {liste.map((article) => {
                                    const actif =
                                      elementsSelectionnes.includes(article.id);

                                    return (
                                      <button
                                        key={article.id}
                                        type="button"
                                        onClick={() =>
                                          basculerElement(article.id)
                                        }
                                        className={`grid w-full gap-2 px-4 py-3 text-left transition md:grid-cols-[minmax(0,1fr)_130px_100px_minmax(180px,0.8fr)] md:items-center md:gap-3 ${
                                          actif
                                            ? "bg-emerald-50/70"
                                            : "bg-white hover:bg-slate-50"
                                        }`}
                                      >
                                        <span className="flex min-w-0 items-center gap-3">
                                          <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                                              actif
                                                ? "border-emerald-600 bg-emerald-600 text-white"
                                                : "border-slate-300 bg-white text-transparent"
                                            }`}
                                          >
                                            ✓
                                          </span>
                                          <span className="text-lg">
                                            {article.icone || "•"}
                                          </span>
                                          <span className="truncate text-sm font-bold text-slate-900">
                                            {article.nom}
                                          </span>
                                        </span>

                                        <span className="text-xs font-semibold text-slate-500">
                                          {article.categorie
                                            .replace("consigne_", "")
                                            .replace("_", " ")}
                                        </span>

                                        <span className="text-xs font-semibold text-slate-600">
                                          1 {article.unite || "u"}
                                        </span>

                                        <span className="text-xs text-slate-500">
                                          {article.description || "—"}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </section>

                      <section className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <h3 className="font-black text-slate-950">
                            📷 Photos de préparation
                          </h3>
                          <div className="mt-4 flex min-h-32 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                            <div>
                              <p className="text-2xl">📸</p>
                              <p className="mt-2 text-sm font-bold text-slate-700">
                                Photos facultatives
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Elles pourront être ajoutées dès que la fiche sera créée, depuis l’onglet Photos.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                          <h3 className="font-black text-slate-950">
                            📝 Commentaire de préparation
                          </h3>
                          <textarea
                            value={formulaire.notes_internes}
                            onChange={(event) =>
                              modifierChamp(
                                "notes_internes",
                                event.target.value
                              )
                            }
                            rows={5}
                            placeholder="Accès, préparation, priorité, risque particulier…"
                            className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          />
                        </div>
                      </section>
                    </>
                  )}

                  {etapeCreation === 3 && (
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-500 text-emerald-700">
                            ✓
                          </span>
                          <div>
                            <h3 className="font-black text-slate-950">
                              Validation finale
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              Vérifiez les informations avant de créer et planifier la fiche.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-5">
                        <article className="rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h4 className="font-black text-slate-900">
                              📄 Informations générales
                            </h4>
                            <button
                              type="button"
                              onClick={() => setEtapeCreation(1)}
                              className="text-xs font-bold text-emerald-700"
                            >
                              ✎ Modifier
                            </button>
                          </div>
                          <div className="grid gap-4 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-400">
                                Client
                              </p>
                              <p className="mt-1 font-bold text-slate-800">
                                {devisSelectionne?.client_nom || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400">
                                Chantier
                              </p>
                              <p className="mt-1 font-bold text-slate-800">
                                {[
                                  formulaire.adresse_chantier,
                                  formulaire.code_postal_chantier,
                                  formulaire.ville_chantier,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400">
                                Type
                              </p>
                              <p className="mt-1 font-bold text-slate-800">
                                {typeSelectionne?.nom || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400">
                                Date & horaires
                              </p>
                              <p className="mt-1 font-bold text-slate-800">
                                {formatPeriodeFiche(
                                  formulaire.date_prevue,
                                  formulaire.date_fin_prevue
                                )} ·{" "}
                                {formulaire.heure_debut_prevue} →{" "}
                                {formulaire.heure_fin_prevue}
                              </p>
                            </div>
                          </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h4 className="font-black text-slate-900">
                              👥 Équipe affectée
                            </h4>
                            <button
                              type="button"
                              onClick={() => setEtapeCreation(2)}
                              className="text-xs font-bold text-emerald-700"
                            >
                              ✎ Modifier
                            </button>
                          </div>

                          <div className="p-4">
                            {salariesSelectionnes.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Aucun salarié affecté pour le moment.
                              </p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {salariesSelectionnes.map((id) => {
                                  const salarie = trouverSalarie(id);
                                  const affectation =
                                    affectationsCreation[id];

                                  return (
                                    <div
                                      key={id}
                                      className="rounded-xl bg-slate-50 px-3 py-3"
                                    >
                                      <p className="text-sm font-black text-slate-900">
                                        {nomSalarie(salarie)}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {affectation?.role_chantier ||
                                          "Intervenant"}{" "}
                                        ·{" "}
                                        {affectation?.heure_arrivee_prevue ||
                                          formulaire.heure_debut_prevue}{" "}
                                        →{" "}
                                        {affectation?.heure_depart_prevue ||
                                          formulaire.heure_fin_prevue}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h4 className="font-black text-slate-900">
                              📋 Éléments sélectionnés
                            </h4>
                            <button
                              type="button"
                              onClick={() => setEtapeCreation(2)}
                              className="text-xs font-bold text-emerald-700"
                            >
                              ✎ Modifier
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 p-4">
                            {elementsSelectionnes.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Aucun élément supplémentaire sélectionné.
                              </p>
                            ) : (
                              <>
                                {lignesDevis
                                  .filter((ligne) =>
                                    elementsSelectionnes.includes(
                                      `ligne-devis-${ligne.id}`
                                    )
                                  )
                                  .map((ligne) => (
                                    <span
                                      key={`validation-${ligne.id}`}
                                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                                    >
                                      📄 {ligne.designation || "Travail du devis"}
                                    </span>
                                  ))}
                                {articles
                                  .filter((article) =>
                                    elementsSelectionnes.includes(article.id)
                                  )
                                  .map((article) => (
                                    <span
                                      key={`validation-${article.id}`}
                                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                    >
                                      {article.icone || "•"} {article.nom}
                                    </span>
                                  ))}
                              </>
                            )}
                          </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h4 className="font-black text-slate-900">
                              📝 Consignes & remarques
                            </h4>
                            <button
                              type="button"
                              onClick={() => setEtapeCreation(2)}
                              className="text-xs font-bold text-emerald-700"
                            >
                              ✎ Modifier
                            </button>
                          </div>

                          <div className="grid gap-4 p-4 text-sm lg:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                Consignes sélectionnées
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {articles.filter(
                                  (article) =>
                                    elementsSelectionnes.includes(article.id) &&
                                    (article.categorie === "consigne_securite" ||
                                      article.categorie === "consigne_chantier")
                                ).length === 0 ? (
                                  <span className="text-xs text-slate-500">
                                    Aucune consigne particulière sélectionnée.
                                  </span>
                                ) : (
                                  articles
                                    .filter(
                                      (article) =>
                                        elementsSelectionnes.includes(article.id) &&
                                        (article.categorie === "consigne_securite" ||
                                          article.categorie === "consigne_chantier")
                                    )
                                    .map((article) => (
                                      <span
                                        key={`consigne-validation-${article.id}`}
                                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
                                      >
                                        {article.icone || "⚠️"} {article.nom}
                                      </span>
                                    ))
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Notes chantier
                                </p>
                                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                                  {formulaire.notes_chantier || "Aucune note chantier."}
                                </p>
                              </div>
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Notes internes
                                </p>
                                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">
                                  {formulaire.notes_internes || "Aucune note interne."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <h4 className="font-black text-slate-900">
                            Vérifications finales
                          </h4>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {[
                              "Devis associé",
                              "Date et horaires confirmés",
                              "Adresse complète",
                              "Équipe vérifiée",
                              "Matériel / éléments vérifiés",
                              "Consignes relues",
                            ].map((item) => (
                              <div
                                key={item}
                                className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                              >
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                                  ✓
                                </span>
                                {item}
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                            Après création, la fiche sera planifiée et les salariés affectés pourront la retrouver dans leur espace terrain.
                          </div>
                        </article>
                      </div>
                    </section>
                  )}
                </main>

                <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                      <span>📄</span>
                      <h3 className="font-black text-slate-950">Résumé</h3>
                    </div>

                    <div className="mt-4 space-y-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Client
                        </p>
                        <p className="mt-1 font-bold text-slate-800">
                          {devisSelectionne?.client_nom || "Non sélectionné"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Période prévue
                        </p>
                        <p className="mt-1 font-bold text-slate-800">
                          {formulaire.date_prevue
                            ? formatPeriodeFiche(
                                formulaire.date_prevue,
                                formulaire.date_fin_prevue
                              )
                            : "Non renseignée"}
                        </p>
                        {(formulaire.heure_debut_prevue ||
                          formulaire.heure_fin_prevue) && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formulaire.heure_debut_prevue || "—"} →{" "}
                            {formulaire.heure_fin_prevue || "—"}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Chantier
                        </p>
                        <p className="mt-1 font-bold text-slate-800">
                          {formulaire.titre || "Non renseigné"}
                        </p>
                        {(formulaire.code_postal_chantier ||
                          formulaire.ville_chantier) && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {[
                              formulaire.code_postal_chantier,
                              formulaire.ville_chantier,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Statut
                        </p>
                        <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                          Brouillon
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Devis associé
                        </p>
                        <p className="mt-1 font-bold text-slate-800">
                          {devisSelectionne?.numero || "—"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">Équipe</p>
                          <p className="mt-1 text-lg font-black text-slate-900">
                            {salariesSelectionnes.length}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">Éléments</p>
                          <p className="mt-1 text-lg font-black text-slate-900">
                            {elementsSelectionnes.length}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>Étape {etapeCreation} sur 3</span>
                          <span>{Math.round((etapeCreation / 3) * 100)}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all"
                            style={{
                              width: `${Math.round(
                                (etapeCreation / 3) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                      <span>💾</span>
                      <h3 className="font-black text-slate-950">Actions</h3>
                    </div>

                    <div className="mt-4 space-y-3">
                      {etapeCreation > 1 && (
                        <button
                          type="button"
                          onClick={revenirCreation}
                          disabled={enregistrement}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          ← Retour
                        </button>
                      )}

                      {etapeCreation < 3 ? (
                        <button
                          type="button"
                          onClick={continuerCreation}
                          disabled={enregistrement}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Continuer →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={enregistrerFiche}
                          disabled={enregistrement}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {enregistrement
                            ? "Création…"
                            : "✓ Créer la fiche d’intervention"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={fermerCreation}
                        disabled={enregistrement}
                        className="w-full rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    </div>

                    <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
                      Les photos avant/après et le PV restent facultatifs et pourront être ajoutés depuis la fiche.
                    </p>
                  </section>
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
