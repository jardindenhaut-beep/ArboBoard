"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import {
  resoudreSalarieConnecte,
  type SalarieConnecte,
} from "@/lib/salaries/resoudreSalarieConnecte";

type FicheIntervention = {
  id: string;
  entreprise_id: string;
  numero: string | null;
  client_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  statut: string | null;
  date_intervention: string | null;
  date_prevue: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  heure_debut_prevue: string | null;
  heure_fin_prevue: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;
  etape_materiel_statut: string | null;
  etape_arrivee_statut: string | null;
  etape_fin_statut: string | null;
  probleme_signale: boolean | null;
  salarie_id: string | null;
  salarie_nom: string | null;
};

type Affectation = {
  id: string;
  fiche_id: string;
  salarie_id: string | null;
  salarie_nom: string | null;
  role_chantier: string | null;
};

type FiltreStatut =
  | "toutes"
  | "aujourd_hui"
  | "a_venir"
  | "en_cours"
  | "terminees"
  | "problemes";

function dateLocaleIso(date = new Date()) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

function dateFiche(fiche: FicheIntervention) {
  return fiche.date_prevue || fiche.date_intervention || "";
}

function heureDebut(fiche: FicheIntervention) {
  return (
    fiche.heure_debut_prevue ||
    fiche.heure_debut ||
    ""
  );
}

function heureFin(fiche: FicheIntervention) {
  return (
    fiche.heure_fin_prevue ||
    fiche.heure_fin ||
    ""
  );
}

function formatDate(date: string) {
  if (!date) return "Non planifiée";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

function formatHeure(heure: string) {
  return heure ? heure.slice(0, 5) : "—";
}

function titreFiche(fiche: FicheIntervention) {
  return (
    fiche.titre ||
    fiche.type_intervention ||
    "Intervention"
  );
}

function adresseFiche(fiche: FicheIntervention) {
  const adresse =
    fiche.adresse_chantier || fiche.adresse || "";
  const codePostal =
    fiche.code_postal_chantier ||
    fiche.code_postal ||
    "";
  const ville =
    fiche.ville_chantier || fiche.ville || "";

  return [
    adresse,
    [codePostal, ville].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ") || "Adresse non renseignée";
}

function libelleStatut(statut: string | null) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function badgeStatut(statut: string | null) {
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

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function etapeValidee(statut: string | null) {
  return statut === "valide";
}

export default function InterventionsSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [salarie, setSalarie] =
    useState<SalarieConnecte | null>(null);
  const [fiches, setFiches] = useState<FicheIntervention[]>(
    []
  );
  const [affectations, setAffectations] = useState<
    Affectation[]
  >([]);

  const [filtre, setFiltre] =
    useState<FiltreStatut>("a_venir");
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] =
    useState(false);
  const [erreur, setErreur] = useState("");
  const [ficheDeplieeId, setFicheDeplieeId] = useState<string | null>(
    null
  );

  useEffect(() => {
    void initialiser();
  }, []);

  async function initialiser() {
    try {
      setChargement(true);
      setErreur("");

      const resultat =
        await chargerContexteEntreprise();

      if (
        resultat.erreur ||
        !resultat.contexte?.entreprise?.id ||
        !resultat.contexte?.profil?.id
      ) {
        throw new Error(
          "Impossible de charger votre espace salarié."
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const entreprise =
        resultat.contexte.entreprise.id;
      const profil = resultat.contexte.profil;

      const salarieTrouve =
        await resoudreSalarieConnecte(
          entreprise,
          {
            profilId: profil.id,
            utilisateurId: user?.id,
            email:
              profil.email || user?.email || "",
          }
        );

      setEntrepriseId(entreprise);
      setSalarie(salarieTrouve);

      if (!salarieTrouve) {
        setFiches([]);
        setAffectations([]);
        throw new Error(
          "Votre compte n’est pas encore lié à une fiche salarié. Demandez au chef de renvoyer ou actualiser votre accès."
        );
      }

      await chargerFiches(
        entreprise,
        salarieTrouve.id
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les fiches."
      );
    } finally {
      setChargement(false);
    }
  }

  async function chargerFiches(
    idEntreprise: string,
    salarieId: string
  ) {
    const [
      affectationsResult,
      legacyResult,
    ] = await Promise.all([
      supabase
        .from("fiches_intervention_salaries")
        .select(
          "id, fiche_id, salarie_id, salarie_nom, role_chantier"
        )
        .eq("entreprise_id", idEntreprise)
        .eq("salarie_id", salarieId),

      supabase
        .from("fiches_intervention")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .eq("salarie_id", salarieId)
        .neq("statut", "archivee"),
    ]);

    if (affectationsResult.error) {
      throw affectationsResult.error;
    }

    if (legacyResult.error) {
      throw legacyResult.error;
    }

    const mesAffectations =
      (affectationsResult.data || []) as Affectation[];

    const ids = Array.from(
      new Set(
        mesAffectations
          .map((item) => item.fiche_id)
          .filter(Boolean)
      )
    );

    let fichesAffectees: FicheIntervention[] = [];

    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("fiches_intervention")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .in("id", ids)
        .neq("statut", "archivee");

      if (error) throw error;

      fichesAffectees =
        (data || []) as FicheIntervention[];
    }

    const mapFiches = new Map<
      string,
      FicheIntervention
    >();

    for (const fiche of [
      ...((legacyResult.data || []) as FicheIntervention[]),
      ...fichesAffectees,
    ]) {
      mapFiches.set(fiche.id, fiche);
    }

    const toutesFiches = Array.from(
      mapFiches.values()
    );

    const tousIds = toutesFiches.map(
      (fiche) => fiche.id
    );

    let equipeComplete: Affectation[] = [];

    if (tousIds.length > 0) {
      const { data, error } = await supabase
        .from("fiches_intervention_salaries")
        .select(
          "id, fiche_id, salarie_id, salarie_nom, role_chantier"
        )
        .eq("entreprise_id", idEntreprise)
        .in("fiche_id", tousIds);

      if (error) throw error;

      equipeComplete =
        (data || []) as Affectation[];
    }

    setAffectations(equipeComplete);
    setFiches(
      toutesFiches.sort((a, b) => {
        const dateA = dateFiche(a) || "9999-12-31";
        const dateB = dateFiche(b) || "9999-12-31";
        const comparaisonDate =
          dateA.localeCompare(dateB);

        if (comparaisonDate !== 0) {
          return comparaisonDate;
        }

        return heureDebut(a).localeCompare(
          heureDebut(b)
        );
      })
    );
  }

  async function rafraichir() {
    if (!entrepriseId || !salarie) return;

    try {
      setActualisation(true);
      setErreur("");
      await chargerFiches(
        entrepriseId,
        salarie.id
      );
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’actualiser les fiches."
      );
    } finally {
      setActualisation(false);
    }
  }

  const aujourdHui = dateLocaleIso();

  const statistiques = useMemo(
    () => ({
      total: fiches.length,
      aujourdHui: fiches.filter(
        (fiche) => dateFiche(fiche) === aujourdHui
      ).length,
      enCours: fiches.filter(
        (fiche) => fiche.statut === "en_cours"
      ).length,
      problemes: fiches.filter(
        (fiche) => fiche.probleme_signale
      ).length,
    }),
    [fiches, aujourdHui]
  );

  const fichesFiltrees = useMemo(() => {
    const texte = recherche
      .trim()
      .toLowerCase();

    return fiches.filter((fiche) => {
      const date = dateFiche(fiche);

      const correspondFiltre =
        filtre === "toutes" ||
        (filtre === "aujourd_hui" &&
          date === aujourdHui) ||
        (filtre === "a_venir" &&
          Boolean(date) &&
          date >= aujourdHui &&
          fiche.statut !== "terminee" &&
          fiche.statut !== "annulee") ||
        (filtre === "en_cours" &&
          fiche.statut === "en_cours") ||
        (filtre === "terminees" &&
          fiche.statut === "terminee") ||
        (filtre === "problemes" &&
          fiche.probleme_signale === true);

      if (!correspondFiltre) return false;
      if (!texte) return true;

      return [
        fiche.numero,
        fiche.client_nom,
        fiche.titre,
        fiche.type_intervention,
        adresseFiche(fiche),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(texte);
    });
  }, [fiches, filtre, recherche, aujourdHui]);

  function equipeFiche(ficheId: string) {
    return affectations.filter(
      (item) => item.fiche_id === ficheId
    );
  }

  if (chargement) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <p className="font-bold text-slate-950">
          Chargement de vos fiches terrain…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
              Terrain
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">
              Mes fiches d’intervention
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Consultez vos chantiers et renseignez directement les étapes terrain.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void rafraichir()}
            disabled={actualisation || !salarie}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {actualisation ? "Actualisation…" : "↻ Actualiser"}
          </button>
        </div>

        {erreur && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {erreur}
          </div>
        )}

        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-200 sm:grid-cols-6">
          {[
            ["a_venir", "À venir"],
            ["aujourd_hui", "Aujourd’hui"],
            ["en_cours", "En cours"],
            ["terminees", "Terminées"],
            ["problemes", "Problèmes"],
            ["toutes", "Toutes"],
          ].map(([valeur, label]) => (
            <button
              key={valeur}
              type="button"
              onClick={() => setFiltre(valeur as FiltreStatut)}
              className={`px-2 py-3 text-center text-[11px] font-bold transition sm:text-xs ${
                filtre === valeur
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border-b border-slate-200 bg-slate-50 p-3">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un client, une ville ou un chantier…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        {fichesFiltrees.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-slate-900">
              Aucune intervention à afficher
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Les fiches affectées par votre chef apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {fichesFiltrees.map((fiche) => {
              const ouverte = ficheDeplieeId === fiche.id;
              const equipe = affectations.filter(
                (item) => item.fiche_id === fiche.id
              );
              const etapes = [
                fiche.etape_materiel_statut,
                fiche.etape_arrivee_statut,
                fiche.etape_fin_statut,
              ].filter(etapeValidee).length;

              return (
                <article key={fiche.id} className="bg-white">
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() =>
                        setFicheDeplieeId(ouverte ? null : fiche.id)
                      }
                      className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="grid gap-2 lg:grid-cols-[minmax(240px,1.3fr)_170px_minmax(150px,0.8fr)_130px] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="truncate text-sm font-black text-slate-950">
                              {titreFiche(fiche)}
                            </h2>
                            <span className="text-xs text-slate-400">
                              {ouverte ? "⌃" : "⌄"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">
                            {fiche.client_nom || "Client non renseigné"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            📍 {adresseFiche(fiche)}
                          </p>
                        </div>

                        <div className="text-xs text-slate-600">
                          <p className="font-semibold">
                            {formatDate(dateFiche(fiche))}
                          </p>
                          <p className="mt-0.5">
                            {formatHeure(heureDebut(fiche))} →{" "}
                            {formatHeure(heureFin(fiche))}
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>{etapes}/3 étapes</span>
                            <span>{Math.round((etapes / 3) * 100)} %</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${Math.round((etapes / 3) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 lg:justify-end">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeStatut(
                              fiche.statut
                            )}`}
                          >
                            {libelleStatut(fiche.statut)}
                          </span>
                          {fiche.probleme_signale && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                              ⚠
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <Link
                      href={`/salarie/interventions/${fiche.id}`}
                      className="flex w-14 shrink-0 items-center justify-center border-l border-slate-100 text-xl font-black text-emerald-700 hover:bg-emerald-50"
                      aria-label="Ouvrir la fiche"
                    >
                      →
                    </Link>
                  </div>

                  {ouverte && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                      <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Équipe
                          </p>
                          <p className="mt-1 font-semibold text-slate-700">
                            {equipe
                              .map((item) => item.salarie_nom)
                              .filter(Boolean)
                              .join(", ") || "Équipe non renseignée"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Matériel
                          </p>
                          <p className="mt-1 font-semibold text-slate-700">
                            {fiche.etape_materiel_statut === "valide"
                              ? "Validé"
                              : "À préparer"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                            Arrivée / fin
                          </p>
                          <p className="mt-1 font-semibold text-slate-700">
                            {fiche.etape_arrivee_statut === "valide"
                              ? "Arrivée validée"
                              : "Arrivée en attente"}{" "}
                            ·{" "}
                            {fiche.etape_fin_statut === "valide"
                              ? "Fin validée"
                              : "Fin en attente"}
                          </p>
                        </div>
                        <div className="flex items-end">
                          <Link
                            href={`/salarie/interventions/${fiche.id}`}
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Remplir la fiche
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
