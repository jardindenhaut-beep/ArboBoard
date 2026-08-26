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
  date_fin_prevue?: string | null;

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

function dateFinFiche(fiche: FicheIntervention) {
  return fiche.date_fin_prevue || dateFiche(fiche);
}

function ficheCouvreDate(
  fiche: FicheIntervention,
  date: string
) {
  const debut = dateFiche(fiche);
  const fin = dateFinFiche(fiche);

  return Boolean(
    debut &&
      fin &&
      debut <= date &&
      fin >= date
  );
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
              "id, numero, client_nom, salarie_nom, titre, type_intervention, statut, date_prevue, date_intervention, date_fin_prevue, heure_debut_prevue, heure_fin_prevue, heure_debut, heure_fin, adresse_chantier, code_postal_chantier, ville_chantier, ville, probleme_signale, created_at"
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
        ficheCouvreDate(fiche, aujourdHui) &&
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
          Boolean(
            date &&
              dateFinFiche(fiche) >= aujourdHui
          )
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
    <div className="min-h-screen bg-[#f4f6f2] px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="relative overflow-hidden rounded-[30px] bg-[#102a20] p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl">
                  🌿
                </span>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                  Centre de pilotage
                </p>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {nomEntreprise}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/70">
                L’essentiel de votre activité en un coup d’œil : chantiers,
                devis, factures et équipe.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void chargerDashboard(false)}
                disabled={actualisation}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                {actualisation ? "Actualisation…" : "↻ Actualiser"}
              </button>
              <Link
                href="/chef/devis"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-[#102a20] transition hover:bg-emerald-50"
              >
                + Nouveau devis
              </Link>
              <Link
                href="/chef/interventions"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#d6b86a] px-4 text-sm font-black text-[#102a20] transition hover:bg-[#e3c97d]"
              >
                + Intervention
              </Link>
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/chef/planning"
              className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10"
            >
              <p className="text-xs font-bold text-emerald-100/70">Aujourd’hui</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-3xl font-black">
                  {statistiques.interventionsAujourdhui}
                </p>
                <span className="text-sm font-bold text-[#d6b86a]">Planning →</span>
              </div>
              <p className="mt-1 text-xs text-emerald-50/55">
                intervention(s) en cours de journée
              </p>
            </Link>

            <Link
              href="/chef/factures"
              className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10"
            >
              <p className="text-xs font-bold text-emerald-100/70">À encaisser</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-2xl font-black">
                  {formatMontant(statistiques.resteAPayer)}
                </p>
                <span className="text-sm font-bold text-[#d6b86a]">Factures →</span>
              </div>
              <p className="mt-1 text-xs text-emerald-50/55">
                {statistiques.facturesEnRetard} facture(s) en retard
              </p>
            </Link>

            <Link
              href="/chef/devis"
              className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10"
            >
              <p className="text-xs font-bold text-emerald-100/70">Devis à suivre</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-3xl font-black">
                  {statistiques.devisASuivre}
                </p>
                <span className="text-sm font-bold text-[#d6b86a]">
                  {statistiques.tauxTransformation} %
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-50/55">
                taux d’acceptation actuel
              </p>
            </Link>

            <Link
              href="/chef/demandes"
              className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:bg-white/10"
            >
              <p className="text-xs font-bold text-emerald-100/70">Équipe</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-3xl font-black">
                  {statistiques.salariesActifs}
                </p>
                <span className="text-sm font-bold text-[#d6b86a]">
                  {statistiques.demandesEnAttente} demande(s)
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-50/55">
                salarié(s) actif(s)
              </p>
            </Link>
          </div>
        </section>

        {(messageErreur || messageSucces) && (
          <div className="space-y-2">
            {messageErreur ? (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {messageErreur}
              </div>
            ) : null}
            {messageSucces ? (
              <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {messageSucces}
              </div>
            ) : null}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Terrain
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Prochaines interventions
                </h2>
              </div>
              <Link href="/chef/planning" className="text-sm font-black text-emerald-700 hover:text-emerald-900">
                Ouvrir le planning →
              </Link>
            </div>

            {prochainesInterventions.length === 0 ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                Aucune intervention à venir.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {prochainesInterventions.map((fiche, index) => {
                  const debut = dateFiche(fiche);
                  const fin = dateFinFiche(fiche);
                  const periode =
                    debut && fin && debut !== fin
                      ? `${formatDate(debut)} → ${formatDate(fin)}`
                      : formatDate(debut);

                  return (
                    <Link
                      key={fiche.id}
                      href={`/chef/interventions/${fiche.id}`}
                      className="group grid gap-4 px-5 py-4 transition hover:bg-[#f7f9f6] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ef] text-sm font-black text-emerald-800">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-black text-slate-950">
                            {fiche.titre || fiche.type_intervention || "Intervention"}
                          </p>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeStatut(fiche.statut)}`}>
                            {libelleStatutFiche(fiche.statut)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                          {fiche.client_nom || "Client non renseigné"} · {villeFiche(fiche)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {periode} · {formatHeure(heureDebutFiche(fiche))} → {formatHeure(heureFinFiche(fiche))}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {fiche.probleme_signale ? (
                          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                            Problème
                          </span>
                        ) : null}
                        <span className="text-lg font-black text-emerald-700 transition group-hover:translate-x-1">
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9a7b2d]">
                    Finance
                  </p>
                  <h2 className="mt-1 text-xl font-black">Vue financière</h2>
                </div>
                <Link href="/chef/factures" className="text-sm font-black text-emerald-700">
                  Détails →
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-500">Facturé TTC</span>
                    <span className="font-black text-slate-950">
                      {formatMontant(statistiques.totalFactureTtc)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width: `${
                          statistiques.totalFactureTtc > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (statistiques.totalEncaisse /
                                    statistiques.totalFactureTtc) *
                                    100
                                )
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-bold text-emerald-700">Encaissé</p>
                    <p className="mt-2 break-words text-lg font-black text-emerald-950">
                      {formatMontant(statistiques.totalEncaisse)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-red-50 p-4">
                    <p className="text-xs font-bold text-red-700">Restant</p>
                    <p className="mt-2 break-words text-lg font-black text-red-950">
                      {formatMontant(statistiques.resteAPayer)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Devis acceptés TTC
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {formatMontant(statistiques.caDevisAccepte)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Raccourcis
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["/chef/clients", "Clients", `${statistiques.clientsActifs}`],
                  ["/chef/devis", "Devis", `${statistiques.devisTotal}`],
                  ["/chef/factures", "Factures", `${statistiques.facturesTotal}`],
                  ["/chef/salaries", "Équipe", `${statistiques.salariesActifs}`],
                ].map(([href, label, value]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-2xl bg-[#f4f6f2] p-4 transition hover:bg-emerald-50"
                  >
                    <p className="text-xl font-black text-slate-950">{value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  Commercial
                </p>
                <h2 className="mt-1 font-black text-slate-950">Devis à suivre</h2>
              </div>
              <Link href="/chef/devis" className="text-xs font-black text-emerald-700">Voir tout →</Link>
            </div>
            {devisASuivre.length === 0 ? (
              <p className="p-6 text-sm font-semibold text-slate-500">Aucun devis à suivre.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {devisASuivre.map((item) => (
                  <Link key={item.id} href="/chef/devis" className="block p-4 transition hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {item.numero || "Devis"} · {item.client_nom || "Client"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {item.objet || "Sans objet"} · {formatDate(item.date_devis)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeStatut(item.statut)}`}>
                        {libelleStatutDevis(item.statut)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
                  Encaissements
                </p>
                <h2 className="mt-1 font-black text-slate-950">Factures à suivre</h2>
              </div>
              <Link href="/chef/factures" className="text-xs font-black text-emerald-700">Voir tout →</Link>
            </div>
            {facturesAEncaisser.length === 0 ? (
              <p className="p-6 text-sm font-semibold text-slate-500">Aucune facture à encaisser.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {facturesAEncaisser.map((item) => (
                  <Link key={item.id} href="/chef/factures" className="block p-4 transition hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {item.numero || "Facture"} · {item.client_nom || "Client"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-red-600">
                          {formatMontant(resteAPayerFacture(item))} à encaisser
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${badgeStatut(item.statut)}`}>
                        {libelleStatutFacture(item.statut)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                  Équipe
                </p>
                <h2 className="mt-1 font-black text-slate-950">Demandes en attente</h2>
              </div>
              <Link href="/chef/demandes" className="text-xs font-black text-emerald-700">Voir tout →</Link>
            </div>
            {demandesEnAttente.length === 0 ? (
              <p className="p-6 text-sm font-semibold text-slate-500">Aucune demande à traiter.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {demandesEnAttente.map((demande) => (
                  <Link key={demande.id} href="/chef/demandes" className="block p-4 transition hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {demande.demandeur_nom || demande.demandeur_email || "Salarié"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {demande.titre || libelleTypeDemande(demande.type_demande)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                        En attente
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
