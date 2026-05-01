"use client";

import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type StatutFiche =
  | "brouillon"
  | "planifiee"
  | "en_cours"
  | "terminee"
  | "annulee"
  | "archivee";

type TypeIntervention =
  | "entretien"
  | "elagage"
  | "abattage"
  | "taille"
  | "tonte"
  | "debroussaillage"
  | "creation"
  | "autre";

type Client = {
  id: string;
  type_client?: string | null;
  nom?: string | null;
  prenom?: string | null;
  entreprise?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  statut?: string | null;
};

type Salarie = {
  id: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  statut?: string | null;
};

type FicheIntervention = {
  id: string;
  entreprise_id: string;
  client_id: string | null;
  client_nom: string | null;
  salarie_id: string | null;
  salarie_nom: string | null;
  titre: string | null;
  type_intervention: string | null;
  statut: string | null;
  date_intervention: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  travaux_prevus: string | null;
  materiel_prevu: string | null;
  consignes_securite: string | null;
  notes_internes: string | null;
  commentaire_salarie: string | null;
  validation_materiel_charge: boolean | null;
  validation_arrivee: boolean | null;
  validation_fin_intervention: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type FormulaireFiche = {
  client_id: string;
  salarie_id: string;
  titre: string;
  type_intervention: TypeIntervention;
  statut: StatutFiche;
  date_intervention: string;
  heure_debut: string;
  heure_fin: string;
  adresse: string;
  code_postal: string;
  ville: string;
  travaux_prevus: string;
  materiel_prevu: string;
  consignes_securite: string;
  notes_internes: string;
};

const FORMULAIRE_VIDE: FormulaireFiche = {
  client_id: "",
  salarie_id: "",
  titre: "",
  type_intervention: "autre",
  statut: "brouillon",
  date_intervention: "",
  heure_debut: "",
  heure_fin: "",
  adresse: "",
  code_postal: "",
  ville: "",
  travaux_prevus: "",
  materiel_prevu: "",
  consignes_securite: "",
  notes_internes: "",
};

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nettoyerDate(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nettoyerHeure(valeur: string) {
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

function nomSalarie(salarie: Salarie | null | undefined) {
  if (!salarie) return "Non affecté";

  const complet = `${salarie.prenom || ""} ${salarie.nom || ""}`.trim();

  return complet || salarie.email || "Salarié";
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "Planifiée";
  if (statut === "en_cours") return "En cours";
  if (statut === "terminee") return "Terminée";
  if (statut === "annulee") return "Annulée";
  if (statut === "archivee") return "Archivée";
  return "Brouillon";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "planifiee") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "en_cours") return "bg-amber-50 text-amber-700 border-amber-200";
  if (statut === "terminee")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "annulee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "archivee")
    return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function libelleType(type: string | null | undefined) {
  if (type === "entretien") return "Entretien";
  if (type === "elagage") return "Élagage";
  if (type === "abattage") return "Abattage";
  if (type === "taille") return "Taille";
  if (type === "tonte") return "Tonte";
  if (type === "debroussaillage") return "Débroussaillage";
  if (type === "creation") return "Création";
  return "Autre";
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

function formatHeure(heure: string | null) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

function titreFiche(fiche: FicheIntervention) {
  return fiche.titre || "Fiche d’intervention sans titre";
}

export default function FichesInterventionPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [fiches, setFiches] = useState<FicheIntervention[]>([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | StatutFiche>(
    "tous"
  );

  const [modalOuverte, setModalOuverte] = useState(false);
  const [ficheEdition, setFicheEdition] = useState<FicheIntervention | null>(
    null
  );
  const [formulaire, setFormulaire] =
    useState<FormulaireFiche>(FORMULAIRE_VIDE);

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

      await Promise.all([
        chargerClients(idEntreprise),
        chargerSalaries(idEntreprise),
        chargerFiches(idEntreprise),
      ]);
    } catch (error) {
      console.error("Erreur initialisation fiches intervention :", error);
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
      .neq("statut", "archive")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement clients :", error);
      setMessageErreur(error.message || "Impossible de charger les clients.");
      return;
    }

    setClients((data || []) as Client[]);
  }

  async function chargerSalaries(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("salaries")
      .select("*")
      .eq("entreprise_id", idEntreprise);

    if (error) {
      console.error("Erreur chargement salariés :", error);
      setSalaries([]);
      return;
    }

    const salariesActifs = ((data || []) as Salarie[]).filter(
      (salarie) => salarie.statut !== "archive" && salarie.statut !== "inactif"
    );

    setSalaries(salariesActifs);
  }

  async function chargerFiches(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("fiches_intervention")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("date_intervention", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement fiches :", error);
      setMessageErreur(
        error.message || "Impossible de charger les fiches d’intervention."
      );
      return;
    }

    setFiches((data || []) as FicheIntervention[]);
  }

  const statistiques = useMemo(() => {
    return {
      total: fiches.length,
      brouillons: fiches.filter((fiche) => fiche.statut === "brouillon").length,
      planifiees: fiches.filter((fiche) => fiche.statut === "planifiee").length,
      enCours: fiches.filter((fiche) => fiche.statut === "en_cours").length,
      terminees: fiches.filter((fiche) => fiche.statut === "terminee").length,
    };
  }, [fiches]);

  const fichesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return fiches.filter((fiche) => {
      const statutFiche = fiche.statut || "brouillon";

      const correspondStatut =
        filtreStatut === "tous" || statutFiche === filtreStatut;

      const zoneRecherche = [
        fiche.titre,
        fiche.client_nom,
        fiche.salarie_nom,
        fiche.type_intervention,
        fiche.adresse,
        fiche.code_postal,
        fiche.ville,
        fiche.travaux_prevus,
        fiche.materiel_prevu,
        fiche.consignes_securite,
        fiche.notes_internes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        texte.length === 0 || zoneRecherche.includes(texte);

      return correspondStatut && correspondRecherche;
    });
  }, [fiches, recherche, filtreStatut]);

  function trouverClient(clientId: string | null | undefined) {
    if (!clientId) return null;
    return clients.find((client) => client.id === clientId) || null;
  }

  function trouverSalarie(salarieId: string | null | undefined) {
    if (!salarieId) return null;
    return salaries.find((salarie) => salarie.id === salarieId) || null;
  }

  function ouvrirCreation() {
    setFicheEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function ouvrirEdition(fiche: FicheIntervention) {
    setFicheEdition(fiche);
    setFormulaire({
      client_id: fiche.client_id || "",
      salarie_id: fiche.salarie_id || "",
      titre: fiche.titre || "",
      type_intervention: (fiche.type_intervention as TypeIntervention) || "autre",
      statut: (fiche.statut as StatutFiche) || "brouillon",
      date_intervention: fiche.date_intervention || "",
      heure_debut: fiche.heure_debut ? fiche.heure_debut.slice(0, 5) : "",
      heure_fin: fiche.heure_fin ? fiche.heure_fin.slice(0, 5) : "",
      adresse: fiche.adresse || "",
      code_postal: fiche.code_postal || "",
      ville: fiche.ville || "",
      travaux_prevus: fiche.travaux_prevus || "",
      materiel_prevu: fiche.materiel_prevu || "",
      consignes_securite: fiche.consignes_securite || "",
      notes_internes: fiche.notes_internes || "",
    });
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (enregistrement) return;

    setModalOuverte(false);
    setFicheEdition(null);
    setFormulaire(FORMULAIRE_VIDE);
  }

  function modifierChamp(champ: keyof FormulaireFiche, valeur: string) {
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

  async function enregistrerFiche() {
    if (!entrepriseId) {
      setMessageErreur("Entreprise introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!formulaireValide()) {
      setMessageErreur("Renseignez au minimum un titre de fiche d’intervention.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const clientSelectionne = trouverClient(formulaire.client_id);
      const salarieSelectionne = trouverSalarie(formulaire.salarie_id);

      const payload = {
        entreprise_id: entrepriseId,
        client_id: formulaire.client_id || null,
        client_nom: clientSelectionne ? nomClient(clientSelectionne) : null,
        salarie_id: formulaire.salarie_id || null,
        salarie_nom: salarieSelectionne ? nomSalarie(salarieSelectionne) : null,
        titre: nettoyerTexte(formulaire.titre),
        type_intervention: formulaire.type_intervention,
        statut: formulaire.statut,
        date_intervention: nettoyerDate(formulaire.date_intervention),
        heure_debut: nettoyerHeure(formulaire.heure_debut),
        heure_fin: nettoyerHeure(formulaire.heure_fin),
        adresse: nettoyerTexte(formulaire.adresse),
        code_postal: nettoyerTexte(formulaire.code_postal),
        ville: nettoyerTexte(formulaire.ville),
        travaux_prevus: nettoyerTexte(formulaire.travaux_prevus),
        materiel_prevu: nettoyerTexte(formulaire.materiel_prevu),
        consignes_securite: nettoyerTexte(formulaire.consignes_securite),
        notes_internes: nettoyerTexte(formulaire.notes_internes),
      };

      if (ficheEdition) {
        const { error } = await supabase
          .from("fiches_intervention")
          .update(payload)
          .eq("id", ficheEdition.id)
          .eq("entreprise_id", entrepriseId);

        if (error) throw error;

        setMessageSucces("Fiche d’intervention modifiée avec succès.");
      } else {
        const { error } = await supabase
          .from("fiches_intervention")
          .insert(payload);

        if (error) throw error;

        setMessageSucces("Fiche d’intervention créée avec succès.");
      }

      await chargerFiches(entrepriseId);
      fermerModal();
    } catch (error: any) {
      console.error("Erreur enregistrement fiche :", error);
      setMessageErreur(
        error?.message ||
          "Impossible d’enregistrer la fiche d’intervention pour le moment."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function changerStatutFiche(fiche: FicheIntervention, statut: StatutFiche) {
    if (!entrepriseId) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .update({ statut })
        .eq("id", fiche.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerFiches(entrepriseId);
      setMessageSucces(`Statut mis à jour : ${libelleStatut(statut)}.`);
    } catch (error: any) {
      console.error("Erreur changement statut fiche :", error);
      setMessageErreur(
        error?.message || "Impossible de modifier le statut de la fiche."
      );
    }
  }

  async function supprimerFiche(fiche: FicheIntervention) {
    if (!entrepriseId) return;

    const confirmation = window.confirm(
      `Suppression définitive de la fiche "${titreFiche(
        fiche
      )}". Cette action est irréversible. Continuer ?`
    );

    if (!confirmation) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("fiches_intervention")
        .delete()
        .eq("id", fiche.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerFiches(entrepriseId);
      setMessageSucces("Fiche d’intervention supprimée définitivement.");
    } catch (error: any) {
      console.error("Erreur suppression fiche :", error);
      setMessageErreur(
        error?.message || "Impossible de supprimer cette fiche d’intervention."
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Fiches d’intervention
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Préparez les interventions terrain : client, salarié affecté, date,
            horaires, travaux prévus, matériel, consignes et suivi de validation.
          </p>
        </div>

        <button
          onClick={ouvrirCreation}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          + Créer une fiche
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
            Brouillons
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.brouillons}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Planifiées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.planifiees}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            En cours
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.enCours}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Terminées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.terminees}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_240px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher par client, salarié, ville, travaux, matériel..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "tous" | StatutFiche)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="brouillon">Brouillons</option>
            <option value="planifiee">Planifiées</option>
            <option value="en_cours">En cours</option>
            <option value="terminee">Terminées</option>
            <option value="annulee">Annulées</option>
            <option value="archivee">Archivées</option>
          </select>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
              📋
            </div>
            <p className="font-semibold text-slate-900">
              Chargement des fiches...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Récupération des données depuis Supabase.
            </p>
          </div>
        ) : fichesFiltrees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📋
            </div>
            <p className="font-semibold text-slate-900">
              Aucune fiche d’intervention trouvée
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Créez votre première fiche pour préparer une intervention terrain.
            </p>

            <button
              onClick={ouvrirCreation}
              className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Créer une fiche
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Intervention</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Salarié</th>
                  <th className="px-4 py-3 font-semibold">Date / horaires</th>
                  <th className="px-4 py-3 font-semibold">Adresse</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {fichesFiltrees.map((fiche) => (
                  <tr key={fiche.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-950">
                        {titreFiche(fiche)}
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {libelleType(fiche.type_intervention)}
                      </p>

                      {fiche.travaux_prevus && (
                        <p className="mt-2 max-w-md text-xs text-slate-500">
                          {fiche.travaux_prevus}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-800">
                        {fiche.client_nom || "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-slate-800">
                        {fiche.salarie_nom || "Non affecté"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top text-sm text-slate-700">
                      <p>{formatDate(fiche.date_intervention)}</p>
                      <p className="text-xs text-slate-500">
                        {formatHeure(fiche.heure_debut)} →{" "}
                        {formatHeure(fiche.heure_fin)}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="max-w-xs text-sm text-slate-700">
                        <p>{fiche.adresse || "—"}</p>
                        <p className="text-xs text-slate-500">
                          {[fiche.code_postal, fiche.ville]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                          fiche.statut
                        )}`}
                      >
                        {libelleStatut(fiche.statut)}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => ouvrirEdition(fiche)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Modifier
                        </button>

                        <button
                          onClick={() => changerStatutFiche(fiche, "planifiee")}
                          className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Planifier
                        </button>

                        <button
                          onClick={() => changerStatutFiche(fiche, "terminee")}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Terminer
                        </button>

                        <button
                          onClick={() => changerStatutFiche(fiche, "archivee")}
                          className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Archiver
                        </button>

                        <button
                          onClick={() => supprimerFiche(fiche)}
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
                  {ficheEdition
                    ? "Modifier la fiche d’intervention"
                    : "Créer une fiche d’intervention"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Préparez toutes les informations nécessaires pour le terrain.
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
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Client
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

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Salarié affecté
                  </label>
                  <select
                    value={formulaire.salarie_id}
                    onChange={(event) =>
                      modifierChamp("salarie_id", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">Non affecté</option>
                    {salaries.map((salarie) => (
                      <option key={salarie.id} value={salarie.id}>
                        {nomSalarie(salarie)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_180px_180px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Titre
                  </label>
                  <input
                    value={formulaire.titre}
                    onChange={(event) =>
                      modifierChamp("titre", event.target.value)
                    }
                    placeholder="Ex : Taille haie charmille, tonte, démontage..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    value={formulaire.type_intervention}
                    onChange={(event) =>
                      modifierChamp("type_intervention", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="entretien">Entretien</option>
                    <option value="elagage">Élagage</option>
                    <option value="abattage">Abattage</option>
                    <option value="taille">Taille</option>
                    <option value="tonte">Tonte</option>
                    <option value="debroussaillage">Débroussaillage</option>
                    <option value="creation">Création</option>
                    <option value="autre">Autre</option>
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
                    <option value="brouillon">Brouillon</option>
                    <option value="planifiee">Planifiée</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminee">Terminée</option>
                    <option value="annulee">Annulée</option>
                    <option value="archivee">Archivée</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date d’intervention
                  </label>
                  <input
                    type="date"
                    value={formulaire.date_intervention}
                    onChange={(event) =>
                      modifierChamp("date_intervention", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={formulaire.heure_debut}
                    onChange={(event) =>
                      modifierChamp("heure_debut", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Heure fin
                  </label>
                  <input
                    type="time"
                    value={formulaire.heure_fin}
                    onChange={(event) =>
                      modifierChamp("heure_fin", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={utiliserAdresseClient}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Utiliser l’adresse du client
                </button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Adresse d’intervention
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
                  Travaux prévus
                </label>
                <textarea
                  value={formulaire.travaux_prevus}
                  onChange={(event) =>
                    modifierChamp("travaux_prevus", event.target.value)
                  }
                  placeholder="Décrivez ce que le salarié doit faire sur place..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Matériel prévu
                </label>
                <textarea
                  value={formulaire.materiel_prevu}
                  onChange={(event) =>
                    modifierChamp("materiel_prevu", event.target.value)
                  }
                  placeholder="Ex : taille-haie, tronçonneuse, broyeur, EPI, carburant..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Consignes sécurité
                </label>
                <textarea
                  value={formulaire.consignes_securite}
                  onChange={(event) =>
                    modifierChamp("consignes_securite", event.target.value)
                  }
                  placeholder="Ex : port des EPI, balisage, voisinage, ligne électrique, accès difficile..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes internes chef
                </label>
                <textarea
                  value={formulaire.notes_internes}
                  onChange={(event) =>
                    modifierChamp("notes_internes", event.target.value)
                  }
                  placeholder="Infos internes non visibles client : temps prévu, contraintes, rappel..."
                  rows={3}
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
                onClick={enregistrerFiche}
                disabled={enregistrement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement
                  ? "Enregistrement..."
                  : ficheEdition
                  ? "Modifier la fiche"
                  : "Créer la fiche"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}