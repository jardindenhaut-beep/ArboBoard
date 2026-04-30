"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type DemandeSalarie = {
  id: string;
  entreprise_id: string | null;
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

export default function DemandesChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [demandes, setDemandes] = useState<DemandeSalarie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");
  const [reponseParDemande, setReponseParDemande] = useState<Record<string, string>>({});

  useEffect(() => {
    chargerContexteEtDemandes();
  }, []);

  async function chargerContexteEtDemandes() {
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

    await chargerDemandes(contexte.entreprise.id);

    setChargement(false);
  }

  async function chargerDemandes(idEntreprise: string) {
    const { data, error } = await supabase
      .from("demandes_salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des demandes.");
    } else {
      setDemandes(data || []);

      const reponses: Record<string, string> = {};

      (data || []).forEach((demande) => {
        reponses[demande.id] = demande.reponse_chef || "";
      });

      setReponseParDemande(reponses);
    }
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  function afficherDateCreation(date: string) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString("fr-FR");
  }

  function changerReponse(id: string, valeur: string) {
    setReponseParDemande((ancien) => ({
      ...ancien,
      [id]: valeur,
    }));
  }

  async function changerStatut(id: string, statut: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const { error } = await supabase
      .from("demandes_salaries")
      .update({
        statut,
        reponse_chef: reponseParDemande[id] || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors de la mise à jour.");
    } else {
      setMessage("Demande mise à jour.");
      await chargerDemandes(entrepriseId);
    }
  }

  async function supprimerDemande(id: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const confirmation = confirm("Supprimer cette demande ?");

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("demandes_salaries")
      .delete()
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors de la suppression.");
    } else {
      setMessage("Demande supprimée.");
      await chargerDemandes(entrepriseId);
    }
  }

  const demandesFiltrees = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return demandes;
    }

    return demandes.filter((demande) => {
      const contenu = `
        ${demande.nom_salarie}
        ${demande.type_demande}
        ${demande.titre}
        ${demande.description}
        ${demande.statut}
        ${demande.reponse_chef}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [demandes, recherche]);

  const demandesEnAttente = demandes.filter(
    (demande) => demande.statut === "En attente"
  ).length;

  const demandesAcceptees = demandes.filter(
    (demande) => demande.statut === "Acceptée"
  ).length;

  const demandesRefusees = demandes.filter(
    (demande) => demande.statut === "Refusée"
  ).length;

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-slate-700">Chargement des demandes...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Demandes salariés
          </h1>

          <p className="mt-2 text-slate-600">
            Consulte, accepte ou refuse les demandes envoyées par les salariés.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total demandes</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandes.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">En attente</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesEnAttente}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Acceptées</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesAcceptees}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Refusées</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {demandesRefusees}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher une demande
          </label>

          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par salarié, type, statut, titre..."
          />

          {message && (
            <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Liste des demandes
          </h2>

          {demandesFiltrees.length === 0 ? (
            <p className="text-slate-600">Aucune demande trouvée.</p>
          ) : (
            <div className="grid gap-4">
              {demandesFiltrees.map((demande) => (
                <div
                  key={demande.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {demande.titre || "Demande sans titre"}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {demande.nom_salarie || "Salarié non renseigné"} —{" "}
                        {demande.type_demande || "Autre"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Créée le : {afficherDateCreation(demande.created_at)}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {demande.statut}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-medium">Date début :</span>{" "}
                      {afficherDate(demande.date_debut)}
                    </p>

                    <p>
                      <span className="font-medium">Date fin :</span>{" "}
                      {afficherDate(demande.date_fin)}
                    </p>
                  </div>

                  {demande.description && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {demande.description}
                    </p>
                  )}

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Réponse chef
                    </label>

                    <textarea
                      value={reponseParDemande[demande.id] || ""}
                      onChange={(e) =>
                        changerReponse(demande.id, e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                      placeholder="Exemple : Demande acceptée, merci de prévoir l'organisation du chantier..."
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => changerStatut(demande.id, "En attente")}
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      En attente
                    </button>

                    <button
                      onClick={() => changerStatut(demande.id, "Acceptée")}
                      className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                      Accepter
                    </button>

                    <button
                      onClick={() => changerStatut(demande.id, "Refusée")}
                      className="rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      Refuser
                    </button>

                    <button
                      onClick={() => changerStatut(demande.id, "Traitée")}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      Traitée
                    </button>

                    <button
                      onClick={() => supprimerDemande(demande.id)}
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