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

type Client = {
  id: string;
  statut?: string | null;
  created_at?: string | null;
};

type Salarie = {
  id: string;
  statut?: string | null;
  created_at?: string | null;
};

type Devis = {
  id: string;
  numero?: string | null;
  client_nom?: string | null;
  objet?: string | null;
  statut?: string | null;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  date_devis?: string | null;
  created_at?: string | null;
};

type Facture = {
  id: string;
  numero?: string | null;
  client_nom?: string | null;
  objet?: string | null;
  statut?: string | null;
  total_ht?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  montant_paye?: number | null;
  reste_a_payer?: number | null;
  date_facture?: string | null;
  date_echeance?: string | null;
  est_avoir?: boolean | null;
  type_facture?: string | null;
  created_at?: string | null;
};

type FicheIntervention = {
  id: string;
  numero?: string | null;
  client_nom?: string | null;
  salarie_nom?: string | null;
  titre?: string | null;
  type_intervention?: string | null;
  statut?: string | null;

  date_prevue?: string | null;
  date_intervention?: string | null;

  heure_debut_prevue?: string | null;
  heure_fin_prevue?: string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;

  adresse_chantier?: string | null;
  code_postal_chantier?: string | null;
  ville_chantier?: string | null;
  ville?: string | null;

  probleme_signale?: boolean | null;
  created_at?: string | null;
};

type Demande = {
  id: string;
  demandeur_nom?: string | null;
  demandeur_email?: string | null;
  type_demande?: string | null;
  titre?: string | null;
  statut?: string | null;
  created_at?: string | null;
};

function messageErreurInconnue(
  error: unknown,
  messageParDefaut: string
) {
  return error instanceof Error && error.message
    ? error.message
    : messageParDefaut;
}

function aujourdHuiISO() {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
  } catch {
    return "—";
  }
}

function formatHeure(heure: string | null | undefined) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function libelleStatutDevis(statut: string | null | undefined) {
  if (statut === "envoye") return "Envoyé";
  if (statut === "accepte") return "Accepté";
  if (statut === "facture") return "Facturé";
  if (statut === "refuse") return "Refusé";
  if (statut === "archive") return "Archivé";
  return "Brouillon";
}

function libelleStatutFacture(statut: string | null | undefined) {
  if (statut === "envoyee") return "Envoyée";
  if (statut === "payee") return "Payée";
  if (statut === "en_retard") return "En retard";
  if (statut === "annulee") return "Annulée";
  if (statut === "archive") return "Archivée";
  return "Brouillon";
}

function libelleStatutFiche(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function libelleTypeDemande(type: string | null | undefined) {
  if (type === "conge") return "Congé";
  if (type === "materiel") return "Matériel";
  if (type === "absence") return "Absence";
  if (type === "probleme") return "Problème";
  return "Autre";
}

function badgeStatut(statut: string | null | undefined) {
  if (
    statut === "accepte" ||
    statut === "payee" ||
    statut === "terminee" ||
    statut === "acceptee"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    statut === "envoye" ||
    statut === "envoyee" ||
    statut === "planifiee" ||
    statut === "traitee" ||
    statut === "facture"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    statut === "refuse" ||
    statut === "refusee" ||
    statut === "en_retard" ||
    statut === "annulee" ||
    statut === "annule"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (statut === "en_cours" || statut === "en_attente") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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

function villeFiche(fiche: FicheIntervention) {
  return fiche.ville_chantier || fiche.ville || "Ville non renseignée";
}

function estAvoirFacture(facture: Facture) {
  return !!facture.est_avoir || facture.type_facture === "avoir";
}

function resteAPayerFacture(facture: Facture) {
  if (estAvoirFacture(facture)) return 0;

  if (
    facture.reste_a_payer !== null &&
    facture.reste_a_payer !== undefined
  ) {
    return Math.max(0, Number(facture.reste_a_payer || 0));
  }

  return Math.max(
    0,
    Number(facture.total_ttc || 0) -
      Number(facture.montant_paye || 0)
  );
}

function trierParCreationDesc<
  T extends { created_at?: string | null },
>(elements: T[]) {
  return [...elements].sort((a, b) => {
    const dateA = a.created_at || "";
    const dateB = b.created_at || "";
    return dateB.localeCompare(dateA);
  });
}

export default function DashboardChefPage() {
  const [nomEntreprise, setNomEntreprise] =
    useState("Votre entreprise");

  const [clients, setClients] = useState<Client[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  const chargerDashboard = useCallback(
    async (chargementInitial = false) => {
      try {
        if (chargementInitial) {
          setChargement(true);
        } else {
          setActualisation(true);
        }

        setMessageErreur("");
        setMessageSucces("");

        const resultat = await chargerContexteEntreprise();

        if (
          resultat.erreur ||
          !resultat.contexte?.entreprise?.id
        ) {
          throw new Error(
            "Impossible de charger votre entreprise. Veuillez vous reconnecter."
          );
        }

        const entreprise = resultat.contexte.entreprise;
        const idEntreprise = entreprise.id as string;

        setNomEntreprise(
          entreprise.nom_entreprise ||
            entreprise.slug ||
            entreprise.email_contact ||
            "Votre entreprise"
        );

        const [
          clientsResult,
          salariesResult,
          devisResult,
          facturesResult,
          fichesResult,
          demandesResult,
        ] = await Promise.all([
          supabase
            .from("clients")
            .select("id, statut, created_at")
            .eq("entreprise_id", idEntreprise)
            .order("created_at", { ascending: false }),

          supabase
            .from("salaries")
            .select("id, statut, created_at")
            .eq("entreprise_id", idEntreprise)
            .order("created_at", { ascending: false }),

          supabase
            .from("devis")
            .select(
              "id, numero, client_nom, objet, statut, total_ht, total_tva, total_ttc, date_devis, created_at"
            )
            .eq("entreprise_id", idEntreprise)
            .order("created_at", { ascending: false }),

          supabase
            .from("factures")
            .select(
              "id, numero, client_nom, objet, statut, total_ht, total_tva, total_ttc, montant_paye, reste_a_payer, date_facture, date_echeance, est_avoir, type_facture, created_at"
            )
            .eq("entreprise_id", idEntreprise)
            .order("created_at", { ascending: false }),

          supabase
            .from("fiches_intervention")
            .select(
              "id, numero, client_nom, salarie_nom, titre, type_intervention, statut, date_prevue, date_intervention, heure_debut_prevue, heure_fin_prevue, heure_debut, heure_fin, adresse_chantier, code_postal_chantier, ville_chantier, ville, probleme_signale, created_at"
            )
            .eq("entreprise_id", idEntreprise)
            .or("statut.is.null,statut.neq.archivee")
            .order("date_prevue", { ascending: true })
            .order("date_intervention", { ascending: true }),

          supabase
            .from("demandes")
            .select(
              "id, demandeur_nom, demandeur_email, type_demande, titre, statut, created_at"
            )
            .eq("entreprise_id", idEntreprise)
            .order("created_at", { ascending: false }),
        ]);

        const erreurs = [
          clientsResult.error,
          salariesResult.error,
          devisResult.error,
          facturesResult.error,
          fichesResult.error,
          demandesResult.error,
        ].filter(Boolean);

        setClients((clientsResult.data || []) as Client[]);
        setSalaries((salariesResult.data || []) as Salarie[]);
        setDevis((devisResult.data || []) as Devis[]);
        setFactures((facturesResult.data || []) as Facture[]);
        setFiches(
          (fichesResult.data || []) as FicheIntervention[]
        );
        setDemandes((demandesResult.data || []) as Demande[]);

        if (erreurs.length > 0) {
          console.error(
            "Certaines données du dashboard n’ont pas été chargées :",
            erreurs
          );

          setMessageErreur(
            "Certaines données du tableau de bord n’ont pas pu être chargées."
          );
        } else if (!chargementInitial) {
          setMessageSucces("Tableau de bord actualisé.");
        }
      } catch (error: unknown) {
        console.error("Erreur dashboard chef :", error);
        setMessageErreur(
          messageErreurInconnue(
            error,
            "Une erreur est survenue pendant le chargement."
          )
        );
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    []
  );

  useEffect(() => {
    void chargerDashboard(true);
  }, [chargerDashboard]);

  const statistiques = useMemo(() => {
    const clientsActifs = clients.filter(
      (client) => client.statut !== "archive"
    );

    const salariesActifs = salaries.filter(
      (salarie) =>
        salarie.statut !== "archive" &&
        salarie.statut !== "inactif" &&
        salarie.statut !== "supprime"
    );

    const devisActifs = devis.filter(
      (item) => item.statut !== "archive"
    );

    const devisAcceptes = devisActifs.filter(
      (item) =>
        item.statut === "accepte" ||
        item.statut === "facture"
    );

    const devisASuivre = devisActifs.filter(
      (item) =>
        item.statut === "brouillon" ||
        item.statut === "envoye"
    );

    const facturesClassiques = factures.filter(
      (item) => !estAvoirFacture(item)
    );

    const facturesComptabilisees = facturesClassiques.filter(
      (item) =>
        item.statut !== "annulee" &&
        item.statut !== "archive"
    );

    const facturesEnRetard = facturesComptabilisees.filter(
      (item) => item.statut === "en_retard"
    );

    const totalFactureTtc = facturesComptabilisees.reduce(
      (total, item) => total + Number(item.total_ttc || 0),
      0
    );

    const totalEncaisse = facturesClassiques.reduce(
      (total, item) =>
        total + Number(item.montant_paye || 0),
      0
    );

    const resteAPayer = facturesComptabilisees.reduce(
      (total, item) => total + resteAPayerFacture(item),
      0
    );

    const aujourdHui = aujourdHuiISO();

    const interventionsAujourdhui = fiches.filter(
      (fiche) =>
        dateFiche(fiche) === aujourdHui &&
        fiche.statut !== "archivee" &&
        fiche.statut !== "annulee"
    );

    const interventionsEnCours = fiches.filter(
      (fiche) => fiche.statut === "en_cours"
    );

    const interventionsProbleme = fiches.filter(
      (fiche) => fiche.probleme_signale === true
    );

    const demandesEnAttente = demandes.filter(
      (demande) => demande.statut === "en_attente"
    );

    const tauxTransformation =
      devisActifs.length > 0
        ? Math.round(
            (devisAcceptes.length / devisActifs.length) * 100
          )
        : 0;

    return {
      clientsActifs: clientsActifs.length,
      salariesActifs: salariesActifs.length,

      devisTotal: devisActifs.length,
      devisASuivre: devisASuivre.length,
      devisAcceptes: devisAcceptes.length,
      caDevisAccepte: devisAcceptes.reduce(
        (total, item) =>
          total + Number(item.total_ttc || 0),
        0
      ),
      tauxTransformation,

      facturesTotal: facturesClassiques.length,
      facturesEnRetard: facturesEnRetard.length,
      totalFactureTtc,
      totalEncaisse,
      resteAPayer,

      interventionsAujourdhui:
        interventionsAujourdhui.length,
      interventionsEnCours: interventionsEnCours.length,
      interventionsProbleme:
        interventionsProbleme.length,

      demandesEnAttente: demandesEnAttente.length,
    };
  }, [clients, salaries, devis, factures, fiches, demandes]);

  const prochainesInterventions = useMemo(() => {
    const aujourdHui = aujourdHuiISO();

    return fiches
      .filter((fiche) => {
        const date = dateFiche(fiche);

        return (
          fiche.statut !== "archivee" &&
          fiche.statut !== "annulee" &&
          Boolean(date && date >= aujourdHui)
        );
      })
      .sort((a, b) => {
        const dateA = `${dateFiche(a) || "9999-12-31"} ${
          heureDebutFiche(a) || "99:99"
        }`;

        const dateB = `${dateFiche(b) || "9999-12-31"} ${
          heureDebutFiche(b) || "99:99"
        }`;

        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);
  }, [fiches]);

  const demandesEnAttente = useMemo(() => {
    return demandes
      .filter((demande) => demande.statut === "en_attente")
      .slice(0, 5);
  }, [demandes]);

  const devisASuivre = useMemo(() => {
    return trierParCreationDesc(
      devis.filter(
        (item) =>
          item.statut === "brouillon" ||
          item.statut === "envoye"
      )
    ).slice(0, 5);
  }, [devis]);

  const facturesAEncaisser = useMemo(() => {
    return factures
      .filter(
        (item) =>
          !estAvoirFacture(item) &&
          item.statut !== "payee" &&
          item.statut !== "annulee" &&
          item.statut !== "archive" &&
          resteAPayerFacture(item) > 0
      )
      .sort((a, b) => {
        if (
          a.statut === "en_retard" &&
          b.statut !== "en_retard"
        ) {
          return -1;
        }

        if (
          b.statut === "en_retard" &&
          a.statut !== "en_retard"
        ) {
          return 1;
        }

        const dateA = a.date_echeance || "9999-12-31";
        const dateB = b.date_echeance || "9999-12-31";

        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);
  }, [factures]);

  if (chargement) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              ⏳
            </div>

            <p className="font-semibold text-slate-950">
              Chargement du tableau de bord…
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Récupération de l’activité commerciale et du
              planning.
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
                  🌿
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                    Arboboard
                  </p>

                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Tableau de bord
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Vue d’ensemble de{" "}
                    <span className="font-semibold text-slate-700">
                      {nomEntreprise}
                    </span>{" "}
                    : activité commerciale, facturation, chantiers
                    et demandes salariés.
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
                <button
                  type="button"
                  onClick={() => void chargerDashboard(false)}
                  disabled={actualisation}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span aria-hidden="true">↻</span>
                  {actualisation ? "Actualisation…" : "Actualiser"}
                </button>

                <Link
                  href="/chef/devis"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <span aria-hidden="true">＋</span>
                  Créer un devis
                </Link>

                <Link
                  href="/chef/interventions"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <span aria-hidden="true">＋</span>
                  Créer une fiche
                </Link>
              </div>
            </div>
          </div>
        </section>

        {(messageErreur || messageSucces) && (
          <div className="space-y-3">
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
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/chef/planning"
            className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Aujourd’hui
                </p>
                <p className="mt-2 text-3xl font-black text-blue-950">
                  {statistiques.interventionsAujourdhui}
                </p>
                <p className="mt-1 text-sm font-medium text-blue-700">
                  Intervention(s) planifiée(s)
                </p>
              </div>

              <span className="text-2xl">📅</span>
            </div>
          </Link>

          <Link
            href="/chef/interventions"
            className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              statistiques.interventionsProbleme > 0
                ? "border-red-200 bg-red-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${
                    statistiques.interventionsProbleme > 0
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  Chantiers en cours
                </p>

                <p
                  className={`mt-2 text-3xl font-black ${
                    statistiques.interventionsProbleme > 0
                      ? "text-red-950"
                      : "text-emerald-950"
                  }`}
                >
                  {statistiques.interventionsEnCours}
                </p>

                <p
                  className={`mt-1 text-sm font-medium ${
                    statistiques.interventionsProbleme > 0
                      ? "text-red-700"
                      : "text-emerald-700"
                  }`}
                >
                  {statistiques.interventionsProbleme} problème(s)
                  signalé(s)
                </p>
              </div>

              <span className="text-2xl">
                {statistiques.interventionsProbleme > 0
                  ? "⚠️"
                  : "🚧"}
              </span>
            </div>
          </Link>

          <Link
            href="/chef/demandes"
            className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              statistiques.demandesEnAttente > 0
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                  Demandes salariés
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {statistiques.demandesEnAttente}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  À traiter
                </p>
              </div>

              <span className="text-2xl">📨</span>
            </div>
          </Link>

          <Link
            href="/chef/factures"
            className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              statistiques.facturesEnRetard > 0
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${
                    statistiques.facturesEnRetard > 0
                      ? "text-red-600"
                      : "text-slate-400"
                  }`}
                >
                  Factures en retard
                </p>

                <p
                  className={`mt-2 text-3xl font-black ${
                    statistiques.facturesEnRetard > 0
                      ? "text-red-950"
                      : "text-slate-950"
                  }`}
                >
                  {statistiques.facturesEnRetard}
                </p>

                <p
                  className={`mt-1 text-sm font-medium ${
                    statistiques.facturesEnRetard > 0
                      ? "text-red-700"
                      : "text-slate-600"
                  }`}
                >
                  {formatMontant(statistiques.resteAPayer)} à
                  encaisser
                </p>
              </div>

              <span className="text-2xl">⏰</span>
            </div>
          </Link>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/chef/clients"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Clients actifs
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {statistiques.clientsActifs}
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                👥
              </span>
            </div>
          </Link>

          <Link
            href="/chef/salaries"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Salariés actifs
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {statistiques.salariesActifs}
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                👷
              </span>
            </div>
          </Link>

          <Link
            href="/chef/devis"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Devis à suivre
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {statistiques.devisASuivre}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {statistiques.tauxTransformation} % acceptés
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                📝
              </span>
            </div>
          </Link>

          <Link
            href="/chef/factures"
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Factures
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {statistiques.facturesTotal}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {formatMontant(statistiques.totalEncaisse)} encaissé
                </p>
              </div>

              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-xl">
                🧾
              </span>
            </div>
          </Link>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Devis acceptés TTC
            </p>

            <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
              {formatMontant(statistiques.caDevisAccepte)}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {statistiques.devisAcceptes} devis accepté(s) sur{" "}
              {statistiques.devisTotal}.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total facturé TTC
            </p>

            <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">
              {formatMontant(statistiques.totalFactureTtc)}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Hors avoirs, factures annulées et archives.
            </p>
          </div>

          <div
            className={`rounded-3xl border p-5 shadow-sm ${
              statistiques.resteAPayer > 0
                ? "border-red-200 bg-red-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                statistiques.resteAPayer > 0
                  ? "text-red-600"
                  : "text-emerald-600"
              }`}
            >
              Reste à encaisser
            </p>

            <p
              className={`mt-2 break-words text-2xl font-black sm:text-3xl ${
                statistiques.resteAPayer > 0
                  ? "text-red-950"
                  : "text-emerald-950"
              }`}
            >
              {formatMontant(statistiques.resteAPayer)}
            </p>

            <p
              className={`mt-2 text-sm leading-6 ${
                statistiques.resteAPayer > 0
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              Montant restant sur les factures non réglées.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="font-black text-slate-950">
                  Prochaines interventions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Les cinq prochaines fiches planifiées.
                </p>
              </div>

              <Link
                href="/chef/planning"
                className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Voir tout
              </Link>
            </div>

            {prochainesInterventions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                  📅
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Aucune intervention à venir
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {prochainesInterventions.map((fiche) => (
                  <Link
                    key={fiche.id}
                    href={`/chef/interventions/${fiche.id}`}
                    className="block p-4 transition hover:bg-slate-50 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                        <span className="text-[10px] font-bold uppercase">
                          {dateFiche(fiche)
                            ? new Intl.DateTimeFormat("fr-FR", {
                                month: "short",
                              })
                                .format(
                                  new Date(
                                    `${dateFiche(
                                      fiche
                                    )}T12:00:00`
                                  )
                                )
                                .replace(".", "")
                            : "—"}
                        </span>

                        <span className="text-sm font-black">
                          {dateFiche(fiche)
                            ? dateFiche(fiche).slice(8, 10)
                            : "—"}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="break-words font-bold text-slate-950">
                            {fiche.titre ||
                              fiche.type_intervention ||
                              "Intervention sans titre"}
                          </p>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeStatut(
                              fiche.statut
                            )}`}
                          >
                            {libelleStatutFiche(fiche.statut)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-600">
                          {fiche.client_nom ||
                            "Client non renseigné"}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {formatDate(dateFiche(fiche))} ·{" "}
                          {formatHeure(heureDebutFiche(fiche))} →{" "}
                          {formatHeure(heureFinFiche(fiche))} ·{" "}
                          {villeFiche(fiche)}
                        </p>

                        {fiche.probleme_signale && (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            ⚠️ Un problème a été signalé
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="font-black text-slate-950">
                  Demandes à traiter
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Demandes salariés actuellement en attente.
                </p>
              </div>

              <Link
                href="/chef/demandes"
                className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Voir tout
              </Link>
            </div>

            {demandesEnAttente.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                  ✅
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Aucune demande en attente
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {demandesEnAttente.map((demande) => (
                  <Link
                    key={demande.id}
                    href="/chef/demandes"
                    className="block p-4 transition hover:bg-slate-50 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                        📨
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="break-words font-bold text-slate-950">
                            {demande.titre ||
                              "Demande sans titre"}
                          </p>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeStatut(
                              demande.statut
                            )}`}
                          >
                            En attente
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-600">
                          {demande.demandeur_nom || "Salarié"} ·{" "}
                          {libelleTypeDemande(
                            demande.type_demande
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="font-black text-slate-950">
                  Devis à suivre
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Brouillons et devis envoyés.
                </p>
              </div>

              <Link
                href="/chef/devis"
                className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Voir tout
              </Link>
            </div>

            {devisASuivre.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                  ✅
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Aucun devis à suivre
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {devisASuivre.map((item) => (
                  <Link
                    key={item.id}
                    href={`/chef/devis?devisId=${item.id}`}
                    className="block p-4 transition hover:bg-slate-50 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-slate-950">
                          {item.numero || "Sans numéro"} ·{" "}
                          {formatMontant(item.total_ttc)}
                        </p>

                        <p className="mt-1 break-words text-sm text-slate-500">
                          {item.client_nom ||
                            "Client non renseigné"}{" "}
                          · {item.objet || "Sans objet"}
                        </p>
                      </div>

                      <span
                        className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                          item.statut
                        )}`}
                      >
                        {libelleStatutDevis(item.statut)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="font-black text-slate-950">
                  Factures à encaisser
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Factures non réglées ou en retard.
                </p>
              </div>

              <Link
                href="/chef/factures"
                className="shrink-0 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Voir tout
              </Link>
            </div>

            {facturesAEncaisser.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                  ✅
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Aucune facture à encaisser
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {facturesAEncaisser.map((item) => (
                  <Link
                    key={item.id}
                    href={`/chef/factures?factureId=${item.id}`}
                    className={`block p-4 transition hover:bg-slate-50 sm:p-5 ${
                      item.statut === "en_retard"
                        ? "bg-red-50/40"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p
                          className={`break-words font-bold ${
                            item.statut === "en_retard"
                              ? "text-red-950"
                              : "text-slate-950"
                          }`}
                        >
                          {item.numero || "Sans numéro"} ·{" "}
                          {formatMontant(
                            resteAPayerFacture(item)
                          )}
                        </p>

                        <p className="mt-1 break-words text-sm text-slate-500">
                          {item.client_nom ||
                            "Client non renseigné"}{" "}
                          · Échéance :{" "}
                          {formatDate(item.date_echeance)}
                        </p>
                      </div>

                      <span
                        className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                          item.statut
                        )}`}
                      >
                        {libelleStatutFacture(item.statut)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Accès rapides
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ouvrez directement les principales fonctions.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              {
                href: "/chef/clients",
                icone: "👥",
                titre: "Clients",
                description: "Coordonnées et fiches clients.",
              },
              {
                href: "/chef/salaries",
                icone: "👷",
                titre: "Salariés",
                description: "Équipe et accès salariés.",
              },
              {
                href: "/chef/planning",
                icone: "📅",
                titre: "Planning",
                description: "Organisation des chantiers.",
              },
              {
                href: "/chef/interventions",
                icone: "📋",
                titre: "Interventions",
                description: "Préparation et suivi terrain.",
              },
              {
                href: "/chef/devis",
                icone: "📝",
                titre: "Devis",
                description: "Création et suivi commercial.",
              },
              {
                href: "/chef/factures",
                icone: "🧾",
                titre: "Factures",
                description: "Paiements, relances et avoirs.",
              },
            ].map((acces) => (
              <Link
                key={acces.href}
                href={acces.href}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <span className="text-2xl">{acces.icone}</span>

                <p className="mt-3 font-black text-slate-950">
                  {acces.titre}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {acces.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}