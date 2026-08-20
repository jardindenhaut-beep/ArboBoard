"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

type VuePlanning = "jour" | "semaine" | "mois" | "liste";

type FiltrePlanning =
  | "toutes"
  | "aujourd_hui"
  | "semaine"
  | "a_venir"
  | "en_cours"
  | "terminees"
  | "problemes";

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

type Salarie = {
  id: string;
  entreprise_id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  user_id?: string | null;
  profil_id?: string | null;
  statut?: string | null;
};

type PlanningEvenement = {
  id: string;
  entreprise_id: string;
  type_evenement: string;
  titre: string;
  description: string | null;
  date_debut: string;
  date_fin: string;
  heure_debut: string | null;
  heure_fin: string | null;
  journee_entiere: boolean | null;
  lieu: string | null;
  statut: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PlanningEvenementSalarie = {
  id: string;
  entreprise_id: string;
  evenement_id: string;
  salarie_id: string;
  salarie_nom: string | null;
};

type ElementPlanningSalarie =
  | { nature: "fiche"; fiche: FicheIntervention }
  | { nature: "evenement"; evenement: PlanningEvenement };

type ContexteEntrepriseMinimal = {
  entreprise?: {
    id?: string | null;
  } | null;
  profil?: {
    id?: string | null;
    email?: string | null;
  } | null;
  utilisateur?: {
    id?: string | null;
    email?: string | null;
  } | null;
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

function dateDansEvenement(date: string, evenement: PlanningEvenement) {
  return date >= evenement.date_debut && date <= evenement.date_fin;
}

function libelleTypeEvenement(type: string | null | undefined) {
  if (type === "rendez_vous") return "Rendez-vous";
  if (type === "conge") return "Congé / vacances";
  if (type === "absence") return "Absence";
  if (type === "formation") return "Formation";
  if (type === "interne") return "Événement interne";
  if (type === "indisponibilite") return "Indisponibilité";
  return "Autre";
}

function iconeTypeEvenement(type: string | null | undefined) {
  if (type === "rendez_vous") return "🤝";
  if (type === "conge") return "🏖️";
  if (type === "absence") return "🚫";
  if (type === "formation") return "🎓";
  if (type === "interne") return "🏢";
  if (type === "indisponibilite") return "⛔";
  return "📌";
}

function classeEvenement(type: string | null | undefined) {
  if (type === "rendez_vous") return "border-violet-200 bg-violet-50";
  if (type === "conge") return "border-sky-200 bg-sky-50";
  if (type === "absence") return "border-rose-200 bg-rose-50";
  if (type === "formation") return "border-indigo-200 bg-indigo-50";
  if (type === "interne") return "border-cyan-200 bg-cyan-50";
  if (type === "indisponibilite") return "border-orange-200 bg-orange-50";
  return "border-slate-200 bg-slate-50";
}

function barreEvenement(type: string | null | undefined) {
  if (type === "rendez_vous") return "bg-violet-500";
  if (type === "conge") return "bg-sky-500";
  if (type === "absence") return "bg-rose-500";
  if (type === "formation") return "bg-indigo-500";
  if (type === "interne") return "bg-cyan-500";
  if (type === "indisponibilite") return "bg-orange-500";
  return "bg-slate-500";
}

function formatDateLongue(date: string | null | undefined) {
  if (!date) return "Non planifiée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
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
    }).format(new Date(`${date}T00:00:00`));
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

function nomSalarie(salarie: Salarie | null) {
  if (!salarie) return "";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();

  return complet || salarie.email || "Salarié";
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

function ficheVisibleDansPlanning(fiche: FicheIntervention) {
  return fiche.statut !== "archivee" && fiche.statut !== "annulee";
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
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

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function bordureEvenementFiche(fiche: FicheIntervention) {
  if (fiche.probleme_signale) {
    return "border-red-300 bg-red-50 hover:border-red-400";
  }

  if (fiche.statut === "en_cours") {
    return "border-amber-300 bg-amber-50 hover:border-amber-400";
  }

  if (fiche.statut === "terminee") {
    return "border-emerald-300 bg-emerald-50 hover:border-emerald-400";
  }

  return "border-blue-200 bg-blue-50 hover:border-blue-300";
}

function iconeStatutPlanning(statut: string | null | undefined) {
  if (statut === "planifiee") return "📅";
  if (statut === "en_cours") return "🚧";
  if (statut === "terminee") return "✅";
  return "📝";
}

function barreStatutPlanning(fiche: FicheIntervention) {
  if (fiche.probleme_signale) return "bg-red-500";
  if (fiche.statut === "en_cours") return "bg-amber-500";
  if (fiche.statut === "terminee") return "bg-emerald-600";
  if (fiche.statut === "planifiee") return "bg-blue-500";
  return "bg-slate-400";
}

function estWeekend(dateIso: string) {
  const jour = dateDepuisIso(dateIso).getDay();
  return jour === 0 || jour === 6;
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

export default function PlanningSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profilEmail, setProfilEmail] = useState("");

  const [salarie, setSalarie] = useState<Salarie | null>(null);
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [elements, setElements] = useState<FicheElement[]>([]);
  const [affectations, setAffectations] = useState<FicheSalarie[]>([]);
  const [evenements, setEvenements] = useState<PlanningEvenement[]>([]);
  const [affectationsEvenements, setAffectationsEvenements] =
    useState<PlanningEvenementSalarie[]>([]);

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltrePlanning>("toutes");
  const [vue, setVue] = useState<VuePlanning>("semaine");
  const [dateReference, setDateReference] = useState(dateLocaleIso());

  useEffect(() => {
    initialiserPage();
  }, []);

  useEffect(() => {
    if (!entrepriseId || !salarie?.id) return;

    let temporisation: ReturnType<typeof setTimeout> | null = null;

    const recharger = () => {
      if (temporisation) clearTimeout(temporisation);
      temporisation = setTimeout(() => {
        void chargerPlanning(entrepriseId, salarie);
      }, 250);
    };

    const canal = supabase
      .channel(`planning-salarie-${entrepriseId}-${salarie.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planning_evenements_salaries",
          filter: `entreprise_id=eq.${entrepriseId}`,
        },
        recharger
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planning_evenements",
          filter: `entreprise_id=eq.${entrepriseId}`,
        },
        recharger
      )
      .subscribe();

    const auFocus = () => void chargerPlanning(entrepriseId, salarie);
    const aLaVisibilite = () => {
      if (document.visibilityState === "visible") {
        void chargerPlanning(entrepriseId, salarie);
      }
    };

    window.addEventListener("focus", auFocus);
    document.addEventListener("visibilitychange", aLaVisibilite);

    return () => {
      if (temporisation) clearTimeout(temporisation);
      window.removeEventListener("focus", auFocus);
      document.removeEventListener("visibilitychange", aLaVisibilite);
      void supabase.removeChannel(canal);
    };
  }, [entrepriseId, salarie?.id]);

  async function initialiserPage() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();
      const contexte =
        (resultat.contexte || null) as ContexteEntrepriseMinimal | null;

      if (resultat.erreur || !contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const idEntreprise = String(contexte.entreprise.id);
      const idProfil =
        contexte.profil?.id ||
        contexte.utilisateur?.id ||
        user?.id ||
        "";
      const emailProfil =
        contexte.profil?.email ||
        contexte.utilisateur?.email ||
        user?.email ||
        "";

      setEntrepriseId(idEntreprise);
      setProfilEmail(emailProfil);

      const salarieTrouve = await chargerSalarieConnecte(
        idEntreprise,
        idProfil,
        user?.id || "",
        emailProfil
      );

      await chargerPlanning(idEntreprise, salarieTrouve);
    } catch (error: unknown) {
      console.error(
        "Erreur initialisation planning salarié :",
        error
      );

      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible de charger le planning salarié."
        )
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerSalarieConnecte(
    idEntreprise: string,
    idProfil: string,
    idUtilisateur: string,
    emailProfil: string
  ) {
    let salarieData: Salarie | null = null;

    const identifiants = Array.from(
      new Set([idProfil, idUtilisateur].filter(Boolean))
    );

    for (const identifiant of identifiants) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .or(
          `user_id.eq.${identifiant},profil_id.eq.${identifiant}`
        )
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
        break;
      }
    }

    if (!salarieData && emailProfil) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .ilike("email", emailProfil)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
      }
    }

    setSalarie(salarieData);

    return salarieData;
  }

  async function chargerFichesParIds(
    idEntreprise: string,
    ficheIds: string[]
  ) {
    if (ficheIds.length === 0) {
      return [] as FicheIntervention[];
    }

    const idsUniques = Array.from(new Set(ficheIds));

    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("id", idsUniques);

    if (error) {
      console.error(
        "Erreur chargement fiches par affectation :",
        error
      );

      throw new Error(
        error.message ||
          "Impossible de charger les interventions affectées."
      );
    }

    return ((data || []) as FicheIntervention[]).filter(
      ficheVisibleDansPlanning
    );
  }

  async function chargerPlanning(
    idEntreprise = entrepriseId,
    salarieConnecte = salarie
  ) {
    if (!idEntreprise) return;

    setMessageErreur("");

    if (!salarieConnecte?.id) {
      setFiches([]);
      setElements([]);
      setAffectations([]);
      setEvenements([]);
      setAffectationsEvenements([]);
      return;
    }

    const { data: affectationsData, error: erreurAffectations } =
      await supabase
        .from("fiches_intervention_salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .eq("salarie_id", salarieConnecte.id);

    if (erreurAffectations) {
      console.error(
        "Erreur chargement affectations salarié :",
        erreurAffectations
      );

      throw new Error(
        erreurAffectations.message ||
          "Impossible de charger vos affectations."
      );
    }

    const affectationsChargees =
      (affectationsData || []) as FicheSalarie[];

    const { data: affectationsEvenementsData, error: erreurAffectationsEvenements } =
      await supabase
        .from("planning_evenements_salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .eq("salarie_id", salarieConnecte.id);

    if (erreurAffectationsEvenements) {
      console.error(
        "Erreur chargement événements affectés au salarié :",
        erreurAffectationsEvenements
      );
      throw new Error(
        erreurAffectationsEvenements.message ||
          "Impossible de charger les événements de votre planning."
      );
    }

    const affectationsEvenementsChargees =
      (affectationsEvenementsData || []) as PlanningEvenementSalarie[];

    setAffectationsEvenements(affectationsEvenementsChargees);

    const idsEvenements = Array.from(
      new Set(
        affectationsEvenementsChargees
          .map((item) => item.evenement_id)
          .filter(Boolean)
      )
    );

    if (idsEvenements.length > 0) {
      const { data: evenementsData, error: erreurEvenements } = await supabase
        .from("planning_evenements")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .in("id", idsEvenements)
        .neq("statut", "supprime")
        .order("date_debut", { ascending: true })
        .order("heure_debut", { ascending: true });

      if (erreurEvenements) {
        console.error("Erreur chargement événements salarié :", erreurEvenements);
        throw new Error(
          erreurEvenements.message ||
            "Impossible de charger les événements de votre planning."
        );
      }

      setEvenements((evenementsData || []) as PlanningEvenement[]);
    } else {
      setEvenements([]);
    }

    const ficheIdsAffectations = affectationsChargees
      .map((item) => item.fiche_id)
      .filter(Boolean);

    const fichesChargees = (
      await chargerFichesParIds(
        idEntreprise,
        ficheIdsAffectations
      )
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

    if (fichesChargees.length === 0) {
      setElements([]);
      setAffectations(affectationsChargees);
      return;
    }

    /*
     * Important côté salarié :
     * on ne fait plus une lecture globale avec `.in(...)` sur toutes les
     * fiches de l’entreprise. Certaines politiques RLS autorisent la lecture
     * d’une fiche précise déjà affectée au salarié mais refusent la lecture
     * groupée de lignes appartenant à d’autres membres de l’équipe.
     *
     * On recharge donc les détails fiche par fiche, exactement dans le même
     * périmètre que la fiche terrain du salarié.
     */
    const detailsParFiche = await Promise.all(
      fichesChargees.map(async (fiche) => {
        const [elementsResult, equipeResult] = await Promise.all([
          supabase
            .from("fiches_intervention_elements")
            .select("*")
            .eq("entreprise_id", idEntreprise)
            .eq("fiche_id", fiche.id)
            .order("ordre", { ascending: true }),

          supabase
            .from("fiches_intervention_salaries")
            .select("*")
            .eq("entreprise_id", idEntreprise)
            .eq("fiche_id", fiche.id)
            .order("created_at", { ascending: true }),
        ]);

        const elementsFiche = elementsResult.error
          ? ([] as FicheElement[])
          : ((elementsResult.data || []) as FicheElement[]);

        /*
         * En cas de politique RLS plus restrictive sur la composition complète
         * de l’équipe, on conserve au minimum l’affectation du salarié connecté.
         * Le planning reste fonctionnel et aucune erreur de console n’est levée.
         */
        const equipeFiche = equipeResult.error
          ? affectationsChargees.filter(
              (item) => item.fiche_id === fiche.id
            )
          : ((equipeResult.data || []) as FicheSalarie[]);

        return {
          elements: elementsFiche,
          equipe: equipeFiche,
        };
      })
    );

    setElements(
      detailsParFiche.flatMap((detail) => detail.elements)
    );

    const equipeMap = new Map<string, FicheSalarie>();

    for (const affectation of affectationsChargees) {
      equipeMap.set(affectation.id, affectation);
    }

    for (const detail of detailsParFiche) {
      for (const affectation of detail.equipe) {
        equipeMap.set(affectation.id, affectation);
      }
    }

    setAffectations(Array.from(equipeMap.values()));
  }

  async function rafraichir() {
    if (actualisation) return;

    try {
      setActualisation(true);
      setMessageErreur("");
      setMessageSucces("");

      await chargerPlanning(entrepriseId, salarie);
      setMessageSucces("Planning actualisé.");
    } catch (error: unknown) {
      console.error(
        "Erreur actualisation planning salarié :",
        error
      );

      setMessageErreur(
        messageErreurInconnue(
          error,
          "Impossible d’actualiser le planning."
        )
      );
    } finally {
      setActualisation(false);
    }
  }

  const statistiques = useMemo(() => {
    const aujourdhui = dateLocaleIso();

    return {
      total: fiches.length + evenements.length,
      aujourdHui:
        fiches.filter((fiche) => dateFiche(fiche) === aujourdhui).length +
        evenements.filter((evenement) => dateDansEvenement(aujourdhui, evenement)).length,
      aVenir:
        fiches.filter((fiche) => {
          const date = dateFiche(fiche);
          return Boolean(
            date && date >= aujourdhui && fiche.statut !== "terminee"
          );
        }).length +
        evenements.filter((evenement) => evenement.date_fin >= aujourdhui).length,
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
  }, [fiches, evenements]);

  const fichesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const aujourdhui = dateLocaleIso();
    const dansSeptJours = ajouterJours(
      aujourdhui,
      7
    );

    return fiches.filter((fiche) => {
      const date = dateFiche(fiche);

      const correspondFiltre =
        filtre === "toutes" ||
        (filtre === "aujourd_hui" &&
          date === aujourdhui) ||
        (filtre === "semaine" &&
          Boolean(
            date &&
              date >= aujourdhui &&
              date <= dansSeptJours &&
              fiche.statut !== "terminee"
          )) ||
        (filtre === "a_venir" &&
          Boolean(
            date &&
              date >= aujourdhui &&
              fiche.statut !== "terminee"
          )) ||
        (filtre === "en_cours" &&
          fiche.statut === "en_cours") ||
        (filtre === "terminees" &&
          fiche.statut === "terminee") ||
        (filtre === "problemes" &&
          fiche.probleme_signale === true);

      const elementsFiche = elements
        .filter(
          (element) => element.fiche_id === fiche.id
        )
        .map((element) => element.nom)
        .join(" ");

      const equipeFiche = affectations
        .filter(
          (item) => item.fiche_id === fiche.id
        )
        .map((item) => item.salarie_nom)
        .join(" ");

      const zoneRecherche = [
        fiche.numero,
        fiche.titre,
        fiche.type_intervention,
        fiche.client_nom,
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
        texte.length === 0 ||
        zoneRecherche.includes(texte);

      return correspondFiltre && correspondRecherche;
    });
  }, [
    fiches,
    elements,
    affectations,
    recherche,
    filtre,
  ]);

  const evenementsFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const aujourdhui = dateLocaleIso();
    const dansSeptJours = ajouterJours(aujourdhui, 7);

    return evenements.filter((evenement) => {
      const correspondFiltre =
        filtre === "toutes" ||
        (filtre === "aujourd_hui" && dateDansEvenement(aujourdhui, evenement)) ||
        (filtre === "semaine" &&
          evenement.date_fin >= aujourdhui &&
          evenement.date_debut <= dansSeptJours) ||
        (filtre === "a_venir" && evenement.date_fin >= aujourdhui);

      // Les vues En cours / Terminées / Problèmes concernent uniquement les chantiers.
      if (!["toutes", "aujourd_hui", "semaine", "a_venir"].includes(filtre)) {
        return false;
      }

      const zoneRecherche = [
        evenement.titre,
        evenement.description,
        evenement.lieu,
        libelleTypeEvenement(evenement.type_evenement),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return correspondFiltre && (texte.length === 0 || zoneRecherche.includes(texte));
    });
  }, [evenements, recherche, filtre]);

  const elementsPlanningFiltres = useMemo<ElementPlanningSalarie[]>(() => {
    return [
      ...fichesFiltrees.map((fiche) => ({ nature: "fiche" as const, fiche })),
      ...evenementsFiltres.map((evenement) => ({
        nature: "evenement" as const,
        evenement,
      })),
    ];
  }, [fichesFiltrees, evenementsFiltres]);

  const joursSemaine = useMemo(
    () => construireSemaine(dateReference),
    [dateReference]
  );

  const joursMois = useMemo(
    () => construireGrilleMois(dateReference),
    [dateReference]
  );

  function elementsPlanningPourDate(date: string) {
    const liste: ElementPlanningSalarie[] = [
      ...fichesFiltrees
        .filter((fiche) => dateFiche(fiche) === date)
        .map((fiche) => ({ nature: "fiche" as const, fiche })),
      ...evenementsFiltres
        .filter((evenement) => dateDansEvenement(date, evenement))
        .map((evenement) => ({
          nature: "evenement" as const,
          evenement,
        })),
    ];

    return liste.sort((a, b) => {
      const heureA =
        a.nature === "fiche"
          ? heureDebutFiche(a.fiche) || "99:99"
          : a.evenement.journee_entiere
            ? "00:00"
            : a.evenement.heure_debut || "99:99";
      const heureB =
        b.nature === "fiche"
          ? heureDebutFiche(b.fiche) || "99:99"
          : b.evenement.journee_entiere
            ? "00:00"
            : b.evenement.heure_debut || "99:99";

      return heureA.localeCompare(heureB);
    });
  }

  function naviguer(direction: -1 | 1) {
    if (vue === "jour") {
      setDateReference((date) => ajouterJours(date, direction));
      return;
    }

    if (vue === "semaine") {
      setDateReference((date) => ajouterJours(date, direction * 7));
      return;
    }

    if (vue === "mois") {
      setDateReference((date) => ajouterMois(date, direction));
    }
  }

  function titrePeriode() {
    if (vue === "jour") return formatDateLongue(dateReference);
    if (vue === "semaine") {
      const debut = joursSemaine[0];
      const fin = joursSemaine[6];
      return `${formatDateCourte(debut)} → ${formatDateCourte(fin)}`;
    }
    if (vue === "mois") return formatMoisAnnee(dateReference);
    return "Tout mon planning";
  }

  const elementsParDate = useMemo(() => {
    const groupes: Record<string, ElementPlanningSalarie[]> = {};

    for (const element of elementsPlanningFiltres) {
      if (element.nature === "fiche") {
        const date = dateFiche(element.fiche) || "non_planifiee";
        if (!groupes[date]) groupes[date] = [];
        groupes[date].push(element);
        continue;
      }

      let date = element.evenement.date_debut;
      while (date <= element.evenement.date_fin) {
        if (!groupes[date]) groupes[date] = [];
        groupes[date].push(element);
        date = ajouterJours(date, 1);
      }
    }

    for (const liste of Object.values(groupes)) {
      liste.sort((a, b) => {
        const heureA =
          a.nature === "fiche"
            ? heureDebutFiche(a.fiche) || "99:99"
            : a.evenement.journee_entiere
              ? "00:00"
              : a.evenement.heure_debut || "99:99";
        const heureB =
          b.nature === "fiche"
            ? heureDebutFiche(b.fiche) || "99:99"
            : b.evenement.journee_entiere
              ? "00:00"
              : b.evenement.heure_debut || "99:99";
        return heureA.localeCompare(heureB);
      });
    }

    return Object.entries(groupes).sort(([dateA], [dateB]) => {
      if (dateA === "non_planifiee") return 1;
      if (dateB === "non_planifiee") return -1;
      return dateA.localeCompare(dateB);
    });
  }, [elementsPlanningFiltres]);

  function elementsDeFiche(ficheId: string) {
    return elements.filter(
      (element) => element.fiche_id === ficheId
    );
  }

  function equipeDeFiche(
    fiche: FicheIntervention
  ) {
    const equipe = affectations.filter(
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
            fiche.heure_debut_prevue ||
            fiche.heure_debut,
          heure_depart_prevue:
            fiche.heure_fin_prevue ||
            fiche.heure_fin,
          heure_arrivee_reelle:
            fiche.heure_debut_reelle,
          heure_depart_reelle:
            fiche.heure_fin_reelle,
        },
      ] as FicheSalarie[];
    }

    return [];
  }

  function renduEtapes(
    fiche: FicheIntervention
  ) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${classeEtape(
            fiche.etape_materiel_statut
          )}`}
        >
          <p>1. Matériel</p>
          <p className="mt-1 font-normal">
            {libelleEtape(
              fiche.etape_materiel_statut
            )}
          </p>
        </div>

        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${classeEtape(
            fiche.etape_arrivee_statut
          )}`}
        >
          <p>2. Arrivée</p>
          <p className="mt-1 font-normal">
            {libelleEtape(
              fiche.etape_arrivee_statut
            )}
          </p>
        </div>

        <div
          className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${classeEtape(
            fiche.etape_fin_statut
          )}`}
        >
          <p>3. Fin / PV</p>
          <p className="mt-1 font-normal">
            {libelleEtape(
              fiche.etape_fin_statut
            )}
          </p>
        </div>
      </div>
    );
  }

  function renduElementsMini(
    fiche: FicheIntervention
  ) {
    const liste = elementsDeFiche(fiche.id);

    if (liste.length === 0) {
      return (
        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Aucun élément renseigné sur cette fiche.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {liste.slice(0, 8).map((element) => (
          <span
            key={element.id}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
          >
            <span>{element.icone || "•"}</span>
            <span>{element.nom}</span>
          </span>
        ))}

        {liste.length > 8 && (
          <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
            +{liste.length - 8}
          </span>
        )}
      </div>
    );
  }

  function renduCarteCalendrierFiche(
    fiche: FicheIntervention,
    compacte = false
  ) {
    return (
      <article
        key={`cal-${fiche.id}`}
        className={`relative overflow-hidden rounded-xl border p-2.5 pl-3.5 shadow-sm transition ${bordureEvenementFiche(
          fiche
        )}`}
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
          <p className="mt-2 line-clamp-2 text-[10px] text-slate-500">
            📍 {adresseFiche(fiche)}
          </p>
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
            href={`/salarie/interventions/${fiche.id}`}
            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900"
          >
            Ouvrir
          </Link>
        </div>
      </article>
    );
  }

  function renduCarteCalendrierEvenement(
    evenement: PlanningEvenement,
    compacte = false
  ) {
    return (
      <article
        key={`cal-event-${evenement.id}`}
        className={`relative overflow-hidden rounded-xl border p-2.5 pl-3.5 shadow-sm ${classeEvenement(
          evenement.type_evenement
        )}`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${barreEvenement(
            evenement.type_evenement
          )}`}
        />

        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-slate-950">
            {evenement.journee_entiere
              ? "Toute la journée"
              : `${formatHeure(evenement.heure_debut)} · `}
            {evenement.titre}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-600">
            {iconeTypeEvenement(evenement.type_evenement)}{" "}
            {libelleTypeEvenement(evenement.type_evenement)}
          </p>
        </div>

        {!compacte && evenement.lieu && (
          <p className="mt-2 line-clamp-1 text-[10px] text-slate-500">
            📍 {evenement.lieu}
          </p>
        )}

        <div className="mt-2">
          <span className="inline-flex rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
            Affecté à mon planning
          </span>
        </div>
      </article>
    );
  }

  function renduElementCalendrier(
    element: ElementPlanningSalarie,
    compacte = false
  ) {
    return element.nature === "fiche"
      ? renduCarteCalendrierFiche(element.fiche, compacte)
      : renduCarteCalendrierEvenement(element.evenement, compacte);
  }

  function renduVueJour() {
    const liste = elementsPlanningPourDate(dateReference);

    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Vue jour
              </p>
              <h2 className="mt-1 text-xl font-bold capitalize text-slate-950">
                {formatDateLongue(dateReference)}
              </h2>
            </div>

            <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-500 shadow-sm">
              {liste.length} élément{liste.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="min-h-[360px] p-4">
          {liste.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📅
              </div>
              <p className="mt-4 font-semibold text-slate-900">
                Rien de prévu ce jour
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Aucune intervention ni aucun événement ne vous est affecté pour
                cette journée.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {liste.map((element) => renduElementCalendrier(element))}
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
                const liste = elementsPlanningPourDate(date);

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
                const liste = elementsPlanningPourDate(date);

                return (
                  <div
                    key={date}
                    className={`min-h-[440px] space-y-2 border-r border-slate-200 p-2 last:border-r-0 ${
                      date === dateLocaleIso()
                        ? "bg-emerald-50/30"
                        : estWeekend(date)
                          ? "bg-slate-50/60"
                          : "bg-white"
                    }`}
                  >
                    {liste.map((element) => renduElementCalendrier(element))}

                    {liste.length === 0 && (
                      <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 px-2 text-center text-[10px] text-slate-400">
                        Rien de prévu
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
                const liste = elementsPlanningPourDate(date);
                const dansMois = date.slice(0, 7) === moisReference;
                const aujourdhui = date === dateLocaleIso();

                return (
                  <div
                    key={date}
                    className={`min-h-[145px] border-b border-r border-slate-200 p-1.5 [&:nth-child(7n)]:border-r-0 ${
                      dansMois
                        ? estWeekend(date)
                          ? "bg-slate-50/70"
                          : "bg-white"
                        : "bg-slate-50/40 text-slate-300"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDateReference(date);
                        setVue("jour");
                      }}
                      className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        aujourdhui
                          ? "bg-emerald-600 text-white"
                          : dansMois
                            ? "text-slate-700 hover:bg-emerald-50"
                            : "text-slate-300"
                      }`}
                    >
                      {formatNumeroJour(date)}
                    </button>

                    <div className="space-y-1">
                      {liste
                        .slice(0, 3)
                        .map((element) => renduElementCalendrier(element, true))}
                    </div>

                    {liste.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateReference(date);
                          setVue("jour");
                        }}
                        className="mt-1 w-full rounded-lg px-1 py-1 text-left text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                      >
                        +{liste.length - 3} autre
                        {liste.length - 3 > 1 ? "s" : ""}
                      </button>
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

  function renduVueListe() {
    if (elementsPlanningFiltres.length === 0) {
      return (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
            📅
          </div>
          <p className="mt-4 font-semibold text-slate-900">
            Aucun élément trouvé
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Aucune intervention ni aucun événement affecté ne correspond aux
            filtres ou à la recherche.
          </p>
        </section>
      );
    }

    return (
      <section className="space-y-6">
        {elementsParDate.map(([date, liste]) => (
          <section key={date} className="space-y-3">
            <div className="sticky top-2 z-10 rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-3 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold capitalize text-slate-950">
                  {date === "non_planifiee"
                    ? "Non planifiées"
                    : formatDateLongue(date)}
                </h2>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {liste.length} élément{liste.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {liste.map((element) =>
                element.nature === "fiche"
                  ? renduCarteFiche(element.fiche)
                  : renduCarteEvenement(element.evenement)
              )}
            </div>
          </section>
        ))}
      </section>
    );
  }

  function renduCarteEvenement(evenement: PlanningEvenement) {
    return (
      <article
        key={`evenement-${evenement.id}`}
        className={`relative overflow-hidden rounded-3xl border p-5 pl-6 shadow-sm ${classeEvenement(
          evenement.type_evenement
        )}`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1.5 ${barreEvenement(
            evenement.type_evenement
          )}`}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {iconeTypeEvenement(evenement.type_evenement)}{" "}
              {libelleTypeEvenement(evenement.type_evenement)}
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              {evenement.titre}
            </h3>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
              <span>
                🗓️ {formatDateCourte(evenement.date_debut)}
                {evenement.date_fin !== evenement.date_debut
                  ? ` → ${formatDateCourte(evenement.date_fin)}`
                  : ""}
              </span>
              <span>
                🕒 {evenement.journee_entiere
                  ? "Toute la journée"
                  : `${formatHeure(evenement.heure_debut)} → ${formatHeure(
                      evenement.heure_fin
                    )}`}
              </span>
              {evenement.lieu && <span>📍 {evenement.lieu}</span>}
            </div>

            {evenement.description && (
              <p className="mt-4 whitespace-pre-line rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm leading-6 text-slate-700">
                {evenement.description}
              </p>
            )}
          </div>

          <span className="shrink-0 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-bold text-slate-700">
            Planning
          </span>
        </div>
      </article>
    );
  }

  function renduCarteFiche(
    fiche: FicheIntervention
  ) {
    const equipe = equipeDeFiche(fiche);
    const terminee =
      fiche.statut === "terminee";

    return (
      <article
        key={fiche.id}
        className={`rounded-3xl border bg-white p-4 shadow-sm transition sm:p-5 ${
          fiche.probleme_signale
            ? "border-red-200 hover:border-red-300"
            : terminee
              ? "border-emerald-200 hover:border-emerald-300"
              : "border-slate-200 hover:border-emerald-200"
        } hover:shadow-md`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                🛠️
              </div>

              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold text-slate-950">
                  {titreFiche(fiche)}
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  {fiche.type_intervention ||
                    "Intervention"}
                  {fiche.numero
                    ? ` · ${fiche.numero}`
                    : ""}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              {fiche.client_nom ||
                "Client non renseigné"}
            </p>

            <p className="mt-1 break-words text-sm text-slate-500">
              📍 {adresseFiche(fiche)}
            </p>

            {fiche.notes_chantier && (
              <p className="mt-2 whitespace-pre-line rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Note chantier :{" "}
                {fiche.notes_chantier}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fiche.probleme_signale && (
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                ⚠️ Problème
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
            <p className="text-xs font-medium text-slate-400">
              Date
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatDateCourte(dateFiche(fiche))}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">
              Horaires prévus
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatHeure(heureDebutFiche(fiche))}{" "}
              → {formatHeure(heureFinFiche(fiche))}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">
              Horaires réels
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatHeure(
                fiche.heure_debut_reelle
              )}{" "}
              →{" "}
              {formatHeure(
                fiche.heure_fin_reelle
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-400">
              Équipe
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {equipe.length > 0
                ? `${equipe.length} salarié${
                    equipe.length > 1 ? "s" : ""
                  }`
                : "Non renseignée"}
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
                👤{" "}
                {item.salarie_nom || "Salarié"}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5">
          {renduEtapes(fiche)}
        </div>

        <ResumeRetourTerrainFiche
          entrepriseId={entrepriseId}
          ficheId={fiche.id}
          problemeSignale={
            fiche.probleme_signale
          }
          descriptionProbleme={
            fiche.description_probleme
          }
          afficherActionsPv={false}
          autoriserEnvoiClient={false}
        />

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Éléments de la fiche
          </p>

          {renduElementsMini(fiche)}
        </div>

        <Link
          href={`/salarie/interventions/${fiche.id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {terminee
            ? "Consulter l’intervention"
            : "Ouvrir l’intervention terrain"}
        </Link>
      </article>
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
              Récupération de vos interventions et événements.
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
                    Espace salarié
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Mon planning
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Retrouvez vos interventions, rendez-vous, congés, absences,
                    formations et autres événements affectés par votre responsable.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Connecté : {nomSalarie(salarie) || profilEmail || "Salarié"}
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                <Link
                  href="/salarie/demandes"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                >
                  <span aria-hidden="true">＋</span>
                  Faire une demande
                </Link>

                <button
                  type="button"
                  onClick={() => void rafraichir()}
                  disabled={actualisation || !salarie}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span aria-hidden="true">↻</span>
                  {actualisation ? "Actualisation…" : "Actualiser"}
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

        {!salarie && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Aucun salarié lié à votre compte n’a été trouvé. Le chef doit
            vérifier votre adresse email et le rattachement de votre compte.
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            {
              filtre: "toutes" as FiltrePlanning,
              label: "Total",
              valeur: statistiques.total,
              inactif: "border-slate-200 bg-white hover:border-slate-300",
              actif: "border-slate-400 bg-slate-100 ring-2 ring-slate-100",
              texte: "text-slate-950",
              labelClasse: "text-slate-400",
            },
            {
              filtre: "aujourd_hui" as FiltrePlanning,
              label: "Aujourd’hui",
              valeur: statistiques.aujourdHui,
              inactif: "border-blue-100 bg-blue-50 hover:border-blue-300",
              actif: "border-blue-400 bg-blue-100 ring-2 ring-blue-100",
              texte: "text-blue-900",
              labelClasse: "text-blue-600",
            },
            {
              filtre: "a_venir" as FiltrePlanning,
              label: "À venir",
              valeur: statistiques.aVenir,
              inactif: "border-emerald-100 bg-emerald-50 hover:border-emerald-300",
              actif: "border-emerald-400 bg-emerald-100 ring-2 ring-emerald-100",
              texte: "text-emerald-900",
              labelClasse: "text-emerald-600",
            },
            {
              filtre: "en_cours" as FiltrePlanning,
              label: "En cours",
              valeur: statistiques.enCours,
              inactif: "border-amber-100 bg-amber-50 hover:border-amber-300",
              actif: "border-amber-400 bg-amber-100 ring-2 ring-amber-100",
              texte: "text-amber-900",
              labelClasse: "text-amber-600",
            },
            {
              filtre: "terminees" as FiltrePlanning,
              label: "Terminées",
              valeur: statistiques.terminees,
              inactif: "border-slate-200 bg-white hover:border-emerald-300",
              actif: "border-emerald-400 bg-emerald-100 ring-2 ring-emerald-100",
              texte: "text-slate-950",
              labelClasse: "text-slate-400",
            },
            {
              filtre: "problemes" as FiltrePlanning,
              label: "Problèmes",
              valeur: statistiques.problemes,
              inactif: "border-red-100 bg-red-50 hover:border-red-300",
              actif: "border-red-400 bg-red-100 ring-2 ring-red-100",
              texte: "text-red-900",
              labelClasse: "text-red-600",
            },
          ].map((item) => (
            <button
              key={item.filtre}
              type="button"
              onClick={() => setFiltre(item.filtre)}
              aria-pressed={filtre === item.filtre}
              className={`rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                filtre === item.filtre ? item.actif : item.inactif
              }`}
            >
              <p className={`text-xs uppercase tracking-wide ${item.labelClasse}`}>
                {item.label}
              </p>
              <p className={`mt-1 text-2xl font-bold sm:text-3xl ${item.texte}`}>
                {item.valeur}
              </p>
            </button>
          ))}
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
                onClick={() => setDateReference(dateLocaleIso())}
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
                aria-label="Choisir une date"
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

          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <input
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher par client, chantier, rendez-vous, congé, formation…"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <select
              value={filtre}
              onChange={(event) =>
                setFiltre(event.target.value as FiltrePlanning)
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="toutes">Tout mon planning</option>
              <option value="aujourd_hui">Aujourd’hui</option>
              <option value="semaine">7 prochains jours</option>
              <option value="a_venir">À venir</option>
              <option value="en_cours">Interventions en cours</option>
              <option value="terminees">Interventions terminées</option>
              <option value="problemes">Problèmes signalés</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setRecherche("");
                setFiltre("toutes");
              }}
              className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Réinitialiser
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {elementsPlanningFiltres.length} élément
              {elementsPlanningFiltres.length === 1 ? "" : "s"} après filtrage
            </p>
            <p>Planning en lecture seule · ouvrez une fiche pour agir sur le chantier.</p>
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