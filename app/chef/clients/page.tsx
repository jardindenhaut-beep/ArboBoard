"use client";

import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type TypeClient = "particulier" | "entreprise" | "collectivite";
type StatutClient = "actif" | "archive";

type Client = {
  id: string;
  entreprise_id: string;
  type_client: TypeClient | string | null;
  nom: string | null;
  prenom: string | null;
  entreprise: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  notes: string | null;
  statut: StatutClient | string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FormulaireClient = {
  type_client: TypeClient;
  nom: string;
  prenom: string;
  entreprise: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  notes: string;
  statut: StatutClient;
};

const FORMULAIRE_VIDE: FormulaireClient = {
  type_client: "particulier",
  nom: "",
  prenom: "",
  entreprise: "",
  email: "",
  telephone: "",
  adresse: "",
  code_postal: "",
  ville: "",
  notes: "",
  statut: "actif",
};

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nomClient(client: Client) {
  const type = client.type_client || "particulier";

  if (type === "particulier") {
    const complet = `${client.prenom || ""} ${client.nom || ""}`.trim();
    return complet || "Client particulier";
  }

  return (
    client.entreprise ||
    client.nom ||
    `${client.prenom || ""} ${client.nom || ""}`.trim() ||
    "Client professionnel"
  );
}

function libelleTypeClient(type: string | null | undefined) {
  if (type === "entreprise") return "Entreprise";
  if (type === "collectivite") return "Collectivité";
  return "Particulier";
}

function badgeTypeClient(type: string | null | undefined) {
  if (type === "entreprise") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (type === "collectivite") {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function formatDate(date: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "—";
  }
}

export default function ClientsPage() {
  const [entrepriseId, setEntrepriseId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<"tous" | TypeClient>("tous");
  const [filtreStatut, setFiltreStatut] = useState<"actif" | "archive" | "tous">(
    "actif"
  );

  const [modalOuverte, setModalOuverte] = useState(false);
  const [clientEdition, setClientEdition] = useState<Client | null>(null);
  const [formulaire, setFormulaire] =
    useState<FormulaireClient>(FORMULAIRE_VIDE);

  const [messageErreur, setMessageErreur] = useState("");
  const [messageSucces, setMessageSucces] = useState("");

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
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

      const idEntreprise = resultat.contexte.entreprise.id;
      setEntrepriseId(idEntreprise);

      await chargerClients(idEntreprise);
    } catch (error) {
      console.error("Erreur initialisation clients :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerClients(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement clients :", error);
      setMessageErreur(error.message || "Impossible de charger les clients.");
      return;
    }

    setClients((data || []) as Client[]);
  }

  const clientsFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return clients.filter((client) => {
      const correspondType =
        filtreType === "tous" || client.type_client === filtreType;

      const statutClient = client.statut || "actif";
      const correspondStatut =
        filtreStatut === "tous" || statutClient === filtreStatut;

      const zoneRecherche = [
        client.nom,
        client.prenom,
        client.entreprise,
        client.email,
        client.telephone,
        client.adresse,
        client.code_postal,
        client.ville,
        client.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        texte.length === 0 || zoneRecherche.includes(texte);

      return correspondType && correspondStatut && correspondRecherche;
    });
  }, [clients, recherche, filtreType, filtreStatut]);

  const statistiques = useMemo(() => {
    const actifs = clients.filter((client) => client.statut !== "archive");
    const archives = clients.filter((client) => client.statut === "archive");

    return {
      total: clients.length,
      actifs: actifs.length,
      archives: archives.length,
      particuliers: actifs.filter((client) => client.type_client === "particulier")
        .length,
      entreprises: actifs.filter((client) => client.type_client === "entreprise")
        .length,
      collectivites: actifs.filter(
        (client) => client.type_client === "collectivite"
      ).length,
    };
  }, [clients]);

  function ouvrirCreation() {
    setClientEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function ouvrirEdition(client: Client) {
    setClientEdition(client);
    setFormulaire({
      type_client: (client.type_client as TypeClient) || "particulier",
      nom: client.nom || "",
      prenom: client.prenom || "",
      entreprise: client.entreprise || "",
      email: client.email || "",
      telephone: client.telephone || "",
      adresse: client.adresse || "",
      code_postal: client.code_postal || "",
      ville: client.ville || "",
      notes: client.notes || "",
      statut: (client.statut as StatutClient) || "actif",
    });
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (enregistrement) return;

    setModalOuverte(false);
    setClientEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
  }

  function modifierChamp(champ: keyof FormulaireClient, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function formulaireValide() {
    if (formulaire.type_client === "particulier") {
      return formulaire.nom.trim().length > 0 || formulaire.prenom.trim().length > 0;
    }

    return (
      formulaire.entreprise.trim().length > 0 ||
      formulaire.nom.trim().length > 0
    );
  }

  async function enregistrerClient() {
    if (!entrepriseId) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!formulaireValide()) {
      setMessageErreur(
        formulaire.type_client === "particulier"
          ? "Renseignez au minimum le nom ou le prénom du client."
          : "Renseignez au minimum le nom de l’entreprise / collectivité."
      );
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        entreprise_id: entrepriseId,
        type_client: formulaire.type_client,
        nom: nettoyerTexte(formulaire.nom),
        prenom: nettoyerTexte(formulaire.prenom),
        entreprise: nettoyerTexte(formulaire.entreprise),
        email: nettoyerTexte(formulaire.email),
        telephone: nettoyerTexte(formulaire.telephone),
        adresse: nettoyerTexte(formulaire.adresse),
        code_postal: nettoyerTexte(formulaire.code_postal),
        ville: nettoyerTexte(formulaire.ville),
        notes: nettoyerTexte(formulaire.notes),
        statut: formulaire.statut,
      };

      if (clientEdition) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", clientEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;

        setMessageSucces("Client modifié avec succès.");
      } else {
        const { error } = await supabase.from("clients").insert(payload);

        if (error) throw error;

        setMessageSucces("Client créé avec succès.");
      }

      await chargerClients(entrepriseId);
      fermerModal();
    } catch (error: any) {
      console.error("Erreur enregistrement client :", error);
      setMessageErreur(
        error?.message || "Impossible d’enregistrer le client pour le moment."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function archiverOuRestaurerClient(client: Client) {
    if (!entrepriseId) return;

    const clientArchive = client.statut === "archive";
    const nouveauStatut = clientArchive ? "actif" : "archive";

    const confirmation = window.confirm(
      clientArchive
        ? `Voulez-vous réactiver le client "${nomClient(client)}" ?`
        : `Voulez-vous archiver le client "${nomClient(client)}" ?`
    );

    if (!confirmation) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("clients")
        .update({ statut: nouveauStatut })
        .eq("id", client.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerClients(entrepriseId);

      setMessageSucces(
        clientArchive
          ? "Client réactivé avec succès."
          : "Client archivé avec succès."
      );
    } catch (error: any) {
      console.error("Erreur archivage client :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier le statut du client."
      );
    }
  }

  async function supprimerClient(client: Client) {
    if (!entrepriseId) return;

    const confirmation = window.confirm(
      `Suppression définitive du client "${nomClient(
        client
      )}". Cette action est irréversible. Continuer ?`
    );

    if (!confirmation) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerClients(entrepriseId);
      setMessageSucces("Client supprimé définitivement.");
    } catch (error: any) {
      console.error("Erreur suppression client :", error);
      setMessageErreur(
        error?.message ||
          "Impossible de supprimer ce client. Il est peut-être déjà lié à un devis, une facture ou un chantier."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Clients</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Gérez vos particuliers, entreprises et collectivités. Chaque client
            est lié uniquement à votre entreprise.
          </p>
        </div>

        <button
          onClick={ouvrirCreation}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          + Ajouter un client
        </button>
      </section>

      {messageErreur && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {messageErreur}
        </div>
      )}

      {messageSucces && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {messageSucces}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Actifs</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.actifs}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Particuliers
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.particuliers}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Entreprises
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.entreprises}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Collectivités
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.collectivites}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Archives
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.archives}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_220px_220px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher par nom, téléphone, email, ville, note..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtreType}
            onChange={(event) =>
              setFiltreType(event.target.value as "tous" | TypeClient)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les types</option>
            <option value="particulier">Particuliers</option>
            <option value="entreprise">Entreprises</option>
            <option value="collectivite">Collectivités</option>
          </select>

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "actif" | "archive" | "tous")
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="actif">Clients actifs</option>
            <option value="archive">Clients archivés</option>
            <option value="tous">Tous les statuts</option>
          </select>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              🌳
            </div>
            <p className="font-semibold text-slate-900">
              Chargement des clients...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des données depuis Supabase.
            </p>
          </div>
        ) : clientsFiltres.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              👥
            </div>
            <p className="font-semibold text-slate-900">Aucun client trouvé</p>
            <p className="mt-1 text-sm text-slate-500">
              Créez votre premier client ou modifiez les filtres de recherche.
            </p>

            <button
              onClick={ouvrirCreation}
              className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Ajouter un client
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Adresse</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Créé le</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {clientsFiltres.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-950">
                        {nomClient(client)}
                      </p>

                      {client.type_client !== "particulier" &&
                        (client.prenom || client.nom) && (
                          <p className="mt-1 text-xs text-slate-500">
                            Contact :{" "}
                            {`${client.prenom || ""} ${client.nom || ""}`.trim()}
                          </p>
                        )}

                      {client.notes && (
                        <p className="mt-2 line-clamp-2 max-w-xs text-xs text-slate-500">
                          {client.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeTypeClient(
                          client.type_client
                        )}`}
                      >
                        {libelleTypeClient(client.type_client)}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1 text-sm text-slate-700">
                        <p>{client.telephone || "—"}</p>
                        <p className="text-xs text-slate-500">
                          {client.email || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="max-w-xs text-sm text-slate-700">
                        <p>{client.adresse || "—"}</p>
                        <p className="text-xs text-slate-500">
                          {[client.code_postal, client.ville]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          client.statut === "archive"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {client.statut === "archive" ? "Archivé" : "Actif"}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-600">
                      {formatDate(client.created_at)}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => ouvrirEdition(client)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Modifier
                        </button>

                        <button
                          onClick={() => archiverOuRestaurerClient(client)}
                          className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          {client.statut === "archive"
                            ? "Réactiver"
                            : "Archiver"}
                        </button>

                        <button
                          onClick={() => supprimerClient(client)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {clientEdition ? "Modifier le client" : "Ajouter un client"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Renseignez les informations utiles pour vos devis, factures et
                  chantiers.
                </p>
              </div>

              <button
                onClick={fermerModal}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Type de client
                  </label>
                  <select
                    value={formulaire.type_client}
                    onChange={(event) =>
                      modifierChamp("type_client", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="particulier">Particulier</option>
                    <option value="entreprise">Entreprise</option>
                    <option value="collectivite">Collectivité</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Statut
                  </label>
                  <select
                    value={formulaire.statut}
                    onChange={(event) =>
                      modifierChamp("statut", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="actif">Actif</option>
                    <option value="archive">Archivé</option>
                  </select>
                </div>
              </div>

              {formulaire.type_client !== "particulier" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nom entreprise / collectivité
                  </label>
                  <input
                    value={formulaire.entreprise}
                    onChange={(event) =>
                      modifierChamp("entreprise", event.target.value)
                    }
                    placeholder="Ex : Mairie de..., SCI..., SAS..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Prénom
                  </label>
                  <input
                    value={formulaire.prenom}
                    onChange={(event) =>
                      modifierChamp("prenom", event.target.value)
                    }
                    placeholder="Prénom"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nom
                  </label>
                  <input
                    value={formulaire.nom}
                    onChange={(event) => modifierChamp("nom", event.target.value)}
                    placeholder="Nom"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Téléphone
                  </label>
                  <input
                    value={formulaire.telephone}
                    onChange={(event) =>
                      modifierChamp("telephone", event.target.value)
                    }
                    placeholder="06 00 00 00 00"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    value={formulaire.email}
                    onChange={(event) =>
                      modifierChamp("email", event.target.value)
                    }
                    placeholder="client@email.fr"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Adresse
                </label>
                <input
                  value={formulaire.adresse}
                  onChange={(event) =>
                    modifierChamp("adresse", event.target.value)
                  }
                  placeholder="Adresse complète"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Code postal
                  </label>
                  <input
                    value={formulaire.code_postal}
                    onChange={(event) =>
                      modifierChamp("code_postal", event.target.value)
                    }
                    placeholder="03000"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Ville
                  </label>
                  <input
                    value={formulaire.ville}
                    onChange={(event) =>
                      modifierChamp("ville", event.target.value)
                    }
                    placeholder="Ville"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes internes
                </label>
                <textarea
                  value={formulaire.notes}
                  onChange={(event) => modifierChamp("notes", event.target.value)}
                  placeholder="Informations utiles : accès chantier, habitudes client, remarques..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button
                onClick={fermerModal}
                disabled={enregistrement}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                onClick={enregistrerClient}
                disabled={enregistrement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement
                  ? "Enregistrement..."
                  : clientEdition
                  ? "Modifier le client"
                  : "Créer le client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}