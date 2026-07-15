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
  heure_debut_prevue: string;
  heure_fin_prevue: string;
  adresse_chantier: string;
  code_postal_chantier: string;
  ville_chantier: string;
  notes_chantier: string;
  notes_internes: string;
};

const FORMULAIRE_VIDE: FormulaireCreation = {
  devis_id: "",
  type_intervention_id: "",
  titre: "",
  date_prevue: "",
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

  async function chargerLignesDevis(devisId: string) {
    if (!entrepriseId || !devisId) {
      setLignesDevis([]);
      return;
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
      return;
    }

    setLignesDevis((data || []) as DevisLigne[]);
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
    setFormulaire(FORMULAIRE_VIDE);
    setElementsSelectionnes([]);
    setSalariesSelectionnes([]);
    setLignesDevis([]);
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

    setFormulaire(FORMULAIRE_VIDE);
    setElementsSelectionnes([]);
    setSalariesSelectionnes([]);
    setLignesDevis([]);
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

  function fermerCreation() {
    if (enregistrement) return;

    setModalCreationOuverte(false);
    setFormulaire(FORMULAIRE_VIDE);
    setElementsSelectionnes([]);
    setSalariesSelectionnes([]);
    setLignesDevis([]);
    setCreationRapideCategorie(null);
  }

  function modifierChamp(champ: keyof FormulaireCreation, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
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

    await chargerLignesDevis(devisId);
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
      if (anciens.includes(salarieId)) {
        return anciens.filter((id) => id !== salarieId);
      }

      return [...anciens, salarieId];
    });
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
      setElementsSelectionnes((anciens) => [...anciens, nouvelArticle.id]);

      setCreationRapideNom("");
      setCreationRapideIcone("🛠️");
      setCreationRapideCategorie(null);
      setMessageSucces("Nouvel élément ajouté à la bibliothèque.");
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
    if (!formulaire.heure_debut_prevue) return false;
    if (!formulaire.heure_fin_prevue) return false;
    return true;
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

      const salariesAssocies = salariesSelectionnes
        .map((id) => trouverSalarie(id))
        .filter(Boolean) as Salarie[];

      const premierSalarie = salariesAssocies[0] || null;

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

      const salariesAInserer = salariesAssocies.map((salarie) => ({
        entreprise_id: entrepriseId,
        fiche_id: fiche.id,
        salarie_id: salarie.id,
        salarie_nom: nomSalarie(salarie),
        role_chantier: "Intervenant",
        heure_arrivee_prevue: formulaire.heure_debut_prevue,
        heure_depart_prevue: formulaire.heure_fin_prevue,
      }));

      if (salariesAInserer.length > 0) {
        const { error: erreurSalaries } = await supabase
          .from("fiches_intervention_salaries")
          .insert(salariesAInserer);

        if (erreurSalaries) throw erreurSalaries;
      }

      await chargerFiches(entrepriseId);

      fermerCreation();

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
              Créer un nouvel élément
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

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[
          {
            filtre: "tous" as const,
            label: "Total",
            valeur: statistiques.total,
            icone: "📚",
            inactif: "border-slate-200 bg-white text-slate-950",
            actif: "border-emerald-500 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-100",
          },
          {
            filtre: "brouillon" as const,
            label: "Brouillons",
            valeur: statistiques.brouillons,
            icone: "📝",
            inactif: "border-slate-200 bg-white text-slate-950",
            actif: "border-slate-500 bg-slate-100 text-slate-950 ring-4 ring-slate-100",
          },
          {
            filtre: "planifiee" as const,
            label: "Planifiées",
            valeur: statistiques.planifiees,
            icone: "📅",
            inactif: "border-blue-100 bg-blue-50 text-blue-950",
            actif: "border-blue-500 bg-blue-100 text-blue-950 ring-4 ring-blue-100",
          },
          {
            filtre: "en_cours" as const,
            label: "En cours",
            valeur: statistiques.enCours,
            icone: "🚧",
            inactif: "border-amber-100 bg-amber-50 text-amber-950",
            actif: "border-amber-500 bg-amber-100 text-amber-950 ring-4 ring-amber-100",
          },
          {
            filtre: "terminee" as const,
            label: "Terminées",
            valeur: statistiques.terminees,
            icone: "✅",
            inactif: "border-emerald-100 bg-emerald-50 text-emerald-950",
            actif: "border-emerald-500 bg-emerald-100 text-emerald-950 ring-4 ring-emerald-100",
          },
          {
            filtre: "archivee" as const,
            label: "Archivées",
            valeur: statistiques.archivees,
            icone: "🗃️",
            inactif: "border-slate-200 bg-slate-100 text-slate-800",
            actif: "border-slate-500 bg-slate-200 text-slate-900 ring-4 ring-slate-100",
          },
        ].map((carte) => {
          const active = filtreStatut === carte.filtre;

          return (
            <button
              key={carte.filtre}
              type="button"
              onClick={() => setFiltreStatut(carte.filtre)}
              aria-pressed={active}
              className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl ${
                active ? carte.actif : carte.inactif
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-65 sm:text-xs">
                    {carte.label}
                  </p>

                  <p className="mt-2 text-2xl font-black sm:text-3xl">
                    {carte.valeur}
                  </p>
                </div>

                <span className="text-xl transition group-hover:scale-110">
                  {carte.icone}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              >
                🔎
              </span>

              <input
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                aria-label="Rechercher une fiche d’intervention"
                placeholder="Client, devis, ville, salarié, matériel, travaux…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <select
              value={filtreStatut}
              onChange={(event) =>
                setFiltreStatut(event.target.value as "tous" | StatutFiche)
              }
              aria-label="Filtrer les fiches par statut"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 xl:w-60"
            >
              <option value="tous">Tous les statuts actifs</option>
              <option value="brouillon">Brouillons</option>
              <option value="planifiee">Planifiées</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Terminées</option>
              <option value="annulee">Annulées</option>
              <option value="archivee">Archivées</option>
            </select>

            <div className="flex items-center justify-between gap-3 xl:justify-end">
              <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                {fichesFiltrees.length} résultat(s)
              </span>

              {(recherche || filtreStatut !== "tous") && (
                <button
                  type="button"
                  onClick={() => {
                    setRecherche("");
                    setFiltreStatut("tous");
                  }}
                  className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              📋
            </div>

            <p className="font-semibold text-slate-900">
              Chargement des fiches...
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Récupération des chantiers depuis Supabase.
            </p>
          </div>
        ) : fichesFiltrees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📋
            </div>

            <p className="font-semibold text-slate-900">
              Aucune fiche d’intervention trouvée
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {recherche || filtreStatut !== "tous"
                ? "Aucune fiche ne correspond aux filtres sélectionnés."
                : "Créez une fiche depuis un devis pour préparer un chantier."}
            </p>

            {recherche || filtreStatut !== "tous" ? (
              <button
                type="button"
                onClick={() => {
                  setRecherche("");
                  setFiltreStatut("tous");
                }}
                className="mt-5 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Effacer les filtres
              </button>
            ) : (
              <button
                type="button"
                onClick={ouvrirCreation}
                className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Créer depuis un devis
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {fichesFiltrees.map((fiche) => {
              const devisLie = devisDeFiche(fiche);
              const equipe = salariesDeFiche(fiche.id);
              const typeArticle =
                articles.find(
                  (article) => article.nom === fiche.type_intervention
                ) || null;

              return (
                <article
                  key={fiche.id}
                  className={`overflow-hidden rounded-3xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5 ${bordureCarteStatut(
                    fiche.statut
                  )}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                          {iconeType(typeArticle)}
                        </span>

                        <div>
                          <h2 className="text-lg font-bold text-slate-950">
                            {titreFiche(fiche)}
                          </h2>

                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            {fiche.numero ? `${fiche.numero} · ` : ""}
                            {fiche.type_intervention || "Intervention"}
                            {devisLie?.numero
                              ? ` · Devis ${devisLie.numero}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm font-semibold text-slate-800">
                        {fiche.client_nom || "Client non renseigné"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        📍 {adresseFiche(fiche)}
                      </p>

                      {fiche.notes_chantier && (
                        <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Note chantier : {fiche.notes_chantier}
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                        fiche.statut
                      )}`}
                    >
                      {libelleStatut(fiche.statut)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-400">
                        Date prévue
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatDate(
                          fiche.date_prevue || fiche.date_intervention
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-400">
                        Horaires prévus
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatHeure(
                          fiche.heure_debut_prevue || fiche.heure_debut
                        )}{" "}
                        →{" "}
                        {formatHeure(
                          fiche.heure_fin_prevue || fiche.heure_fin
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-400">
                        Équipe
                      </p>

                      <p
                        className="mt-1 line-clamp-2 text-sm font-bold text-slate-900"
                        title={
                          equipe.length > 0
                            ? equipe
                                .map((membre) => membre.salarie_nom)
                                .filter(Boolean)
                                .join(", ")
                            : fiche.salarie_nom || "Non affecté"
                        }
                      >
                        {equipe.length > 0
                          ? equipe
                              .map((membre) => membre.salarie_nom)
                              .filter(Boolean)
                              .join(", ") || `${equipe.length} salarié(s)`
                          : fiche.salarie_nom || "Non affecté"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">{renduEtapes(fiche)}</div>

                  <ResumeRetourTerrainFiche
                    entrepriseId={entrepriseId}
                    ficheId={fiche.id}
                    problemeSignale={fiche.probleme_signale}
                    descriptionProbleme={fiche.description_probleme}
                    afficherActionsPv={true}
                    autoriserEnvoiClient={true}
                  />

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Éléments fiche
                    </p>

                    {renduElementsMini(fiche)}
                  </div>

                  <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    {devisLie && (
                      <Link
                        href={`/chef/devis?devisId=${devisLie.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Voir devis
                      </Link>
                    )}

                    <Link
                      href={`/chef/interventions/${fiche.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      Ouvrir fiche
                    </Link>

                    {fiche.statut === "planifiee" && (
                      <button
                        type="button"
                        onClick={() =>
                          changerStatutFiche(fiche, "en_cours")
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                      >
                        Passer en cours
                      </button>
                    )}

                    {fiche.statut === "en_cours" && (
                      <button
                        type="button"
                        onClick={() =>
                          changerStatutFiche(fiche, "terminee")
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Terminer la fiche
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modalCreationOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-modal-creation-fiche"
            className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white p-4 sm:p-5">
              <div>
                <h2
                  id="titre-modal-creation-fiche"
                  className="text-xl font-bold text-slate-950"
                >
                  Créer une fiche depuis un devis
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Le chef prépare la fiche complète avant l’envoi au planning et
                  aux salariés.
                </p>
              </div>

              <button type="button"
                onClick={fermerCreation}
                aria-label="Fermer la fenêtre de création"
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto bg-slate-50 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="space-y-5">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                      📄
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-950">
                        1. Sélection du devis
                      </h3>

                      <p className="text-sm text-slate-500">
                        La fiche récupère le client, l’adresse chantier et les
                        informations du devis.
                      </p>
                    </div>
                  </div>

                  <select
                    value={formulaire.devis_id}
                    onChange={(event) => selectionnerDevis(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Sélectionner un devis</option>

                    {devis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.numero || "Devis sans numéro"} ·{" "}
                        {item.client_nom || "Client"} ·{" "}
                        {item.objet || "Sans objet"} ·{" "}
                        {formatMontant(item.total_ttc)}
                      </option>
                    ))}
                  </select>

                  {devisSelectionne && (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="font-bold text-emerald-950">
                        {devisSelectionne.objet || "Devis sélectionné"}
                      </p>

                      <p className="mt-1 text-sm text-emerald-700">
                        {devisSelectionne.client_nom || "Client"} ·{" "}
                        {devisSelectionne.numero || "Sans numéro"} ·{" "}
                        {formatMontant(devisSelectionne.total_ttc)}
                      </p>
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                      🌳
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-950">
                        2. Type d’intervention
                      </h3>

                      <p className="text-sm text-slate-500">
                        Choisissez le symbole principal de la fiche.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(articlesParCategorie.type_intervention || []).map(
                      (article) => {
                        const actif =
                          formulaire.type_intervention_id === article.id;

                        return (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() =>
                              modifierChamp("type_intervention_id", article.id)
                            }
                            className={`rounded-2xl border p-4 text-left transition ${
                              actif
                                ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100"
                                : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {article.icone || "🛠️"}
                              </span>

                              <div>
                                <p className="font-bold text-slate-950">
                                  {article.nom}
                                </p>

                                {article.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                    {article.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                      🧾
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-950">
                        3. Informations chantier
                      </h3>

                      <p className="text-sm text-slate-500">
                        Le titre, l’adresse et les notes sont modifiables avant
                        planification.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_180px_180px]">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Titre de la fiche
                      </label>

                      <input
                        value={formulaire.titre}
                        onChange={(event) =>
                          modifierChamp("titre", event.target.value)
                        }
                        placeholder="Ex : Taille de haie, démontage sapin..."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Date prévue
                      </label>

                      <input
                        type="date"
                        value={formulaire.date_prevue}
                        onChange={(event) =>
                          modifierChamp("date_prevue", event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Heures prévues
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          value={formulaire.heure_debut_prevue}
                          onChange={(event) =>
                            modifierChamp(
                              "heure_debut_prevue",
                              event.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        />

                        <input
                          type="time"
                          value={formulaire.heure_fin_prevue}
                          onChange={(event) =>
                            modifierChamp(
                              "heure_fin_prevue",
                              event.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Adresse chantier
                    </label>

                    <input
                      value={formulaire.adresse_chantier}
                      onChange={(event) =>
                        modifierChamp("adresse_chantier", event.target.value)
                      }
                      placeholder="Adresse complète"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Code postal
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
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Ville
                      </label>

                      <input
                        value={formulaire.ville_chantier}
                        onChange={(event) =>
                          modifierChamp("ville_chantier", event.target.value)
                        }
                        placeholder="Ville"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Notes chantier / accès
                    </label>

                    <textarea
                      value={formulaire.notes_chantier}
                      onChange={(event) =>
                        modifierChamp("notes_chantier", event.target.value)
                      }
                      placeholder="Accès, portail, consignes particulières, client absent..."
                      rows={3}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-xl">
                      👥
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-950">
                        4. Équipe affectée
                      </h3>

                      <p className="text-sm text-slate-500">
                        Sélectionnez les salariés qui verront la fiche côté
                        salarié.
                      </p>
                    </div>
                  </div>

                  {salaries.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      Aucun salarié actif trouvé.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {salaries.map((salarie) => {
                        const actif = salariesSelectionnes.includes(salarie.id);

                        return (
                          <button
                            key={salarie.id}
                            type="button"
                            onClick={() => basculerSalarie(salarie.id)}
                            className={`rounded-2xl border p-4 text-left transition ${
                              actif
                                ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100"
                                : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                            }`}
                          >
                            <p className="font-bold text-slate-950">
                              {nomSalarie(salarie)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {salarie.email || salarie.telephone || "Salarié"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                      📝
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-950">
                        5. Notes internes chef
                      </h3>

                      <p className="text-sm text-slate-500">
                        Informations non visibles client.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={formulaire.notes_internes}
                    onChange={(event) =>
                      modifierChamp("notes_internes", event.target.value)
                    }
                    placeholder="Temps prévu, rappel chef, priorité, matériel spécifique..."
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </section>
              </div>

              <aside className="space-y-5 xl:sticky xl:top-0 xl:self-start">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-slate-950">
                    Résumé de création
                  </p>

                  <div className="mt-4 space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Devis
                      </p>

                      <p className="font-semibold text-slate-800">
                        {devisSelectionne?.numero || "Non sélectionné"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Client
                      </p>

                      <p className="font-semibold text-slate-800">
                        {devisSelectionne?.client_nom || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Type
                      </p>

                      <p className="font-semibold text-slate-800">
                        {typeSelectionne
                          ? `${typeSelectionne.icone || ""} ${
                              typeSelectionne.nom
                            }`
                          : "Non sélectionné"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Sélections
                      </p>

                      <p className="font-semibold text-slate-800">
                        {elementsSelectionnes.length} élément(s)
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Équipe
                      </p>

                      <p className="font-semibold text-slate-800">
                        {salariesSelectionnes.length} salarié(s)
                      </p>
                    </div>
                  </div>
                </section>

                {lignesDevis.length > 0 && (
                  <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-blue-950">
                            Lignes du devis à reprendre
                          </p>

                          <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                            {nombreLignesDevisSelectionnees()} / {lignesDevis.length} sélectionnée(s)
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-blue-700">
                          Plusieurs lignes peuvent être cochées en même temps pour créer les tâches de la fiche.
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={selectionnerToutesLignesDevis}
                          className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Tout sélectionner
                        </button>

                        <button
                          type="button"
                          onClick={deselectionnerToutesLignesDevis}
                          className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-100"
                        >
                          Tout retirer
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {lignesDevis.map((ligne) => {
                        const idVirtuel = `ligne-devis-${ligne.id}`;
                        const actif = elementsSelectionnes.includes(idVirtuel);

                        return (
                          <button
                            key={ligne.id}
                            type="button"
                            aria-pressed={actif}
                            onClick={() =>
                              selectionnerLigneDevisCommeTravail(ligne)
                            }
                            className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                              actif
                                ? "border-blue-500 bg-white ring-4 ring-blue-100"
                                : "border-blue-100 bg-white/70 hover:border-blue-300 hover:bg-white"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                                actif
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300 bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-slate-950">
                                📄 {ligne.designation || "Ligne du devis"}
                              </span>

                              <span className="mt-1 block text-xs text-slate-500">
                                {Number(ligne.quantite || 1)} {ligne.unite || "u"}
                              </span>

                              {ligne.description && (
                                <span className="mt-1 block text-xs text-slate-500">
                                  {ligne.description}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {renduCreationRapide()}

                {CATEGORIES_ELEMENTS.map((bloc) => {
                  const articlesCategorie =
                    articlesParCategorie[bloc.categorie] || [];
                  const nombreSelectionne = nombreSelectionneCategorie(
                    bloc.categorie
                  );

                  return (
                    <section
                      key={bloc.categorie}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">
                              {bloc.icone} {bloc.titre}
                            </p>

                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                              {nombreSelectionne} / {articlesCategorie.length} sélectionné(s)
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {bloc.description} Tu peux en sélectionner plusieurs.
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {articlesCategorie.length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  selectionnerTousCategorie(bloc.categorie)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Tout sélectionner
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deselectionnerCategorie(bloc.categorie)
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                Tout retirer
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setCreationRapideCategorie(bloc.categorie);
                              setCreationRapideNom("");
                              setCreationRapideIcone(bloc.icone);
                            }}
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            + Créer
                          </button>
                        </div>
                      </div>

                      {articlesCategorie.length === 0 ? (
                        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          Aucun élément enregistré dans cette catégorie.
                        </p>
                      ) : (
                        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                          {articlesCategorie.map((article) => {
                            const actif = elementsSelectionnes.includes(
                              article.id
                            );

                            return (
                              <button
                                key={article.id}
                                type="button"
                                aria-pressed={actif}
                                onClick={() => basculerElement(article.id)}
                                className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                                  actif
                                    ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100"
                                    : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                                }`}
                              >
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                                    actif
                                      ? "border-emerald-600 bg-emerald-600 text-white"
                                      : "border-slate-300 bg-white text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>

                                <span className="text-xl">
                                  {article.icone || "•"}
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-slate-900">
                                    {article.nom}
                                  </span>

                                  {article.description && (
                                    <span className="mt-1 block text-xs text-slate-500">
                                      {article.description}
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </aside>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <p className="text-xs text-slate-500">
                Les champs devis, type, titre, date et horaires sont obligatoires.
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button"
                onClick={fermerCreation}
                disabled={enregistrement}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button type="button"
                onClick={enregistrerFiche}
                disabled={enregistrement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement
                  ? "Création..."
                  : "Créer la fiche et planifier"}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}