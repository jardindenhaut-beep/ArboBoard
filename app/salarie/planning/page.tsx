"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import ResumeRetourTerrainFiche from "@/components/interventions/ResumeRetourTerrainFiche";

type FiltreDate =
  | "toutes"
  | "aujourd_hui"
  | "semaine"
  | "a_venir"
  | "terminees";

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

function formatDate(date: string | null | undefined) {
  if (!date) return "Non planifiée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
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

function adresseFiche(fiche: FicheIntervention) {
  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const codePostal = fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";

  const villeComplete = [codePostal, ville].filter(Boolean).join(" ");

  if (!adresse && !villeComplete) return "Adresse non renseignée";

  return [adresse, villeComplete].filter(Boolean).join(", ");
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
  if (statut === "en_cours") return "bg-amber-50 text-amber-700 border-amber-200";
  if (statut === "terminee")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annulee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archivee")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
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

export default function PlanningSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profilId, setProfilId] = useState("");
  const [profilEmail, setProfilEmail] = useState("");

  const [salarie, setSalarie] = useState<Salarie | null>(null);

  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [elements, setElements] = useState<FicheElement[]>([]);
  const [affectations, setAffectations] = useState<FicheSalarie[]>([]);

  const [chargement, setChargement] = useState(true);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtreDate, setFiltreDate] = useState<FiltreDate>("a_venir");

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
    try {
      setChargement(true);
      setMessageErreur("");
      setMessageSucces("");

      const resultat = await chargerContexteEntreprise();
      const contexte: any = resultat.contexte;

      if (resultat.erreur || !contexte?.entreprise?.id) {
        setMessageErreur(
          "Impossible de charger votre entreprise. Veuillez vous reconnecter."
        );
        setChargement(false);
        return;
      }

      const idEntreprise = contexte.entreprise.id;
      const idProfil = contexte?.profil?.id || "";
      const emailProfil =
        contexte?.profil?.email || contexte?.utilisateur?.email || "";

      setEntrepriseId(idEntreprise);
      setProfilId(idProfil);
      setProfilEmail(emailProfil);

      const salarieTrouve = await chargerSalarieConnecte(
        idEntreprise,
        idProfil,
        emailProfil
      );

      await chargerPlanning(idEntreprise, salarieTrouve);
    } catch (error: any) {
      console.error("Erreur initialisation planning salarié :", error);
      setMessageErreur(
        error?.message || "Impossible de charger le planning salarié."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerSalarieConnecte(
    idEntreprise: string,
    idProfil: string,
    emailProfil: string
  ) {
    let salarieData: Salarie | null = null;

    if (idProfil) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .or(`user_id.eq.${idProfil},profil_id.eq.${idProfil}`)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
      }
    }

    if (!salarieData && emailProfil) {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .eq("email", emailProfil)
        .maybeSingle();

      if (!error && data) {
        salarieData = data as Salarie;
      }
    }

    setSalarie(salarieData);
    return salarieData;
  }

  async function chargerPlanning(
    idEntreprise = entrepriseId,
    salarieConnecte = salarie
  ) {
    if (!idEntreprise) return;

    if (!salarieConnecte?.id) {
      setFiches([]);
      setElements([]);
      setAffectations([]);
      return;
    }

    const { data: affectationsData, error: erreurAffectations } = await supabase
      .from("fiches_intervention_salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("salarie_id", salarieConnecte.id);

    if (erreurAffectations) {
      console.error("Erreur chargement affectations salarié :", erreurAffectations);
    }

    const affectationsChargees = (affectationsData || []) as FicheSalarie[];
    const ficheIdsAffectations = affectationsChargees
      .map((item) => item.fiche_id)
      .filter(Boolean);

    const fichesDepuisAffectations = await chargerFichesParIds(
      idEntreprise,
      ficheIdsAffectations
    );

    const { data: fichesLegacyData, error: erreurLegacy } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("salarie_id", salarieConnecte.id)
      .neq("statut", "archivee")
      .order("date_prevue", { ascending: true })
      .order("created_at", { ascending: false });

    if (erreurLegacy) {
      console.error("Erreur chargement fiches legacy salarié :", erreurLegacy);
    }

    const fichesLegacy = (fichesLegacyData || []) as FicheIntervention[];

    const fichesMap = new Map<string, FicheIntervention>();

    for (const fiche of fichesDepuisAffectations) {
      if (fiche.statut !== "archivee") {
        fichesMap.set(fiche.id, fiche);
      }
    }

    for (const fiche of fichesLegacy) {
      if (fiche.statut !== "archivee") {
        fichesMap.set(fiche.id, fiche);
      }
    }

    const fichesChargees = Array.from(fichesMap.values()).sort((a, b) => {
      const dateA = dateFiche(a) || "9999-12-31";
      const dateB = dateFiche(b) || "9999-12-31";

      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const heureA = heureDebutFiche(a) || "99:99";
      const heureB = heureDebutFiche(b) || "99:99";

      return heureA.localeCompare(heureB);
    });

    setFiches(fichesChargees);

    const tousLesIds = fichesChargees.map((fiche) => fiche.id);

    if (tousLesIds.length === 0) {
      setElements([]);
      setAffectations([]);
      return;
    }

    const [elementsResult, affectationsToutesResult] = await Promise.all([
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
      console.error("Erreur chargement éléments fiches :", elementsResult.error);
      setElements([]);
    } else {
      setElements((elementsResult.data || []) as FicheElement[]);
    }

    if (affectationsToutesResult.error) {
      console.error(
        "Erreur chargement équipe fiches :",
        affectationsToutesResult.error
      );
      setAffectations(affectationsChargees);
    } else {
      setAffectations(
        (affectationsToutesResult.data || []) as FicheSalarie[]
      );
    }
  }

  async function chargerFichesParIds(idEntreprise: string, ficheIds: string[]) {
    if (ficheIds.length === 0) return [];

    const idsUniques = Array.from(new Set(ficheIds));

    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("id", idsUniques)
      .order("date_prevue", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement fiches par affectation :", error);
      return [];
    }

    return (data || []) as FicheIntervention[];
  }

  async function rafraichir() {
    try {
      setMessageErreur("");
      setMessageSucces("");
      await chargerPlanning(entrepriseId, salarie);
      setMessageSucces("Planning actualisé.");
    } catch (error: any) {
      console.error("Erreur actualisation planning :", error);
      setMessageErreur(
        error?.message || "Impossible d’actualiser le planning."
      );
    }
  }

  const statistiques = useMemo(() => {
    const aujourdhui = dateLocaleIso();

    return {
      total: fiches.length,
      aujourdHui: fiches.filter((fiche) => dateFiche(fiche) === aujourdhui)
        .length,
      aVenir: fiches.filter((fiche) => {
        const date = dateFiche(fiche);
        return date && date >= aujourdhui && fiche.statut !== "terminee";
      }).length,
      enCours: fiches.filter((fiche) => fiche.statut === "en_cours").length,
      terminees: fiches.filter((fiche) => fiche.statut === "terminee").length,
      problemes: fiches.filter((fiche) => fiche.probleme_signale).length,
    };
  }, [fiches]);

  const fichesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const aujourdhui = dateLocaleIso();
    const dansSeptJours = ajouterJours(aujourdhui, 7);

    return fiches.filter((fiche) => {
      const date = dateFiche(fiche);

      const correspondDate =
        filtreDate === "toutes" ||
        (filtreDate === "aujourd_hui" && date === aujourdhui) ||
        (filtreDate === "semaine" &&
          date &&
          date >= aujourdhui &&
          date <= dansSeptJours) ||
        (filtreDate === "a_venir" &&
          date &&
          date >= aujourdhui &&
          fiche.statut !== "terminee" &&
          fiche.statut !== "annulee" &&
          fiche.statut !== "archivee") ||
        (filtreDate === "terminees" && fiche.statut === "terminee");

      const elementsFiche = elements
        .filter((element) => element.fiche_id === fiche.id)
        .map((element) => element.nom)
        .join(" ");

      const equipeFiche = affectations
        .filter((item) => item.fiche_id === fiche.id)
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
        texte.length === 0 || zoneRecherche.includes(texte);

      return correspondDate && correspondRecherche;
    });
  }, [fiches, elements, affectations, recherche, filtreDate]);

  function elementsDeFiche(ficheId: string) {
    return elements.filter((element) => element.fiche_id === ficheId);
  }

  function equipeDeFiche(fiche: FicheIntervention) {
    const equipe = affectations.filter((item) => item.fiche_id === fiche.id);

    if (equipe.length > 0) return equipe;

    if (fiche.salarie_id || fiche.salarie_nom) {
      return [
        {
          id: "legacy",
          entreprise_id: fiche.entreprise_id,
          fiche_id: fiche.id,
          salarie_id: fiche.salarie_id,
          salarie_nom: fiche.salarie_nom,
          role_chantier: "Intervenant",
          heure_arrivee_prevue: fiche.heure_debut_prevue || fiche.heure_debut,
          heure_depart_prevue: fiche.heure_fin_prevue || fiche.heure_fin,
          heure_arrivee_reelle: fiche.heure_debut_reelle,
          heure_depart_reelle: fiche.heure_fin_reelle,
        },
      ] as FicheSalarie[];
    }

    return [];
  }

  function renduEtapes(fiche: FicheIntervention) {
    return (
      <div className="grid gap-2 md:grid-cols-3">
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
          Aucun élément préparé sur cette fiche.
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
            Retrouvez vos interventions, ouvrez la fiche terrain, validez le
            matériel, l’arrivée, la fin de chantier, les photos et le PV.
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-400">
            Connecté : {nomSalarie(salarie) || profilEmail || "Salarié"}
          </p>
        </div>

        <button
          type="button"
          onClick={rafraichir}
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Actualiser
        </button>
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

      {!salarie && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aucun salarié lié à votre compte n’a été trouvé. Vérifiez côté chef
          que votre email salarié ou votre profil est bien rattaché.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Total
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-blue-500">
            Aujourd’hui
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {statistiques.aujourdHui}
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-500">
            À venir
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {statistiques.aVenir}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-amber-500">
            En cours
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {statistiques.enCours}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Terminées
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.terminees}
          </p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-red-500">
            Problèmes
          </p>
          <p className="mt-2 text-3xl font-bold text-red-900">
            {statistiques.problemes}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_240px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher par client, ville, chantier, matériel..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtreDate}
            onChange={(event) => setFiltreDate(event.target.value as FiltreDate)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="a_venir">À venir</option>
            <option value="aujourd_hui">Aujourd’hui</option>
            <option value="semaine">7 prochains jours</option>
            <option value="terminees">Terminées</option>
            <option value="toutes">Toutes</option>
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
              Aucune fiche ne correspond au filtre sélectionné.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {fichesFiltrees.map((fiche) => {
              const equipe = equipeDeFiche(fiche);

              return (
                <article
                  key={fiche.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                          🛠️
                        </div>

                        <div>
                          <h2 className="text-lg font-bold text-slate-950">
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
                        Date
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatDate(dateFiche(fiche))}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-400">
                        Horaires
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatHeure(heureDebutFiche(fiche))} →{" "}
                        {formatHeure(heureFinFiche(fiche))}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-400">
                        Équipe
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {equipe.length > 0
                          ? `${equipe.length} salarié(s)`
                          : "Non renseignée"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">{renduEtapes(fiche)}</div>

                  <ResumeRetourTerrainFiche
                    entrepriseId={entrepriseId}
                    ficheId={fiche.id}
                    problemeSignale={fiche.probleme_signale}
                    descriptionProbleme={fiche.description_probleme}
                  />

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Éléments de la fiche
                    </p>

                    {renduElementsMini(fiche)}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                      {formatDateCourte(dateFiche(fiche))} ·{" "}
                      {formatHeure(heureDebutFiche(fiche))} →{" "}
                      {formatHeure(heureFinFiche(fiche))}
                    </div>

                    <Link
                      href={`/salarie/interventions/${fiche.id}`}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Ouvrir intervention
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}