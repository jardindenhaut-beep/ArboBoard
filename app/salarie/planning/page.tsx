"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

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

function ajouterJours(dateIso: string, jours: number) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + jours);

  return dateLocaleIso(date);
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

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<FiltrePlanning>("a_venir");

  useEffect(() => {
    initialiserPage();
  }, []);

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

    const ficheIdsAffectations = affectationsChargees
      .map((item) => item.fiche_id)
      .filter(Boolean);

    const fichesDepuisAffectations =
      await chargerFichesParIds(
        idEntreprise,
        ficheIdsAffectations
      );

    const { data: fichesLegacyData, error: erreurLegacy } =
      await supabase
        .from("fiches_intervention")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .eq("salarie_id", salarieConnecte.id);

    if (erreurLegacy) {
      console.error(
        "Erreur chargement fiches historiques salarié :",
        erreurLegacy
      );
    }

    const fichesLegacy = (
      (fichesLegacyData || []) as FicheIntervention[]
    ).filter(ficheVisibleDansPlanning);

    const fichesMap = new Map<string, FicheIntervention>();

    for (const fiche of fichesDepuisAffectations) {
      fichesMap.set(fiche.id, fiche);
    }

    for (const fiche of fichesLegacy) {
      fichesMap.set(fiche.id, fiche);
    }

    const fichesChargees = Array.from(
      fichesMap.values()
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

    const tousLesIds = fichesChargees.map(
      (fiche) => fiche.id
    );

    if (tousLesIds.length === 0) {
      setElements([]);
      setAffectations([]);
      return;
    }

    const [elementsResult, affectationsToutesResult] =
      await Promise.all([
        supabase
          .from("fiches_intervention_elements")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .in("fiche_id", tousLesIds)
          .order("ordre", { ascending: true }),

        supabase
          .from("fiches_intervention_salaries")
          .select("*")
          .eq("entreprise_id", idEntreprise)
          .in("fiche_id", tousLesIds)
          .order("created_at", { ascending: true }),
      ]);

    if (elementsResult.error) {
      console.error(
        "Erreur chargement éléments fiches :",
        elementsResult.error
      );
      setElements([]);
    } else {
      setElements(
        (elementsResult.data || []) as FicheElement[]
      );
    }

    if (affectationsToutesResult.error) {
      console.error(
        "Erreur chargement équipes fiches :",
        affectationsToutesResult.error
      );
      setAffectations(affectationsChargees);
    } else {
      setAffectations(
        (affectationsToutesResult.data ||
          []) as FicheSalarie[]
      );
    }
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
      total: fiches.length,
      aujourdHui: fiches.filter(
        (fiche) => dateFiche(fiche) === aujourdhui
      ).length,
      aVenir: fiches.filter((fiche) => {
        const date = dateFiche(fiche);

        return Boolean(
          date &&
            date >= aujourdhui &&
            fiche.statut !== "terminee"
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

  const fichesParDate = useMemo(() => {
    const groupes: Record<
      string,
      FicheIntervention[]
    > = {};

    for (const fiche of fichesFiltrees) {
      const date =
        dateFiche(fiche) || "non_planifiee";

      if (!groupes[date]) {
        groupes[date] = [];
      }

      groupes[date].push(fiche);
    }

    return Object.entries(groupes).sort(
      ([dateA], [dateB]) => {
        if (dateA === "non_planifiee") return 1;
        if (dateB === "non_planifiee") return -1;
        return dateA.localeCompare(dateB);
      }
    );
  }, [fichesFiltrees]);

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
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            📅
          </div>

          <p className="font-semibold text-slate-950">
            Chargement du planning...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Récupération de vos interventions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Espace salarié
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Mon planning
          </h1>

          <p className="mt-2 max-w-4xl text-sm text-slate-600">
            Retrouvez uniquement les interventions qui
            vous sont affectées et ouvrez directement la
            fiche terrain.
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-400">
            Connecté :{" "}
            {nomSalarie(salarie) ||
              profilEmail ||
              "Salarié"}
          </p>
        </div>

        <button
          type="button"
          onClick={rafraichir}
          disabled={actualisation || !salarie}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {actualisation
            ? "Actualisation..."
            : "Actualiser"}
        </button>
      </section>

      {messageErreur && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      {!salarie && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aucun salarié lié à votre compte n’a été trouvé.
          Le chef doit vérifier votre adresse email et le
          rattachement de votre compte dans la fiche salarié.
        </div>
      )}

      <section className="grid grid-cols-4 gap-2 md:hidden">
        {[
          ["Total", statistiques.total],
          ["Aujourd’hui", statistiques.aujourdHui],
          ["En cours", statistiques.enCours],
          ["Alertes", statistiques.problemes],
        ].map(([libelle, valeur]) => (
          <button
            key={String(libelle)}
            type="button"
            onClick={() => {
              if (libelle === "Aujourd’hui") {
                setFiltre("aujourd_hui");
              } else if (libelle === "En cours") {
                setFiltre("en_cours");
              } else if (libelle === "Alertes") {
                setFiltre("problemes");
              } else {
                setFiltre("toutes");
              }
            }}
            className="rounded-2xl border border-slate-200 bg-white p-2 text-center shadow-sm"
          >
            <span className="block truncate text-[9px] font-bold uppercase text-slate-400">
              {libelle}
            </span>
            <span className="mt-1 block text-xl font-black text-slate-950">
              {valeur}
            </span>
          </button>
        ))}
      </section>

      <section className="hidden grid-cols-2 gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => setFiltre("toutes")}
          aria-pressed={filtre === "toutes"}
          className={`rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
            filtre === "toutes"
              ? "border-slate-400 bg-slate-100 ring-2 ring-slate-200"
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
          onClick={() =>
            setFiltre("aujourd_hui")
          }
          aria-pressed={
            filtre === "aujourd_hui"
          }
          className={`rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
            filtre === "aujourd_hui"
              ? "border-blue-400 bg-blue-100 ring-2 ring-blue-100"
              : "border-blue-100 bg-blue-50 hover:border-blue-300"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-blue-500">
            Aujourd’hui
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-900 sm:text-3xl">
            {statistiques.aujourdHui}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFiltre("a_venir")}
          aria-pressed={filtre === "a_venir"}
          className={`rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
            filtre === "a_venir"
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
          onClick={() => setFiltre("en_cours")}
          aria-pressed={filtre === "en_cours"}
          className={`rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
            filtre === "en_cours"
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
          onClick={() => setFiltre("terminees")}
          aria-pressed={
            filtre === "terminees"
          }
          className={`rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
            filtre === "terminees"
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
          onClick={() => setFiltre("problemes")}
          aria-pressed={
            filtre === "problemes"
          }
          className={`rounded-2xl border p-3 text-left shadow-sm transition sm:p-4 ${
            filtre === "problemes"
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

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-2 z-10 grid gap-3 rounded-t-3xl border-b border-slate-200 bg-white/95 p-3 backdrop-blur sm:p-4 lg:grid-cols-[1fr_240px]">
          <input
            value={recherche}
            onChange={(event) =>
              setRecherche(event.target.value)
            }
            placeholder="Rechercher par client, ville, chantier, matériel..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtre}
            onChange={(event) =>
              setFiltre(
                event.target.value as FiltrePlanning
              )
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="a_venir">
              À venir
            </option>
            <option value="aujourd_hui">
              Aujourd’hui
            </option>
            <option value="semaine">
              7 prochains jours
            </option>
            <option value="en_cours">
              En cours
            </option>
            <option value="terminees">
              Terminées
            </option>
            <option value="problemes">
              Problèmes
            </option>
            <option value="toutes">
              Toutes mes interventions
            </option>
          </select>
        </div>

        {fichesFiltrees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📅
            </div>

            <p className="font-semibold text-slate-900">
              Aucune intervention trouvée
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Aucune fiche affectée ne correspond au
              filtre ou à la recherche.
            </p>
          </div>
        ) : (
          <div className="space-y-6 p-4">
            {fichesParDate.map(([date, liste]) => (
              <section
                key={date}
                className="space-y-3"
              >
                <div className="sticky top-2 z-10 rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-3 shadow-sm backdrop-blur">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-bold capitalize text-slate-950">
                      {date === "non_planifiee"
                        ? "Non planifiées"
                        : formatDateLongue(date)}
                    </h2>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {liste.length} intervention
                      {liste.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {liste.map((fiche) =>
                    renduCarteFiche(fiche)
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}