"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { chargerContexteEntreprise } from "@/lib/entreprise";

type ClientEntreprise = {
  id: string;
  entreprise_id: string | null;
  type_client: string;
  nom: string;
  prenom: string;
  entreprise: string;
  telephone: string;
  email: string;
  adresse_facturation: string;
  adresse_chantier: string;
  code_postal: string;
  ville: string;
  statut: string;
  notes: string;
  created_at: string;
};

type FormClient = {
  type_client: string;
  nom: string;
  prenom: string;
  entreprise: string;
  telephone: string;
  email: string;
  adresse_facturation: string;
  adresse_chantier: string;
  code_postal: string;
  ville: string;
  statut: string;
  notes: string;
};

const formulaireVide: FormClient = {
  type_client: "Particulier",
  nom: "",
  prenom: "",
  entreprise: "",
  telephone: "",
  email: "",
  adresse_facturation: "",
  adresse_chantier: "",
  code_postal: "",
  ville: "",
  statut: "Actif",
  notes: "",
};

export default function ClientsChefPage() {
  const router = useRouter();

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");

  const [clients, setClients] = useState<ClientEntreprise[]>([]);
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [message, setMessage] = useState("");
  const [recherche, setRecherche] = useState("");
  const [idEdition, setIdEdition] = useState<string | null>(null);

  const [form, setForm] = useState<FormClient>(formulaireVide);

  useEffect(() => {
    chargerContexteEtClients();
  }, []);

  async function chargerContexteEtClients() {
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

    await chargerClients(contexte.entreprise.id);

    setChargement(false);
  }

  async function chargerClients(idEntreprise: string) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("entreprise", { ascending: true })
      .order("nom", { ascending: true })
      .order("prenom", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Erreur lors du chargement des clients.");
    } else {
      setClients(data || []);
    }
  }

  function modifierChamp(champ: keyof FormClient, valeur: string) {
    setForm((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function nomAffichage(client: ClientEntreprise) {
    if (client.type_client === "Professionnel" && client.entreprise) {
      return client.entreprise;
    }

    const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();

    if (complet) {
      return complet;
    }

    return client.entreprise || "Client sans nom";
  }

  async function enregistrerClient() {
    setSauvegarde(true);
    setMessage("");

    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée. Reconnecte-toi.");
      setSauvegarde(false);
      return;
    }

    const nomParticulier = `${form.prenom} ${form.nom}`.trim();

    if (!form.entreprise.trim() && !nomParticulier) {
      setMessage("Merci de remplir au minimum un nom, un prénom ou une entreprise.");
      setSauvegarde(false);
      return;
    }

    if (idEdition) {
      const { error } = await supabase
        .from("clients")
        .update({
          type_client: form.type_client,
          nom: form.nom,
          prenom: form.prenom,
          entreprise: form.entreprise,
          telephone: form.telephone,
          email: form.email,
          adresse_facturation: form.adresse_facturation,
          adresse_chantier: form.adresse_chantier,
          code_postal: form.code_postal,
          ville: form.ville,
          statut: form.statut,
          notes: form.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idEdition)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        console.error(error);
        setMessage("Erreur : le client n'a pas été modifié.");
      } else {
        setMessage("Client modifié avec succès.");
        annulerEdition();
        await chargerClients(entrepriseId);
      }
    } else {
      const { error } = await supabase.from("clients").insert({
        entreprise_id: entrepriseId,
        type_client: form.type_client,
        nom: form.nom,
        prenom: form.prenom,
        entreprise: form.entreprise,
        telephone: form.telephone,
        email: form.email,
        adresse_facturation: form.adresse_facturation,
        adresse_chantier: form.adresse_chantier,
        code_postal: form.code_postal,
        ville: form.ville,
        statut: form.statut,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error(error);
        setMessage("Erreur : le client n'a pas été ajouté.");
      } else {
        setMessage("Client ajouté avec succès.");
        setForm(formulaireVide);
        await chargerClients(entrepriseId);
      }
    }

    setSauvegarde(false);
  }

  function lancerEdition(client: ClientEntreprise) {
    setIdEdition(client.id);

    setForm({
      type_client: client.type_client || "Particulier",
      nom: client.nom || "",
      prenom: client.prenom || "",
      entreprise: client.entreprise || "",
      telephone: client.telephone || "",
      email: client.email || "",
      adresse_facturation: client.adresse_facturation || "",
      adresse_chantier: client.adresse_chantier || "",
      code_postal: client.code_postal || "",
      ville: client.ville || "",
      statut: client.statut || "Actif",
      notes: client.notes || "",
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

    const { error } = await supabase
      .from("clients")
      .update({
        statut,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      console.error(error);
      setMessage("Erreur lors du changement de statut.");
    } else {
      setMessage("Statut du client mis à jour.");
      await chargerClients(entrepriseId);
    }
  }

  async function supprimerClient(id: string) {
    if (!entrepriseId) {
      setMessage("Aucune entreprise connectée.");
      return;
    }

    const confirmation = confirm(
      "Supprimer ce client ? Cette action est définitive."
    );

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      console.error(error);
      setMessage("Erreur lors de la suppression du client.");
    } else {
      setMessage("Client supprimé.");
      await chargerClients(entrepriseId);
    }
  }

  const clientsFiltres = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    if (!texte) {
      return clients;
    }

    return clients.filter((client) => {
      const contenu = `
        ${client.type_client}
        ${client.nom}
        ${client.prenom}
        ${client.entreprise}
        ${client.telephone}
        ${client.email}
        ${client.adresse_facturation}
        ${client.adresse_chantier}
        ${client.code_postal}
        ${client.ville}
        ${client.statut}
        ${client.notes}
      `;

      return contenu.toLowerCase().includes(texte);
    });
  }, [clients, recherche]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des clients
          </h1>

          <p className="mt-2 text-slate-600">
            Ajoute, modifie et retrouve facilement les clients de l&apos;entreprise.
          </p>

          {nomEntreprise && (
            <p className="mt-2 text-sm font-medium text-slate-500">
              Entreprise connectée : {nomEntreprise}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            {idEdition ? "Modifier un client" : "Ajouter un client"}
          </h2>

          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Type de client
                </label>
                <select
                  value={form.type_client}
                  onChange={(e) => modifierChamp("type_client", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>Particulier</option>
                  <option>Professionnel</option>
                  <option>Collectivité</option>
                  <option>Syndic</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Entreprise
                </label>
                <input
                  value={form.entreprise}
                  onChange={(e) => modifierChamp("entreprise", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Nom société si pro"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom
                </label>
                <input
                  value={form.nom}
                  onChange={(e) => modifierChamp("nom", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Nom du client"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Prénom
                </label>
                <input
                  value={form.prenom}
                  onChange={(e) => modifierChamp("prenom", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Prénom du client"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Téléphone
                </label>
                <input
                  value={form.telephone}
                  onChange={(e) => modifierChamp("telephone", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="06 00 00 00 00"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) => modifierChamp("email", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="client@mail.fr"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Statut
                </label>
                <select
                  value={form.statut}
                  onChange={(e) => modifierChamp("statut", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option>Actif</option>
                  <option>Inactif</option>
                  <option>Prospect</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Adresse de facturation
                </label>
                <textarea
                  value={form.adresse_facturation}
                  onChange={(e) =>
                    modifierChamp("adresse_facturation", e.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Adresse utilisée pour devis et factures"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Adresse du chantier
                </label>
                <textarea
                  value={form.adresse_chantier}
                  onChange={(e) =>
                    modifierChamp("adresse_chantier", e.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Adresse d'intervention si différente"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Code postal
                </label>
                <input
                  value={form.code_postal}
                  onChange={(e) => modifierChamp("code_postal", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="03500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ville
                </label>
                <input
                  value={form.ville}
                  onChange={(e) => modifierChamp("ville", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Châtel-de-Neuvre"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Notes client
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => modifierChamp("notes", e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                placeholder="Informations utiles : accès, portail, habitudes, préférences, historique..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={enregistrerClient}
                disabled={sauvegarde}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {sauvegarde
                  ? "Enregistrement..."
                  : idEdition
                  ? "Modifier le client"
                  : "Ajouter le client"}
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
            Rechercher un client
          </label>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="Recherche par nom, téléphone, ville, adresse, entreprise..."
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-slate-900">
            Liste des clients
          </h2>

          {chargement ? (
            <p className="text-slate-600">Chargement...</p>
          ) : clientsFiltres.length === 0 ? (
            <p className="text-slate-600">Aucun client trouvé.</p>
          ) : (
            <div className="grid gap-4">
              {clientsFiltres.map((client) => (
                <div
                  key={client.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {nomAffichage(client)}
                      </h3>

                      <p className="text-sm text-slate-600">
                        {client.type_client} — {client.ville || "Ville non renseignée"}
                      </p>

                      {(client.nom || client.prenom) && client.entreprise && (
                        <p className="mt-1 text-sm text-slate-500">
                          Contact : {client.prenom} {client.nom}
                        </p>
                      )}
                    </div>

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {client.statut}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      <span className="font-medium">Téléphone :</span>{" "}
                      {client.telephone || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Email :</span>{" "}
                      {client.email || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Code postal :</span>{" "}
                      {client.code_postal || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Ville :</span>{" "}
                      {client.ville || "—"}
                    </p>

                    <p className="md:col-span-2">
                      <span className="font-medium">Adresse chantier :</span>{" "}
                      {client.adresse_chantier || "—"}
                    </p>

                    <p className="md:col-span-2">
                      <span className="font-medium">Adresse facturation :</span>{" "}
                      {client.adresse_facturation || "—"}
                    </p>
                  </div>

                  {client.notes && (
                    <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {client.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => lancerEdition(client)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Modifier
                    </button>

                    <button
                      onClick={() =>
                        changerStatut(
                          client.id,
                          client.statut === "Actif" ? "Inactif" : "Actif"
                        )
                      }
                      className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                    >
                      {client.statut === "Actif" ? "Désactiver" : "Réactiver"}
                    </button>

                    <button
                      onClick={() => supprimerClient(client.id)}
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