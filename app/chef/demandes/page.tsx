"use client";

import { useEffect, useMemo, useState } from "react";
import { chargerContexteEntreprise } from "@/lib/entreprise";
import { supabase } from "@/lib/supabaseClient";

type TypeDemande = "conge" | "materiel" | "absence" | "probleme" | "autre";

type StatutDemande =
  | "en_attente"
  | "acceptee"
  | "refusee"
  | "traitee"
  | "annulee";

type ProfilUtilisateur = {
  id: string;
  email?: string | null;
  nom?: string | null;
  prenom?: string | null;
  role?: string | null;
  statut?: string | null;
};

type Demande = {
  id: string;
  entreprise_id: string;
  demandeur_user_id: string | null;
  salarie_id: string | null;
  demandeur_nom: string | null;
  demandeur_email: string | null;
  type_demande: string | null;
  titre: string | null;
  message: string | null;
  statut: string | null;
  date_debut: string | null;
  date_fin: string | null;
  reponse_chef: string | null;
  repondu_par: string | null;
  repondu_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function libelleType(type: string | null | undefined) {
  if (type === "conge") return "Congé";
  if (type === "materiel") return "Matériel";
  if (type === "absence") return "Absence";
  if (type === "probleme") return "Problème";
  return "Autre";
}

function badgeType(type: string | null | undefined) {
  if (type === "conge") return "bg-blue-50 text-blue-700 border-blue-200";
  if (type === "materiel") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "absence") return "bg-amber-50 text-amber-700 border-amber-200";
  if (type === "probleme") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function libelleStatut(statut: string | null | undefined) {
  if (statut === "acceptee") return "Acceptée";
  if (statut === "refusee") return "Refusée";
  if (statut === "traitee") return "Traitée";
  if (statut === "annulee") return "Annulée";
  return "En attente";
}

function badgeStatut(statut: string | null | undefined) {
  if (statut === "acceptee") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (statut === "refusee") return "bg-red-50 text-red-700 border-red-200";
  if (statut === "traitee") return "bg-blue-50 text-blue-700 border-blue-200";
  if (statut === "annulee") return "bg-slate-100 text-slate-600 border-slate-200";
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

function formatDateHeure(date: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return "—";
  }
}

export default function DemandesChefPage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [reponses, setReponses] = useState<Record<string, string>>({});

  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);

  const [filtreStatut, setFiltreStatut] = useState<"tous" | StatutDemande>(
    "tous"
  );
  const [filtreType, setFiltreType] = useState<"tous" | TypeDemande>("tous");
  const [recherche, setRecherche] = useState("");

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

      const profilConnecte = resultat.contexte.profil as ProfilUtilisateur;

      if (profilConnecte.role !== "chef") {
        setMessageErreur("Cette page est réservée au chef d’entreprise.");
        setChargement(false);
        return;
      }

      const idEntreprise = resultat.contexte.entreprise.id as string;

      setEntrepriseId(idEntreprise);
      setProfil(profilConnecte);

      await chargerDemandes(idEntreprise);
    } catch (error) {
      console.error("Erreur initialisation demandes chef :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerDemandes(idEntreprise = entrepriseId) {
    if (!idEntreprise) return;

    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement demandes chef :", error);
      setMessageErreur(error.message || "Impossible de charger les demandes.");
      return;
    }

    const demandesChargees = (data || []) as Demande[];

    setDemandes(demandesChargees);

    const reponsesInitiales: Record<string, string> = {};

    demandesChargees.forEach((demande) => {
      reponsesInitiales[demande.id] = demande.reponse_chef || "";
    });

    setReponses(reponsesInitiales);
  }

  const statistiques = useMemo(() => {
    return {
      total: demandes.length,
      attente: demandes.filter((demande) => demande.statut === "en_attente")
        .length,
      acceptees: demandes.filter((demande) => demande.statut === "acceptee")
        .length,
      refusees: demandes.filter((demande) => demande.statut === "refusee")
        .length,
      traitees: demandes.filter((demande) => demande.statut === "traitee")
        .length,
    };
  }, [demandes]);

  const demandesFiltrees = useMemo(() => {
    const texte = recherche.trim().toLowerCase();

    return demandes.filter((demande) => {
      const statut = demande.statut || "en_attente";
      const type = demande.type_demande || "autre";

      const correspondStatut =
        filtreStatut === "tous" || statut === filtreStatut;

      const correspondType = filtreType === "tous" || type === filtreType;

      const zoneRecherche = [
        demande.demandeur_nom,
        demande.demandeur_email,
        demande.titre,
        demande.message,
        demande.reponse_chef,
        demande.type_demande,
        demande.statut,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correspondRecherche =
        texte.length === 0 || zoneRecherche.includes(texte);

      return correspondStatut && correspondType && correspondRecherche;
    });
  }, [demandes, filtreStatut, filtreType, recherche]);

  function modifierReponse(demandeId: string, valeur: string) {
    setReponses((ancien) => ({
      ...ancien,
      [demandeId]: valeur,
    }));
  }

  async function mettreAJourDemande(
    demande: Demande,
    statut: StatutDemande,
    messageSuccesAction: string
  ) {
    if (!entrepriseId || !profil?.id) return;

    try {
      setActionEnCours(true);
      setMessageErreur("");
      setMessageSucces("");

      const reponse = reponses[demande.id] || "";

      const { error } = await supabase
        .from("demandes")
        .update({
          statut,
          reponse_chef: reponse.trim() || null,
          repondu_par: profil.id,
          repondu_at: new Date().toISOString(),
        })
        .eq("id", demande.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerDemandes(entrepriseId);

      setMessageSucces(messageSuccesAction);
    } catch (error: any) {
      console.error("Erreur mise à jour demande :", error);
      setMessageErreur(
        error?.message || "Impossible de mettre à jour cette demande."
      );
    } finally {
      setActionEnCours(false);
    }
  }

  async function supprimerDemande(demande: Demande) {
    if (!entrepriseId) return;

    const confirmation = window.confirm(
      `Supprimer définitivement la demande "${
        demande.titre || "sans titre"
      }" ?`
    );

    if (!confirmation) return;

    try {
      setActionEnCours(true);
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("demandes")
        .delete()
        .eq("id", demande.id)
        .eq("entreprise_id", entrepriseId);

      if (error) throw error;

      await chargerDemandes(entrepriseId);

      setMessageSucces("Demande supprimée.");
    } catch (error: any) {
      console.error("Erreur suppression demande :", error);
      setMessageErreur(error?.message || "Impossible de supprimer cette demande.");
    } finally {
      setActionEnCours(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Demandes salariés
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Consultez les demandes envoyées par vos salariés : congés, matériel,
            absence, problème terrain ou autre besoin.
          </p>
        </div>
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
            En attente
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.attente}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Acceptées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.acceptees}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Refusées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.refusees}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Traitées
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {statistiques.traitees}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_220px_220px]">
          <input
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher salarié, titre, message..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <select
            value={filtreType}
            onChange={(event) =>
              setFiltreType(event.target.value as "tous" | TypeDemande)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les types</option>
            <option value="conge">Congé</option>
            <option value="materiel">Matériel</option>
            <option value="absence">Absence</option>
            <option value="probleme">Problème</option>
            <option value="autre">Autre</option>
          </select>

          <select
            value={filtreStatut}
            onChange={(event) =>
              setFiltreStatut(event.target.value as "tous" | StatutDemande)
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="tous">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="acceptee">Acceptées</option>
            <option value="refusee">Refusées</option>
            <option value="traitee">Traitées</option>
            <option value="annulee">Annulées</option>
          </select>
        </div>

        {chargement ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-slate-900">
              Chargement des demandes...
            </p>
          </div>
        ) : demandesFiltrees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📩
            </div>
            <p className="font-semibold text-slate-900">
              Aucune demande trouvée
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Les demandes envoyées par les salariés apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {demandesFiltrees.map((demande) => (
              <article key={demande.id} className="p-5">
                <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeType(
                          demande.type_demande
                        )}`}
                      >
                        {libelleType(demande.type_demande)}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeStatut(
                          demande.statut
                        )}`}
                      >
                        {libelleStatut(demande.statut)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-slate-950">
                      {demande.titre || "Demande sans titre"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Par {demande.demandeur_nom || "Salarié"} —{" "}
                      {demande.demandeur_email || "email non renseigné"}
                    </p>

                    <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                      {demande.message || "—"}
                    </p>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                      <p>Envoyée le : {formatDateHeure(demande.created_at)}</p>
                      <p>Début : {formatDate(demande.date_debut)}</p>
                      <p>Fin : {formatDate(demande.date_fin)}</p>
                    </div>

                    {demande.reponse_chef && (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <p className="font-semibold">Réponse enregistrée</p>
                        <p className="mt-1 whitespace-pre-line">
                          {demande.reponse_chef}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      Réponse au salarié
                    </label>

                    <textarea
                      value={reponses[demande.id] || ""}
                      onChange={(event) =>
                        modifierReponse(demande.id, event.target.value)
                      }
                      rows={5}
                      placeholder="Écrire une réponse..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          mettreAJourDemande(
                            demande,
                            "acceptee",
                            "Demande acceptée."
                          )
                        }
                        disabled={actionEnCours}
                        className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        Accepter
                      </button>

                      <button
                        onClick={() =>
                          mettreAJourDemande(
                            demande,
                            "refusee",
                            "Demande refusée."
                          )
                        }
                        disabled={actionEnCours}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Refuser
                      </button>

                      <button
                        onClick={() =>
                          mettreAJourDemande(
                            demande,
                            "traitee",
                            "Demande marquée comme traitée."
                          )
                        }
                        disabled={actionEnCours}
                        className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                      >
                        Traiter
                      </button>

                      <button
                        onClick={() => supprimerDemande(demande)}
                        disabled={actionEnCours}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}