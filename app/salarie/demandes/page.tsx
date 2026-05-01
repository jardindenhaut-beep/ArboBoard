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

type FormulaireDemande = {
  type_demande: TypeDemande;
  titre: string;
  message: string;
  date_debut: string;
  date_fin: string;
};

const FORMULAIRE_VIDE: FormulaireDemande = {
  type_demande: "autre",
  titre: "",
  message: "",
  date_debut: "",
  date_fin: "",
};

function nettoyerTexte(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nettoyerDate(valeur: string) {
  const texte = valeur.trim();
  return texte.length > 0 ? texte : null;
}

function nomProfil(profil: ProfilUtilisateur | null) {
  if (!profil) return "Salarié";

  const complet = `${profil.prenom || ""} ${profil.nom || ""}`.trim();

  return complet || profil.email || "Salarié";
}

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

export default function DemandesSalariePage() {
  const [entrepriseId, setEntrepriseId] = useState("");
  const [profil, setProfil] = useState<ProfilUtilisateur | null>(null);
  const [demandes, setDemandes] = useState<Demande[]>([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [modalOuverte, setModalOuverte] = useState(false);
  const [formulaire, setFormulaire] =
    useState<FormulaireDemande>(FORMULAIRE_VIDE);

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

      if (profilConnecte.role !== "salarie") {
        setMessageErreur("Cette page est réservée aux salariés.");
        setChargement(false);
        return;
      }

      const idEntreprise = resultat.contexte.entreprise.id as string;

      setEntrepriseId(idEntreprise);
      setProfil(profilConnecte);

      await chargerDemandes(idEntreprise, profilConnecte.id);
    } catch (error) {
      console.error("Erreur initialisation demandes salarié :", error);
      setMessageErreur("Une erreur est survenue pendant le chargement.");
    } finally {
      setChargement(false);
    }
  }

  async function chargerDemandes(
    idEntreprise = entrepriseId,
    userId = profil?.id || ""
  ) {
    if (!idEntreprise || !userId) return;

    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .eq("demandeur_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement demandes salarié :", error);
      setMessageErreur(error.message || "Impossible de charger vos demandes.");
      return;
    }

    setDemandes((data || []) as Demande[]);
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

  function ouvrirCreation() {
    setFormulaire(FORMULAIRE_VIDE);
    setMessageErreur("");
    setMessageSucces("");
    setModalOuverte(true);
  }

  function fermerModal() {
    if (enregistrement) return;
    setModalOuverte(false);
    setFormulaire(FORMULAIRE_VIDE);
  }

  function modifierChamp(champ: keyof FormulaireDemande, valeur: string) {
    setFormulaire((ancien) => ({
      ...ancien,
      [champ]: valeur,
    }));
  }

  function formulaireValide() {
    return formulaire.titre.trim().length > 0 && formulaire.message.trim().length > 0;
  }

  async function creerDemande() {
    if (!entrepriseId || !profil?.id) {
      setMessageErreur("Compte salarié introuvable. Veuillez vous reconnecter.");
      return;
    }

    if (!formulaireValide()) {
      setMessageErreur("Renseignez au minimum un titre et un message.");
      return;
    }

    try {
      setEnregistrement(true);
      setMessageErreur("");
      setMessageSucces("");

      const payload = {
        entreprise_id: entrepriseId,
        demandeur_user_id: profil.id,
        demandeur_nom: nomProfil(profil),
        demandeur_email: profil.email || null,
        type_demande: formulaire.type_demande,
        titre: nettoyerTexte(formulaire.titre),
        message: nettoyerTexte(formulaire.message),
        statut: "en_attente",
        date_debut: nettoyerDate(formulaire.date_debut),
        date_fin: nettoyerDate(formulaire.date_fin),
      };

      const { error } = await supabase.from("demandes").insert(payload);

      if (error) throw error;

      await chargerDemandes(entrepriseId, profil.id);

      setMessageSucces("Demande envoyée au chef d’entreprise.");
      fermerModal();
    } catch (error: any) {
      console.error("Erreur création demande :", error);
      setMessageErreur(
        error?.message || "Impossible de créer votre demande pour le moment."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function annulerDemande(demande: Demande) {
    if (!entrepriseId || !profil?.id) return;

    if (demande.statut !== "en_attente") {
      setMessageErreur("Seules les demandes en attente peuvent être annulées.");
      return;
    }

    const confirmation = window.confirm(
      `Voulez-vous annuler la demande "${demande.titre || "sans titre"}" ?`
    );

    if (!confirmation) return;

    try {
      setMessageErreur("");
      setMessageSucces("");

      const { error } = await supabase
        .from("demandes")
        .update({ statut: "annulee" })
        .eq("id", demande.id)
        .eq("entreprise_id", entrepriseId)
        .eq("demandeur_user_id", profil.id);

      if (error) throw error;

      await chargerDemandes(entrepriseId, profil.id);

      setMessageSucces("Demande annulée.");
    } catch (error: any) {
      console.error("Erreur annulation demande :", error);
      setMessageErreur(error?.message || "Impossible d’annuler cette demande.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Arboboard</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Mes demandes
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Envoyez une demande au chef d’entreprise : congé, matériel, absence,
            problème terrain ou autre besoin.
          </p>
        </div>

        <button
          onClick={ouvrirCreation}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          + Nouvelle demande
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
            placeholder="Rechercher dans mes demandes..."
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
              Chargement de vos demandes...
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
              Créez une demande pour l’envoyer au chef d’entreprise.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {demandesFiltrees.map((demande) => (
              <article key={demande.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
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

                    <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                      {demande.message || "—"}
                    </p>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                      <p>Envoyée le : {formatDateHeure(demande.created_at)}</p>
                      <p>Début : {formatDate(demande.date_debut)}</p>
                      <p>Fin : {formatDate(demande.date_fin)}</p>
                    </div>

                    {demande.reponse_chef && (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <p className="font-semibold">Réponse du chef</p>
                        <p className="mt-1 whitespace-pre-line">
                          {demande.reponse_chef}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {demande.statut === "en_attente" && (
                      <button
                        onClick={() => annulerDemande(demande)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Nouvelle demande
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Cette demande sera visible par le chef d’entreprise.
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
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Type
                  </label>
                  <select
                    value={formulaire.type_demande}
                    onChange={(event) =>
                      modifierChamp("type_demande", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="conge">Congé</option>
                    <option value="materiel">Matériel</option>
                    <option value="absence">Absence</option>
                    <option value="probleme">Problème</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Titre
                  </label>
                  <input
                    value={formulaire.titre}
                    onChange={(event) =>
                      modifierChamp("titre", event.target.value)
                    }
                    placeholder="Ex : Demande de congé, matériel manquant..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date début
                  </label>
                  <input
                    type="date"
                    value={formulaire.date_debut}
                    onChange={(event) =>
                      modifierChamp("date_debut", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date fin
                  </label>
                  <input
                    type="date"
                    value={formulaire.date_fin}
                    onChange={(event) =>
                      modifierChamp("date_fin", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Message
                </label>
                <textarea
                  value={formulaire.message}
                  onChange={(event) =>
                    modifierChamp("message", event.target.value)
                  }
                  placeholder="Expliquez votre demande..."
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button
                onClick={fermerModal}
                disabled={enregistrement}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                onClick={creerDemande}
                disabled={enregistrement}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {enregistrement ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}