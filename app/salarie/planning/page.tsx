"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type InterventionPlanning = {
  id: string;
  entreprise_id: string | null;
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
  created_at: string;
};

function dateAujourdhui() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlanningSalariePage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [nomSalarieConnecte, setNomSalarieConnecte] = useState("");

  const [interventions, setInterventions] = useState<InterventionPlanning[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    chargerContexteEtPlanning();
  }, []);

  async function chargerContexteEtPlanning() {
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

    setEntrepriseId(contexte.entreprise.id);
    setNomEntreprise(contexte.entreprise.nom_entreprise);
    setNomSalarieConnecte(nomFinal);

    await chargerPlanning(contexte.entreprise.id);

    setChargement(false);
  }

  async function chargerPlanning(idEntreprise: string) {
    const { data, error } = await supabase
      .from("planning_interventions")
      .select(
        "id, entreprise_id, titre, client, adresse, type_intervention, salarie_assigne, date_intervention, heure_debut, heure_fin, statut, notes, created_at"
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

  const interventionsFiltrees = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return interventionsDuSalarie;
    }

    return interventionsDuSalarie.filter((intervention) => {
      const contenu = `
        ${intervention.titre}
        ${intervention.client}
        ${intervention.adresse}
        ${intervention.type_intervention}
        ${intervention.salarie_assigne}
        ${intervention.date_intervention}
        ${intervention.statut}
        ${intervention.notes}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [interventionsDuSalarie, recherche]);

  const planningAujourdhui = interventionsDuSalarie.filter(
    (intervention) => intervention.date_intervention === dateAujourdhui()
  );

  const prochainesInterventions = interventionsDuSalarie.filter(
    (intervention) => intervention.date_intervention >= dateAujourdhui()
  );

  const interventionsTerminees = interventionsDuSalarie.filter(
    (intervention) => intervention.statut === "Terminé"
  ).length;

  const interventionsEnCours = interventionsDuSalarie.filter(
    (intervention) => intervention.statut === "En cours"
  ).length;

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement du planning salarié...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Mon planning
          </h1>

          <p className="mt-2 text-slate-600">
            Consulte les interventions qui te sont assignées.
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
            <p className="text-sm text-slate-500">Aujourd&apos;hui</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {planningAujourdhui.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">À venir</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {prochainesInterventions.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">En cours</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {interventionsEnCours}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Terminées</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {interventionsTerminees}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher dans mon planning
          </label>

          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par client, adresse, type, date, statut..."
          />
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
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
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {intervention.titre}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {intervention.client || "Client non renseigné"} —{" "}
                        {intervention.type_intervention}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {intervention.statut}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-medium">Horaires :</span>{" "}
                      {intervention.heure_debut || "—"} à{" "}
                      {intervention.heure_fin || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Date :</span>{" "}
                      {afficherDate(intervention.date_intervention)}
                    </p>

                    <p className="md:col-span-2">
                      <span className="font-medium">Adresse :</span>{" "}
                      {intervention.adresse || "Non renseignée"}
                    </p>
                  </div>

                  {intervention.notes && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
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
            Toutes mes interventions
          </h2>

          {interventionsFiltrees.length === 0 ? (
            <p className="text-slate-600">
              Aucune intervention trouvée pour ton compte salarié.
            </p>
          ) : (
            <div className="grid gap-4">
              {interventionsFiltrees.map((intervention) => (
                <div
                  key={intervention.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {intervention.titre}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {intervention.client || "Client non renseigné"} —{" "}
                        {intervention.type_intervention}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Assigné à :{" "}
                        {intervention.salarie_assigne || "Non assigné"}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {intervention.statut}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-medium">Date :</span>{" "}
                      {afficherDate(intervention.date_intervention)}
                    </p>

                    <p>
                      <span className="font-medium">Horaires :</span>{" "}
                      {intervention.heure_debut || "—"} à{" "}
                      {intervention.heure_fin || "—"}
                    </p>

                    <p className="md:col-span-2">
                      <span className="font-medium">Adresse :</span>{" "}
                      {intervention.adresse || "Non renseignée"}
                    </p>
                  </div>

                  {intervention.notes && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {intervention.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}