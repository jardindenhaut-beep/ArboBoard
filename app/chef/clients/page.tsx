"use client";

import Link from "next/link";
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
  adresse_chantier: string | null;
  code_postal_chantier: string | null;
  ville_chantier: string | null;
  notes: string | null;
  notes_chantier: string | null;
  statut: StatutClient | string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DevisClient = {
  id: string;
  numero: string | null;
  objet: string | null;
  statut: string | null;
  date_devis: string | null;
  total_ttc: number | null;
};

type FactureClient = {
  id: string;
  numero: string | null;
  objet: string | null;
  statut: string | null;
  date_facture: string | null;
  date_echeance: string | null;
  total_ttc: number | null;
  montant_paye: number | null;
  reste_a_payer: number | null;
  est_avoir: boolean | null;
  type_facture: string | null;
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
  adresse_chantier: string;
  code_postal_chantier: string;
  ville_chantier: string;
  notes: string;
  notes_chantier: string;
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
  adresse_chantier: "",
  code_postal_chantier: "",
  ville_chantier: "",
  notes: "",
  notes_chantier: "",
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

function formatDate(date: string | null | undefined) {
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

function formatMontant(montant: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(montant || 0));
}

function estAvoirFacture(facture: FactureClient) {
  return !!facture.est_avoir || facture.type_facture === "avoir";
}

function adresseClientComplete(client: Client) {
  return [client.adresse, [client.code_postal, client.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join("\n");
}

function adresseChantierComplete(client: Client) {
  return [
    client.adresse_chantier,
    [client.code_postal_chantier, client.ville_chantier]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ClientsPage() {
  const [entrepriseId, setEntrepriseId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<"tous" | TypeClient>("tous");
  const [filtreStatut, setFiltreStatut] = useState<
    "actif" | "archive" | "tous"
  >("actif");

  const [modalOuverte, setModalOuverte] = useState(false);
  const [clientEdition, setClientEdition] = useState<Client | null>(null);
  const [formulaire, setFormulaire] =
    useState<FormulaireClient>(FORMULAIRE_VIDE);

  const [ficheClientOuverte, setFicheClientOuverte] = useState(false);
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(
    null
  );
  const [devisClient, setDevisClient] = useState<DevisClient[]>([]);
  const [facturesClient, setFacturesClient] = useState<FactureClient[]>([]);
  const [chargementFicheClient, setChargementFicheClient] = useState(false);

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
        client.adresse_chantier,
        client.code_postal_chantier,
        client.ville_chantier,
        client.notes,
        client.notes_chantier,
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
      particuliers: actifs.filter(
        (client) => client.type_client === "particulier"
      ).length,
      entreprises: actifs.filter(
        (client) => client.type_client === "entreprise"
      ).length,
      collectivites: actifs.filter(
        (client) => client.type_client === "collectivite"
      ).length,
    };
  }, [clients]);

  const statsFicheClient = useMemo(() => {
    const facturesClassiques = facturesClient.filter(
      (facture) => !estAvoirFacture(facture)
    );

    const totalFactureTtc = facturesClassiques.reduce(
      (total, facture) => total + Number(facture.total_ttc || 0),
      0
    );

    const totalPaye = facturesClassiques.reduce(
      (total, facture) => total + Number(facture.montant_paye || 0),
      0
    );

    const resteAPayer = facturesClassiques.reduce(
      (total, facture) => total + Number(facture.reste_a_payer || 0),
      0
    );

    return {
      totalDevis: devisClient.length,
      totalFactures: facturesClassiques.length,
      totalAvoirs: facturesClient.filter(estAvoirFacture).length,
      totalFactureTtc,
      totalPaye,
      resteAPayer,
    };
  }, [devisClient, facturesClient]);

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
      adresse_chantier: client.adresse_chantier || "",
      code_postal_chantier: client.code_postal_chantier || "",
      ville_chantier: client.ville_chantier || "",
      notes: client.notes || "",
      notes_chantier: client.notes_chantier || "",
      statut: (client.statut as StatutClient) || "actif",
    });
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  async function ouvrirFicheClient(client: Client) {
    if (!entrepriseId) return;

    try {
      setMessageErreur("");
      setMessageSucces("");
      setChargementFicheClient(true);
      setClientSelectionne(client);
      setFicheClientOuverte(true);

      const [
        { data: devisData, error: devisError },
        { data: facturesData, error: facturesError },
      ] = await Promise.all([
        supabase
          .from("devis")
          .select("id, numero, objet, statut, date_devis, total_ttc")
          .eq("entreprise_id", entrepriseId)
          .eq("client_id", client.id)
          .order("date_devis", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("factures")
          .select(
            "id, numero, objet, statut, date_facture, date_echeance, total_ttc, montant_paye, reste_a_payer, est_avoir, type_facture"
          )
          .eq("entreprise_id", entrepriseId)
          .eq("client_id", client.id)
          .order("date_facture", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (devisError) throw devisError;
      if (facturesError) throw facturesError;

      setDevisClient((devisData || []) as DevisClient[]);
      setFacturesClient((facturesData || []) as FactureClient[]);
    } catch (error: any) {
      console.error("Erreur ouverture fiche client :", error);
      setMessageErreur(
        error?.message || "Impossible de charger la fiche client."
      );
    } finally {
      setChargementFicheClient(false);
    }
  }

  function fermerModal() {
    if (enregistrement) return;

    setModalOuverte(false);
    setClientEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
  }

  function fermerFicheClient() {
    setFicheClientOuverte(false);
    setClientSelectionne(null);
    setDevisClient([]);
    setFacturesClient([]);
  }

  function modifierChamp(champ: keyof FormulaireClient, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function copierAdresseClientVersChantier() {
    setFormulaire((ancien) => ({
      ...ancien,
      adresse_chantier: ancien.adresse,
      code_postal_chantier: ancien.code_postal,
      ville_chantier: ancien.ville,
    }));
  }

  function formulaireValide() {
    if (formulaire.type_client === "particulier") {
      return (
        formulaire.nom.trim().length > 0 ||
        formulaire.prenom.trim().length > 0
      );
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
        adresse_chantier: nettoyerTexte(formulaire.adresse_chantier),
        code_postal_chantier: nettoyerTexte(formulaire.code_postal_chantier),
        ville_chantier: nettoyerTexte(formulaire.ville_chantier),
        notes: nettoyerTexte(formulaire.notes),
        notes_chantier: nettoyerTexte(formulaire.notes_chantier),
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
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Total
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Actifs
          </p>
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
            placeholder="Rechercher par nom, téléphone, email, ville, note, chantier..."
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
              setFiltreStatut(
                event.target.value as "actif" | "archive" | "tous"
              )
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
            <table className="w-full min-w-[1080px] text-left text-sm">
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
                            {`${client.prenom || ""} ${
                              client.nom || ""
                            }`.trim()}
                          </p>
                        )}

                      {client.notes && (
                        <p className="mt-2 line-clamp-2 max-w-xs text-xs text-slate-500">
                          {client.notes}
                        </p>
                      )}

                      {client.notes_chantier && (
                        <p className="mt-2 line-clamp-2 max-w-xs text-xs text-emerald-700">
                          Chantier : {client.notes_chantier}
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

                        {(client.adresse_chantier ||
                          client.code_postal_chantier ||
                          client.ville_chantier) && (
                          <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            <p className="font-semibold">Chantier</p>
                            <p>{client.adresse_chantier || "—"}</p>
                            <p>
                              {[
                                client.code_postal_chantier,
                                client.ville_chantier,
                              ]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </p>
                          </div>
                        )}
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
                          onClick={() => void ouvrirFicheClient(client)}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Voir fiche
                        </button>

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
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
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

            <div className="space-y-6 p-5">
              <section className="rounded-3xl border border-slate-200 p-5">
                <h3 className="mb-4 text-lg font-bold text-slate-950">
                  Informations client
                </h3>

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
                  <div className="mt-4">
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

                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                      onChange={(event) =>
                        modifierChamp("nom", event.target.value)
                      }
                      placeholder="Nom"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              </section>

              <section className="rounded-3xl border border-slate-200 p-5">
                <h3 className="mb-4 text-lg font-bold text-slate-950">
                  Adresse client / facturation
                </h3>

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

                <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
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
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-emerald-50/30 p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      Adresse chantier par défaut
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      À utiliser si le lieu d’intervention est différent de
                      l’adresse client.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copierAdresseClientVersChantier}
                    className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Copier adresse client
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Adresse chantier
                  </label>
                  <input
                    value={formulaire.adresse_chantier}
                    onChange={(event) =>
                      modifierChamp("adresse_chantier", event.target.value)
                    }
                    placeholder="Adresse du chantier"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Code postal chantier
                    </label>
                    <input
                      value={formulaire.code_postal_chantier}
                      onChange={(event) =>
                        modifierChamp(
                          "code_postal_chantier",
                          event.target.value
                        )
                      }
                      placeholder="03000"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Ville chantier
                    </label>
                    <input
                      value={formulaire.ville_chantier}
                      onChange={(event) =>
                        modifierChamp("ville_chantier", event.target.value)
                      }
                      placeholder="Ville du chantier"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes chantier / accès
                  </label>
                  <textarea
                    value={formulaire.notes_chantier}
                    onChange={(event) =>
                      modifierChamp("notes_chantier", event.target.value)
                    }
                    placeholder="Ex : portail étroit, accès camion compliqué, chien présent, stationnement devant la maison, code portail..."
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 p-5">
                <h3 className="mb-4 text-lg font-bold text-slate-950">
                  Notes internes
                </h3>

                <textarea
                  value={formulaire.notes}
                  onChange={(event) =>
                    modifierChamp("notes", event.target.value)
                  }
                  placeholder="Informations utiles : habitudes client, remarques commerciales, préférences..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </section>
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

      {ficheClientOuverte && clientSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Fiche client
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {nomClient(clientSelectionne)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Historique devis, factures, coordonnées, adresses et notes
                  chantier.
                </p>
              </div>

              <button
                onClick={fermerFicheClient}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-6 p-5">
              {chargementFicheClient ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    Chargement de la fiche client...
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Contact
                      </p>
                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p>
                          <span className="font-semibold">Type :</span>{" "}
                          {libelleTypeClient(clientSelectionne.type_client)}
                        </p>
                        <p>
                          <span className="font-semibold">Téléphone :</span>{" "}
                          {clientSelectionne.telephone || "—"}
                        </p>
                        <p>
                          <span className="font-semibold">Email :</span>{" "}
                          {clientSelectionne.email || "—"}
                        </p>
                        <p>
                          <span className="font-semibold">Statut :</span>{" "}
                          {clientSelectionne.statut === "archive"
                            ? "Archivé"
                            : "Actif"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Adresse client
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                        {adresseClientComplete(clientSelectionne) || "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-600">
                        Adresse chantier
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-emerald-900">
                        {adresseChantierComplete(clientSelectionne) ||
                          "Identique ou non renseignée."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-emerald-600">
                        Notes chantier
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-emerald-900">
                        {clientSelectionne.notes_chantier ||
                          "Aucune note chantier."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Notes internes
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                      {clientSelectionne.notes || "Aucune note interne."}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Devis
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {statsFicheClient.totalDevis}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Factures
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {statsFicheClient.totalFactures}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Avoirs
                      </p>
                      <p className="mt-2 text-2xl font-bold text-purple-700">
                        {statsFicheClient.totalAvoirs}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Total facturé TTC
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {formatMontant(statsFicheClient.totalFactureTtc)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Reste à payer
                      </p>
                      <p className="mt-2 text-2xl font-bold text-red-600">
                        {formatMontant(statsFicheClient.resteAPayer)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 p-4">
                        <h3 className="font-bold text-slate-950">
                          Historique devis
                        </h3>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {devisClient.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500">
                            Aucun devis pour ce client.
                          </p>
                        ) : (
                          devisClient.map((devis) => (
                            <div key={devis.id} className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-950">
                                    {devis.numero || "Sans numéro"}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {devis.objet || "Sans objet"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatDate(devis.date_devis)} —{" "}
                                    {devis.statut || "brouillon"}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="font-bold text-slate-950">
                                    {formatMontant(devis.total_ttc)}
                                  </p>

                                  <Link
                                    href="/chef/devis"
                                    className="mt-2 inline-flex rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Ouvrir devis
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 p-4">
                        <h3 className="font-bold text-slate-950">
                          Historique factures
                        </h3>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {facturesClient.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500">
                            Aucune facture pour ce client.
                          </p>
                        ) : (
                          facturesClient.map((facture) => {
                            const estAvoir = estAvoirFacture(facture);

                            return (
                              <div key={facture.id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-950">
                                      {facture.numero || "Sans numéro"}
                                    </p>
                                    <p className="text-sm text-slate-600">
                                      {facture.objet || "Sans objet"}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {formatDate(facture.date_facture)} —{" "}
                                      {estAvoir
                                        ? "avoir"
                                        : facture.statut || "brouillon"}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <p
                                      className={`font-bold ${
                                        estAvoir
                                          ? "text-purple-700"
                                          : "text-slate-950"
                                      }`}
                                    >
                                      {formatMontant(facture.total_ttc)}
                                    </p>

                                    {!estAvoir && (
                                      <p className="text-xs text-red-600">
                                        Reste :{" "}
                                        {formatMontant(
                                          facture.reste_a_payer
                                        )}
                                      </p>
                                    )}

                                    <Link
                                      href="/chef/factures"
                                      className="mt-2 inline-flex rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Ouvrir facture
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}