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
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;
  commentaire_salarie: string | null;
  validation_materiel_charge: boolean | null;
  validation_arrivee: boolean | null;
  validation_fin_intervention: boolean | null;
  created_at: string | null;
  updated_at: string | null;
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

function formatHeure(heure: string | null) {
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

function libelleType(type: string | null | undefined) {
  if (type === "entretien") return "Entretien";
  if (type === "elagage") return "Élagage";
  if (type === "abattage") return "Abattage";
  if (type === "taille") return "Taille";
  if (type === "tonte") return "Tonte";
  if (type === "debroussaillage") return "Débroussaillage";
  if (type === "creation") return "Création";
  return "Autre";
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || "Intervention sans titre";
}

function nomSalarie(salarie: Salarie | null | undefined) {
  if (!salarie) return "Non affecté";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();

  return complet || salarie.email || "Salarié";
}

function comparerFiches(a: FicheIntervention, b: FicheIntervention) {
  const dateA = a.date_intervention || "9999-12-31";
  const dateB = b.date_intervention || "9999-12-31";

  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const heureA = a.heure_debut || "99:99";
  const heureB = b.heure_debut || "99:99";

  return heureA.localeCompare(heureB);
}

export default function PlanningChefPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);

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
      .order("date_intervention", { ascending: true })
      .order("heure_debut", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement planning :", error);
      setMessageErreur(
        error.message || "Impossible de charger les fiches d’intervention."
      );
      return;
    }

    setFiches(((data || []) as FicheIntervention[]).sort(comparerFiches));
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
        salarie.statut !== "inactif" &&
        salarie.statut !== "supprime"
    );

    setSalaries(salariesActifs);
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

        if (periode !== "tous") {
          if (!fiche.date_intervention) {
            correspondPeriode = false;
          } else if (periode === "aujourdhui") {
            correspondPeriode = fiche.date_intervention === aujourdHui;
          } else if (dateFin) {
            correspondPeriode =
              fiche.date_intervention >= aujourdHui &&
              fiche.date_intervention <= dateFin;
          }
        }

        const zoneRecherche = [
          fiche.titre,
          fiche.client_nom,
          fiche.salarie_nom,
          fiche.type_intervention,
          fiche.adresse,
          fiche.code_postal,
          fiche.ville,
          fiche.travaux_prevus,
          fiche.materiel_prevu,
          fiche.notes_internes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const correspondRecherche =
          texte.length === 0 || zoneRecherche.includes(texte);

        return correspondStatut && correspondPeriode && correspondRecherche;
      })
      .sort(comparerFiches);
  }, [fiches, recherche, filtreStatut, periode]);

  const fichesGroupees = useMemo(() => {
    const groupes: Record<string, FicheIntervention[]> = {};

    fichesFiltrees.forEach((fiche) => {
      const cle = fiche.date_intervention || "non_datee";

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
          fiche.date_intervention === aujourdhui && fiche.statut !== "archivee"
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

  async function affecterSalarie(
    fiche: FicheIntervention,
    salarieId: string
  ) {
    if (!entrepriseId) return;

    try {
      setActionEnCours(true);
      setMessageErreur("");
      setMessageSucces("");

      const salarie = salaries.find((item) => item.id === salarieId);

      const payload = {
        salarie_id: salarieId || null,
        salarie_nom: salarie ? nomSalarie(salarie) : null,
      };

      const { error } = await supabase
        .from("fiches_intervention")
        .update(payload)
        .eq("id", fiche.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerFiches(entrepriseId);

      setMessageSucces(
        salarie
          ? `Intervention affectée à ${nomSalarie(salarie)}.`
          : "Affectation salarié retirée."
      );
    } catch (error: any) {
      console.error("Erreur affectation salarié :", error);
      setMessageErreur(
        error?.message || "Impossible d’affecter le salarié à l’intervention."
      );
    } finally {
      setActionEnCours(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Planning</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Le planning est alimenté par vos fiches d’intervention. Planifiez,
            affectez un salarié et suivez l’avancement terrain.
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
            + Créer une fiche
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Aujourd’hui
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.aujourdHui}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Planifiées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.planifiees}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            En cours
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.enCours}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Terminées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.terminees}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_180px_220px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher client, salarié, ville, type d’intervention..."
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
              Créez une fiche d’intervention avec une date pour l’afficher ici.
            </p>

            <Link
              href="/chef/interventions"
              className="mt-5 inline-flex rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Créer une fiche
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {fichesGroupees.map(([date, fichesDuJour]) => (
              <div key={date} className="p-4">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold capitalize text-slate-950">
                      {date === "non_datee" ? "Interventions non datées" : formatDate(date)}
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
                      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                                fiche.statut
                              )}`}
                            >
                              {libelleStatut(fiche.statut)}
                            </span>

                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {libelleType(fiche.type_intervention)}
                            </span>
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
                                Salarié :
                              </span>{" "}
                              {fiche.salarie_nom || "Non affecté"}
                            </p>

                            <p>
                              <span className="font-semibold text-slate-800">
                                Horaires :
                              </span>{" "}
                              {formatHeure(fiche.heure_debut)} →{" "}
                              {formatHeure(fiche.heure_fin)}
                            </p>

                            <p>
                              <span className="font-semibold text-slate-800">
                                Adresse :
                              </span>{" "}
                              {[fiche.adresse, fiche.code_postal, fiche.ville]
                                .filter(Boolean)
                                .join(", ") || "—"}
                            </p>
                          </div>

                          {fiche.travaux_prevus && (
                            <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                              <p className="font-semibold text-slate-900">
                                Travaux prévus
                              </p>
                              <p className="mt-1 whitespace-pre-line">
                                {fiche.travaux_prevus}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span
                              className={`rounded-full px-3 py-1 font-medium ${
                                fiche.validation_materiel_charge
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              Matériel chargé
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 font-medium ${
                                fiche.validation_arrivee
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              Arrivé sur site
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 font-medium ${
                                fiche.validation_fin_intervention
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              Intervention terminée
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-2xl bg-white p-4">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">
                              Affecter un salarié
                            </label>
                            <select
                              value={fiche.salarie_id || ""}
                              onChange={(event) =>
                                affecterSalarie(fiche, event.target.value)
                              }
                              disabled={actionEnCours}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-60"
                            >
                              <option value="">Non affecté</option>
                              {salaries.map((salarie) => (
                                <option key={salarie.id} value={salarie.id}>
                                  {nomSalarie(salarie)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() =>
                                changerStatutFiche(fiche, "planifiee")
                              }
                              disabled={actionEnCours}
                              className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                            >
                              Planifier
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
                              Terminer
                            </button>

                            <button
                              onClick={() =>
                                changerStatutFiche(fiche, "annulee")
                              }
                              disabled={actionEnCours}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              Annuler
                            </button>
                          </div>

                          <Link
                            href="/chef/interventions"
                            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                          >
                            Modifier la fiche
                          </Link>
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