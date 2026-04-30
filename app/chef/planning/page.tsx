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

type Salarie = {
  id: string;
  nom: string;
  prenom: string;
  statut: string;
};

type ClientEntreprise = {
  id: string;
  type_client: string;
  nom: string;
  prenom: string;
  entreprise: string;
  adresse_facturation: string;
  adresse_chantier: string;
  statut: string;
};

type FormPlanning = {
  titre: string;
  client: string;
  adresse: string;
  type_intervention: string;
  salarie_assigne: string;
  date_intervention: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
  notes: string;
};

const formulaireVide: FormPlanning = {
  titre: "",
  client: "",
  adresse: "",
  type_intervention: "Entretien",
  salarie_assigne: "",
  date_intervention: "",
  heure_debut: "",
  heure_fin: "",
  statut: "Prévu",
  notes: "",
};

export default function PlanningChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [interventions, setInterventions] = useState<InterventionPlanning[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [clients, setClients] = useState<ClientEntreprise[]>([]);

  const [clientSelectionneId, setClientSelectionneId] = useState("");
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");

  const [form, setForm] = useState<FormPlanning>(formulaireVide);

  useEffect(() => {
    chargerContexteEtPlanning();
  }, []);

  async function chargerContexteEtPlanning() {
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

    setEntrepriseId(contexte.entreprise.id);
    setNomEntreprise(contexte.entreprise.nom_entreprise);

    await Promise.all([
      chargerPlanning(contexte.entreprise.id),
      chargerSalaries(contexte.entreprise.id),
      chargerClients(contexte.entreprise.id),
    ]);

    setChargement(false);
  }

  async function chargerSalaries(idEntreprise: string) {
    const { data, error } = await supabase
      .from("salaries")
      .select("id, nom, prenom, statut")
      .eq("entreprise_id", idEntreprise)
      .eq("statut", "Actif")
      .order("nom", { ascending: true })
      .order("prenom", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des salariés.");
    } else {
      setSalaries(data || []);
    }
  }

  async function chargerClients(idEntreprise: string) {
    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, type_client, nom, prenom, entreprise, adresse_facturation, adresse_chantier, statut"
      )
      .eq("entreprise_id", idEntreprise)
      .in("statut", ["Actif", "Prospect"])
      .order("entreprise", { ascending: true })
      .order("nom", { ascending: true })
      .order("prenom", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des clients.");
    } else {
      setClients(data || []);
    }
  }

  async function chargerPlanning(idEntreprise: string) {
    const { data, error } = await supabase
      .from("planning_interventions")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("date_intervention", { ascending: true })
      .order("heure_debut", { ascending: true });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement du planning.");
    } else {
      setInterventions(data || []);
    }
  }

  function modifierChamp(champ: keyof FormPlanning, valeur: string) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function nomAffichageClient(client: ClientEntreprise) {
    if (client.type_client === "Professionnel" && client.entreprise) {
      return client.entreprise;
    }

    const nomComplet = `${client.prenom || ""} ${client.nom || ""}`.trim();

    if (nomComplet) {
      return nomComplet;
    }

    return client.entreprise || "Client sans nom";
  }

  function choisirClient(id: string) {
    setClientSelectionneId(id);

    if (!id) {
      setForm((ancien) => ({
        ...ancien,
        client: "",
        adresse: "",
      }));
      return;
    }

    const clientTrouve = clients.find((client) => client.id === id);

    if (!clientTrouve) {
      return;
    }

    setForm((ancien) => ({
      ...ancien,
      client: nomAffichageClient(clientTrouve),
      adresse:
        clientTrouve.adresse_chantier ||
        clientTrouve.adresse_facturation ||
        ancien.adresse,
    }));
  }

  async function ajouterIntervention() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.titre.trim() || !form.date_intervention) {
      setMessage("Merci de remplir au minimum le titre et la date.");
      setSauvegarde(false);
      return;
    }

    const { error } = await supabase.from("planning_interventions").insert({
      entreprise_id: entrepriseId,
      titre: form.titre,
      client: form.client,
      adresse: form.adresse,
      type_intervention: form.type_intervention,
      salarie_assigne: form.salarie_assigne,
      date_intervention: form.date_intervention,
      heure_debut: form.heure_debut || null,
      heure_fin: form.heure_fin || null,
      statut: form.statut,
      notes: form.notes,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message || "Erreur : l'intervention n'a pas été ajoutée.");
    } else {
      setMessage("Intervention ajoutée au planning.");
      setForm(formulaireVide);
      setClientSelectionneId("");
      await chargerPlanning(entrepriseId);
    }

    setSauvegarde(false);
  }

  async function changerStatut(id: string, statut: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const { error } = await supabase
      .from("planning_interventions")
      .update({
        statut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors du changement de statut.");
    } else {
      setMessage("Statut mis à jour.");
      await chargerPlanning(entrepriseId);
    }
  }

  async function supprimerIntervention(id: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const confirmation = confirm("Supprimer cette intervention du planning ?");

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("planning_interventions")
      .delete()
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors de la suppression.");
    } else {
      setMessage("Intervention supprimée.");
      await chargerPlanning(entrepriseId);
    }
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  const interventionsFiltrees = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return interventions;
    }

    return interventions.filter((intervention) => {
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
  }, [interventions, recherche]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Planning chef
          </h1>

          <p className="mt-2 text-slate-600">
            Ajoute les interventions, affecte un salarié et suis l&apos;avancement.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Ajouter une intervention
          </h2>

          <div className="grid gap-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Titre de l&apos;intervention
              </label>

              <input
                value={form.titre}
                onChange={(e) => modifierChamp("titre", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Exemple : Taille de haie chez Mme Martin"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Client
                </label>

                <select
                  value={clientSelectionneId}
                  onChange={(e) => choisirClient(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">Client non sélectionné</option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {nomAffichageClient(client)}
                    </option>
                  ))}
                </select>

                {clients.length === 0 && (
                  <p className="mt-2 text-sm text-orange-700">
                    Aucun client actif trouvé. Ajoute d&apos;abord un client.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Salarié assigné
                </label>

                <select
                  value={form.salarie_assigne}
                  onChange={(e) =>
                    modifierChamp("salarie_assigne", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">Non assigné</option>

                  {salaries.map((salarie) => (
                    <option
                      key={salarie.id}
                      value={`${salarie.prenom} ${salarie.nom}`.trim()}
                    >
                      {salarie.prenom} {salarie.nom}
                    </option>
                  ))}
                </select>

                {salaries.length === 0 && (
                  <p className="mt-2 text-sm text-orange-700">
                    Aucun salarié actif trouvé. Ajoute d&apos;abord un salarié.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Adresse du chantier
              </label>

              <input
                value={form.adresse}
                onChange={(e) => modifierChamp("adresse", e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Adresse complète"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Type
                </label>

                <select
                  value={form.type_intervention}
                  onChange={(e) =>
                    modifierChamp("type_intervention", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>Entretien</option>
                  <option>Tonte</option>
                  <option>Taille</option>
                  <option>Élagage</option>
                  <option>Création</option>
                  <option>Clôture</option>
                  <option>Plantation</option>
                  <option>Nettoyage</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date
                </label>

                <input
                  type="date"
                  value={form.date_intervention}
                  onChange={(e) =>
                    modifierChamp("date_intervention", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Heure début
                </label>

                <input
                  type="time"
                  value={form.heure_debut}
                  onChange={(e) => modifierChamp("heure_debut", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Heure fin
                </label>

                <input
                  type="time"
                  value={form.heure_fin}
                  onChange={(e) => modifierChamp("heure_fin", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Notes internes
              </label>

              <textarea
                value={form.notes}
                onChange={(e) => modifierChamp("notes", e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Matériel à prévoir, consignes, accès chantier..."
              />
            </div>

            <button
              onClick={ajouterIntervention}
              disabled={sauvegarde}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sauvegarde ? "Ajout en cours..." : "Ajouter au planning"}
            </button>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher une intervention
          </label>

          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par client, salarié, date, statut, adresse..."
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Planning des interventions
          </h2>

          {chargement ? (
            <p className="text-slate-600">Chargement...</p>
          ) : interventionsFiltrees.length === 0 ? (
            <p className="text-slate-600">Aucune intervention planifiée.</p>
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
                        Salarié :{" "}
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

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => changerStatut(intervention.id, "Prévu")}
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      Prévu
                    </button>

                    <button
                      onClick={() =>
                        changerStatut(intervention.id, "En cours")
                      }
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      En cours
                    </button>

                    <button
                      onClick={() => changerStatut(intervention.id, "Terminé")}
                      className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                      Terminé
                    </button>

                    <button
                      onClick={() => changerStatut(intervention.id, "Annulé")}
                      className="rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      Annulé
                    </button>

                    <button
                      onClick={() => supprimerIntervention(intervention.id)}
                      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}