"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type PeriodeFiltre = "aujourdhui" | "7jours" | "30jours" | "tous";

type Salarie = {
  id: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  statut?: string | null;
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

  validation_materiel_charge: boolean | null;
  validation_arrivee: boolean | null;
  validation_fin_intervention: boolean | null;

  etape_materiel_statut: string | null;
  etape_arrivee_statut: string | null;
  etape_fin_statut: string | null;

  commentaire_preparation: string | null;
  commentaire_arrivee: string | null;
  commentaire_fin: string | null;

  probleme_signale: boolean | null;
  description_probleme: string | null;

  created_at: string | null;
  updated_at: string | null;
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
};

function dateISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function aujourdHuiISO() {
  return dateISO(new Date());
}

function ajouterJours(date: Date, jours: number) {
  const copie = new Date(date);
  copie.setDate(copie.getDate() + jours);
  return copie;
}

function datePlanning(fiche: FicheIntervention) {
  return fiche.date_prevue || fiche.date_intervention || null;
}

function heureDebutPlanning(fiche: FicheIntervention) {
  return fiche.heure_debut_prevue || fiche.heure_debut || null;
}

function heureFinPlanning(fiche: FicheIntervention) {
  return fiche.heure_fin_prevue || fiche.heure_fin || null;
}

function formatDate(date: string | null) {
  if (!date) return "Non datée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "Non datée";
  }
}

function formatDateCourte(date: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return "—";
  }
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
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

function badgeEtape(statut: string | null | undefined) {
  if (statut === "valide") return "bg-emerald-100 text-emerald-700";
  if (statut === "en_cours") return "bg-amber-100 text-amber-700";
  if (statut === "probleme") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-500";
}

function libelleEtape(statut: string | null | undefined) {
  if (statut === "valide") return "Validée";
  if (statut === "en_cours") return "En cours";
  if (statut === "probleme") return "Problème";
  if (statut === "a_preparer") return "À préparer";
  return "En attente";
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || "Intervention sans titre";
}

function adresseFiche(fiche: FicheIntervention) {
  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const codePostal = fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";

  return [adresse, codePostal, ville].filter(Boolean).join(", ") || "—";
}

function nomSalarie(salarie: Salarie | null | undefined) {
  if (!salarie) return "Salarié";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();

  return complet || salarie.email || "Salarié";
}

function comparerFiches(a: FicheIntervention, b: FicheIntervention) {
  const dateA = datePlanning(a) || "9999-12-31";
  const dateB = datePlanning(b) || "9999-12-31";

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const heureA = heureDebutPlanning(a) || "99:99";
  const heureB = heureDebutPlanning(b) || "99:99";

  return heureA.localeCompare(heureB);
}

export default function PlanningChefPage() {
  const [entrepriseId, setEntrepriseId] = useState("");

  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [salariesFiches, setSalariesFiches] = useState<FicheSalarie[]>([]);
  const [elementsFiches, setElementsFiches] = useState<FicheElement[]>([]);

  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);

  const [periode, setPeriode] = useState<PeriodeFiltre>("30jours");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | StatutFiche>("tous");
  const [recherche, setRecherche] = useState("");

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    initialiserPage();
  }, []);

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
        chargerFiches(idEntreprise),
        chargerSalaries(idEntreprise),
      ]);
    } catch (error) {
      console.error("Erreur initialisation planning :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerFiches(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("date_prevue", { ascending: true, nullsFirst: false })
      .order("date_intervention", { ascending: true, nullsFirst: false })
      .order("heure_debut_prevue", { ascending: true, nullsFirst: false })
      .order("heure_debut", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement planning :", error);
      setMessageErreur(
        error.message || "Impossible de charger les fiches d’intervention."
      );
      return;
    }

    const fichesChargees = ((data || []) as FicheIntervention[]).sort(
      comparerFiches
    );

    setFiches(fichesChargees);

    const idsFiches = fichesChargees.map((fiche) => fiche.id);

    if (idsFiches.length === 0) {
      setSalariesFiches([]);
      setElementsFiches([]);
      return;
    }

    await Promise.all([
      chargerSalariesFiches(idEntreprise, idsFiches),
      chargerElementsFiches(idEntreprise, idsFiches),
    ]);
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

    const salariesActifs = ((data || []) as Salarie[]).filter(
      (salarie) =>
        salarie.statut !== "archive" &&
        salarie.statut !== "archivee" &&
        salarie.statut !== "inactif" &&
        salarie.statut !== "supprime"
    );

    setSalaries(salariesActifs);
  }

  async function chargerSalariesFiches(idEntreprise: string, ficheIds: string[]) {
    const { data, error } = await supabase
      .from("fiches_intervention_salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("fiche_id", ficheIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erreur chargement équipes fiches :", error);
      setSalariesFiches([]);
      return;
    }

    setSalariesFiches((data || []) as FicheSalarie[]);
  }

  async function chargerElementsFiches(idEntreprise: string, ficheIds: string[]) {
    const { data, error } = await supabase
      .from("fiches_intervention_elements")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .in("fiche_id", ficheIds)
      .order("ordre", { ascending: true });

    if (error) {
      console.error("Erreur chargement éléments planning :", error);
      setElementsFiches([]);
      return;
    }

    setElementsFiches((data || []) as FicheElement[]);
  }

  function equipeFiche(fiche: FicheIntervention) {
    const equipe = salariesFiches.filter((item) => item.fiche_id === fiche.id);

    if (equipe.length > 0) return equipe;

    if (fiche.salarie_id || fiche.salarie_nom) {
      return [
        {
          id: `legacy-${fiche.id}`,
          fiche_id: fiche.id,
          salarie_id: fiche.salarie_id,
          salarie_nom: fiche.salarie_nom || "Salarié",
          role_chantier: "Intervenant",
          heure_arrivee_prevue: heureDebutPlanning(fiche),
          heure_depart_prevue: heureFinPlanning(fiche),
          heure_arrivee_reelle: fiche.heure_debut_reelle,
          heure_depart_reelle: fiche.heure_fin_reelle,
        },
      ];
    }

    return [];
  }

  function elementsFiche(fiche: FicheIntervention) {
    return elementsFiches.filter((element) => element.fiche_id === fiche.id);
  }

  const fichesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    const maintenant = new Date();
    const aujourdHui = aujourdHuiISO();

    let dateFin: string | null = null;

    if (periode === "aujourdhui") {
      dateFin = aujourdHui;
    }

    if (periode === "7jours") {
      dateFin = dateISO(ajouterJours(maintenant, 7));
    }

    if (periode === "30jours") {
      dateFin = dateISO(ajouterJours(maintenant, 30));
    }

    return fiches
      .filter((fiche) => fiche.statut !== "archivee")
      .filter((fiche) => {
        const statut = fiche.statut || "brouillon";

        const correspondStatut =
          filtreStatut === "tous" || statut === filtreStatut;

        let correspondPeriode = true;
        const dateFiche = datePlanning(fiche);

        if (periode !== "tous") {
          if (!dateFiche) {
            correspondPeriode = false;
          } else if (periode === "aujourdhui") {
            correspondPeriode = dateFiche === aujourdHui;
          } else if (dateFin) {
            correspondPeriode = dateFiche >= aujourdHui && dateFiche <= dateFin;
          }
        }

        const equipe = equipeFiche(fiche)
          .map((item) => item.salarie_nom)
          .join(" ");

        const elements = elementsFiche(fiche)
          .map((item) => item.nom)
          .join(" ");

        const zoneRecherche = [
          fiche.numero,
          fiche.titre,
          fiche.client_nom,
          fiche.salarie_nom,
          equipe,
          fiche.type_intervention,
          fiche.adresse,
          fiche.code_postal,
          fiche.ville,
          fiche.adresse_chantier,
          fiche.code_postal_chantier,
          fiche.ville_chantier,
          fiche.notes_chantier,
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

        return correspondStatut && correspondPeriode && correspondRecherche;
      })
      .sort(comparerFiches);
  }, [
    fiches,
    salariesFiches,
    elementsFiches,
    recherche,
    filtreStatut,
    periode,
  ]);

  const fichesGroupees = useMemo(() => {
    const groupes: Record<string, FicheIntervention[]> = {};

    fichesFiltrees.forEach((fiche) => {
      const cle = datePlanning(fiche) || "non_datee";

      if (!groupes[cle]) {
        groupes[cle] = [];
      }

      groupes[cle].push(fiche);
    });

    return Object.entries(groupes).sort(([dateA], [dateB]) => {
      if (dateA === "non_datee") return 1;
      if (dateB === "non_datee") return -1;
      return dateA.localeCompare(dateB);
    });
  }, [fichesFiltrees]);

  const statistiques = useMemo(() => {
    const aujourdhui = aujourdHuiISO();

    return {
      total: fiches.filter((fiche) => fiche.statut !== "archivee").length,
      aujourdHui: fiches.filter(
        (fiche) =>
          datePlanning(fiche) === aujourdhui && fiche.statut !== "archivee"
      ).length,
      planifiees: fiches.filter((fiche) => fiche.statut === "planifiee").length,
      enCours: fiches.filter((fiche) => fiche.statut === "en_cours").length,
      terminees: fiches.filter((fiche) => fiche.statut === "terminee").length,
    };
  }, [fiches]);

  async function changerStatutFiche(
    fiche: FicheIntervention,
    statut: StatutFiche
  ) {
    if (!entrepriseId) return;

    try {
      setActionEnCours(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update({ statut })
        .eq("id", fiche.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerFiches(entrepriseId);

      setMessageSucces(`Intervention mise à jour : ${libelleStatut(statut)}.`);
    } catch (error: any) {
      console.error("Erreur changement statut planning :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier le statut de l’intervention."
      );
    } finally {
      setActionEnCours(false);
    }
  }

  function renduEquipe(fiche: FicheIntervention) {
    const equipe = equipeFiche(fiche);

    if (equipe.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          Aucun salarié affecté. À compléter dans la fiche.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {equipe.map((item) => (
          <span
            key={item.id}
            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
          >
            👤 {item.salarie_nom || "Salarié"}
          </span>
        ))}
      </div>
    );
  }

  function renduElements(fiche: FicheIntervention) {
    const elements = elementsFiche(fiche);

    if (elements.length === 0) {
      return null;
    }

    return (
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Éléments fiche
        </p>

        <div className="flex flex-wrap gap-2">
          {elements.slice(0, 10).map((element) => (
            <span
              key={element.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              <span>{element.icone || "•"}</span>
              <span>{element.nom}</span>
            </span>
          ))}

          {elements.length > 10 && (
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              +{elements.length - 10}
            </span>
          )}
        </div>
      </div>
    );
  }

  function renduEtapes(fiche: FicheIntervention) {
    return (
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <span
          className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${badgeEtape(
            fiche.etape_materiel_statut ||
              (fiche.validation_materiel_charge ? "valide" : "a_preparer")
          )}`}
        >
          Matériel :{" "}
          {libelleEtape(
            fiche.etape_materiel_statut ||
              (fiche.validation_materiel_charge ? "valide" : "a_preparer")
          )}
        </span>

        <span
          className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${badgeEtape(
            fiche.etape_arrivee_statut ||
              (fiche.validation_arrivee ? "valide" : "en_attente")
          )}`}
        >
          Arrivée :{" "}
          {libelleEtape(
            fiche.etape_arrivee_statut ||
              (fiche.validation_arrivee ? "valide" : "en_attente")
          )}
        </span>

        <span
          className={`rounded-full px-3 py-2 text-center text-xs font-semibold ${badgeEtape(
            fiche.etape_fin_statut ||
              (fiche.validation_fin_intervention ? "valide" : "en_attente")
          )}`}
        >
          Fin / PV :{" "}
          {libelleEtape(
            fiche.etape_fin_statut ||
              (fiche.validation_fin_intervention ? "valide" : "en_attente")
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Planning</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Le planning est alimenté automatiquement par les fiches
            d’intervention créées depuis les devis. Il affiche la date prévue,
            les horaires, l’équipe affectée et l’avancement terrain.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/chef/interventions"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Voir les fiches
          </Link>

          <Link
            href="/chef/interventions"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            + Créer depuis devis
          </Link>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Aujourd’hui
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.aujourdHui}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-blue-500">
            Planifiées
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-900">
            {statistiques.planifiees}
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

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-500">
            Terminées
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {statistiques.terminees}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_180px_220px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher client, salarié, ville, matériel, travaux..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={periode}
            onChange={(event) => setPeriode(event.target.value as PeriodeFiltre)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="aujourdhui">Aujourd’hui</option>
            <option value="7jours">7 prochains jours</option>
            <option value="30jours">30 prochains jours</option>
            <option value="tous">Tout afficher</option>
          </select>

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "tous" | StatutFiche)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="brouillon">Brouillons</option>
            <option value="planifiee">Planifiées</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminées</option>
            <option value="annulee">Annulées</option>
            <option value="archivee">Archivées</option>
          </select>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              📅
            </div>
            <p className="font-semibold text-slate-900">
              Chargement du planning...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des fiches d’intervention.
            </p>
          </div>
        ) : fichesGroupees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📅
            </div>
            <p className="font-semibold text-slate-900">
              Aucune intervention dans le planning
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Créez une fiche d’intervention avec une date prévue pour
              l’afficher ici.
            </p>

            <Link
              href="/chef/interventions"
              className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Créer depuis un devis
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {fichesGroupees.map(([date, fichesDuJour]) => (
              <div key={date} className="p-4">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold capitalize text-slate-950">
                      {date === "non_datee"
                        ? "Interventions non datées"
                        : formatDate(date)}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {fichesDuJour.length} intervention
                      {fichesDuJour.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  {date !== "non_datee" && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {formatDateCourte(date)}
                    </span>
                  )}
                </div>

                <div className="grid gap-4">
                  {fichesDuJour.map((fiche) => (
                    <article
                      key={fiche.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                                fiche.statut
                              )}`}
                            >
                              {libelleStatut(fiche.statut)}
                            </span>

                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {fiche.type_intervention || "Intervention"}
                            </span>

                            {fiche.numero && (
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {fiche.numero}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 text-lg font-bold text-slate-950">
                            {titreFiche(fiche)}
                          </h3>

                          <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                            <p>
                              <span className="font-semibold text-slate-800">
                                Client :
                              </span>{" "}
                              {fiche.client_nom || "—"}
                            </p>

                            <p>
                              <span className="font-semibold text-slate-800">
                                Horaires :
                              </span>{" "}
                              {formatHeure(heureDebutPlanning(fiche))} →{" "}
                              {formatHeure(heureFinPlanning(fiche))}
                            </p>

                            <p className="md:col-span-2">
                              <span className="font-semibold text-slate-800">
                                Adresse :
                              </span>{" "}
                              {adresseFiche(fiche)}
                            </p>
                          </div>

                          {fiche.notes_chantier && (
                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                              <span className="font-semibold">
                                Notes chantier :
                              </span>{" "}
                              {fiche.notes_chantier}
                            </div>
                          )}

                          <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Équipe
                            </p>
                            {renduEquipe(fiche)}
                          </div>

                          {renduEtapes(fiche)}
                          {renduElements(fiche)}

                          {fiche.probleme_signale && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                              <p className="font-semibold">Problème signalé</p>
                              {fiche.description_probleme && (
                                <p className="mt-1">
                                  {fiche.description_probleme}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 rounded-2xl bg-white p-4">
                          <p className="text-sm font-bold text-slate-950">
                            Actions planning
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() =>
                                changerStatutFiche(fiche, "planifiee")
                              }
                              disabled={actionEnCours}
                              className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                            >
                              Planifiée
                            </button>

                            <button
                              onClick={() =>
                                changerStatutFiche(fiche, "en_cours")
                              }
                              disabled={actionEnCours}
                              className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                            >
                              En cours
                            </button>

                            <button
                              onClick={() =>
                                changerStatutFiche(fiche, "terminee")
                              }
                              disabled={actionEnCours}
                              className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              Terminée
                            </button>

                            <button
                              onClick={() =>
                                changerStatutFiche(fiche, "annulee")
                              }
                              disabled={actionEnCours}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              Annulée
                            </button>
                          </div>

                          <Link
                            href="/chef/interventions"
                            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            Ouvrir la fiche
                          </Link>

                          <p className="text-xs text-slate-500">
                            L’affectation de l’équipe se fait dans la fiche
                            d’intervention pour éviter d’écraser les salariés
                            déjà sélectionnés.
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}