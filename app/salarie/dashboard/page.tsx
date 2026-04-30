"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type InterventionPlanning = {
  id: string;
  titre: string;
  client: string;
  adresse: string;
  type_intervention: string;
  salarie_assigne: string;
  date_intervention: string;
  heure_debut: string | null;
  heure_fin: string | null;
  statut: string;
  notes: string;
};

type DemandeSalarie = {
  id: string;
  nom_salarie: string;
  type_demande: string;
  titre: string;
  description: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: string;
  reponse_chef: string;
  created_at: string;
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardSalariePage() {
  const router = useRouter();

  const [nomEntreprise, setNomEntreprise] = useState("");
  const [nomSalarieConnecte, setNomSalarieConnecte] = useState("");

  const [interventions, setInterventions] = useState<InterventionPlanning[]>([]);
  const [demandes, setDemandes] = useState<DemandeSalarie[]>([]);

  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    chargerDashboardSalarie();
  }, []);

  async function chargerDashboardSalarie() {
    setChargement(true);
    setMessage("");

    const { contexte, erreur } = await chargerContexteEntreprise();

    if (erreur || !contexte) {
      setMessage(erreur || "Impossible de charger le contexte salarié.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion/salarie");
      }, 1200);

      return;
    }

    if (contexte.profil.role !== "salarie") {
      setMessage("Ce compte n'est pas un compte salarié.");
      setChargement(false);

      setTimeout(() => {
        router.push("/connexion/salarie");
      }, 1200);

      return;
    }

    const nomComplet = `${contexte.profil.prenom || ""} ${
      contexte.profil.nom || ""
    }`.trim();

    const nomFinal =
      nomComplet || contexte.profil.email || "Salarié non renseigné";

    setNomEntreprise(contexte.entreprise.nom_entreprise);
    setNomSalarieConnecte(nomFinal);

    await Promise.all([
      chargerPlanning(contexte.entreprise.id),
      chargerDemandes(contexte.entreprise.id, nomFinal),
    ]);

    setChargement(false);
  }

  async function chargerPlanning(idEntreprise: string) {
    const { data, error } = await supabase
      .from("planning_interventions")
      .select(
        "id, titre, client, adresse, type_intervention, salarie_assigne, date_intervention, heure_debut, heure_fin, statut, notes"
      )
      .eq("entreprise_id", idEntreprise)
      .order("date_intervention", { ascending: true })
      .order("heure_debut", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement du planning.");
    } else {
      setInterventions(data || []);
    }
  }

  async function chargerDemandes(idEntreprise: string, nomSalarie: string) {
    const { data, error } = await supabase
      .from("demandes_salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("nom_salarie", nomSalarie)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des demandes.");
    } else {
      setDemandes(data || []);
    }
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  function nomNormalise(texte: string) {
    return texte.toLowerCase().trim();
  }

  const interventionsDuSalarie = useMemo(() => {
    const nom = nomNormalise(nomSalarieConnecte);

    if (!nom) {
      return [];
    }

    return interventions.filter((intervention) =>
      nomNormalise(intervention.salarie_assigne || "").includes(nom)
    );
  }, [interventions, nomSalarieConnecte]);

  const planningAujourdhui = interventionsDuSalarie.filter(
    (intervention) => intervention.date_intervention === dateAujourdhui()
  );

  const prochainesInterventions = interventionsDuSalarie
    .filter((intervention) => intervention.date_intervention >= dateAujourdhui())
    .slice(0, 5);

  const demandesEnAttente = demandes.filter(
    (demande) => demande.statut === "En attente"
  );

  const demandesAcceptees = demandes.filter(
    (demande) => demande.statut === "Acceptée"
  );

  const demandesRefusees = demandes.filter(
    (demande) => demande.statut === "Refusée"
  );

  const dernieresDemandes = demandes.slice(0, 5);

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement du dashboard salarié...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard salarié
          </h1>

          <p className="mt-2 text-slate-600">
            Vue rapide de ton planning et de tes demandes.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}

          {nomSalarieConnecte && (
            <p className="mt-1 text-sm font-medium text-slate-500">
              Salarié connecté : {nomSalarieConnecte}
            </p>
          )}
        </div>

        {message && (
          <p className="mb-6 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {message}
          </p>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Interventions aujourd&apos;hui</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {planningAujourdhui.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Interventions à venir</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {prochainesInterventions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Demandes en attente</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesEnAttente.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Demandes acceptées</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesAcceptees.length}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Accès rapides
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <Link
              href="/salarie/planning"
              className="rounded-xl bg-slate-900 px-5 py-4 font-semibold text-white hover:bg-slate-700"
            >
              Voir mon planning
            </Link>

            <Link
              href="/salarie/demandes"
              className="rounded-xl bg-slate-100 px-5 py-4 font-semibold text-slate-800 hover:bg-slate-200"
            >
              Faire une demande
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Planning du jour
            </h2>

            {planningAujourdhui.length === 0 ? (
              <p className="text-slate-600">
                Aucune intervention prévue aujourd&apos;hui.
              </p>
            ) : (
              <div className="grid gap-4">
                {planningAujourdhui.map((intervention) => (
                  <div
                    key={intervention.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {intervention.titre}
                        </p>

                        <p className="text-sm text-slate-600">
                          {intervention.client || "Client non renseigné"} —{" "}
                          {intervention.type_intervention}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {intervention.statut}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Horaires :</span>{" "}
                      {intervention.heure_debut || "—"} à{" "}
                      {intervention.heure_fin || "—"}
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-medium">Adresse :</span>{" "}
                      {intervention.adresse || "Non renseignée"}
                    </p>

                    {intervention.notes && (
                      <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                        {intervention.notes}
                      </p>
                    )}
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
              <p className="text-slate-600">
                Aucune intervention à venir.
              </p>
            ) : (
              <div className="grid gap-4">
                {prochainesInterventions.map((intervention) => (
                  <div
                    key={intervention.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {intervention.titre}
                        </p>

                        <p className="text-sm text-slate-600">
                          {intervention.client || "Client non renseigné"} —{" "}
                          {intervention.type_intervention}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {intervention.statut}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Date :</span>{" "}
                      {afficherDate(intervention.date_intervention)}
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-medium">Horaires :</span>{" "}
                      {intervention.heure_debut || "—"} à{" "}
                      {intervention.heure_fin || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Mes dernières demandes
            </h2>

            {dernieresDemandes.length === 0 ? (
              <p className="text-slate-600">
                Tu n&apos;as encore envoyé aucune demande.
              </p>
            ) : (
              <div className="grid gap-4">
                {dernieresDemandes.map((demande) => (
                  <div
                    key={demande.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {demande.titre || "Demande sans titre"}
                        </p>

                        <p className="text-sm text-slate-600">
                          {demande.type_demande || "Autre"} —{" "}
                          {afficherDate(demande.date_debut)} à{" "}
                          {afficherDate(demande.date_fin)}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {demande.statut}
                      </span>
                    </div>

                    {demande.description && (
                      <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                        {demande.description}
                      </p>
                    )}

                    {demande.reponse_chef && (
                      <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                        Réponse chef : {demande.reponse_chef}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {demandesRefusees.length > 0 && (
              <p className="mt-4 text-sm text-slate-500">
                Demandes refusées : {demandesRefusees.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}