"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  created_at?: string | null;
};

type FicheIntervention = {
  id: string;
  client_nom?: string | null;
  salarie_nom?: string | null;
  titre?: string | null;
  type_intervention?: string | null;
  statut?: string | null;
  date_intervention?: string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;
  ville?: string | null;
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

function aujourdHuiISO() {
  return new Date().toISOString().slice(0, 10);
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
    }).format(new Date(`${date}T00:00:00`));
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
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    statut === "envoye" ||
    statut === "envoyee" ||
    statut === "planifiee" ||
    statut === "traitee"
  ) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (
    statut === "refuse" ||
    statut === "refusee" ||
    statut === "en_retard" ||
    statut === "annulee" ||
    statut === "annule"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (statut === "en_cours" || statut === "en_attente") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function trierParCreationDesc<T extends { created_at?: string | null }>(
  elements: T[]
) {
  return [...elements].sort((a, b) => {
    const dateA = a.created_at || "";
    const dateB = b.created_at || "";
    return dateB.localeCompare(dateA);
  });
}

export default function DashboardChefPage() {
  const [nomEntreprise, setNomEntreprise] = useState("Votre entreprise");

  const [clients, setClients] = useState<Client[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);

  const [chargement, setChargement] = useState(true);
  const [messageErreur, setMessageErreur] = useState("");

  useEffect(() => {
    initialiserDashboard();
  }, []);

  async function initialiserDashboard() {
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

      const entreprise = resultat.contexte.entreprise;
      const idEntreprise = entreprise.id;

      setNomEntreprise(
        entreprise.nom_entreprise ||
          entreprise.slug ||
          entreprise.email_contact ||
          "Votre entreprise"
      );

      await Promise.all([
        chargerClients(idEntreprise),
        chargerSalaries(idEntreprise),
        chargerDevis(idEntreprise),
        chargerFactures(idEntreprise),
        chargerFiches(idEntreprise),
        chargerDemandes(idEntreprise),
      ]);
    } catch (error) {
      console.error("Erreur dashboard chef :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerClients(idEntreprise: string) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur clients dashboard :", error);
      setClients([]);
      return;
    }

    setClients((data || []) as Client[]);
  }

  async function chargerSalaries(idEntreprise: string) {
    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur salariés dashboard :", error);
      setSalaries([]);
      return;
    }

    setSalaries((data || []) as Salarie[]);
  }

  async function chargerDevis(idEntreprise: string) {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur devis dashboard :", error);
      setDevis([]);
      return;
    }

    setDevis((data || []) as Devis[]);
  }

  async function chargerFactures(idEntreprise: string) {
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur factures dashboard :", error);
      setFactures([]);
      return;
    }

    setFactures((data || []) as Facture[]);
  }

  async function chargerFiches(idEntreprise: string) {
    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("date_intervention", { ascending: true })
      .order("heure_debut", { ascending: true });

    if (error) {
      console.error("Erreur fiches dashboard :", error);
      setFiches([]);
      return;
    }

    setFiches((data || []) as FicheIntervention[]);
  }

  async function chargerDemandes(idEntreprise: string) {
    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur demandes dashboard :", error);
      setDemandes([]);
      return;
    }

    setDemandes((data || []) as Demande[]);
  }

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

    const devisAcceptes = devis.filter((item) => item.statut === "accepte");
    const devisEnvoyes = devis.filter((item) => item.statut === "envoye");

    const caDevisAccepte = devisAcceptes.reduce(
      (total, item) => total + Number(item.total_ttc || 0),
      0
    );

    const facturesPayees = factures.filter(
      (item) => item.statut === "payee"
    );

    const caFacturePaye = facturesPayees.reduce(
      (total, item) => total + Number(item.total_ttc || 0),
      0
    );

    const resteAPayer = factures
      .filter(
        (item) =>
          item.statut !== "payee" &&
          item.statut !== "annulee" &&
          item.statut !== "archive"
      )
      .reduce((total, item) => {
        const reste = Number(item.reste_a_payer || 0);
        const totalTtc = Number(item.total_ttc || 0);
        return total + (reste > 0 ? reste : totalTtc);
      }, 0);

    const aujourdHui = aujourdHuiISO();

    const interventionsAujourdhui = fiches.filter(
      (fiche) =>
        fiche.date_intervention === aujourdHui &&
        fiche.statut !== "archivee" &&
        fiche.statut !== "annulee"
    );

    const interventionsEnCours = fiches.filter(
      (fiche) => fiche.statut === "en_cours"
    );

    const demandesEnAttente = demandes.filter(
      (demande) => demande.statut === "en_attente"
    );

    const tauxTransformation =
      devis.length > 0
        ? Math.round((devisAcceptes.length / devis.length) * 100)
        : 0;

    return {
      clientsActifs: clientsActifs.length,
      salariesActifs: salariesActifs.length,
      devisTotal: devis.length,
      devisEnvoyes: devisEnvoyes.length,
      devisAcceptes: devisAcceptes.length,
      caDevisAccepte,
      facturesTotal: factures.length,
      facturesPayees: facturesPayees.length,
      caFacturePaye,
      resteAPayer,
      interventionsAujourdhui: interventionsAujourdhui.length,
      interventionsEnCours: interventionsEnCours.length,
      demandesEnAttente: demandesEnAttente.length,
      tauxTransformation,
    };
  }, [clients, salaries, devis, factures, fiches, demandes]);

  const prochainesInterventions = useMemo(() => {
    const aujourdHui = aujourdHuiISO();

    return fiches
      .filter(
        (fiche) =>
          fiche.statut !== "archivee" &&
          fiche.statut !== "annulee" &&
          fiche.date_intervention &&
          fiche.date_intervention >= aujourdHui
      )
      .sort((a, b) => {
        const dateA = `${a.date_intervention || "9999-12-31"} ${
          a.heure_debut || "99:99"
        }`;
        const dateB = `${b.date_intervention || "9999-12-31"} ${
          b.heure_debut || "99:99"
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
        (item) => item.statut === "brouillon" || item.statut === "envoye"
      )
    ).slice(0, 5);
  }, [devis]);

  const facturesAEncaisser = useMemo(() => {
    return factures
      .filter(
        (item) =>
          item.statut !== "payee" &&
          item.statut !== "annulee" &&
          item.statut !== "archive"
      )
      .sort((a, b) => {
        const dateA = a.date_echeance || "9999-12-31";
        const dateB = b.date_echeance || "9999-12-31";
        return dateA.localeCompare(dateB);
      })
      .slice(0, 5);
  }, [factures]);

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
            🌿
          </div>
          <p className="text-lg font-bold text-slate-950">
            Chargement du dashboard...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Récupération des données Arboboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Arboboard</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Tableau de bord
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Vue d’ensemble de {nomEntreprise} : activité commerciale,
              facturation, planning et demandes salariés.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/chef/devis"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Créer un devis
            </Link>

            <Link
              href="/chef/interventions"
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Créer une fiche
            </Link>
          </div>
        </div>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Clients actifs
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.clientsActifs}
          </p>
          <Link
            href="/chef/clients"
            className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Voir les clients →
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Salariés actifs
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.salariesActifs}
          </p>
          <Link
            href="/chef/salaries"
            className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Voir les salariés →
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Interventions aujourd’hui
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.interventionsAujourdhui}
          </p>
          <Link
            href="/chef/planning"
            className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Voir le planning →
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Demandes en attente
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {statistiques.demandesEnAttente}
          </p>
          <Link
            href="/chef/demandes"
            className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Traiter les demandes →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Devis acceptés TTC
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {formatMontant(statistiques.caDevisAccepte)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {statistiques.devisAcceptes} accepté(s) sur{" "}
            {statistiques.devisTotal} devis — taux de transformation{" "}
            {statistiques.tauxTransformation} %.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Factures payées TTC
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {formatMontant(statistiques.caFacturePaye)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {statistiques.facturesPayees} facture(s) payée(s) sur{" "}
            {statistiques.facturesTotal}.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Reste à encaisser
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {formatMontant(statistiques.resteAPayer)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Montant restant sur les factures non payées.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">
                Prochaines interventions
              </h2>
              <p className="text-sm text-slate-500">
                Les 5 prochaines fiches planifiées.
              </p>
            </div>

            <Link
              href="/chef/planning"
              className="text-sm font-semibold text-emerald-700"
            >
              Voir tout
            </Link>
          </div>

          {prochainesInterventions.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Aucune intervention à venir.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {prochainesInterventions.map((fiche) => (
                <div key={fiche.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {fiche.titre || "Intervention sans titre"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {fiche.client_nom || "Client non renseigné"} —{" "}
                        {fiche.ville || "ville non renseignée"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(fiche.date_intervention)} ·{" "}
                        {formatHeure(fiche.heure_debut)} →{" "}
                        {formatHeure(fiche.heure_fin)} ·{" "}
                        {fiche.salarie_nom || "Non affecté"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                        fiche.statut
                      )}`}
                    >
                      {libelleStatutFiche(fiche.statut)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">Demandes à traiter</h2>
              <p className="text-sm text-slate-500">
                Demandes salariés en attente.
              </p>
            </div>

            <Link
              href="/chef/demandes"
              className="text-sm font-semibold text-emerald-700"
            >
              Voir tout
            </Link>
          </div>

          {demandesEnAttente.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Aucune demande en attente.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {demandesEnAttente.map((demande) => (
                <div key={demande.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {demande.titre || "Demande sans titre"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {demande.demandeur_nom || "Salarié"} —{" "}
                        {libelleTypeDemande(demande.type_demande)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                        demande.statut
                      )}`}
                    >
                      En attente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">Devis à suivre</h2>
              <p className="text-sm text-slate-500">
                Brouillons et devis envoyés.
              </p>
            </div>

            <Link
              href="/chef/devis"
              className="text-sm font-semibold text-emerald-700"
            >
              Voir tout
            </Link>
          </div>

          {devisASuivre.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Aucun devis à suivre.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
             {devisASuivre.map((item) => (
                <div key={item.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.numero || "Sans numéro"} —{" "}
                        {formatMontant(item.total_ttc)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.client_nom || "Client non renseigné"} ·{" "}
                        {item.objet || "Sans objet"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                        item.statut
                      )}`}
                    >
                      {libelleStatutDevis(item.statut)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold text-slate-950">Factures à encaisser</h2>
              <p className="text-sm text-slate-500">
                Factures non payées ou en retard.
              </p>
            </div>

            <Link
              href="/chef/factures"
              className="text-sm font-semibold text-emerald-700"
            >
              Voir tout
            </Link>
          </div>

          {facturesAEncaisser.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              Aucune facture à encaisser.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {facturesAEncaisser.map((item) => (
                <div key={item.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.numero || "Sans numéro"} —{" "}
                        {formatMontant(item.reste_a_payer || item.total_ttc)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.client_nom || "Client non renseigné"} · Échéance :{" "}
                        {formatDate(item.date_echeance)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                        item.statut
                      )}`}
                    >
                      {libelleStatutFacture(item.statut)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/chef/clients"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-2xl">👥</p>
          <p className="mt-3 font-bold text-slate-950">Clients</p>
          <p className="mt-1 text-sm text-slate-500">
            Ajouter et gérer les clients.
          </p>
        </Link>

        <Link
          href="/chef/devis"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-2xl">📝</p>
          <p className="mt-3 font-bold text-slate-950">Devis</p>
          <p className="mt-1 text-sm text-slate-500">
            Créer et suivre les devis.
          </p>
        </Link>

        <Link
          href="/chef/factures"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-2xl">🧾</p>
          <p className="mt-3 font-bold text-slate-950">Factures</p>
          <p className="mt-1 text-sm text-slate-500">
            Suivre les paiements.
          </p>
        </Link>

        <Link
          href="/chef/interventions"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <p className="text-2xl">📋</p>
          <p className="mt-3 font-bold text-slate-950">Fiches intervention</p>
          <p className="mt-1 text-sm text-slate-500">
            Préparer le terrain.
          </p>
        </Link>
      </section>
    </div>
  );
}