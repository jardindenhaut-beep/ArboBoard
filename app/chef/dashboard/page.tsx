"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type Client = {
  id: string;
  statut: string;
};

type Salarie = {
  id: string;
  statut: string;
};

type Demande = {
  id: string;
  nom_salarie: string;
  type_demande: string;
  titre: string;
  statut: string;
  created_at: string;
};

type Chantier = {
  id: string;
  titre: string;
  client_nom: string;
  statut: string;
  avancement: number;
  date_debut_prevue: string | null;
  date_fin_prevue: string | null;
};

type PlanningIntervention = {
  id: string;
  titre: string;
  client: string;
  salarie_assigne: string;
  date_intervention: string;
  heure_debut: string | null;
  heure_fin: string | null;
  statut: string;
};

type Devis = {
  id: string;
  numero: string;
  client_nom: string;
  objet: string;
  statut: string;
  total_ttc: number;
  date_devis: string | null;
};

type Facture = {
  id: string;
  numero: string;
  client_nom: string;
  objet: string;
  statut: string;
  total_ttc: number;
  date_facture: string | null;
  echeance_jours: number;
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [planning, setPlanning] = useState<PlanningIntervention[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);

  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    chargerDashboard();
  }, []);

  async function chargerDashboard() {
    setChargement(true);
    setMessage("");

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(erreur || "Impossible de charger le contexte entreprise.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion");
      }, 1200);

      return;
    }

    const idEntreprise = contexte.entreprise.id;

    setEntrepriseId(idEntreprise);
    setNomEntreprise(contexte.entreprise.nom_entreprise);

    const [
      clientsResult,
      salariesResult,
      demandesResult,
      chantiersResult,
      planningResult,
      devisResult,
      facturesResult,
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("id, statut")
        .eq("entreprise_id", idEntreprise),

      supabase
        .from("salaries")
        .select("id, statut")
        .eq("entreprise_id", idEntreprise),

      supabase
        .from("demandes_salaries")
        .select("id, nom_salarie, type_demande, titre, statut, created_at")
        .eq("entreprise_id", idEntreprise)
        .order("created_at", { ascending: false }),

      supabase
        .from("chantiers")
        .select(
          "id, titre, client_nom, statut, avancement, date_debut_prevue, date_fin_prevue"
        )
        .eq("entreprise_id", idEntreprise)
        .order("created_at", { ascending: false }),

      supabase
        .from("planning_interventions")
        .select(
          "id, titre, client, salarie_assigne, date_intervention, heure_debut, heure_fin, statut"
        )
        .eq("entreprise_id", idEntreprise)
        .order("date_intervention", { ascending: true })
        .order("heure_debut", { ascending: true }),

      supabase
        .from("devis")
        .select("id, numero, client_nom, objet, statut, total_ttc, date_devis")
        .eq("entreprise_id", idEntreprise)
        .order("created_at", { ascending: false }),

      supabase
        .from("factures")
        .select(
          "id, numero, client_nom, objet, statut, total_ttc, date_facture, echeance_jours"
        )
        .eq("entreprise_id", idEntreprise)
        .order("created_at", { ascending: false }),
    ]);

    if (clientsResult.error) {
      setMessage(clientsResult.error.message);
    }

    if (salariesResult.error) {
      setMessage(salariesResult.error.message);
    }

    if (demandesResult.error) {
      setMessage(demandesResult.error.message);
    }

    if (chantiersResult.error) {
      setMessage(chantiersResult.error.message);
    }

    if (planningResult.error) {
      setMessage(planningResult.error.message);
    }

    if (devisResult.error) {
      setMessage(devisResult.error.message);
    }

    if (facturesResult.error) {
      setMessage(facturesResult.error.message);
    }

    setClients(clientsResult.data || []);
    setSalaries(salariesResult.data || []);
    setDemandes(demandesResult.data || []);
    setChantiers(chantiersResult.data || []);
    setPlanning(planningResult.data || []);
    setDevis(devisResult.data || []);
    setFactures(facturesResult.data || []);

    setChargement(false);
  }

  function formatPrix(nombre: number) {
    return Number(nombre || 0).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  function calculerDateEcheance(dateFacture: string | null, jours: number) {
    if (!dateFacture) {
      return "—";
    }

    const date = new Date(dateFacture + "T00:00:00");
    date.setDate(date.getDate() + Number(jours || 30));

    return date.toLocaleDateString("fr-FR");
  }

  const stats = useMemo(() => {
    const clientsActifs = clients.filter(
      (client) => client.statut === "Actif" || client.statut === "Prospect"
    ).length;

    const salariesActifs = salaries.filter(
      (salarie) => salarie.statut === "Actif"
    ).length;

    const demandesEnAttente = demandes.filter(
      (demande) => demande.statut === "En attente"
    ).length;

    const chantiersEnCours = chantiers.filter(
      (chantier) =>
        chantier.statut === "En cours" ||
        chantier.statut === "Planifié" ||
        chantier.statut === "À planifier"
    ).length;

    const interventionsAujourdhui = planning.filter(
      (intervention) => intervention.date_intervention === dateAujourdhui()
    ).length;

    const devisASuivre = devis.filter(
      (devisItem) =>
        devisItem.statut === "Brouillon" || devisItem.statut === "Envoyé"
    ).length;

    const facturesImpayees = factures.filter(
      (facture) =>
        facture.statut !== "Payée" &&
        facture.statut !== "Annulée" &&
        facture.statut !== "Brouillon"
    ).length;

    const totalFactureTtc = factures
      .filter((facture) => facture.statut !== "Annulée")
      .reduce((total, facture) => total + Number(facture.total_ttc || 0), 0);

    const totalPayeTtc = factures
      .filter((facture) => facture.statut === "Payée")
      .reduce((total, facture) => total + Number(facture.total_ttc || 0), 0);

    const totalImpayesTtc = factures
      .filter(
        (facture) =>
          facture.statut !== "Payée" &&
          facture.statut !== "Annulée" &&
          facture.statut !== "Brouillon"
      )
      .reduce((total, facture) => total + Number(facture.total_ttc || 0), 0);

    return {
      clientsActifs,
      salariesActifs,
      demandesEnAttente,
      chantiersEnCours,
      interventionsAujourdhui,
      devisASuivre,
      facturesImpayees,
      totalFactureTtc,
      totalPayeTtc,
      totalImpayesTtc,
    };
  }, [clients, salaries, demandes, chantiers, planning, devis, factures]);

  const planningAujourdhui = planning.filter(
    (intervention) => intervention.date_intervention === dateAujourdhui()
  );

  const prochainesInterventions = planning
    .filter((intervention) => intervention.date_intervention >= dateAujourdhui())
    .slice(0, 5);

  const demandesRecentes = demandes
    .filter((demande) => demande.statut === "En attente")
    .slice(0, 5);

  const chantiersPrioritaires = chantiers
    .filter(
      (chantier) =>
        chantier.statut === "À planifier" ||
        chantier.statut === "Planifié" ||
        chantier.statut === "En cours"
    )
    .slice(0, 5);

  const devisASuivre = devis
    .filter(
      (devisItem) =>
        devisItem.statut === "Brouillon" || devisItem.statut === "Envoyé"
    )
    .slice(0, 5);

  const facturesASuivre = factures
    .filter(
      (facture) =>
        facture.statut !== "Payée" &&
        facture.statut !== "Annulée" &&
        facture.statut !== "Brouillon"
    )
    .slice(0, 5);

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement du tableau de bord...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Tableau de bord chef
            </h1>

            <p className="mt-2 text-slate-600">
              Vue d&apos;ensemble de l&apos;activité : clients, salariés, planning, devis, factures et chantiers.
            </p>

            {nomEntreprise && (
              <p className="mt-2 text-sm font-medium text-slate-500">
                Entreprise connectée : {nomEntreprise}
              </p>
            )}

            {entrepriseId && (
              <p className="mt-1 text-xs text-slate-400">
                Mode SaaS actif
              </p>
            )}
          </div>

          <button
            onClick={chargerDashboard}
            className="w-fit rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Actualiser
          </button>
        </div>

        {message && (
          <p className="mb-6 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {message}
          </p>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Clients actifs / prospects</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.clientsActifs}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Salariés actifs</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.salariesActifs}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Demandes en attente</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.demandesEnAttente}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Interventions aujourd&apos;hui</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.interventionsAujourdhui}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Chantiers à suivre</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.chantiersEnCours}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Devis à suivre</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.devisASuivre}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Factures impayées</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.facturesImpayees}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm text-slate-300">Impayés TTC</p>
            <p className="mt-2 text-3xl font-bold">
              {formatPrix(stats.totalImpayesTtc)}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total facturé TTC</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatPrix(stats.totalFactureTtc)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total payé TTC</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatPrix(stats.totalPayeTtc)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total impayé TTC</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatPrix(stats.totalImpayesTtc)}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Accès rapides
          </h2>

          <div className="grid gap-3 md:grid-cols-4">
            <Link href="/chef/clients" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Clients
            </Link>

            <Link href="/chef/salaries" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Salariés
            </Link>

            <Link href="/chef/planning" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Planning
            </Link>

            <Link href="/chef/demandes" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Demandes
            </Link>

            <Link href="/chef/chantiers" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Chantiers
            </Link>

            <Link href="/chef/devis" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Devis
            </Link>

            <Link href="/chef/factures" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Factures
            </Link>

            <Link href="/chef/parametres" className="rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-200">
              Paramètres
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Planning du jour
            </h2>

            {planningAujourdhui.length === 0 ? (
              <p className="text-slate-600">Aucune intervention aujourd&apos;hui.</p>
            ) : (
              <div className="grid gap-4">
                {planningAujourdhui.map((intervention) => (
                  <div key={intervention.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">
                      {intervention.titre}
                    </p>

                    <p className="text-sm text-slate-600">
                      {intervention.client || "Client non renseigné"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {intervention.heure_debut || "—"} à{" "}
                      {intervention.heure_fin || "—"} —{" "}
                      {intervention.salarie_assigne || "Non assigné"}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {intervention.statut}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Prochaines interventions
            </h2>

            {prochainesInterventions.length === 0 ? (
              <p className="text-slate-600">Aucune intervention à venir.</p>
            ) : (
              <div className="grid gap-4">
                {prochainesInterventions.map((intervention) => (
                  <div key={intervention.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">
                      {intervention.titre}
                    </p>

                    <p className="text-sm text-slate-600">
                      {intervention.client || "Client non renseigné"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {afficherDate(intervention.date_intervention)} —{" "}
                      {intervention.heure_debut || "—"} à{" "}
                      {intervention.heure_fin || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Demandes salariés en attente
            </h2>

            {demandesRecentes.length === 0 ? (
              <p className="text-slate-600">Aucune demande en attente.</p>
            ) : (
              <div className="grid gap-4">
                {demandesRecentes.map((demande) => (
                  <div key={demande.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">
                      {demande.titre}
                    </p>

                    <p className="text-sm text-slate-600">
                      {demande.nom_salarie} — {demande.type_demande}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-700">
                      {demande.statut}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Chantiers à suivre
            </h2>

            {chantiersPrioritaires.length === 0 ? (
              <p className="text-slate-600">Aucun chantier prioritaire.</p>
            ) : (
              <div className="grid gap-4">
                {chantiersPrioritaires.map((chantier) => (
                  <div key={chantier.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {chantier.titre}
                        </p>

                        <p className="text-sm text-slate-600">
                          {chantier.client_nom || "Client non renseigné"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {chantier.statut}
                        </p>
                      </div>

                      <p className="text-sm font-semibold text-slate-900">
                        {Number(chantier.avancement || 0)}%
                      </p>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-slate-900"
                        style={{
                          width: `${Math.min(
                            Math.max(Number(chantier.avancement) || 0, 0),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Devis à suivre
            </h2>

            {devisASuivre.length === 0 ? (
              <p className="text-slate-600">Aucun devis à suivre.</p>
            ) : (
              <div className="grid gap-4">
                {devisASuivre.map((devisItem) => (
                  <div key={devisItem.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">
                      {devisItem.numero}
                    </p>

                    <p className="text-sm text-slate-600">
                      {devisItem.client_nom || "Client non renseigné"} —{" "}
                      {devisItem.objet}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {devisItem.statut} —{" "}
                      {formatPrix(Number(devisItem.total_ttc) || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Factures à suivre
            </h2>

            {facturesASuivre.length === 0 ? (
              <p className="text-slate-600">Aucune facture impayée à suivre.</p>
            ) : (
              <div className="grid gap-4">
                {facturesASuivre.map((facture) => (
                  <div key={facture.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">
                      {facture.numero}
                    </p>

                    <p className="text-sm text-slate-600">
                      {facture.client_nom || "Client non renseigné"} —{" "}
                      {facture.objet}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {facture.statut} — échéance{" "}
                      {calculerDateEcheance(
                        facture.date_facture,
                        facture.echeance_jours
                      )}{" "}
                      — {formatPrix(Number(facture.total_ttc) || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}