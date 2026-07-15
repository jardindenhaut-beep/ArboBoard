"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const TYPES_DEMANDE = [
  "acces",
  "rectification",
  "effacement",
  "limitation",
  "opposition",
  "portabilite",
] as const;

type TypeDemande = (typeof TYPES_DEMANDE)[number];

type StatutDemande =
  | "recue"
  | "verification_identite"
  | "en_cours"
  | "terminee"
  | "refusee"
  | "annulee";

type DemandeRgpd = {
  id: string;
  type_demande: TypeDemande;
  statut: StatutDemande;
  commentaire_utilisateur?: string | null;
  reponse_interne?: string | null;
  source: string;
  recue_at: string;
  echeance_reponse: string;
  prolongee_jusqu_au?: string | null;
  motif_prolongation?: string | null;
  prise_en_charge_at?: string | null;
  terminee_at?: string | null;
  annulee_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ReponseDemandes = {
  demandes?: DemandeRgpd[];
  demande?: DemandeRgpd;
  succes?: boolean;
  erreur?: string;
};

type DefinitionDroit = {
  type: TypeDemande;
  titre: string;
  description: string;
  emoji: string;
};

const DEFINITIONS: DefinitionDroit[] = [
  {
    type: "acces",
    titre: "Accès",
    description:
      "Demander quelles données personnelles Arboboard détient sur votre compte.",
    emoji: "👁️",
  },
  {
    type: "rectification",
    titre: "Rectification",
    description:
      "Signaler une information personnelle inexacte ou incomplète.",
    emoji: "✏️",
  },
  {
    type: "effacement",
    titre: "Effacement",
    description:
      "Demander la suppression de données lorsque les conditions applicables sont réunies.",
    emoji: "🗑️",
  },
  {
    type: "limitation",
    titre: "Limitation",
    description:
      "Demander le gel temporaire de certains traitements.",
    emoji: "⏸️",
  },
  {
    type: "opposition",
    titre: "Opposition",
    description:
      "Vous opposer à certains traitements fondés sur l’intérêt légitime.",
    emoji: "🛑",
  },
  {
    type: "portabilite",
    titre: "Portabilité",
    description:
      "Demander les données concernées dans un format structuré et lisible par machine.",
    emoji: "📦",
  },
];

function libelleType(type: TypeDemande) {
  return (
    DEFINITIONS.find(
      (definition) => definition.type === type
    )?.titre || type
  );
}

function libelleStatut(statut: StatutDemande) {
  const libelles: Record<StatutDemande, string> = {
    recue: "Reçue",
    verification_identite: "Vérification d’identité",
    en_cours: "En cours",
    terminee: "Terminée",
    refusee: "Refusée",
    annulee: "Annulée",
  };

  return libelles[statut];
}

function classesStatut(statut: StatutDemande) {
  if (statut === "terminee") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (statut === "refusee") {
    return "bg-red-50 text-red-700";
  }

  if (statut === "annulee") {
    return "bg-slate-100 text-slate-600";
  }

  if (statut === "en_cours") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function peutAnnuler(statut: StatutDemande) {
  return (
    statut === "recue" ||
    statut === "verification_identite"
  );
}

export default function DonneesPersonnellesChefPage() {
  const [demandes, setDemandes] = useState<
    DemandeRgpd[]
  >([]);
  const [typeSelectionne, setTypeSelectionne] =
    useState<TypeDemande>("acces");
  const [commentaire, setCommentaire] = useState("");
  const [chargement, setChargement] = useState(true);
  const [creation, setCreation] = useState(false);
  const [exportEnCours, setExportEnCours] =
    useState(false);
  const [annulationId, setAnnulationId] =
    useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const demandesOuvertes = useMemo(
    () =>
      new Set(
        demandes
          .filter((demande) =>
            [
              "recue",
              "verification_identite",
              "en_cours",
            ].includes(demande.statut)
          )
          .map((demande) => demande.type_demande)
      ),
    [demandes]
  );

  useEffect(() => {
    void chargerDemandes();
  }, []);

  async function obtenirJeton() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error(
        "Votre session a expiré. Veuillez vous reconnecter."
      );
    }

    return session.access_token;
  }

  async function chargerDemandes() {
    try {
      setChargement(true);
      setErreur("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/demandes-rgpd",
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      const donnees =
        (await reponse.json()) as ReponseDemandes;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible de charger vos demandes."
        );
      }

      setDemandes(donnees.demandes || []);
    } catch (error) {
      console.error(
        "Erreur chargement demandes RGPD :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger vos demandes."
      );
    } finally {
      setChargement(false);
    }
  }

  async function creerDemande() {
    try {
      setCreation(true);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/demandes-rgpd",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            type_demande: typeSelectionne,
            commentaire,
          }),
        }
      );

      const donnees =
        (await reponse.json()) as ReponseDemandes;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible d’enregistrer la demande."
        );
      }

      setCommentaire("");
      setMessage(
        "Votre demande a été enregistrée et horodatée."
      );

      await chargerDemandes();
    } catch (error) {
      console.error(
        "Erreur création demande RGPD :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer la demande."
      );
    } finally {
      setCreation(false);
    }
  }

  async function annulerDemande(demandeId: string) {
    const confirme = window.confirm(
      "Annuler cette demande ?"
    );

    if (!confirme) return;

    try {
      setAnnulationId(demandeId);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/demandes-rgpd",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            demande_id: demandeId,
          }),
        }
      );

      const donnees =
        (await reponse.json()) as ReponseDemandes;

      if (!reponse.ok) {
        throw new Error(
          donnees.erreur ||
            "Impossible d’annuler la demande."
        );
      }

      setMessage("La demande a été annulée.");
      await chargerDemandes();
    } catch (error) {
      console.error(
        "Erreur annulation demande RGPD :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d’annuler la demande."
      );
    } finally {
      setAnnulationId(null);
    }
  }

  async function telechargerDonnees() {
    try {
      setExportEnCours(true);
      setErreur("");
      setMessage("");

      const jeton = await obtenirJeton();

      const reponse = await fetch(
        "/api/securite/export-donnees-personnelles",
        {
          headers: {
            Authorization: `Bearer ${jeton}`,
          },
          cache: "no-store",
        }
      );

      if (!reponse.ok) {
        const donnees =
          (await reponse.json().catch(() => ({}))) as {
            erreur?: string;
          };

        throw new Error(
          donnees.erreur ||
            "Impossible de générer l’export."
        );
      }

      const blob = await reponse.blob();
      const disposition =
        reponse.headers.get("content-disposition");

      const correspondance =
        disposition?.match(/filename="([^"]+)"/);

      const nomFichier =
        correspondance?.[1] ||
        "arboboard-donnees-personnelles.json";

      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");

      lien.href = url;
      lien.download = nomFichier;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);

      setMessage(
        "Votre export personnel JSON a été téléchargé."
      );
    } catch (error) {
      console.error(
        "Erreur téléchargement données :",
        error
      );
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de télécharger vos données."
      );
    } finally {
      setExportEnCours(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Sécurité & conformité
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Mes données personnelles
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Téléchargez les données personnelles associées à votre
              compte ou créez une demande d’exercice de droits suivie
              depuis Arboboard.
            </p>
          </div>

          <Link
            href="/chef/securite"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ← Sécurité
          </Link>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold text-emerald-950">
              Export immédiat du compte
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              L’export JSON contient les informations personnelles du
              compte, les consentements, les demandes et le journal
              personnel. Il n’inclut pas les données métiers de
              l’entreprise.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void telechargerDonnees()}
            disabled={exportEnCours}
            className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {exportEnCours
              ? "Préparation…"
              : "Télécharger mes données"}
          </button>
        </div>
      </header>

      {erreur ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {erreur}
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DEFINITIONS.map((definition) => {
          const ouverte = demandesOuvertes.has(
            definition.type
          );
          const selectionnee =
            typeSelectionne === definition.type;

          return (
            <button
              key={definition.type}
              type="button"
              onClick={() =>
                setTypeSelectionne(definition.type)
              }
              className={`rounded-3xl border p-5 text-left shadow-sm transition ${
                selectionnee
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl">
                  {definition.emoji}
                </span>

                {ouverte ? (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                    Demande en cours
                  </span>
                ) : null}
              </div>

              <h2 className="mt-4 font-bold text-slate-950">
                {definition.titre}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {definition.description}
              </p>
            </button>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-950">
          Nouvelle demande : {libelleType(typeSelectionne)}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Décrivez précisément votre demande sans transmettre de mot
          de passe, de pièce d’identité ou de donnée sensible dans ce
          champ. Arboboard pourra demander une vérification adaptée
          séparément lorsque cela est nécessaire.
        </p>

        <textarea
          value={commentaire}
          onChange={(event) =>
            setCommentaire(
              event.target.value.slice(0, 2000)
            )
          }
          rows={6}
          placeholder="Informations utiles pour comprendre et traiter votre demande…"
          className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />

        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Commentaire facultatif</span>
          <span>{commentaire.length} / 2000</span>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void creerDemande()}
            disabled={
              creation ||
              demandesOuvertes.has(typeSelectionne)
            }
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creation
              ? "Enregistrement…"
              : demandesOuvertes.has(typeSelectionne)
                ? "Une demande est déjà en cours"
                : "Envoyer la demande"}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <h2 className="text-xl font-bold text-slate-950">
            Suivi de mes demandes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            L’échéance affichée est une date de suivi initiale. Une
            prolongation motivée peut apparaître dans le dossier.
          </p>
        </div>

        {chargement ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Chargement des demandes…
          </div>
        ) : demandes.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl">📭</div>
            <p className="mt-3 font-semibold text-slate-900">
              Aucune demande enregistrée
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {demandes.map((demande) => (
              <article
                key={demande.id}
                className="p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950">
                        {libelleType(demande.type_demande)}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${classesStatut(
                          demande.statut
                        )}`}
                      >
                        {libelleStatut(demande.statut)}
                      </span>
                    </div>

                    {demande.commentaire_utilisateur ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {demande.commentaire_utilisateur}
                      </p>
                    ) : null}

                    {demande.reponse_interne ? (
                      <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                          Réponse Arboboard
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-900">
                          {demande.reponse_interne}
                        </p>
                      </div>
                    ) : null}

                    {demande.motif_prolongation ? (
                      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                        <strong>Prolongation :</strong>{" "}
                        {demande.motif_prolongation}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>
                        Reçue :{" "}
                        <strong className="text-slate-700">
                          {formatDate(demande.recue_at)}
                        </strong>
                      </span>
                      <span>
                        Échéance initiale :{" "}
                        <strong className="text-slate-700">
                          {formatDate(
                            demande.echeance_reponse
                          )}
                        </strong>
                      </span>
                      {demande.prolongee_jusqu_au ? (
                        <span>
                          Échéance prolongée :{" "}
                          <strong className="text-slate-700">
                            {formatDate(
                              demande.prolongee_jusqu_au
                            )}
                          </strong>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {peutAnnuler(demande.statut) ? (
                    <button
                      type="button"
                      onClick={() =>
                        void annulerDemande(demande.id)
                      }
                      disabled={annulationId === demande.id}
                      className="shrink-0 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {annulationId === demande.id
                        ? "Annulation…"
                        : "Annuler la demande"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
        La suppression du compte n’est jamais automatique après un
        simple clic : Arboboard doit vérifier la portée de la demande,
        les obligations de conservation applicables et les données
        nécessaires à la sécurité ou à la défense des droits.
      </div>
    </main>
  );
}