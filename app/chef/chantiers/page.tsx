"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

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

type Chantier = {
  id: string;
  entreprise_id: string | null;
  client_id: string | null;
  client_nom: string;
  titre: string;
  description: string;
  adresse_chantier: string;
  statut: string;
  date_debut_prevue: string | null;
  date_fin_prevue: string | null;
  avancement: number;
  notes: string;
  created_at: string;
};

type FormChantier = {
  client_id: string;
  client_nom: string;
  titre: string;
  description: string;
  adresse_chantier: string;
  statut: string;
  date_debut_prevue: string;
  date_fin_prevue: string;
  avancement: string;
  notes: string;
};

const formulaireVide: FormChantier = {
  client_id: "",
  client_nom: "",
  titre: "",
  description: "",
  adresse_chantier: "",
  statut: "À planifier",
  date_debut_prevue: "",
  date_fin_prevue: "",
  avancement: "0",
  notes: "",
};

export default function ChantiersChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [clients, setClients] = useState<ClientEntreprise[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);

  const [form, setForm] = useState<FormChantier>(formulaireVide);
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");
  const [idEdition, setIdEdition] = useState<string | null>(null);

  useEffect(() => {
    chargerContexteEtChantiers();
  }, []);

  async function chargerContexteEtChantiers() {
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
      chargerClients(contexte.entreprise.id),
      chargerChantiers(contexte.entreprise.id),
    ]);

    setChargement(false);
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

  async function chargerChantiers(idEntreprise: string) {
    const { data, error } = await supabase
      .from("chantiers")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Erreur lors du chargement des chantiers.");
    } else {
      setChantiers(data || []);
    }
  }

  function modifierChamp(champ: keyof FormChantier, valeur: string) {
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
    if (!id) {
      setForm((ancien) => ({
        ...ancien,
        client_id: "",
        client_nom: "",
        adresse_chantier: "",
      }));
      return;
    }

    const clientTrouve = clients.find((client) => client.id === id);

    if (!clientTrouve) {
      return;
    }

    setForm((ancien) => ({
      ...ancien,
      client_id: clientTrouve.id,
      client_nom: nomAffichageClient(clientTrouve),
      adresse_chantier:
        clientTrouve.adresse_chantier ||
        clientTrouve.adresse_facturation ||
        ancien.adresse_chantier,
    }));
  }

  function afficherDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date + "T00:00:00").toLocaleDateString("fr-FR");
  }

  async function enregistrerChantier() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    if (!form.titre.trim()) {
      setMessage("Merci de remplir le titre du chantier.");
      setSauvegarde(false);
      return;
    }

    const avancementCorrige = Math.min(
      Math.max(Number(form.avancement) || 0, 0),
      100
    );

    if (idEdition) {
      const { error } = await supabase
        .from("chantiers")
        .update({
          client_id: form.client_id || null,
          client_nom: form.client_nom,
          titre: form.titre,
          description: form.description,
          adresse_chantier: form.adresse_chantier,
          statut: form.statut,
          date_debut_prevue: form.date_debut_prevue || null,
          date_fin_prevue: form.date_fin_prevue || null,
          avancement: avancementCorrige,
          notes: form.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idEdition)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        setMessage(error.message || "Erreur : le chantier n'a pas été modifié.");
      } else {
        setMessage("Chantier modifié avec succès.");
        annulerEdition();
        await chargerChantiers(entrepriseId);
      }
    } else {
      const { error } = await supabase.from("chantiers").insert({
        entreprise_id: entrepriseId,
        client_id: form.client_id || null,
        client_nom: form.client_nom,
        titre: form.titre,
        description: form.description,
        adresse_chantier: form.adresse_chantier,
        statut: form.statut,
        date_debut_prevue: form.date_debut_prevue || null,
        date_fin_prevue: form.date_fin_prevue || null,
        avancement: avancementCorrige,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setMessage(error.message || "Erreur : le chantier n'a pas été ajouté.");
      } else {
        setMessage("Chantier ajouté avec succès.");
        setForm(formulaireVide);
        await chargerChantiers(entrepriseId);
      }
    }

    setSauvegarde(false);
  }

  function lancerEdition(chantier: Chantier) {
    setIdEdition(chantier.id);

    setForm({
      client_id: chantier.client_id || "",
      client_nom: chantier.client_nom || "",
      titre: chantier.titre || "",
      description: chantier.description || "",
      adresse_chantier: chantier.adresse_chantier || "",
      statut: chantier.statut || "À planifier",
      date_debut_prevue: chantier.date_debut_prevue || "",
      date_fin_prevue: chantier.date_fin_prevue || "",
      avancement: String(chantier.avancement || 0),
      notes: chantier.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function annulerEdition() {
    setIdEdition(null);
    setForm(formulaireVide);
  }

  async function changerStatut(id: string, statut: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const avancementAuto =
      statut === "Terminé" ? 100 : statut === "À planifier" ? 0 : null;

    const updateData =
      avancementAuto === null
        ? {
            statut,
            updated_at: new Date().toISOString(),
          }
        : {
            statut,
            avancement: avancementAuto,
            updated_at: new Date().toISOString(),
          };

    const { error } = await supabase
      .from("chantiers")
      .update(updateData)
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors du changement de statut.");
    } else {
      setMessage("Statut du chantier mis à jour.");
      await chargerChantiers(entrepriseId);
    }
  }

  async function supprimerChantier(id: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const confirmation = confirm(
      "Supprimer ce chantier ? Cette action est définitive."
    );

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("chantiers")
      .delete()
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      setMessage(error.message || "Erreur lors de la suppression du chantier.");
    } else {
      setMessage("Chantier supprimé.");
      await chargerChantiers(entrepriseId);
    }
  }

  const chantiersFiltres = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return chantiers;
    }

    return chantiers.filter((chantier) => {
      const contenu = `
        ${chantier.client_nom}
        ${chantier.titre}
        ${chantier.description}
        ${chantier.adresse_chantier}
        ${chantier.statut}
        ${chantier.notes}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [chantiers, recherche]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des chantiers
          </h1>

          <p className="mt-2 text-slate-600">
            Crée, planifie et suis l&apos;avancement des chantiers de ton entreprise.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            {idEdition ? "Modifier un chantier" : "Ajouter un chantier"}
          </h2>

          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Client lié
                </label>

                <select
                  value={form.client_id}
                  onChange={(e) => choisirClient(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">Aucun client sélectionné</option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {nomAffichageClient(client)}
                    </option>
                  ))}
                </select>

                {clients.length === 0 && (
                  <p className="mt-2 text-sm text-orange-700">
                    Aucun client trouvé. Ajoute d&apos;abord un client.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Titre du chantier
                </label>

                <input
                  value={form.titre}
                  onChange={(e) => modifierChamp("titre", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Exemple : Création massif chez Mme Martin"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Adresse du chantier
              </label>

              <input
                value={form.adresse_chantier}
                onChange={(e) =>
                  modifierChamp("adresse_chantier", e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Adresse complète du chantier"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Statut
                </label>

                <select
                  value={form.statut}
                  onChange={(e) => modifierChamp("statut", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>À planifier</option>
                  <option>Planifié</option>
                  <option>En cours</option>
                  <option>Terminé</option>
                  <option>Annulé</option>
                  <option>En attente</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date début prévue
                </label>

                <input
                  type="date"
                  value={form.date_debut_prevue}
                  onChange={(e) =>
                    modifierChamp("date_debut_prevue", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Date fin prévue
                </label>

                <input
                  type="date"
                  value={form.date_fin_prevue}
                  onChange={(e) =>
                    modifierChamp("date_fin_prevue", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Avancement %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.avancement}
                  onChange={(e) => modifierChamp("avancement", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description du chantier
              </label>

              <textarea
                value={form.description}
                onChange={(e) => modifierChamp("description", e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Travaux prévus, détails techniques, matériel nécessaire..."
              />
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
                placeholder="Accès, portail, contraintes, consignes particulières..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={enregistrerChantier}
                disabled={sauvegarde}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {sauvegarde
                  ? "Enregistrement..."
                  : idEdition
                  ? "Modifier le chantier"
                  : "Ajouter le chantier"}
              </button>

              {idEdition && (
                <button
                  onClick={annulerEdition}
                  className="rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-800 hover:bg-slate-300"
                >
                  Annuler la modification
                </button>
              )}
            </div>

            {message && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Rechercher un chantier
          </label>

          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par client, titre, adresse, statut..."
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Liste des chantiers
          </h2>

          {chargement ? (
            <p className="text-slate-600">Chargement...</p>
          ) : chantiersFiltres.length === 0 ? (
            <p className="text-slate-600">Aucun chantier trouvé.</p>
          ) : (
            <div className="grid gap-4">
              {chantiersFiltres.map((chantier) => (
                <div
                  key={chantier.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {chantier.titre || "Chantier sans titre"}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {chantier.client_nom || "Client non renseigné"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {chantier.adresse_chantier || "Adresse non renseignée"}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {chantier.statut}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                      <span>Avancement</span>
                      <span className="font-semibold">
                        {Number(chantier.avancement || 0)}%
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200">
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

                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-medium">Début prévu :</span>{" "}
                      {afficherDate(chantier.date_debut_prevue)}
                    </p>

                    <p>
                      <span className="font-medium">Fin prévue :</span>{" "}
                      {afficherDate(chantier.date_fin_prevue)}
                    </p>
                  </div>

                  {chantier.description && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {chantier.description}
                    </p>
                  )}

                  {chantier.notes && (
                    <p className="mt-4 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
                      Notes : {chantier.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => lancerEdition(chantier)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={() => changerStatut(chantier.id, "Planifié")}
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      Planifié
                    </button>

                    <button
                      onClick={() => changerStatut(chantier.id, "En cours")}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      En cours
                    </button>

                    <button
                      onClick={() => changerStatut(chantier.id, "Terminé")}
                      className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                    >
                      Terminé
                    </button>

                    <button
                      onClick={() => changerStatut(chantier.id, "Annulé")}
                      className="rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      Annulé
                    </button>

                    <button
                      onClick={() => supprimerChantier(chantier.id)}
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