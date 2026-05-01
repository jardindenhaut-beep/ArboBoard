"use client";

import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type StatutChantier = "a_prevoir" | "en_cours" | "termine" | "annule" | "archive";

type Client = {
  id: string;
  type_client: string | null;
  nom: string | null;
  prenom: string | null;
  entreprise: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  statut: string | null;
};

type Chantier = {
  id: string;
  entreprise_id: string;
  client_id: string | null;
  client_nom: string | null;
  titre: string | null;
  statut: string | null;
  description: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  date_debut_prevue: string | null;
  date_fin_prevue: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FormulaireChantier = {
  client_id: string;
  titre: string;
  statut: StatutChantier;
  description: string;
  adresse: string;
  code_postal: string;
  ville: string;
  date_debut_prevue: string;
  date_fin_prevue: string;
  notes: string;
};

const FORMULAIRE_VIDE: FormulaireChantier = {
  client_id: "",
  titre: "",
  statut: "a_prevoir",
  description: "",
  adresse: "",
  code_postal: "",
  ville: "",
  date_debut_prevue: "",
  date_fin_prevue: "",
  notes: "",
};

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nettoyerDate(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nomClient(client: Client | null | undefined) {
  if (!client) return "Client non renseigné";

  if (client.type_client === "particulier") {
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

function libelleStatut(statut: string | null | undefined) {
  if (statut === "en_cours") return "En cours";
  if (statut === "termine") return "Terminé";
  if (statut === "annule") return "Annulé";
  if (statut === "archive") return "Archivé";
  return "À prévoir";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "en_cours") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "termine")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annule") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archive") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function formatDate(date: string | null) {
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

function titreChantier(chantier: Chantier) {
  return chantier.titre || "Chantier sans titre";
}

export default function ChantiersPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<
    "tous" | "a_prevoir" | "en_cours" | "termine" | "annule" | "archive"
  >("tous");

  const [modalOuverte, setModalOuverte] = useState(false);
  const [chantierEdition, setChantierEdition] = useState<Chantier | null>(null);
  const [formulaire, setFormulaire] =
    useState<FormulaireChantier>(FORMULAIRE_VIDE);

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

      await Promise.all([chargerClients(idEntreprise), chargerChantiers(idEntreprise)]);
    } catch (error) {
      console.error("Erreur initialisation chantiers :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerClients(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("clients")
      .select(
        "id,type_client,nom,prenom,entreprise,email,telephone,adresse,code_postal,ville,statut"
      )
      .eq("entreprise_id", idEntreprise)
      .neq("statut", "archive")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement clients :", error);
      setMessageErreur(error.message || "Impossible de charger les clients.");
      return;
    }

    setClients((data || []) as Client[]);
  }

  async function chargerChantiers(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("chantiers")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement chantiers :", error);
      setMessageErreur(error.message || "Impossible de charger les chantiers.");
      return;
    }

    setChantiers((data || []) as Chantier[]);
  }

  const statistiques = useMemo(() => {
    return {
      total: chantiers.length,
      a_prevoir: chantiers.filter((chantier) => chantier.statut === "a_prevoir")
        .length,
      en_cours: chantiers.filter((chantier) => chantier.statut === "en_cours")
        .length,
      termines: chantiers.filter((chantier) => chantier.statut === "termine")
        .length,
      archives: chantiers.filter((chantier) => chantier.statut === "archive")
        .length,
    };
  }, [chantiers]);

  const chantiersFiltres = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return chantiers.filter((chantier) => {
      const statutChantier = chantier.statut || "a_prevoir";

      const correspondStatut =
        filtreStatut === "tous" || statutChantier === filtreStatut;

      const zoneRecherche = [
        chantier.titre,
        chantier.client_nom,
        chantier.description,
        chantier.adresse,
        chantier.code_postal,
        chantier.ville,
        chantier.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        texte.length === 0 || zoneRecherche.includes(texte);

      return correspondStatut && correspondRecherche;
    });
  }, [chantiers, recherche, filtreStatut]);

  function trouverClient(clientId: string | null | undefined) {
    if (!clientId) return null;
    return clients.find((client) => client.id === clientId) || null;
  }

  function ouvrirCreation() {
    setChantierEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function ouvrirEdition(chantier: Chantier) {
    setChantierEdition(chantier);
    setFormulaire({
      client_id: chantier.client_id || "",
      titre: chantier.titre || "",
      statut: (chantier.statut as StatutChantier) || "a_prevoir",
      description: chantier.description || "",
      adresse: chantier.adresse || "",
      code_postal: chantier.code_postal || "",
      ville: chantier.ville || "",
      date_debut_prevue: chantier.date_debut_prevue || "",
      date_fin_prevue: chantier.date_fin_prevue || "",
      notes: chantier.notes || "",
    });
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (enregistrement) return;

    setModalOuverte(false);
    setChantierEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
  }

  function modifierChamp(champ: keyof FormulaireChantier, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function utiliserAdresseClient() {
    const client = trouverClient(formulaire.client_id);

    if (!client) {
      setMessageErreur("Choisissez d’abord un client.");
      return;
    }

    setFormulaire((ancien) => ({
      ...ancien,
      adresse: client.adresse || "",
      code_postal: client.code_postal || "",
      ville: client.ville || "",
    }));

    setMessageErreur("");
  }

  function formulaireValide() {
    return formulaire.titre.trim().length > 0;
  }

  async function enregistrerChantier() {
    if (!entrepriseId) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!formulaireValide()) {
      setMessageErreur("Renseignez au minimum un titre de chantier.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const clientSelectionne = trouverClient(formulaire.client_id);

      const payload = {
        entreprise_id: entrepriseId,
        client_id: formulaire.client_id || null,
        client_nom: clientSelectionne ? nomClient(clientSelectionne) : null,
        titre: nettoyerTexte(formulaire.titre),
        statut: formulaire.statut,
        description: nettoyerTexte(formulaire.description),
        adresse: nettoyerTexte(formulaire.adresse),
        code_postal: nettoyerTexte(formulaire.code_postal),
        ville: nettoyerTexte(formulaire.ville),
        date_debut_prevue: nettoyerDate(formulaire.date_debut_prevue),
        date_fin_prevue: nettoyerDate(formulaire.date_fin_prevue),
        notes: nettoyerTexte(formulaire.notes),
      };

      if (chantierEdition) {
        const { error } = await supabase
          .from("chantiers")
          .update(payload)
          .eq("id", chantierEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;

        setMessageSucces("Chantier modifié avec succès.");
      } else {
        const { error } = await supabase.from("chantiers").insert(payload);

        if (error) throw error;

        setMessageSucces("Chantier créé avec succès.");
      }

      await chargerChantiers(entrepriseId);
      fermerModal();
    } catch (error: any) {
      console.error("Erreur enregistrement chantier :", error);
      setMessageErreur(
        error?.message || "Impossible d’enregistrer le chantier pour le moment."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function changerStatutChantier(chantier: Chantier, statut: StatutChantier) {
    if (!entrepriseId) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("chantiers")
        .update({ statut })
        .eq("id", chantier.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerChantiers(entrepriseId);
      setMessageSucces(`Statut du chantier mis à jour : ${libelleStatut(statut)}.`);
    } catch (error: any) {
      console.error("Erreur changement statut chantier :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier le statut du chantier."
      );
    }
  }

  async function archiverOuRestaurerChantier(chantier: Chantier) {
    const estArchive = chantier.statut === "archive";
    const nouveauStatut: StatutChantier = estArchive ? "a_prevoir" : "archive";

    const confirmation = window.confirm(
      estArchive
        ? `Voulez-vous réactiver le chantier "${titreChantier(chantier)}" ?`
        : `Voulez-vous archiver le chantier "${titreChantier(chantier)}" ?`
    );

    if (!confirmation) return;

    await changerStatutChantier(chantier, nouveauStatut);
  }

  async function supprimerChantier(chantier: Chantier) {
    if (!entrepriseId) return;

    const confirmation = window.confirm(
      `Suppression définitive du chantier "${titreChantier(
        chantier
      )}". Cette action est irréversible. Continuer ?`
    );

    if (!confirmation) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("chantiers")
        .delete()
        .eq("id", chantier.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerChantiers(entrepriseId);
      setMessageSucces("Chantier supprimé définitivement.");
    } catch (error: any) {
      console.error("Erreur suppression chantier :", error);
      setMessageErreur(
        error?.message ||
          "Impossible de supprimer ce chantier. Il sera peut-être lié plus tard à des devis, factures ou interventions."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Chantiers</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Créez vos chantiers, rattachez-les à vos clients et préparez la base
            pour les devis, factures, plannings et fiches d’intervention.
          </p>
        </div>

        <button
          onClick={ouvrirCreation}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          + Ajouter un chantier
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            À prévoir
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.a_prevoir}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            En cours
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.en_cours}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Terminés
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.termines}
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
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_240px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher par titre, client, ville, adresse, notes..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as typeof filtreStatut)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="a_prevoir">À prévoir</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminés</option>
            <option value="annule">Annulés</option>
            <option value="archive">Archivés</option>
          </select>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              🌳
            </div>
            <p className="font-semibold text-slate-900">
              Chargement des chantiers...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des données depuis Supabase.
            </p>
          </div>
        ) : chantiersFiltres.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🌳
            </div>
            <p className="font-semibold text-slate-900">Aucun chantier trouvé</p>
            <p className="mt-1 text-sm text-slate-500">
              Créez votre premier chantier ou modifiez les filtres de recherche.
            </p>

            <button
              onClick={ouvrirCreation}
              className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Ajouter un chantier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Chantier</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Adresse</th>
                  <th className="px-4 py-3 font-semibold">Dates prévues</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {chantiersFiltres.map((chantier) => (
                  <tr key={chantier.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-950">
                        {titreChantier(chantier)}
                      </p>

                      {chantier.description && (
                        <p className="mt-1 max-w-md text-xs text-slate-500">
                          {chantier.description}
                        </p>
                      )}

                      {chantier.notes && (
                        <p className="mt-2 max-w-md text-xs text-slate-400">
                          Notes : {chantier.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-800">
                        {chantier.client_nom || "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="max-w-xs text-sm text-slate-700">
                        <p>{chantier.adresse || "—"}</p>
                        <p className="text-xs text-slate-500">
                          {[chantier.code_postal, chantier.ville]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      <p>Début : {formatDate(chantier.date_debut_prevue)}</p>
                      <p className="text-xs text-slate-500">
                        Fin : {formatDate(chantier.date_fin_prevue)}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                          chantier.statut
                        )}`}
                      >
                        {libelleStatut(chantier.statut)}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => ouvrirEdition(chantier)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Modifier
                        </button>

                        <button
                          onClick={() =>
                            changerStatutChantier(chantier, "en_cours")
                          }
                          className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          En cours
                        </button>

                        <button
                          onClick={() => changerStatutChantier(chantier, "termine")}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Terminer
                        </button>

                        <button
                          onClick={() => archiverOuRestaurerChantier(chantier)}
                          className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          {chantier.statut === "archive"
                            ? "Réactiver"
                            : "Archiver"}
                        </button>

                        <button
                          onClick={() => supprimerChantier(chantier)}
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
                  {chantierEdition
                    ? "Modifier le chantier"
                    : "Ajouter un chantier"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rattachez le chantier à un client et renseignez les
                  informations utiles pour le suivi terrain.
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
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Client rattaché
                  </label>
                  <select
                    value={formulaire.client_id}
                    onChange={(event) =>
                      modifierChamp("client_id", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Aucun client sélectionné</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {nomClient(client)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={utiliserAdresseClient}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Utiliser adresse client
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Titre du chantier
                  </label>
                  <input
                    value={formulaire.titre}
                    onChange={(event) =>
                      modifierChamp("titre", event.target.value)
                    }
                    placeholder="Ex : Taille haie charmille, création massif, abattage..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
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
                    <option value="a_prevoir">À prévoir</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                    <option value="archive">Archivé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={formulaire.description}
                  onChange={(event) =>
                    modifierChamp("description", event.target.value)
                  }
                  placeholder="Décrivez rapidement les travaux prévus..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Adresse du chantier
                </label>
                <input
                  value={formulaire.adresse}
                  onChange={(event) =>
                    modifierChamp("adresse", event.target.value)
                  }
                  placeholder="Adresse complète du chantier"
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
                    onChange={(event) => modifierChamp("ville", event.target.value)}
                    placeholder="Ville"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date début prévue
                  </label>
                  <input
                    type="date"
                    value={formulaire.date_debut_prevue}
                    onChange={(event) =>
                      modifierChamp("date_debut_prevue", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date fin prévue
                  </label>
                  <input
                    type="date"
                    value={formulaire.date_fin_prevue}
                    onChange={(event) =>
                      modifierChamp("date_fin_prevue", event.target.value)
                    }
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
                  placeholder="Accès, contraintes, matériel à prévoir, consignes..."
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
                onClick={enregistrerChantier}
                disabled={enregistrement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement
                  ? "Enregistrement..."
                  : chantierEdition
                  ? "Modifier le chantier"
                  : "Créer le chantier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}