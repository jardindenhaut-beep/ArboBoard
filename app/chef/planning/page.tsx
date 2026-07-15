"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type VuePlanning = "jour" | "semaine" | "mois" | "liste";

type FiltreRapide =
  | "toutes"
  | "aujourd_hui"
  | "a_venir"
  | "en_cours"
  | "terminees"
  | "problemes";

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type FiltreStatut = "tous" | StatutFiche;

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
  entreprise_id: string;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
  heure_arrivee_prevue: string | null;
  heure_depart_prevue: string | null;
  heure_arrivee_reelle: string | null;
  heure_depart_reelle: string | null;
};

type OptionSalarie = {
  valeur: string;
  libelle: string;
};

function messageErreurInconnue(
  error: unknown,
  messageParDefaut: string
) {
  return error instanceof Error && error.message
    ? error.message
    : messageParDefaut;
}

function dateLocaleIso(date = new Date()) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function dateDepuisIso(dateIso: string) {
  return new Date(`${dateIso}T12:00:00`);
}

function ajouterJours(dateIso: string, jours: number) {
  const date = dateDepuisIso(dateIso);
  date.setDate(date.getDate() + jours);
  return dateLocaleIso(date);
}

function ajouterMois(dateIso: string, mois: number) {
  const date = dateDepuisIso(dateIso);
  const jourInitial = date.getDate();

  date.setDate(1);
  date.setMonth(date.getMonth() + mois);

  const dernierJourDuMois = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  date.setDate(Math.min(jourInitial, dernierJourDuMois));
  return dateLocaleIso(date);
}

function debutSemaine(dateIso: string) {
  const date = dateDepuisIso(dateIso);
  const jour = date.getDay();
  const decalage = jour === 0 ? -6 : 1 - jour;

  date.setDate(date.getDate() + decalage);
  return dateLocaleIso(date);
}

function debutMois(dateIso: string) {
  const date = dateDepuisIso(dateIso);
  date.setDate(1);
  return dateLocaleIso(date);
}

function construireSemaine(dateIso: string) {
  const debut = debutSemaine(dateIso);
  return Array.from({ length: 7 }, (_, index) =>
    ajouterJours(debut, index)
  );
}

function construireGrilleMois(dateIso: string) {
  const premierJour = debutMois(dateIso);
  const premierJourGrille = debutSemaine(premierJour);

  return Array.from({ length: 42 }, (_, index) =>
    ajouterJours(premierJourGrille, index)
  );
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Non planifiée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(dateDepuisIso(date));
  } catch {
    return date;
  }
}

function formatDateCourte(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dateDepuisIso(date));
  } catch {
    return date;
  }
}

function formatJourSemaine(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
  }).format(dateDepuisIso(date));
}

function formatNumeroJour(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
  }).format(dateDepuisIso(date));
}

function formatMoisAnnee(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(dateDepuisIso(date));
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || fiche.type_intervention || "Intervention";
}

function dateFiche(fiche: FicheIntervention) {
  return fiche.date_prevue || fiche.date_intervention || "";
}

function heureDebutFiche(fiche: FicheIntervention) {
  return fiche.heure_debut_prevue || fiche.heure_debut || "";
}

function heureFinFiche(fiche: FicheIntervention) {
  return fiche.heure_fin_prevue || fiche.heure_fin || "";
}

function adresseFiche(fiche: FicheIntervention) {
  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const codePostal =
    fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";
  const villeComplete = [codePostal, ville].filter(Boolean).join(" ");

  if (!adresse && !villeComplete) {
    return "Adresse non renseignée";
  }

  return [adresse, villeComplete].filter(Boolean).join(", ");
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
  if (statut === "planifiee") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (statut === "en_cours") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (statut === "terminee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statut === "annulee") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (statut === "archivee") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function bordureEvenement(fiche: FicheIntervention) {
  if (fiche.probleme_signale) {
    return "border-red-300 bg-red-50 hover:border-red-400";
  }

  if (fiche.statut === "en_cours") {
    return "border-amber-300 bg-amber-50 hover:border-amber-400";
  }

  if (fiche.statut === "terminee") {
    return "border-emerald-300 bg-emerald-50 hover:border-emerald-400";
  }

  if (fiche.statut === "annulee") {
    return "border-slate-300 bg-slate-100 opacity-70";
  }

  return "border-blue-200 bg-blue-50 hover:border-blue-300";
}

function libelleEtape(statut: string | null | undefined) {
  if (statut === "valide") return "Validée";
  if (statut === "en_cours") return "En cours";
  if (statut === "probleme") return "Problème";
  if (statut === "a_preparer") return "À préparer";
  return "En attente";
}

function classeEtape(statut: string | null | undefined) {
  if (statut === "valide") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (statut === "en_cours") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (statut === "probleme") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function peutDeplacerFiche(fiche: FicheIntervention) {
  return !["terminee", "annulee", "archivee"].includes(
    fiche.statut || "brouillon"
  );
}

function iconeStatutPlanning(statut: string | null | undefined) {
  if (statut === "planifiee") return "📅";
  if (statut === "en_cours") return "🚧";
  if (statut === "terminee") return "✅";
  if (statut === "annulee") return "⛔";
  if (statut === "archivee") return "🗄️";
  return "📝";
}

function barreStatutPlanning(fiche: FicheIntervention) {
  if (fiche.probleme_signale) return "bg-red-500";
  if (fiche.statut === "en_cours") return "bg-amber-500";
  if (fiche.statut === "terminee") return "bg-emerald-600";
  if (fiche.statut === "annulee") return "bg-slate-400";
  if (fiche.statut === "planifiee") return "bg-blue-500";
  return "bg-slate-400";
}

function estWeekend(dateIso: string) {
  const jour = dateDepuisIso(dateIso).getDay();
  return jour === 0 || jour === 6;
}

function pluraliserIntervention(nombre: number) {
  return `${nombre} intervention${nombre === 1 ? "" : "s"}`;
}

export default function PlanningChefPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [elements, setElements] = useState<FicheElement[]>([]);
  const [equipes, setEquipes] = useState<FicheSalarie[]>([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [vue, setVue] = useState<VuePlanning>("semaine");
  const [dateReference, setDateReference] = useState(dateLocaleIso());
  const [recherche, setRecherche] = useState("");
  const [filtreRapide, setFiltreRapide] =
    useState<FiltreRapide>("toutes");
  const [filtreStatut, setFiltreStatut] =
    useState<FiltreStatut>("tous");
  const [filtreSalarie, setFiltreSalarie] = useState("tous");

  const [ficheGlisseeId, setFicheGlisseeId] = useState<string | null>(
    null
  );
  const [dateSurvolee, setDateSurvolee] = useState<string | null>(null);

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();

      if (
        resultat.erreur ||
        !resultat.contexte?.entreprise?.id
      ) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        return;
      }

      const idEntreprise = resultat.contexte.entreprise.id as string;

      setEntrepriseId(idEntreprise);
      await chargerPlanning(idEntreprise);
    } catch (error: unknown) {
      console.error("Erreur initialisation planning chef :", error);
      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de charger le planning chef."
        )
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerPlanning(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .or("statut.is.null,statut.neq.archivee")
      .order("date_prevue", { ascending: true })
      .order("date_intervention", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement planning chef :", error);
      setMessageErreur(
        error.message ||
          "Impossible de charger les fiches du planning."
      );
      setFiches([]);
      setElements([]);
      setEquipes([]);
      return;
    }

    const fichesChargees = (
      (data || []) as FicheIntervention[]
    ).sort((a, b) => {
      const dateA = dateFiche(a) || "9999-12-31";
      const dateB = dateFiche(b) || "9999-12-31";

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const heureA = heureDebutFiche(a) || "99:99";
      const heureB = heureDebutFiche(b) || "99:99";

      return heureA.localeCompare(heureB);
    });

    setFiches(fichesChargees);

    const ids = fichesChargees.map((fiche) => fiche.id);

    if (ids.length === 0) {
      setElements([]);
      setEquipes([]);
      return;
    }

    const [elementsResult, equipesResult] = await Promise.all([
      supabase
        .from("fiches_intervention_elements")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .in("fiche_id", ids)
        .order("ordre", { ascending: true }),

      supabase
        .from("fiches_intervention_salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .in("fiche_id", ids)
        .order("created_at", { ascending: true }),
    ]);

    if (elementsResult.error) {
      console.error(
        "Erreur chargement éléments planning :",
        elementsResult.error
      );
      setElements([]);
    } else {
      setElements((elementsResult.data || []) as FicheElement[]);
    }

    if (equipesResult.error) {
      console.error(
        "Erreur chargement équipes planning :",
        equipesResult.error
      );
      setEquipes([]);
    } else {
      setEquipes((equipesResult.data || []) as FicheSalarie[]);
    }
  }

  async function rafraichir() {
    if (!entrepriseId || enregistrement) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      await chargerPlanning(entrepriseId);
      setMessageSucces("Planning actualisé.");
    } catch (error: unknown) {
      console.error("Erreur actualisation planning chef :", error);
      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible d’actualiser le planning."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function changerStatut(
    fiche: FicheIntervention,
    statut: StatutFiche
  ) {
    if (!entrepriseId || enregistrement) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update({ statut })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      setFiches((liste) =>
        liste.map((item) =>
          item.id === fiche.id ? { ...item, statut } : item
        )
      );

      setMessageSucces(
        `Statut mis à jour : ${libelleStatut(statut)}.`
      );
    } catch (error: unknown) {
      console.error("Erreur changement statut planning :", error);
      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de modifier le statut de la fiche."
        )
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function replanifierFiche(
    fiche: FicheIntervention,
    nouvelleDate: string
  ) {
    if (!entrepriseId || enregistrement) return;
    if (!peutDeplacerFiche(fiche)) return;
    if (dateFiche(fiche) === nouvelleDate) return;

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update({
          date_prevue: nouvelleDate,
          date_intervention: nouvelleDate,
        })
        .eq("entreprise_id", entrepriseId)
        .eq("id", fiche.id);

      if (error) throw error;

      setFiches((liste) =>
        liste
          .map((item) =>
            item.id === fiche.id
              ? {
                  ...item,
                  date_prevue: nouvelleDate,
                  date_intervention: nouvelleDate,
                }
              : item
          )
          .sort((a, b) => {
            const dateA = dateFiche(a) || "9999-12-31";
            const dateB = dateFiche(b) || "9999-12-31";

            if (dateA !== dateB) {
              return dateA.localeCompare(dateB);
            }

            return (heureDebutFiche(a) || "99:99").localeCompare(
              heureDebutFiche(b) || "99:99"
            );
          })
      );

      setMessageSucces(
        `${titreFiche(fiche)} déplacée au ${formatDateCourte(
          nouvelleDate
        )}.`
      );
    } catch (error: unknown) {
      console.error("Erreur replanification fiche :", error);
      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de déplacer cette intervention."
        )
      );
    } finally {
      setEnregistrement(false);
      setFicheGlisseeId(null);
      setDateSurvolee(null);
    }
  }

  function equipeDeFiche(fiche: FicheIntervention) {
    const equipe = equipes.filter(
      (item) => item.fiche_id === fiche.id
    );

    if (equipe.length > 0) {
      return equipe;
    }

    if (fiche.salarie_id || fiche.salarie_nom) {
      return [
        {
          id: `legacy-${fiche.id}`,
          entreprise_id: fiche.entreprise_id,
          fiche_id: fiche.id,
          salarie_id: fiche.salarie_id,
          salarie_nom: fiche.salarie_nom,
          role_chantier: "Intervenant",
          heure_arrivee_prevue:
            fiche.heure_debut_prevue || fiche.heure_debut,
          heure_depart_prevue:
            fiche.heure_fin_prevue || fiche.heure_fin,
          heure_arrivee_reelle: fiche.heure_debut_reelle,
          heure_depart_reelle: fiche.heure_fin_reelle,
        },
      ] as FicheSalarie[];
    }

    return [];
  }

  function elementsDeFiche(ficheId: string) {
    return elements.filter((element) => element.fiche_id === ficheId);
  }

  const optionsSalaries = useMemo(() => {
    const options = new Map<string, OptionSalarie>();

    for (const item of equipes) {
      const libelle = item.salarie_nom?.trim();
      if (!libelle) continue;

      const valeur = item.salarie_id
        ? `id:${item.salarie_id}`
        : `nom:${libelle.toLowerCase()}`;

      options.set(valeur, { valeur, libelle });
    }

    for (const fiche of fiches) {
      const libelle = fiche.salarie_nom?.trim();
      if (!libelle) continue;

      const valeur = fiche.salarie_id
        ? `id:${fiche.salarie_id}`
        : `nom:${libelle.toLowerCase()}`;

      if (!options.has(valeur)) {
        options.set(valeur, { valeur, libelle });
      }
    }

    return Array.from(options.values()).sort((a, b) =>
      a.libelle.localeCompare(b.libelle, "fr")
    );
  }, [equipes, fiches]);

  const statistiques = useMemo(() => {
    const aujourdhui = dateLocaleIso();

    return {
      total: fiches.length,
      aujourdHui: fiches.filter(
        (fiche) => dateFiche(fiche) === aujourdhui
      ).length,
      aVenir: fiches.filter((fiche) => {
        const date = dateFiche(fiche);

        return Boolean(
          date &&
            date >= aujourdhui &&
            fiche.statut !== "terminee" &&
            fiche.statut !== "annulee" &&
            fiche.statut !== "archivee"
        );
      }).length,
      enCours: fiches.filter(
        (fiche) => fiche.statut === "en_cours"
      ).length,
      terminees: fiches.filter(
        (fiche) => fiche.statut === "terminee"
      ).length,
      problemes: fiches.filter(
        (fiche) => fiche.probleme_signale === true
      ).length,
    };
  }, [fiches]);

  const fichesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const aujourdhui = dateLocaleIso();

    return fiches.filter((fiche) => {
      const date = dateFiche(fiche);
      const statut = (fiche.statut || "brouillon") as StatutFiche;
      const equipe = equipeDeFiche(fiche);

      const correspondFiltreRapide =
        filtreRapide === "toutes" ||
        (filtreRapide === "aujourd_hui" && date === aujourdhui) ||
        (filtreRapide === "a_venir" &&
          Boolean(
            date &&
              date >= aujourdhui &&
              statut !== "terminee" &&
              statut !== "annulee" &&
              statut !== "archivee"
          )) ||
        (filtreRapide === "en_cours" && statut === "en_cours") ||
        (filtreRapide === "terminees" && statut === "terminee") ||
        (filtreRapide === "problemes" &&
          fiche.probleme_signale === true);

      const correspondStatut =
        filtreStatut === "tous" || statut === filtreStatut;

      const correspondSalarie =
        filtreSalarie === "tous" ||
        equipe.some((item) => {
          const valeur = item.salarie_id
            ? `id:${item.salarie_id}`
            : `nom:${(item.salarie_nom || "").toLowerCase()}`;

          return valeur === filtreSalarie;
        });

      const elementsFiche = elementsDeFiche(fiche.id)
        .map((element) => element.nom)
        .join(" ");

      const equipeFiche = equipe
        .map((item) => item.salarie_nom)
        .join(" ");

      const zoneRecherche = [
        fiche.numero,
        fiche.titre,
        fiche.type_intervention,
        fiche.client_nom,
        fiche.salarie_nom,
        fiche.adresse_chantier,
        fiche.code_postal_chantier,
        fiche.ville_chantier,
        fiche.adresse,
        fiche.code_postal,
        fiche.ville,
        fiche.notes_chantier,
        fiche.travaux_prevus,
        fiche.materiel_prevu,
        fiche.consignes_securite,
        elementsFiche,
        equipeFiche,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        texte.length === 0 || zoneRecherche.includes(texte);

      return (
        correspondFiltreRapide &&
        correspondStatut &&
        correspondSalarie &&
        correspondRecherche
      );
    });
  }, [
    fiches,
    elements,
    equipes,
    recherche,
    filtreRapide,
    filtreStatut,
    filtreSalarie,
  ]);

  const fichesParDate = useMemo(() => {
    const groupes: Record<string, FicheIntervention[]> = {};

    for (const fiche of fichesFiltrees) {
      const date = dateFiche(fiche) || "non_planifiee";

      if (!groupes[date]) {
        groupes[date] = [];
      }

      groupes[date].push(fiche);
    }

    return Object.entries(groupes).sort(([dateA], [dateB]) => {
      if (dateA === "non_planifiee") return 1;
      if (dateB === "non_planifiee") return -1;
      return dateA.localeCompare(dateB);
    });
  }, [fichesFiltrees]);

  const joursSemaine = useMemo(
    () => construireSemaine(dateReference),
    [dateReference]
  );

  const joursMois = useMemo(
    () => construireGrilleMois(dateReference),
    [dateReference]
  );

  function fichesPourDate(date: string) {
    return fichesFiltrees
      .filter((fiche) => dateFiche(fiche) === date)
      .sort((a, b) =>
        (heureDebutFiche(a) || "99:99").localeCompare(
          heureDebutFiche(b) || "99:99"
        )
      );
  }

  function naviguer(direction: -1 | 1) {
    if (vue === "jour") {
      setDateReference(ajouterJours(dateReference, direction));
      return;
    }

    if (vue === "semaine") {
      setDateReference(ajouterJours(dateReference, direction * 7));
      return;
    }

    if (vue === "liste") {
      return;
    }

    setDateReference(ajouterMois(dateReference, direction));
  }

  function allerAujourdhui() {
    const aujourdhui = dateLocaleIso();
    setDateReference(aujourdhui);
  }

  function titrePeriode() {
    if (vue === "jour") {
      return formatDate(dateReference);
    }

    if (vue === "semaine") {
      const debut = debutSemaine(dateReference);
      const fin = ajouterJours(debut, 6);
      return `${formatDateCourte(debut)} — ${formatDateCourte(fin)}`;
    }

    if (vue === "liste") {
      return "Toutes les interventions filtrées";
    }

    return formatMoisAnnee(dateReference);
  }

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreRapide("toutes");
    setFiltreStatut("tous");
    setFiltreSalarie("tous");
  }

  function commencerGlisser(
    event: DragEvent<HTMLElement>,
    fiche: FicheIntervention
  ) {
    if (!peutDeplacerFiche(fiche) || enregistrement) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", fiche.id);
    setFicheGlisseeId(fiche.id);
  }

  function autoriserDepot(
    event: DragEvent<HTMLElement>,
    date: string
  ) {
    if (!ficheGlisseeId || enregistrement) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDateSurvolee(date);
  }

  async function deposerFiche(
    event: DragEvent<HTMLElement>,
    date: string
  ) {
    event.preventDefault();

    const id =
      event.dataTransfer.getData("text/plain") || ficheGlisseeId;
    const fiche = fiches.find((item) => item.id === id);

    setDateSurvolee(null);

    if (!fiche) {
      setFicheGlisseeId(null);
      return;
    }

    await replanifierFiche(fiche, date);
  }

  function finGlisser() {
    setFicheGlisseeId(null);
    setDateSurvolee(null);
  }

  function activerFiltreRapide(filtre: FiltreRapide) {
    setFiltreRapide(filtre);

    if (filtre === "aujourd_hui") {
      setDateReference(dateLocaleIso());
      setVue("jour");
    }

    if (filtre === "a_venir") {
      setVue("liste");
    }
  }

  function renduEtapes(fiche: FicheIntervention) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${classeEtape(
            fiche.etape_materiel_statut
          )}`}
        >
          <p>1. Matériel</p>
          <p className="mt-1 font-normal">
            {libelleEtape(fiche.etape_materiel_statut)}
          </p>
        </div>

        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${classeEtape(
            fiche.etape_arrivee_statut
          )}`}
        >
          <p>2. Arrivée</p>
          <p className="mt-1 font-normal">
            {libelleEtape(fiche.etape_arrivee_statut)}
          </p>
        </div>

        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${classeEtape(
            fiche.etape_fin_statut
          )}`}
        >
          <p>3. Fin / PV</p>
          <p className="mt-1 font-normal">
            {libelleEtape(fiche.etape_fin_statut)}
          </p>
        </div>
      </div>
    );
  }

  function renduElementsMini(fiche: FicheIntervention) {
    const liste = elementsDeFiche(fiche.id);

    if (liste.length === 0) {
      return (
        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Aucun élément renseigné.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {liste.slice(0, 7).map((element) => (
          <span
            key={element.id}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
          >
            <span>{element.icone || "•"}</span>
            <span>{element.nom}</span>
          </span>
        ))}

        {liste.length > 7 && (
          <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            +{liste.length - 7}
          </span>
        )}
      </div>
    );
  }

  function renduActions(fiche: FicheIntervention) {
    const statut = (fiche.statut || "brouillon") as StatutFiche;

    return (
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <Link
          href={`/chef/interventions/${fiche.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Ouvrir fiche
        </Link>

        {(statut === "brouillon" || statut === "planifiee") && (
          <button
            type="button"
            onClick={() => changerStatut(fiche, "en_cours")}
            disabled={enregistrement}
            className="rounded-xl border border-amber-200 px-4 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Passer en cours
          </button>
        )}

        {statut === "en_cours" && (
          <button
            type="button"
            onClick={() => changerStatut(fiche, "terminee")}
            disabled={enregistrement}
            className="rounded-xl border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marquer terminée
          </button>
        )}
      </div>
    );
  }

  function renduCarteCalendrier(
    fiche: FicheIntervention,
    compacte = false
  ) {
    const equipe = equipeDeFiche(fiche);
    const deplacable = peutDeplacerFiche(fiche);

    return (
      <article
        key={fiche.id}
        draggable={deplacable && !enregistrement}
        onDragStart={(event) => commencerGlisser(event, fiche)}
        onDragEnd={finGlisser}
        className={`relative overflow-hidden rounded-xl border p-2.5 pl-3.5 shadow-sm transition ${bordureEvenement(
          fiche
        )} ${
          ficheGlisseeId === fiche.id
            ? "scale-[0.98] opacity-50"
            : ""
        } ${
          deplacable
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default"
        }`}
        title={
          deplacable
            ? "Glissez cette intervention vers un autre jour"
            : "Une intervention terminée ou annulée ne peut pas être déplacée"
        }
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${barreStatutPlanning(
            fiche
          )}`}
        />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-slate-950">
              {formatHeure(heureDebutFiche(fiche))} · {titreFiche(fiche)}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-600">
              {fiche.client_nom || "Client non renseigné"}
            </p>
          </div>

          <span
            className="shrink-0 text-xs"
            title={
              fiche.probleme_signale
                ? "Problème signalé"
                : libelleStatut(fiche.statut)
            }
          >
            {fiche.probleme_signale
              ? "⚠️"
              : iconeStatutPlanning(fiche.statut)}
          </span>
        </div>

        {!compacte && (
          <>
            <p className="mt-2 line-clamp-2 text-[10px] text-slate-500">
              📍 {adresseFiche(fiche)}
            </p>

            {equipe.length > 0 && (
              <p className="mt-2 line-clamp-1 text-[10px] font-medium text-slate-600">
                👤 {equipe.map((item) => item.salarie_nom).join(", ")}
              </p>
            )}
          </>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badgeStatut(
              fiche.statut
            )}`}
          >
            {libelleStatut(fiche.statut)}
          </span>

          <Link
            href={`/chef/interventions/${fiche.id}`}
            draggable={false}
            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900"
          >
            Ouvrir
          </Link>
        </div>
      </article>
    );
  }

  function renduCarteListe(fiche: FicheIntervention) {
    const equipe = equipeDeFiche(fiche);
    const terminee = fiche.statut === "terminee";
    const annulee = fiche.statut === "annulee";

    return (
      <article
        key={fiche.id}
        className={`relative overflow-hidden rounded-3xl border bg-white p-4 pl-5 shadow-sm transition sm:p-5 sm:pl-6 ${
          fiche.probleme_signale
            ? "border-red-200 hover:border-red-300"
            : terminee
              ? "border-emerald-200 hover:border-emerald-300"
              : annulee
                ? "border-slate-200 opacity-80"
                : "border-slate-200 hover:border-emerald-200"
        } hover:shadow-md`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1.5 ${barreStatutPlanning(
            fiche
          )}`}
        />

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl sm:h-12 sm:w-12 sm:text-2xl">
                {fiche.probleme_signale
                  ? "⚠️"
                  : iconeStatutPlanning(fiche.statut)}
              </div>

              <div className="min-w-0">
                <h2 className="break-words text-base font-bold text-slate-950 sm:text-lg">
                  {titreFiche(fiche)}
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  {fiche.type_intervention || "Intervention"}
                  {fiche.numero ? ` · ${fiche.numero}` : ""}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              {fiche.client_nom || "Client non renseigné"}
            </p>

            <p className="mt-1 break-words text-sm text-slate-500">
              📍 {adresseFiche(fiche)}
            </p>

            {fiche.notes_chantier && (
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Note chantier : {fiche.notes_chantier}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fiche.probleme_signale && (
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                ⚠️ Problème signalé
              </span>
            )}

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                fiche.statut
              )}`}
            >
              {libelleStatut(fiche.statut)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">Date</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatDateCourte(dateFiche(fiche))}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">
              Horaires prévus
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatHeure(heureDebutFiche(fiche))} →{" "}
              {formatHeure(heureFinFiche(fiche))}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">
              Horaires réels
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatHeure(fiche.heure_debut_reelle)} →{" "}
              {formatHeure(fiche.heure_fin_reelle)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">Équipe</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {equipe.length > 0
                ? `${equipe.length} salarié${equipe.length > 1 ? "s" : ""}`
                : "Non affectée"}
            </p>
          </div>
        </div>

        {equipe.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {equipe.map((item) => (
              <span
                key={item.id}
                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
              >
                👤 {item.salarie_nom || "Salarié"}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5">{renduEtapes(fiche)}</div>

        <ResumeRetourTerrainFiche
          entrepriseId={entrepriseId}
          ficheId={fiche.id}
          problemeSignale={fiche.probleme_signale}
          descriptionProbleme={fiche.description_probleme}
          afficherActionsPv={false}
          autoriserEnvoiClient={false}
        />

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Éléments fiche
          </p>
          {renduElementsMini(fiche)}
        </div>

        {renduActions(fiche)}
      </article>
    );
  }

  function renduVueJour() {
    const liste = fichesPourDate(dateReference);

    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Vue jour
              </p>
              <h2 className="mt-1 text-xl font-bold capitalize text-slate-950">
                {formatDate(dateReference)}
              </h2>
            </div>

            <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-500 shadow-sm">
              {pluraliserIntervention(liste.length)}
            </p>
          </div>
        </div>

        <div
          onDragOver={(event) => autoriserDepot(event, dateReference)}
          onDrop={(event) => deposerFiche(event, dateReference)}
          onDragLeave={() => setDateSurvolee(null)}
          className={`min-h-[360px] p-4 transition ${
            dateSurvolee === dateReference
              ? "bg-emerald-50 ring-2 ring-inset ring-emerald-300"
              : "bg-white"
          }`}
        >
          {liste.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📅
              </div>
              <p className="mt-4 font-semibold text-slate-900">
                Aucune intervention ce jour
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Vous pouvez glisser une intervention depuis une autre date ou
                créer une nouvelle fiche d’intervention.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {liste.map((fiche) => renduCarteCalendrier(fiche))}
            </div>
          )}
        </div>
      </section>
    );
  }

  function renduVueSemaine() {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 lg:hidden">
          Faites défiler horizontalement pour consulter toute la semaine.
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1050px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {joursSemaine.map((date) => {
                const aujourdhui = date === dateLocaleIso();
                const liste = fichesPourDate(date);

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setDateReference(date);
                      setVue("jour");
                    }}
                    className={`border-r border-slate-200 px-3 py-3 text-left transition last:border-r-0 hover:bg-emerald-50 ${
                      aujourdhui
                        ? "bg-emerald-50"
                        : estWeekend(date)
                          ? "bg-slate-50/80"
                          : "bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {formatJourSemaine(date)}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          aujourdhui
                            ? "bg-emerald-600 text-white"
                            : "text-slate-950"
                        }`}
                      >
                        {formatNumeroJour(date)}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-400 shadow-sm">
                        {liste.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-7">
              {joursSemaine.map((date) => {
                const liste = fichesPourDate(date);
                const survolee = dateSurvolee === date;

                return (
                  <div
                    key={date}
                    onDragOver={(event) => autoriserDepot(event, date)}
                    onDrop={(event) => deposerFiche(event, date)}
                    onDragLeave={() => setDateSurvolee(null)}
                    className={`min-h-[440px] space-y-2 border-r border-slate-200 p-2 last:border-r-0 transition ${
                      survolee
                        ? "bg-emerald-50 ring-2 ring-inset ring-emerald-300"
                        : date === dateLocaleIso()
                          ? "bg-emerald-50/30"
                          : estWeekend(date)
                            ? "bg-slate-50/60"
                            : "bg-white"
                    }`}
                  >
                    {liste.map((fiche) => renduCarteCalendrier(fiche))}

                    {liste.length === 0 && (
                      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 px-2 text-center text-[10px] text-slate-400">
                        Déposez une intervention ici
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renduVueMois() {
    const moisReference = dateReference.slice(0, 7);

    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 lg:hidden">
          Faites défiler horizontalement pour consulter tout le mois.
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
            (jour) => (
              <div
                key={jour}
                className="border-r border-slate-200 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0"
              >
                {jour}
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-7">
          {joursMois.map((date) => {
            const liste = fichesPourDate(date);
            const dansMois = date.slice(0, 7) === moisReference;
            const aujourdhui = date === dateLocaleIso();
            const survolee = dateSurvolee === date;

            return (
              <div
                key={date}
                onDragOver={(event) => autoriserDepot(event, date)}
                onDrop={(event) => deposerFiche(event, date)}
                onDragLeave={() => setDateSurvolee(null)}
                className={`min-h-[145px] border-b border-r border-slate-200 p-1.5 transition [&:nth-child(7n)]:border-r-0 ${
                  dansMois
                    ? estWeekend(date)
                      ? "bg-slate-50/70"
                      : "bg-white"
                    : "bg-slate-50/80"
                } ${
                  survolee
                    ? "bg-emerald-50 ring-2 ring-inset ring-emerald-300"
                    : ""
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setDateReference(date);
                      setVue("jour");
                    }}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      aujourdhui
                        ? "bg-emerald-600 text-white"
                        : dansMois
                          ? "text-slate-900 hover:bg-slate-100"
                          : "text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {formatNumeroJour(date)}
                  </button>

                  {liste.length > 0 && (
                    <span className="text-[9px] font-semibold text-slate-400">
                      {liste.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {liste
                    .slice(0, 3)
                    .map((fiche) => renduCarteCalendrier(fiche, true))}

                  {liste.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateReference(date);
                        setVue("jour");
                      }}
                      className="w-full rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      +{liste.length - 3} autre
                      {liste.length - 3 > 1 ? "s" : ""}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </section>
    );
  }

  function renduVueListe() {
    if (fichesFiltrees.length === 0) {
      return (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            📅
          </div>
          <p className="mt-4 font-semibold text-slate-900">
            Aucune intervention trouvée
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Aucune fiche ne correspond aux filtres ou à la recherche.
          </p>
          <Link
            href="/chef/interventions"
            className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ouvrir les fiches d’intervention
          </Link>
        </section>
      );
    }

    return (
      <section className="space-y-6">
        {fichesParDate.map(([date, liste]) => (
          <section key={date} className="space-y-3">
            <div className="sticky top-2 z-10 rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-3 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold capitalize text-slate-950">
                  {date === "non_planifiee"
                    ? "Non planifiées"
                    : formatDate(date)}
                </h2>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {liste.length} intervention{liste.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {liste.map((fiche) => renduCarteListe(fiche))}
            </div>
          </section>
        ))}
      </section>
    );
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              ⏳
            </div>
            <p className="font-semibold text-slate-950">
              Chargement du planning…
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des fiches, équipes et éléments chantier.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-emerald-600" />

          <div className="bg-gradient-to-br from-emerald-50 via-white to-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl shadow-sm">
                  📅
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                    Organisation chantier
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Planning chantier
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Organisez les interventions en vue jour, semaine, mois ou
                    liste. Glissez une fiche vers une autre date pour la
                    replanifier.
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                <Link
                  href="/chef/interventions"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <span aria-hidden="true">＋</span>
                  Nouvelle intervention
                </Link>

                <button
                  type="button"
                  onClick={() => void rafraichir()}
                  disabled={enregistrement}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span aria-hidden="true">↻</span>
                  {enregistrement ? "Enregistrement…" : "Actualiser"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {messageErreur && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {messageErreur}
          </div>
        )}

        {messageSucces && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {messageSucces}
          </div>
        )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => activerFiltreRapide("toutes")}
          aria-pressed={filtreRapide === "toutes"}
          className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            filtreRapide === "toutes"
              ? "border-slate-400 bg-slate-100 ring-2 ring-slate-100"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Total
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
            {statistiques.total}
          </p>
        </button>

        <button
          type="button"
          onClick={() => activerFiltreRapide("aujourd_hui")}
          aria-pressed={filtreRapide === "aujourd_hui"}
          className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            filtreRapide === "aujourd_hui"
              ? "border-blue-400 bg-blue-100 ring-2 ring-blue-100"
              : "border-blue-100 bg-blue-50 hover:border-blue-300"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-blue-600">
            Aujourd’hui
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-900 sm:text-3xl">
            {statistiques.aujourdHui}
          </p>
        </button>

        <button
          type="button"
          onClick={() => activerFiltreRapide("a_venir")}
          aria-pressed={filtreRapide === "a_venir"}
          className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            filtreRapide === "a_venir"
              ? "border-emerald-400 bg-emerald-100 ring-2 ring-emerald-100"
              : "border-emerald-100 bg-emerald-50 hover:border-emerald-300"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-emerald-600">
            À venir
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-900 sm:text-3xl">
            {statistiques.aVenir}
          </p>
        </button>

        <button
          type="button"
          onClick={() => activerFiltreRapide("en_cours")}
          aria-pressed={filtreRapide === "en_cours"}
          className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            filtreRapide === "en_cours"
              ? "border-amber-400 bg-amber-100 ring-2 ring-amber-100"
              : "border-amber-100 bg-amber-50 hover:border-amber-300"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-amber-600">
            En cours
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-900 sm:text-3xl">
            {statistiques.enCours}
          </p>
        </button>

        <button
          type="button"
          onClick={() => activerFiltreRapide("terminees")}
          aria-pressed={filtreRapide === "terminees"}
          className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            filtreRapide === "terminees"
              ? "border-emerald-400 bg-emerald-100 ring-2 ring-emerald-100"
              : "border-slate-200 bg-white hover:border-emerald-300"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Terminées
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
            {statistiques.terminees}
          </p>
        </button>

        <button
          type="button"
          onClick={() => activerFiltreRapide("problemes")}
          aria-pressed={filtreRapide === "problemes"}
          className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            filtreRapide === "problemes"
              ? "border-red-400 bg-red-100 ring-2 ring-red-100"
              : "border-red-100 bg-red-50 hover:border-red-300"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-red-600">
            Problèmes
          </p>
          <p className="mt-1 text-2xl font-bold text-red-900 sm:text-3xl">
            {statistiques.problemes}
          </p>
        </button>
      </section>

        <section className="sticky top-3 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1 xl:w-auto">
            {(
              [
                ["jour", "Jour"],
                ["semaine", "Semaine"],
                ["mois", "Mois"],
                ["liste", "Liste"],
              ] as Array<[VuePlanning, string]>
            ).map(([valeur, libelle]) => (
              <button
                key={valeur}
                type="button"
                onClick={() => setVue(valeur)}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition xl:flex-none ${
                  vue === valeur
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => naviguer(-1)}
              disabled={vue === "liste"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Période précédente"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={allerAujourdhui}
              disabled={vue === "liste"}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Aujourd’hui
            </button>

            <input
              type="date"
              value={dateReference}
              onChange={(event) => {
                if (event.target.value) setDateReference(event.target.value);
              }}
              disabled={vue === "liste"}
              aria-label="Choisir une date de référence"
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-30"
            />

            <button
              type="button"
              onClick={() => naviguer(1)}
              disabled={vue === "liste"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Période suivante"
            >
              ›
            </button>
          </div>

          <h2 className="text-center text-base font-bold capitalize text-slate-950 xl:min-w-72 xl:text-right">
            {titrePeriode()}
          </h2>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 lg:grid-cols-[minmax(0,1fr)_190px_220px_auto]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher par client, ville, salarié, chantier, matériel..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as FiltreStatut)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="brouillon">Brouillons</option>
            <option value="planifiee">Planifiées</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminées</option>
            <option value="annulee">Annulées</option>
          </select>

          <select
            value={filtreSalarie}
            onChange={(event) => setFiltreSalarie(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Toute l’équipe</option>
            {optionsSalaries.map((option) => (
              <option key={option.valeur} value={option.valeur}>
                {option.libelle}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={reinitialiserFiltres}
            className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Réinitialiser
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{pluraliserIntervention(fichesFiltrees.length)} après filtrage</p>
          <p>
            Glisser-déposer actif pour les fiches brouillon, planifiées et en
            cours.
          </p>
        </div>
      </section>

        {vue === "jour" && renduVueJour()}
        {vue === "semaine" && renduVueSemaine()}
        {vue === "mois" && renduVueMois()}
        {vue === "liste" && renduVueListe()}
      </div>
    </div>
  );
}