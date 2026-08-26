"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";
import {
  resoudreSalarieConnecte,
} from "@/lib/salaries/resoudreSalarieConnecte";

type SalarieMinimal = {
  id: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
};

type FicheIntervention = {
  id: string;
  entreprise_id?: string | null;
  numero?: string | null;
  client_nom?: string | null;
  titre?: string | null;
  type_intervention?: string | null;
  statut?: string | null;
  date_prevue?: string | null;
  date_intervention?: string | null;
  date_fin_prevue?: string | null;
  heure_debut_prevue?: string | null;
  heure_fin_prevue?: string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;
  adresse_chantier?: string | null;
  code_postal_chantier?: string | null;
  ville_chantier?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  etape_materiel_statut?: string | null;
  etape_arrivee_statut?: string | null;
  etape_fin_statut?: string | null;
  probleme_signale?: boolean | null;
  salarie_id?: string | null;
};

type Affectation = {
  id: string;
  fiche_id: string;
  salarie_id: string | null;
};

type Demande = {
  id: string;
  type_demande?: string | null;
  titre?: string | null;
  statut?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  created_at?: string | null;
};

function aujourdHuiISO() {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

function ajouterJours(dateIso: string, nombre: number) {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + nombre);
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
  } catch {
    return "—";
  }
}

function formatDateCourte(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
  } catch {
    return "—";
  }
}

function formatHeure(heure: string | null | undefined) {
  return heure ? heure.slice(0, 5) : "—";
}

function nomSalarie(salarie: SalarieMinimal | null) {
  if (!salarie) return "Salarié";
  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();
  return complet || salarie.email || "Salarié";
}

function dateDebutFiche(fiche: FicheIntervention) {
  return fiche.date_prevue || fiche.date_intervention || "";
}

function dateFinFiche(fiche: FicheIntervention) {
  return fiche.date_fin_prevue || dateDebutFiche(fiche);
}

function ficheCouvreDate(fiche: FicheIntervention, date: string) {
  const debut = dateDebutFiche(fiche);
  const fin = dateFinFiche(fiche);
  return Boolean(debut && fin && debut <= date && fin >= date);
}

function heureDebutFiche(fiche: FicheIntervention) {
  return fiche.heure_debut_prevue || fiche.heure_debut || "";
}

function heureFinFiche(fiche: FicheIntervention) {
  return fiche.heure_fin_prevue || fiche.heure_fin || "";
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || fiche.type_intervention || "Intervention";
}

function adresseFiche(fiche: FicheIntervention) {
  const adresse = fiche.adresse_chantier || fiche.adresse || "";
  const cp = fiche.code_postal_chantier || fiche.code_postal || "";
  const ville = fiche.ville_chantier || fiche.ville || "";
  return [adresse, [cp, ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ") || "Adresse non renseignée";
}

function progressionFiche(fiche: FicheIntervention) {
  const etapes = [
    fiche.etape_materiel_statut === "valide",
    fiche.etape_arrivee_statut === "valide",
    fiche.etape_fin_statut === "valide",
  ].filter(Boolean).length;

  return {
    etapes,
    pourcentage: Math.round((etapes / 3) * 100),
  };
}

function libelleStatutFiche(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  return "À préparer";
}

function badgeStatutFiche(statut: string | null | undefined) {
  if (statut === "en_cours") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (statut === "terminee") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (statut === "annulee") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function libelleDemande(type: string | null | undefined) {
  if (type === "conge") return "Congé";
  if (type === "absence") return "Absence";
  if (type === "materiel") return "Matériel";
  if (type === "probleme") return "Problème";
  if (type === "rendez_vous") return "Rendez-vous";
  return "Demande";
}

function badgeDemande(statut: string | null | undefined) {
  if (statut === "acceptee" || statut === "accepte") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (statut === "refusee" || statut === "refuse") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function DashboardSalariePage() {
  const [salarie, setSalarie] = useState<SalarieMinimal | null>(null);
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");

  const chargerDashboard = useCallback(async (initial = false) => {
    try {
      if (initial) setChargement(true);
      else setActualisation(true);

      setMessageErreur("");

      const resultat = await chargerContexteEntreprise();

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
        error: erreurUtilisateur,
      } = await supabase.auth.getUser();

      if (erreurUtilisateur || !user) {
        throw new Error(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      }

      const entrepriseId = String(
        resultat.contexte.entreprise.id
      );
      const profil = resultat.contexte.profil;

      const salarieTrouve = (await resoudreSalarieConnecte(
        entrepriseId,
        {
          profilId: profil.id,
          utilisateurId: user.id,
          email: profil.email || user.email || "",
        }
      )) as SalarieMinimal | null;

      setSalarie(salarieTrouve);

      if (!salarieTrouve?.id) {
        setFiches([]);
        setDemandes([]);
        setMessageErreur(
          "Aucune fiche salarié n’est reliée à votre compte."
        );
        return;
      }

      const { data: affectationsData, error: erreurAffectations } =
        await supabase
          .from("fiches_intervention_salaries")
          .select("id, fiche_id, salarie_id")
          .eq("entreprise_id", entrepriseId)
          .eq("salarie_id", salarieTrouve.id);

      if (erreurAffectations) {
        throw erreurAffectations;
      }

      const affectations =
        (affectationsData || []) as Affectation[];
      const ficheIds = Array.from(
        new Set(
          affectations
            .map((item) => item.fiche_id)
            .filter(Boolean)
        )
      );

      let fichesAffectees: FicheIntervention[] = [];

      if (ficheIds.length > 0) {
        const { data, error } = await supabase
          .from("fiches_intervention")
          .select("*")
          .eq("entreprise_id", entrepriseId)
          .in("id", ficheIds);

        if (error) throw error;
        fichesAffectees = (data || []) as FicheIntervention[];
      }

      const { data: fichesLegacyData, error: erreurLegacy } =
        await supabase
          .from("fiches_intervention")
          .select("*")
          .eq("entreprise_id", entrepriseId)
          .eq("salarie_id", salarieTrouve.id);

      if (erreurLegacy) {
        console.warn(
          "Chargement des anciennes affectations salarié :",
          erreurLegacy
        );
      }

      const fichesMap = new Map<string, FicheIntervention>();

      for (const fiche of fichesAffectees) {
        fichesMap.set(fiche.id, fiche);
      }
      for (const fiche of (fichesLegacyData || []) as FicheIntervention[]) {
        fichesMap.set(fiche.id, fiche);
      }

      setFiches(
        Array.from(fichesMap.values()).filter(
          (fiche) => fiche.statut !== "archivee"
        )
      );

      const { data: demandesData, error: erreurDemandes } =
        await supabase
          .from("demandes")
          .select("*")
          .eq("entreprise_id", entrepriseId)
          .order("created_at", { ascending: false });

      if (erreurDemandes) {
        console.warn(
          "Chargement demandes dashboard salarié :",
          erreurDemandes
        );
        setDemandes([]);
      } else {
        setDemandes((demandesData || []) as Demande[]);
      }
    } catch (error: unknown) {
      console.error("Erreur dashboard salarié :", error);
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger le tableau de bord."
      );
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }, []);

  useEffect(() => {
    void chargerDashboard(true);
  }, [chargerDashboard]);

  const statistiques = useMemo(() => {
    const aujourdHui = aujourdHuiISO();
    const finSemaine = ajouterJours(aujourdHui, 7);

    const actives = fiches.filter(
      (fiche) =>
        fiche.statut !== "annulee" &&
        fiche.statut !== "archivee"
    );

    return {
      aujourdHui: actives.filter((fiche) =>
        ficheCouvreDate(fiche, aujourdHui)
      ).length,
      semaine: actives.filter((fiche) => {
        const debut = dateDebutFiche(fiche);
        const fin = dateFinFiche(fiche);
        return Boolean(
          debut &&
            fin &&
            fin >= aujourdHui &&
            debut <= finSemaine
        );
      }).length,
      enCours: actives.filter(
        (fiche) => fiche.statut === "en_cours"
      ).length,
      demandesEnAttente: demandes.filter(
        (demande) =>
          demande.statut === "en_attente" ||
          !demande.statut
      ).length,
    };
  }, [fiches, demandes]);

  const interventionsAujourdhui = useMemo(() => {
    const aujourdHui = aujourdHuiISO();

    return fiches
      .filter(
        (fiche) =>
          ficheCouvreDate(fiche, aujourdHui) &&
          fiche.statut !== "annulee" &&
          fiche.statut !== "archivee"
      )
      .sort((a, b) =>
        (heureDebutFiche(a) || "99:99").localeCompare(
          heureDebutFiche(b) || "99:99"
        )
      );
  }, [fiches]);

  const prochainesInterventions = useMemo(() => {
    const aujourdHui = aujourdHuiISO();

    return fiches
      .filter(
        (fiche) =>
          fiche.statut !== "annulee" &&
          fiche.statut !== "archivee" &&
          Boolean(
            dateDebutFiche(fiche) &&
              dateFinFiche(fiche) >= aujourdHui
          )
      )
      .sort((a, b) => {
        const dateA =
          dateDebutFiche(a) < aujourdHui
            ? aujourdHui
            : dateDebutFiche(a);
        const dateB =
          dateDebutFiche(b) < aujourdHui
            ? aujourdHui
            : dateDebutFiche(b);

        return `${dateA} ${heureDebutFiche(a) || "99:99"}`.localeCompare(
          `${dateB} ${heureDebutFiche(b) || "99:99"}`
        );
      })
      .slice(0, 5);
  }, [fiches]);

  const dernieresDemandes = useMemo(
    () => demandes.slice(0, 4),
    [demandes]
  );

  if (chargement) {
    return (
      <div className="min-h-[60vh] px-3 py-5 sm:px-4">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
            🌿
          </div>
          <p className="mt-4 font-black text-slate-950">
            Chargement de votre journée…
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Planning et interventions en cours de préparation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f2] px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="relative overflow-hidden rounded-[30px] bg-[#102a20] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                Ma journée
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Bonjour {nomSalarie(salarie)}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/70">
                Vos chantiers, vos étapes terrain et vos demandes au même endroit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void chargerDashboard(false)}
              disabled={actualisation}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {actualisation ? "Actualisation…" : "↻ Actualiser"}
            </button>
          </div>

          <div className="relative mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Link href="/salarie/planning" className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10">
              <p className="text-xs font-bold text-emerald-100/70">Aujourd’hui</p>
              <p className="mt-2 text-3xl font-black">{statistiques.aujourdHui}</p>
              <p className="mt-1 text-xs text-emerald-50/55">intervention(s)</p>
            </Link>
            <Link href="/salarie/planning" className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10">
              <p className="text-xs font-bold text-emerald-100/70">7 prochains jours</p>
              <p className="mt-2 text-3xl font-black">{statistiques.semaine}</p>
              <p className="mt-1 text-xs text-emerald-50/55">chantier(s)</p>
            </Link>
            <Link href="/salarie/interventions" className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10">
              <p className="text-xs font-bold text-emerald-100/70">En cours</p>
              <p className="mt-2 text-3xl font-black">{statistiques.enCours}</p>
              <p className="mt-1 text-xs text-emerald-50/55">fiche(s) terrain</p>
            </Link>
            <Link href="/salarie/demandes" className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10">
              <p className="text-xs font-bold text-emerald-100/70">Demandes</p>
              <p className="mt-2 text-3xl font-black">{statistiques.demandesEnAttente}</p>
              <p className="mt-1 text-xs text-emerald-50/55">en attente</p>
            </Link>
          </div>
        </section>

        {messageErreur ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {messageErreur}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Priorité terrain
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {interventionsAujourdhui.length > 0
                    ? "Interventions du jour"
                    : "Prochaines interventions"}
                </h2>
              </div>
              <Link href="/salarie/planning" className="text-sm font-black text-emerald-700">
                Planning →
              </Link>
            </div>

            {(interventionsAujourdhui.length > 0
              ? interventionsAujourdhui
              : prochainesInterventions
            ).length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                  ✓
                </div>
                <p className="mt-3 font-black text-slate-950">
                  Rien de planifié pour le moment
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Votre prochain chantier apparaîtra ici.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(interventionsAujourdhui.length > 0
                  ? interventionsAujourdhui
                  : prochainesInterventions
                )
                  .slice(0, 5)
                  .map((fiche) => {
                    const progression = progressionFiche(fiche);
                    const debut = dateDebutFiche(fiche);
                    const fin = dateFinFiche(fiche);

                    return (
                      <Link
                        key={fiche.id}
                        href={`/salarie/interventions/${fiche.id}`}
                        className="group block p-5 transition hover:bg-[#f7f9f6] sm:px-6"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#eef5ef] text-emerald-900">
                            <span className="text-[10px] font-black uppercase">
                              {debut ? formatDate(debut).split(" ")[0] : "—"}
                            </span>
                            <span className="text-lg font-black">
                              {debut ? debut.slice(8, 10) : "—"}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-slate-950">
                                {titreFiche(fiche)}
                              </h3>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeStatutFiche(fiche.statut)}`}>
                                {libelleStatutFiche(fiche.statut)}
                              </span>
                              {fiche.probleme_signale ? (
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700">
                                  Problème signalé
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-sm font-semibold text-slate-600">
                              {fiche.client_nom || "Client non renseigné"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">
                              {debut && fin && debut !== fin
                                ? `${formatDateCourte(debut)} → ${formatDateCourte(fin)}`
                                : formatDate(debut)}
                              {" · "}
                              {formatHeure(heureDebutFiche(fiche))} → {formatHeure(heureFinFiche(fiche))}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              📍 {adresseFiche(fiche)}
                            </p>

                            <div className="mt-4">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                <span>{progression.etapes}/3 étapes terrain</span>
                                <span>{progression.pourcentage} %</span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-emerald-600"
                                  style={{ width: `${progression.pourcentage}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <span className="self-end text-xl font-black text-emerald-700 transition group-hover:translate-x-1 sm:self-center">
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a7b2d]">
                Accès rapide
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Mes outils
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["/salarie/planning", "📅", "Planning", "Voir mes dates"],
                  ["/salarie/interventions", "🧾", "Terrain", "Ouvrir mes fiches"],
                  ["/salarie/demandes", "📩", "Demandes", "Faire une demande"],
                  ["/salarie/profil", "🙋", "Profil", "Mes informations"],
                ].map(([href, icone, titre, texte]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-2xl bg-[#f4f6f2] p-4 transition hover:bg-emerald-50"
                  >
                    <span className="text-xl">{icone}</span>
                    <p className="mt-3 text-sm font-black text-slate-950">{titre}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">{texte}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                    Suivi
                  </p>
                  <h2 className="mt-1 font-black text-slate-950">
                    Mes demandes
                  </h2>
                </div>
                <Link href="/salarie/demandes" className="text-xs font-black text-emerald-700">
                  Voir tout →
                </Link>
              </div>

              {dernieresDemandes.length === 0 ? (
                <p className="p-6 text-sm font-semibold text-slate-500">
                  Aucune demande récente.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dernieresDemandes.map((demande) => (
                    <Link
                      key={demande.id}
                      href="/salarie/demandes"
                      className="flex items-center justify-between gap-3 p-4 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {demande.titre || libelleDemande(demande.type_demande)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {demande.date_debut
                            ? formatDate(demande.date_debut)
                            : demande.created_at
                              ? formatDate(demande.created_at.slice(0, 10))
                              : "—"}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeDemande(demande.statut)}`}>
                        {demande.statut === "acceptee" || demande.statut === "accepte"
                          ? "Acceptée"
                          : demande.statut === "refusee" || demande.statut === "refuse"
                            ? "Refusée"
                            : "En attente"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
